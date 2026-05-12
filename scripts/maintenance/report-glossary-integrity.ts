/**
 * Read-only maintenance: glossary / projectData consistency report.
 *
 * No Firestore writes. Outputs:
 *   - Console summary counts
 *   - reports/glossary-integrity-report.md
 *   - reports/glossary-integrity-report.json
 *
 * Credentials (same as report-orphans.ts):
 *
 *   PowerShell:
 *     $env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\service-account.json"
 *     npx tsx scripts/maintenance/report-glossary-integrity.ts
 *
 * Optional:
 *     $env:FIREBASE_PROJECT_ID="your-project-id"
 *
 * Project id is also read from firebase-applet-config.json when env unset.
 */
import fs from 'fs';
import path from 'path';
import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { GLOSSARY_SET_DEFS, glossarySetById } from '../../src/lib/glossarySets.ts';

const REPORT_DIR = path.join(process.cwd(), 'reports');
const MD_PATH = path.join(REPORT_DIR, 'glossary-integrity-report.md');
const JSON_PATH = path.join(REPORT_DIR, 'glossary-integrity-report.json');

const KNOWN_SET_IDS = new Set(GLOSSARY_SET_DEFS.map((d) => d.id.toUpperCase()));

function printCredentialHelp(): void {
  console.error(`
Firebase Admin could not initialize or access Firestore.

Set GOOGLE_APPLICATION_CREDENTIALS to a service account JSON path (do not commit the JSON).
See scripts/maintenance/report-orphans.ts header for examples.

The service account needs Firestore read access on the target project.
`);
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
  try {
    initializeApp({
      credential: applicationDefault(),
      ...(projectId ? { projectId } : {}),
    });
  } catch (e) {
    console.error('initializeApp failed:', e);
    printCredentialHelp();
    process.exit(1);
  }
}

function norm(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

function normKey(v: unknown): string {
  return norm(v).toLowerCase();
}

function isSoftDeleted(data: Record<string, unknown>): boolean {
  return (
    data.fldDeleted === true ||
    data.fldIsDeleted === true ||
    data.fldIsArchived === true
  );
}

type Row = { id: string; data: Record<string, unknown>; soft: boolean };

async function fetchAll(db: Firestore, name: string): Promise<Row[]> {
  const snap = await db.collection(name).get();
  const out: Row[] = [];
  snap.forEach((d) => {
    const data = d.data() as Record<string, unknown>;
    out.push({ id: d.id, data, soft: isSoftDeleted(data) });
  });
  return out;
}

function missingGlossarySetFields(data: Record<string, unknown>): string[] {
  const missing: string[] = [];
  if (!norm(data.fldGlossarySetId)) missing.push('fldGlossarySetId');
  if (!norm(data.fldGlossarySetName)) missing.push('fldGlossarySetName');
  if (!norm(data.fldGlossaryStandardType)) missing.push('fldGlossaryStandardType');
  if (!norm(data.fldGlossaryStandardVersion)) missing.push('fldGlossaryStandardVersion');
  return missing;
}

function isLegacyProjectDataCitationRow(data: Record<string, unknown>): boolean {
  return Object.prototype.hasOwnProperty.call(data, 'citation_num');
}

function pathKeyFromGlossary(data: Record<string, unknown>): string | null {
  const c = normKey(data.fldCat);
  const i = normKey(data.fldItem);
  const f = normKey(data.fldFind);
  const r = normKey(data.fldRec) || normKey(data.fldRecID);
  if (!c || !i || !f || !r) return null;
  return `${c}|${i}|${f}|${r}`;
}

function mainHeader(title: string): string {
  return `\n## ${title}\n\n`;
}

async function main() {
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.log(
      'Note: GOOGLE_APPLICATION_CREDENTIALS is not set. Using Application Default Credentials if available.\n'
    );
  }

  ensureAdminApp();
  const db = getFirestore();

  let glossary: Row[],
    projectData: Row[],
    findings: Row[],
    recommendations: Row[],
    categories: Row[],
    items: Row[],
    locations: Row[],
    projects: Row[],
    facilities: Row[];

  try {
    [
      glossary,
      projectData,
      findings,
      recommendations,
      categories,
      items,
      locations,
      projects,
      facilities,
    ] = await Promise.all([
      fetchAll(db, 'glossary'),
      fetchAll(db, 'projectData'),
      fetchAll(db, 'findings'),
      fetchAll(db, 'recommendations'),
      fetchAll(db, 'categories'),
      fetchAll(db, 'items'),
      fetchAll(db, 'locations'),
      fetchAll(db, 'projects'),
      fetchAll(db, 'facilities'),
    ]);
  } catch (e: unknown) {
    console.error('Failed to read collections.', e);
    printCredentialHelp();
    process.exit(1);
  }

  const findingById = new Map<string, Row>();
  for (const r of findings) {
    findingById.set(normKey(r.data.fldFindID), r);
    findingById.set(normKey(r.id), r);
  }

  const recById = new Map<string, Row>();
  for (const r of recommendations) {
    recById.set(normKey(r.data.fldRecID), r);
    recById.set(normKey(r.id), r);
  }

  const catById = new Map<string, Row>();
  for (const r of categories) {
    catById.set(normKey(r.data.fldCategoryID), r);
    catById.set(normKey(r.id), r);
  }

  const itemById = new Map<string, Row>();
  for (const r of items) {
    itemById.set(normKey(r.data.fldItemID), r);
    itemById.set(normKey(r.id), r);
  }

  const locById = new Map<string, Row>();
  for (const r of locations) {
    locById.set(normKey(r.data.fldLocID), r);
    locById.set(normKey(r.id), r);
  }

  const projById = new Map<string, Row>();
  for (const r of projects) {
    projById.set(normKey(r.data.fldProjID), r);
    projById.set(normKey(r.id), r);
  }

  const facById = new Map<string, Row>();
  for (const r of facilities) {
    facById.set(normKey(r.data.fldFacID), r);
    facById.set(normKey(r.id), r);
  }

  /** Resolve glossary row by fldGlosId field or Firestore doc id */
  const glossaryByDataKey = new Map<string, Row>();
  for (const g of glossary) {
    const glos = norm(g.data.fldGlosId);
    if (glos) glossaryByDataKey.set(normKey(glos), g);
    glossaryByDataKey.set(normKey(g.id), g);
  }

  function resolveGlossaryRow(fldData: unknown): Row | undefined {
    const k = normKey(fldData);
    if (!k) return undefined;
    return glossaryByDataKey.get(k);
  }

  // --- 1. Glossary rows missing set info ---
  type GlossaryMissingSetRow = {
    docId: string;
    fldGlosId: string;
    fldCat: string;
    fldItem: string;
    fldFind: string;
    fldRec: string;
    categoryLabel: string;
    itemLabel: string;
    findingLabel: string;
    recommendationLabel: string;
    missingFields: string[];
    soft: boolean;
    fldGlossarySetId: string;
    unknownSetId: boolean;
  };

  const glossaryMissingSet: GlossaryMissingSetRow[] = [];
  const glossaryUnknownSetId: GlossaryMissingSetRow[] = [];

  for (const g of glossary) {
    const missing = missingGlossarySetFields(g.data);
    const gid = norm(g.data.fldGlossarySetId);
    const unknownSet = Boolean(gid) && !KNOWN_SET_IDS.has(gid.toUpperCase());

    if (missing.length > 0 || unknownSet) {
      const catId = norm(g.data.fldCat);
      const itemId = norm(g.data.fldItem);
      const findId = norm(g.data.fldFind);
      const recId = norm(g.data.fldRec) || norm(g.data.fldRecID);
      const catRow = catById.get(normKey(catId));
      const itemRow = itemById.get(normKey(itemId));
      const findRow = findingById.get(normKey(findId));
      const recRow = recById.get(normKey(recId));
      const row: GlossaryMissingSetRow = {
        docId: g.id,
        fldGlosId: norm(g.data.fldGlosId) || g.id,
        fldCat: catId,
        fldItem: itemId,
        fldFind: findId,
        fldRec: recId,
        categoryLabel: norm(catRow?.data.fldCategoryName) || '',
        itemLabel: norm(itemRow?.data.fldItemName) || '',
        findingLabel: norm(findRow?.data.fldFindShort) || '',
        recommendationLabel: norm(recRow?.data.fldRecShort) || '',
        missingFields: missing,
        soft: g.soft,
        fldGlossarySetId: gid,
        unknownSetId: unknownSet,
      };
      if (missing.length > 0) glossaryMissingSet.push(row);
      if (unknownSet && !g.soft) glossaryUnknownSetId.push(row);
    }
  }

  // --- 2 & 3. ProjectData fldData + mismatch ---
  type PdFldDataIssue = {
    fldPDataID: string;
    fldPDataProject: string;
    fldFacility: string;
    fldLocation: string;
    projectName: string;
    facilityName: string;
    locationName: string;
    fldData: string;
    fldDataResolves: boolean;
    glossaryDocId: string;
    glossaryRowHasSetId: boolean;
    fldGlossarySetId: string;
    fldFindShort: string;
    fldRecShort: string;
    soft: boolean;
    fldRecordSource: string;
    issue: 'blank_fldData' | 'missing_glossary_row' | 'glossary_row_missing_set';
  };

  type PdMismatch = {
    fldPDataID: string;
    soft: boolean;
    projectData: {
      fldPDataCategoryID: string;
      fldPDataItemID: string;
      fldPDataMasterFindID: string;
      fldPDataMasterRecID: string;
    };
    glossary: {
      docId: string;
      fldCat: string;
      fldItem: string;
      fldFind: string;
      fldRec: string;
    };
    fieldsDiffer: string[];
  };

  const pdFldDataIssues: PdFldDataIssue[] = [];
  const pdMismatches: PdMismatch[] = [];
  let projectDataGlossaryFldDataResolvedOk = 0;

  for (const r of projectData) {
    if (isLegacyProjectDataCitationRow(r.data)) continue;

    const d = r.data;
    const fldData = norm(d.fldData);
    const projId = norm(d.fldPDataProject);
    const facId = norm(d.fldFacility);
    const locId = norm(d.fldLocation);
    const projRow = projById.get(normKey(projId));
    const facRow = facById.get(normKey(facId));
    const locRow = locById.get(normKey(locId));

    const baseIssue: Omit<PdFldDataIssue, 'issue' | 'fldDataResolves' | 'glossaryDocId' | 'glossaryRowHasSetId' | 'fldGlossarySetId'> = {
      fldPDataID: norm(d.fldPDataID) || r.id,
      fldPDataProject: projId,
      fldFacility: facId,
      fldLocation: locId,
      projectName: norm(projRow?.data.fldProjName) || '',
      facilityName: norm(facRow?.data.fldFacName) || '',
      locationName: norm(locRow?.data.fldLocName) || '',
      fldData: fldData,
      fldFindShort: norm(d.fldFindShort),
      fldRecShort: norm(d.fldRecShort),
      soft: r.soft,
      fldRecordSource: norm(d.fldRecordSource),
    };

    const src = norm(d.fldRecordSource);
    const isCustom = src === 'custom';

    if (!fldData) {
      if (!isCustom) {
        pdFldDataIssues.push({
          ...baseIssue,
          fldDataResolves: false,
          glossaryDocId: '',
          glossaryRowHasSetId: false,
          fldGlossarySetId: '',
          issue: 'blank_fldData',
        });
      }
      continue;
    }

    const gRow = resolveGlossaryRow(fldData);
    if (!gRow) {
      pdFldDataIssues.push({
        ...baseIssue,
        fldDataResolves: false,
        glossaryDocId: '',
        glossaryRowHasSetId: false,
        fldGlossarySetId: '',
        issue: 'missing_glossary_row',
      });
      continue;
    }

    const gSetId = norm(gRow.data.fldGlossarySetId);
    const hasSet = Boolean(gSetId);
    if (!hasSet) {
      pdFldDataIssues.push({
        ...baseIssue,
        fldDataResolves: true,
        glossaryDocId: gRow.id,
        glossaryRowHasSetId: false,
        fldGlossarySetId: '',
        issue: 'glossary_row_missing_set',
      });
    } else {
      projectDataGlossaryFldDataResolvedOk += 1;
    }

    // Mismatch: projectData snapshot ids vs glossary row
    const pCat = norm(d.fldPDataCategoryID);
    const pItem = norm(d.fldPDataItemID);
    const pFind = norm(d.fldPDataMasterFindID);
    const pRec = norm(d.fldPDataMasterRecID);
    const gCat = norm(gRow.data.fldCat);
    const gItem = norm(gRow.data.fldItem);
    const gFind = norm(gRow.data.fldFind);
    const gRec = norm(gRow.data.fldRec) || norm(gRow.data.fldRecID);

    const fieldsDiffer: string[] = [];
    if (pCat && gCat && normKey(pCat) !== normKey(gCat)) fieldsDiffer.push('category');
    if (pItem && gItem && normKey(pItem) !== normKey(gItem)) fieldsDiffer.push('item');
    if (pFind && gFind && normKey(pFind) !== normKey(gFind)) fieldsDiffer.push('finding');
    if (pRec && gRec && normKey(pRec) !== normKey(gRec)) fieldsDiffer.push('recommendation');

    if (fieldsDiffer.length > 0) {
      pdMismatches.push({
        fldPDataID: baseIssue.fldPDataID,
        soft: r.soft,
        projectData: {
          fldPDataCategoryID: pCat,
          fldPDataItemID: pItem,
          fldPDataMasterFindID: pFind,
          fldPDataMasterRecID: pRec,
        },
        glossary: {
          docId: gRow.id,
          fldCat: gCat,
          fldItem: gItem,
          fldFind: gFind,
          fldRec: gRec,
        },
        fieldsDiffer,
      });
    }
  }

  const pdProblems = pdFldDataIssues;

  // --- 4. Duplicate paths across sets ---
  type PathDupGroup = {
    pathKey: string;
    entries: {
      glossaryDocId: string;
      fldGlosId: string;
      fldGlossarySetId: string;
      fldGlossarySetName: string;
      soft: boolean;
    }[];
  };

  const pathMap = new Map<string, Row[]>();
  for (const g of glossary) {
    const pk = pathKeyFromGlossary(g.data);
    if (!pk) continue;
    let arr = pathMap.get(pk);
    if (!arr) {
      arr = [];
      pathMap.set(pk, arr);
    }
    arr.push(g);
  }

  const duplicatePaths: PathDupGroup[] = [];
  for (const [pathKey, rows] of pathMap) {
    const setIds = new Set(
      rows.map((x) => normKey(x.data.fldGlossarySetId)).filter(Boolean)
    );
    const hasMultipleSets = setIds.size > 1;
    const hasUnsetWithOther =
      rows.some((x) => !norm(x.data.fldGlossarySetId)) && rows.some((x) => norm(x.data.fldGlossarySetId));
    if (rows.length > 1 && (hasMultipleSets || hasUnsetWithOther)) {
      duplicatePaths.push({
        pathKey,
        entries: rows.map((x) => ({
          glossaryDocId: x.id,
          fldGlosId: norm(x.data.fldGlosId) || x.id,
          fldGlossarySetId: norm(x.data.fldGlossarySetId),
          fldGlossarySetName: norm(x.data.fldGlossarySetName),
          soft: x.soft,
        })),
      });
    }
  }

  duplicatePaths.sort((a, b) => b.entries.length - a.entries.length);

  // --- 5. Master findings / recommendations missing fldGlossarySetId ---
  type MasterMissingSet = {
    collection: 'findings' | 'recommendations';
    docId: string;
    masterId: string;
    shortLabel: string;
    soft: boolean;
  };

  const findingsMissingSet: MasterMissingSet[] = [];
  for (const r of findings) {
    if (r.soft) continue;
    if (!norm(r.data.fldGlossarySetId)) {
      findingsMissingSet.push({
        collection: 'findings',
        docId: r.id,
        masterId: norm(r.data.fldFindID) || r.id,
        shortLabel: norm(r.data.fldFindShort),
        soft: r.soft,
      });
    }
  }

  const recommendationsMissingSet: MasterMissingSet[] = [];
  for (const r of recommendations) {
    if (r.soft) continue;
    if (!norm(r.data.fldGlossarySetId)) {
      recommendationsMissingSet.push({
        collection: 'recommendations',
        docId: r.id,
        masterId: norm(r.data.fldRecID) || r.id,
        shortLabel: norm(r.data.fldRecShort),
        soft: r.soft,
      });
    }
  }

  // --- Console summary ---
  const nGlossMissingAnySetField = glossaryMissingSet.filter((x) => x.missingFields.length > 0).length;
  const nGlossUnknownSet = glossaryUnknownSetId.length;
  const nPdProblems = pdProblems.length;
  const nPdMismatch = pdMismatches.length;
  const nDupPaths = duplicatePaths.length;
  const nFindMissing = findingsMissingSet.length;
  const nRecMissing = recommendationsMissingSet.length;

  console.log('Glossary integrity report (read-only, Firebase Admin)');
  console.log('======================================================');
  console.log(`Glossary rows loaded:        ${glossary.length}`);
  console.log(`ProjectData rows loaded:     ${projectData.length}`);
  console.log(`Findings loaded:             ${findings.length}`);
  console.log(`Recommendations loaded:      ${recommendations.length}`);
  console.log('');
  console.log('Summary counts');
  console.log('--------------');
  console.log(`1. Glossary rows with any missing set field:     ${nGlossMissingAnySetField}`);
  console.log(`   (subset) Active glossary unknown fldGlossarySetId vs defs: ${nGlossUnknownSet}`);
  console.log(`2. ProjectData fldData issues:                 ${nPdProblems}`);
  console.log(`   (subset) fldData → glossary row OK (count): ${projectDataGlossaryFldDataResolvedOk}`);
  console.log(`3. ProjectData vs glossary row id mismatches:   ${nPdMismatch}`);
  console.log(`4. Duplicate/near-duplicate paths (multi-set):  ${nDupPaths}`);
  console.log(`5a. Active findings missing fldGlossarySetId:   ${nFindMissing}`);
  console.log(`5b. Active recommendations missing fldGlossarySetId: ${nRecMissing}`);
  console.log('');

  if (!fs.existsSync(REPORT_DIR)) {
    fs.mkdirSync(REPORT_DIR, { recursive: true });
  }

  const reportJson = {
    generatedAt: new Date().toISOString(),
    summary: {
      glossaryRowsLoaded: glossary.length,
      projectDataRowsLoaded: projectData.length,
      findingsLoaded: findings.length,
      recommendationsLoaded: recommendations.length,
      glossaryRowsMissingAnyGlossarySetField: nGlossMissingAnySetField,
      glossaryRowsUnknownGlossarySetId: nGlossUnknownSet,
      projectDataGlossaryFldDataResolvedOk: projectDataGlossaryFldDataResolvedOk,
      projectDataFldDataIssueRows: nPdProblems,
      projectDataGlossaryIdMismatches: nPdMismatch,
      duplicatePathGroups: nDupPaths,
      activeFindingsMissingFldGlossarySetId: nFindMissing,
      activeRecommendationsMissingFldGlossarySetId: nRecMissing,
    },
    glossaryMissingSetFields: glossaryMissingSet,
    glossaryUnknownSetId: glossaryUnknownSetId.filter((x) => !x.soft),
    projectDataFldDataIssues: pdFldDataIssues,
    projectDataMismatches: pdMismatches,
    duplicateGlossaryPathsAcrossSets: duplicatePaths,
    findingsMissingGlossarySetId: findingsMissingSet,
    recommendationsMissingGlossarySetId: recommendationsMissingSet,
    knownGlossarySetDefs: GLOSSARY_SET_DEFS.map((d) => ({
      id: d.id,
      name: d.name,
      standardType: d.standardType,
      standardVersion: d.standardVersion,
      resolved: glossarySetById(d.id) != null,
    })),
  };

  fs.writeFileSync(JSON_PATH, JSON.stringify(reportJson, null, 2), 'utf-8');

  const md: string[] = [];
  md.push('# Glossary integrity report\n');
  md.push(`Generated: ${reportJson.generatedAt}\n`);
  md.push('**Read-only.** No Firestore writes.\n');
  md.push('## Summary\n');
  md.push('| Metric | Count |');
  md.push('|--------|------:|');
  md.push(`| Glossary rows loaded | ${glossary.length} |`);
  md.push(`| ProjectData rows loaded | ${projectData.length} |`);
  md.push(`| Glossary rows missing any of: fldGlossarySetId, fldGlossarySetName, fldGlossaryStandardType, fldGlossaryStandardVersion | ${nGlossMissingAnySetField} |`);
  md.push(`| Active glossary rows with unknown fldGlossarySetId (not in GLOSSARY_SET_DEFS) | ${nGlossUnknownSet} |`);
  md.push(`| ProjectData fldData → glossary resolved OK (glossary row has set id) | ${projectDataGlossaryFldDataResolvedOk} |`);
  md.push(`| ProjectData fldData / resolution issues | ${nPdProblems} |`);
  md.push(`| ProjectData field disagreements vs glossary row (fldData) | ${nPdMismatch} |`);
  md.push(`| Duplicate cat/item/find/rec paths across sets or unset+set | ${nDupPaths} |`);
  md.push(`| Active findings missing fldGlossarySetId | ${nFindMissing} |`);
  md.push(`| Active recommendations missing fldGlossarySetId | ${nRecMissing} |`);
  md.push('\nFull detail: `glossary-integrity-report.json` in this folder.\n');

  md.push(mainHeader('1. Glossary rows — missing glossary set fields'));
  md.push(
    'Each row lists `fldGlosId`, FK path, resolvable labels, `missingFields`, and whether `fldGlossarySetId` is unknown vs `src/lib/glossarySets.ts`.\n'
  );
  for (const row of glossaryMissingSet.slice(0, 400)) {
    md.push(
      `- **${row.fldGlosId}** (doc \`${row.docId}\`) soft=${row.soft} missing=[${row.missingFields.join(', ')}] setId=\`${row.fldGlossarySetId}\` cat/item/find/rec=\`${row.fldCat}\`/\`${row.fldItem}\`/\`${row.fldFind}\`/\`${row.fldRec}\` labels: ${row.categoryLabel} / ${row.itemLabel} / ${row.findingLabel} / ${row.recommendationLabel}`
    );
  }
  if (glossaryMissingSet.length > 400) {
    md.push(`\n… ${glossaryMissingSet.length - 400} more rows in JSON only.\n`);
  }

  md.push(mainHeader('1b. Glossary rows — fldGlossarySetId not in GLOSSARY_SET_DEFS (active only)'));
  for (const row of glossaryUnknownSetId.slice(0, 200)) {
    md.push(
      `- **${row.fldGlosId}** doc \`${row.docId}\` setId=\`${row.fldGlossarySetId}\` path \`${row.fldCat}\`/\`${row.fldItem}\`/\`${row.fldFind}\`/\`${row.fldRec}\``
    );
  }
  if (glossaryUnknownSetId.length > 200) {
    md.push(`\n… ${glossaryUnknownSetId.length - 200} more in JSON.\n`);
  }

  md.push(mainHeader('2–3. ProjectData — fldData and mismatches'));
  md.push('### fldData issues (blank, missing glossary, glossary row missing set)\n');
  for (const p of pdProblems.slice(0, 300)) {
    md.push(
      `- **${p.fldPDataID}** issue=\`${p.issue}\` fldData=\`${p.fldData}\` resolves=${p.fldDataResolves} glossDoc=\`${p.glossaryDocId}\` rowHasSetId=${p.glossaryRowHasSetId} proj=\`${p.fldPDataProject}\` fac=\`${p.fldFacility}\` loc=\`${p.fldLocation}\` | ${p.projectName} / ${p.facilityName} / ${p.locationName} | findShort=${JSON.stringify(p.fldFindShort)} recShort=${JSON.stringify(p.fldRecShort)}`
    );
  }
  if (pdProblems.length > 300) md.push(`\n… ${pdProblems.length - 300} more in JSON.\n`);

  md.push('\n### ProjectData saved IDs vs glossary row (when both sides present and differ)\n');
  for (const m of pdMismatches.slice(0, 200)) {
    md.push(
      `- **${m.fldPDataID}** soft=${m.soft} differ=[${m.fieldsDiffer.join(', ')}] pData: cat=\`${m.projectData.fldPDataCategoryID}\` item=\`${m.projectData.fldPDataItemID}\` find=\`${m.projectData.fldPDataMasterFindID}\` rec=\`${m.projectData.fldPDataMasterRecID}\` vs glossary \`${m.glossary.docId}\`: cat=\`${m.glossary.fldCat}\` item=\`${m.glossary.fldItem}\` find=\`${m.glossary.fldFind}\` rec=\`${m.glossary.fldRec}\``
    );
  }
  if (pdMismatches.length > 200) md.push(`\n… ${pdMismatches.length - 200} more in JSON.\n`);

  md.push(mainHeader('4. Duplicate glossary paths (same cat|item|find|rec) across sets'));
  for (const g of duplicatePaths.slice(0, 150)) {
    md.push(`- Path \`${g.pathKey}\`: ${g.entries.length} rows`);
    for (const e of g.entries) {
      md.push(
        `  - doc \`${e.glossaryDocId}\` glosId=\`${e.fldGlosId}\` set=\`${e.fldGlossarySetId || '(empty)'}\` name=${JSON.stringify(e.fldGlossarySetName)} soft=${e.soft}`
      );
    }
  }
  if (duplicatePaths.length > 150) md.push(`\n… ${duplicatePaths.length - 150} more groups in JSON.\n`);

  md.push(mainHeader('5. Master findings / recommendations missing fldGlossarySetId (active only)'));
  md.push('Soft-deleted/archived documents excluded from 5a/5b counts.\n');
  for (const f of findingsMissingSet.slice(0, 200)) {
    md.push(`- finding **${f.masterId}** doc \`${f.docId}\` ${JSON.stringify(f.shortLabel)}`);
  }
  if (findingsMissingSet.length > 200) md.push(`\n… ${findingsMissingSet.length - 200} more in JSON.\n`);
  for (const r of recommendationsMissingSet.slice(0, 200)) {
    md.push(`- recommendation **${r.masterId}** doc \`${r.docId}\` ${JSON.stringify(r.shortLabel)}`);
  }
  if (recommendationsMissingSet.length > 200) md.push(`\n… ${recommendationsMissingSet.length - 200} more in JSON.\n`);

  fs.writeFileSync(MD_PATH, md.join('\n'), 'utf-8');

  console.log(`Markdown report: ${MD_PATH}`);
  console.log(`JSON report:     ${JSON_PATH}`);
  console.log('Done. No writes to Firestore.');
}

main().catch((e) => {
  console.error(e);
  printCredentialHelp();
  process.exit(1);
});
