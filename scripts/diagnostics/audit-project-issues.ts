/**
 * Read-only Project Audit diagnostic for a project (+ optional facility).
 * Uses the same build logic as src/lib/projectAuditReport.ts.
 *
 *   $env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\service-account.json"
 *   npx tsx scripts/diagnostics/audit-project-issues.ts --project d1f42949-3b30-4e00-8c7f-9dccc802dae1 --facility 0c41f0e7-0a56-433a-93e5-4d84d00737d4
 */
import fs from 'fs';
import path from 'path';
import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import {
  buildProjectAuditReport,
  hasProjectAuditReportContentIssue,
  REPORT_CONTENT_AUDIT_WARNING_CODES,
  type AuditWarningCode,
  type ProjectAuditRecordView,
} from '../../src/lib/projectAuditReport.ts';

type Row = Record<string, unknown>;

/** Local helpers for typo detection (diagnostic-only; no app dependency). */
function normalizeCategoryId(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

function buildCategoryByIdMap(categories: Row[]): Map<string, Row> {
  const map = new Map<string, Row>();
  for (const c of categories) {
    const k1 = normalizeCategoryId(c.fldCategoryID);
    const k2 = normalizeCategoryId(c.id);
    if (k1) map.set(k1, c);
    if (k2) map.set(k2, c);
  }
  return map;
}

const REPORT_CONTENT = REPORT_CONTENT_AUDIT_WARNING_CODES;

/** Non-report-content warning codes (metadata / linkage). */
const METADATA_CODES = new Set<string>([
  'missing_finding_id',
  'missing_recommendation_id',
  'missing_glossary_row',
  'master_finding_archived',
  'master_finding_missing',
  'master_rec_archived',
  'master_rec_missing',
  'snapshot_finding_differs',
  'snapshot_rec_differs',
  'multiple_costs',
  'multiple_paired_recommendations',
  'multiple_paired_findings',
  'inconsistent_citations',
  'unresolved_facility',
]);

function normId(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

function resolveProjectId(): string | undefined {
  const fromEnv =
    process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;
  if (fromEnv) return String(fromEnv).trim() || undefined;
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (!fs.existsSync(configPath)) return undefined;
  try {
    const j = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as Record<string, unknown>;
    const pid = j.projectId ?? j.project_id;
    if (pid != null && String(pid).trim()) return String(pid).trim();
  } catch {
    /* ignore */
  }
  return undefined;
}

function ensureAdminApp(): void {
  if (getApps().length > 0) return;
  const projectId = resolveProjectId();
  initializeApp({
    credential: applicationDefault(),
    ...(projectId ? { projectId } : {}),
  });
}

function parseArgs(argv: string[]) {
  const get = (flag: string) => {
    const i = argv.indexOf(flag);
    return i >= 0 ? String(argv[i + 1] ?? '').trim() : '';
  };
  return { project: get('--project'), facility: get('--facility') };
}

async function loadCollection(name: string): Promise<Row[]> {
  const snap = await getFirestore().collection(name).get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

function isCustomRecord(rec: Row): boolean {
  const fldDataBlank = !String(rec.fldData ?? '').trim();
  const hasPDataCatItem =
    !!String(rec.fldPDataCategoryID ?? '').trim() && !!String(rec.fldPDataItemID ?? '').trim();
  return rec.fldRecordSource === 'custom' || (fldDataBlank && hasPDataCatItem);
}

/** Detect likely fldCat typo (extra/missing char vs a library category). */
function suggestCategoryRepair(
  rawCatId: string,
  categoryById: Map<string, Row>
): { likelyTypo: boolean; suggestion: string; note: string } {
  const key = normalizeCategoryId(rawCatId);
  if (!key) return { likelyTypo: false, suggestion: '', note: 'empty fldCat' };
  if (categoryById.has(key)) {
    return { likelyTypo: false, suggestion: key, note: 'resolves in library' };
  }

  const raw = String(rawCatId).trim();
  let best: { id: string; name: string; dist: number } | null = null;
  for (const [cid, cat] of categoryById) {
    const name = String(cat.fldCategoryName ?? '');
    if (cid.length === 0) continue;
    const dist = levenshtein(key, cid);
    if (dist <= 2 && (!best || dist < best.dist)) {
      best = { id: cid, name, dist };
    }
    if (raw.length >= 8 && (cid.startsWith(key.slice(0, -1)) || key.startsWith(cid.slice(0, -1)))) {
      if (!best || best.dist > 1) best = { id: cid, name, dist: 1 };
    }
  }
  if (best && best.dist <= 2) {
    return {
      likelyTypo: true,
      suggestion: best.id,
      note: `closest category "${best.name}" (${best.id}), edit distance ${best.dist}; raw fldCat len=${raw.length}`,
    };
  }
  return { likelyTypo: false, suggestion: '', note: 'no close category match in library' };
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function classifyWarnings(record: ProjectAuditRecordView) {
  const reportContent: AuditWarningCode[] = [];
  const metadata: string[] = [];
  const customMasterIdNoise: string[] = [];
  const isCustom = record.recordSource === 'custom';

  for (const w of record.warnings) {
    if (REPORT_CONTENT.has(w.code)) {
      reportContent.push(w.code);
    } else if (METADATA_CODES.has(w.code)) {
      metadata.push(w.code);
      if (
        isCustom &&
        (w.code === 'missing_finding_id' || w.code === 'missing_recommendation_id')
      ) {
        const hasFindSnap = !/^\s*$/.test(record.findShort) || !/^\s*$/.test(record.findLong);
        const hasRecSnap = !/^\s*$/.test(record.recShort) || !/^\s*$/.test(record.recLong);
        if (
          (w.code === 'missing_finding_id' && hasFindSnap) ||
          (w.code === 'missing_recommendation_id' && hasRecSnap)
        ) {
          customMasterIdNoise.push(w.code);
        }
      }
    } else {
      metadata.push(w.code);
    }
  }
  return { reportContent, metadata, customMasterIdNoise };
}

function affectsReportOutput(code: AuditWarningCode): boolean {
  return REPORT_CONTENT.has(code);
}

function sourceFieldForIssue(code: AuditWarningCode, record: ProjectAuditRecordView): string {
  switch (code) {
    case 'unresolved_category':
      return `glossary.fldCat / fldPDataCategoryID → "${record.categoryId}"`;
    case 'unresolved_item':
      return `glossary.fldItem / fldPDataItemID → "${record.itemId}"`;
    case 'unresolved_location':
      return `projectData.fldLocation → "${record.locationId}"`;
    case 'missing_finding_short':
    case 'missing_finding_long':
      return 'projectData.fldFindShort / fldFindLong';
    case 'missing_recommendation_short':
    case 'missing_recommendation_long':
      return 'projectData.fldRecShort / fldRecLong';
    case 'missing_finding_id':
      return 'glossary.fldFind / fldPDataMasterFindID';
    case 'missing_recommendation_id':
      return 'glossary.fldRec / fldPDataMasterRecID';
    case 'missing_glossary_row':
      return 'projectData.fldData (no glossary match)';
    default:
      return code;
  }
}

function repairHint(
  code: AuditWarningCode,
  raw: Row,
  glossaryRow: Row | undefined,
  categoryRepair: ReturnType<typeof suggestCategoryRepair>
): string {
  if (code === 'unresolved_category' && categoryRepair.likelyTypo) {
    return `Metadata-only: set glossary.fldCat to ${categoryRepair.suggestion} (fix typo in Firebase glossary row)`;
  }
  if (code === 'unresolved_category' && !String(raw.fldPDataCategoryID ?? '').trim() && glossaryRow) {
    return 'Fix glossary.fldCat to valid fldCategoryID; optional: align fldPDataCategoryID on save';
  }
  if (code === 'unresolved_item') {
    return 'Fix glossary.fldItem to valid fldItemID; verify item.fldCatID matches glossary.fldCat';
  }
  if (code === 'unresolved_location') {
    return 'Set valid fldLocation on projectData or restore location row';
  }
  if (code.startsWith('missing_finding_') || code.startsWith('missing_recommendation_')) {
    return 'Fill projectData snapshot text fields (report-visible)';
  }
  if (code === 'missing_glossary_row') {
    return 'Restore glossary row or clear/fix fldData pointer';
  }
  if (code === 'missing_finding_id' || code === 'missing_recommendation_id') {
    if (isCustomRecord(raw)) {
      return 'Custom record: acceptable if snapshot text present; optional master IDs for linkage only';
    }
    return 'Glossary record: link fldFind/fldRec on glossary row or master IDs on projectData';
  }
  return 'Review metadata; may be informational';
}

async function main(): Promise<void> {
  const { project, facility } = parseArgs(process.argv.slice(2));
  if (!project) {
    console.error('Usage: --project <fldProjID> [--facility <fldFacID>]');
    process.exit(1);
  }

  ensureAdminApp();

  console.log('Read-only Project Audit diagnostic');
  console.log(`Project: ${project}`);
  if (facility) console.log(`Facility filter: ${facility}`);

  const [
    projectData,
    glossary,
    categories,
    items,
    locations,
    facilities,
    findings,
    masterRecommendations,
    standards,
  ] = await Promise.all([
    loadCollection('projectData'),
    loadCollection('glossary'),
    loadCollection('categories'),
    loadCollection('items'),
    loadCollection('locations'),
    loadCollection('facilities'),
    loadCollection('findings'),
    loadCollection('masterRecommendations'),
    loadCollection('standards'),
  ]);

  const activeCategories = categories.filter((c) => !c.fldDeleted && !c.fldIsDeleted);
  const activeFindings = findings.filter((f) => !f.fldDeleted && !f.fldIsDeleted);
  const activeRecs = masterRecommendations.filter((r) => !r.fldDeleted && !r.fldIsDeleted);

  const built = buildProjectAuditReport({
    projectId: project,
    projectData: projectData as never[],
    facilities: facilities as never[],
    locations: locations as never[],
    categories: activeCategories as never[],
    items: items.filter((i) => !i.fldDeleted && !i.fldIsDeleted) as never[],
    glossary: glossary as never[],
    findings: activeFindings as never[],
    resolvableFindings: findings as never[],
    masterRecommendations: activeRecs as never[],
    resolvableMasterRecommendations: masterRecommendations as never[],
    standards: standards as never[],
  });

  let records = built.records;
  if (facility) {
    const fid = normId(facility);
    records = records.filter((r) => normId(r.facilityId) === fid);
  }

  const glossaryByKey = new Map<string, Row>();
  for (const g of glossary) {
    const k1 = normId(g.fldGlosId);
    const k2 = normId(g.id);
    if (k1) glossaryByKey.set(k1, g);
    if (k2) glossaryByKey.set(k2, g);
  }
  const categoryById = buildCategoryByIdMap(categories);
  const itemById = new Map<string, Row>();
  for (const i of items) {
    const k = normId(i.fldItemID);
    if (k) itemById.set(k, i);
  }
  const projectDataById = new Map<string, Row>();
  for (const d of projectData) {
    const k = normId(d.fldPDataID);
    if (k) projectDataById.set(k, d);
  }

  const lines: string[] = [];
  let reportContentRecordCount = 0;
  let metadataOnlyRecordCount = 0;
  let dataRepairCount = 0;
  let acceptableCustomMetadataCount = 0;

  const issueRows: {
    fldPDataID: string;
    source: string;
    reportContent: AuditWarningCode[];
    metadata: string[];
    customNoise: string[];
    repair: string[];
  }[] = [];

  for (const r of records) {
    const { reportContent, metadata, customMasterIdNoise } = classifyWarnings(r);
    const hasReport = reportContent.length > 0;
    const hasMeta = metadata.length > 0;
    if (hasReport) reportContentRecordCount += 1;
    else if (hasMeta) metadataOnlyRecordCount += 1;

    if (hasReport || hasMeta) {
      const raw = projectDataById.get(normId(r.recordId)) ?? {};
      const glos = glossaryByKey.get(normId(raw.fldData));
      const catRepair = suggestCategoryRepair(r.categoryId, categoryById);
      const repairs: string[] = [];

      for (const code of [...reportContent, ...metadata] as AuditWarningCode[]) {
        repairs.push(repairHint(code, raw, glos, catRepair));
      }
      if (catRepair.likelyTypo && reportContent.includes('unresolved_category')) {
        dataRepairCount += 1;
      } else if (hasReport) {
        dataRepairCount += 1;
      }

      if (customMasterIdNoise.length > 0) acceptableCustomMetadataCount += 1;

      issueRows.push({
        fldPDataID: r.recordId,
        source: r.recordSource,
        reportContent,
        metadata,
        customNoise: customMasterIdNoise,
        repair: [...new Set(repairs)],
      });

      lines.push('');
      lines.push(`--- ${r.recordId} (${r.recordSource}) ---`);
      lines.push(`  facility: ${r.facilityLabel} | location: ${r.locationLabel}`);
      lines.push(`  category: ${r.categoryLabel} [${r.categoryId}]`);
      lines.push(`  item: ${r.itemLabel} [${r.itemId}]`);
      lines.push(`  fldData: ${String(raw.fldData ?? '')}`);
      if (glos) {
        lines.push(`  glossary.fldCat: ${String(glos.fldCat ?? '')} (doc ${glos.id})`);
        const item = itemById.get(normId(glos.fldItem));
        if (item) {
          lines.push(
            `  item.fldCatID: ${String(item.fldCatID ?? '')} matches fldCat: ${normId(item.fldCatID) === normId(glos.fldCat)}`
          );
        }
        if (catRepair.likelyTypo) {
          lines.push(`  ** TYPO SUSPECT: ${catRepair.note} → suggest ${catRepair.suggestion}`);
        }
      }
      lines.push(`  finding/rec IDs: ${r.findingId ?? '—'} / ${r.recommendationId ?? '—'}`);
      lines.push(
        `  snapshots: findShort=${r.findShort ? 'yes' : 'BLANK'} findLong=${r.findLong ? 'yes' : 'BLANK'} recShort=${r.recShort ? 'yes' : 'BLANK'} recLong=${r.recLong ? 'yes' : 'BLANK'}`
      );
      if (reportContent.length) {
        lines.push(`  REPORT-CONTENT: ${reportContent.join(', ')}`);
        for (const c of reportContent) {
          lines.push(`    - ${c}: affects report=${affectsReportOutput(c)} | ${sourceFieldForIssue(c, r)}`);
        }
      }
      if (metadata.length) {
        lines.push(`  METADATA: ${metadata.join(', ')}`);
      }
      if (customMasterIdNoise.length) {
        lines.push(
          `  CUSTOM (acceptable metadata noise if filter excludes): ${customMasterIdNoise.join(', ')}`
        );
      }
      lines.push(`  repair: ${repairs[0] ?? '—'}`);
    }
  }

  const scopedCount = records.filter((r) => hasProjectAuditReportContentIssue(r)).length;

  const summary = [
    '',
    '========== SUMMARY ==========',
    `Records in scope: ${records.length}`,
    `Records with ≥1 report-content issue: ${scopedCount} (facility-scoped count)`,
    `Records with report-content warnings (detailed): ${reportContentRecordCount}`,
    `Records with metadata-only warnings (no report-content): ${metadataOnlyRecordCount}`,
    `Records flagged for likely data repair: ${dataRepairCount}`,
    `Custom records with missing master ID but snapshot present: ${acceptableCustomMetadataCount}`,
    '',
    'REPORT_CONTENT codes:',
    [...REPORT_CONTENT].join(', '),
    '',
    'Note: missing_finding_id / missing_recommendation_id are NOT report-content codes today.',
    'contentIssuesOnly filter already excludes them.',
  ];

  const out = ['Project Audit diagnostic', ...summary, ...lines].join('\n');
  console.log(out);

  const reportDir = path.join(process.cwd(), 'reports', 'diagnostics');
  fs.mkdirSync(reportDir, { recursive: true });
  const outPath = path.join(reportDir, `audit-project-${project.slice(0, 8)}-${Date.now()}.txt`);
  fs.writeFileSync(outPath, out, 'utf-8');
  const jsonPath = outPath.replace('.txt', '.json');
  fs.writeFileSync(jsonPath, JSON.stringify({ project, facility, issueRows, summary: scopedCount }, null, 2));
  console.log(`\nWrote ${outPath}`);
  console.log(`Wrote ${jsonPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
