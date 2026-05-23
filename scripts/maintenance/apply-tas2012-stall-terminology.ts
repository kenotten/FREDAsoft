/**
 * Apply TAS 2012 stall → compartment terminology (Toilet Rooms / Bathing Rooms).
 *
 * Default: DRY RUN ONLY (no Firestore writes).
 *
 *   PowerShell:
 *     $env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\service-account.json"
 *     npx tsx scripts/maintenance/apply-tas2012-stall-terminology.ts
 *     npx tsx scripts/maintenance/apply-tas2012-stall-terminology.ts --write
 *
 * Optional:
 *     --include-ambiguous   Also update recommendations.fldCitation (not default)
 *     --include-deleted     Also update soft-deleted/archived rows (not default)
 *
 * Reports (gitignored under reports/):
 *   - tas2012-stall-terminology-write-report.md
 *   - tas2012-stall-terminology-write-report.json
 */
import fs from 'fs';
import path from 'path';
import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import {
  collectTas2012StallTerminologyReplacements,
  groupPatchesForWrite,
  isEligibleForWrite,
  replaceStallTerminologyInText,
  summarizeReplacements,
  TAS_2012_ID,
  TARGET_CATEGORY_NAMES,
  type ProposedReplacement,
  type WriteEligibilityOptions,
} from './tas2012StallTerminologyScan.ts';

const BATCH_LIMIT = 450;
const REPORT_DIR = path.join(process.cwd(), 'reports');
const MD_PATH = path.join(REPORT_DIR, 'tas2012-stall-terminology-write-report.md');
const JSON_PATH = path.join(REPORT_DIR, 'tas2012-stall-terminology-write-report.json');

type AppliedUpdate = {
  collection: string;
  documentId: string;
  fieldPath: string;
  status: 'updated' | 'skipped_unchanged' | 'skipped_conflict';
  reason?: string;
};

function parseArgs(argv: string[]) {
  return {
    write: argv.includes('--write'),
    includeAmbiguous: argv.includes('--include-ambiguous'),
    includeDeleted: argv.includes('--include-deleted'),
  };
}

function printCredentialHelp(): void {
  console.error(`
Firebase Admin could not initialize or access Firestore.

Set GOOGLE_APPLICATION_CREDENTIALS to a service account JSON path (do not commit the JSON).
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

function mainHeader(title: string): string {
  return `\n## ${title}\n\n`;
}

function buildReportMarkdown(input: {
  mode: 'dry_run' | 'write';
  proposed: ProposedReplacement[];
  eligible: ProposedReplacement[];
  skipped: { row: ProposedReplacement; reason: string }[];
  applied: AppliedUpdate[];
  targetCategoryList: string[];
  documentsUpdated: number;
  fieldsUpdated: number;
  writeOptions: WriteEligibilityOptions;
}): string {
  const {
    mode,
    proposed,
    eligible,
    skipped,
    applied,
    targetCategoryList,
    documentsUpdated,
    fieldsUpdated,
    writeOptions,
  } = input;

  const statusLine =
    mode === 'write'
      ? '**Status:** WRITE COMPLETED — Firestore documents updated.'
      : '**Status:** DRY RUN ONLY — no Firestore writes performed. Pass `--write` to apply.';

  const { byCollection, byField, byCategory, bySource } = summarizeReplacements(eligible);

  let md = `# TAS 2012 Stall → Compartment Terminology (Apply)

${statusLine}

### Write options

- \`--write\`: ${mode === 'write' ? 'yes' : 'no'}
- \`--include-ambiguous\` (fldCitation): ${writeOptions.includeAmbiguous ? 'yes' : 'no'}
- \`--include-deleted\`: ${writeOptions.includeDeleted ? 'yes' : 'no'}

### Resolved target categories

${targetCategoryList.length ? targetCategoryList.map((l) => `- ${l}`).join('\n') : '- *(none)*'}

### Summary

| Metric | Count |
|--------|------:|
| Total scanned replacements | ${proposed.length} |
| Eligible for ${mode === 'write' ? 'write' : 'would-write'} | ${eligible.length} |
| Skipped (ineligible) | ${skipped.length} |
| Documents ${mode === 'write' ? 'updated' : 'that would update'} | ${documentsUpdated} |
| Fields ${mode === 'write' ? 'updated' : 'that would update'} | ${fieldsUpdated} |

#### Eligible by collection

${Object.entries(byCollection)
  .sort((a, b) => b[1] - a[1])
  .map(([k, v]) => `- ${k}: ${v}`)
  .join('\n') || '- (none)'}

#### Eligible by field

${Object.entries(byField)
  .sort((a, b) => b[1] - a[1])
  .map(([k, v]) => `- ${k}: ${v}`)
  .join('\n') || '- (none)'}

`;

  if (skipped.length) {
    md += mainHeader('Skipped (not written)');
    for (const s of skipped.slice(0, 80)) {
      md += `- **${s.row.collection}** / \`${s.row.documentId}\` / ${s.row.fieldPath}: ${s.reason}\n`;
    }
    if (skipped.length > 80) md += `\n*…and ${skipped.length - 80} more.*\n`;
  }

  md += mainHeader('Eligible replacements');
  md += '| Collection | Doc ID | Field | Category | Quality | Current excerpt | Proposed excerpt |\n';
  md += '|------------|--------|-------|----------|---------|-----------------|------------------|\n';
  for (const p of eligible) {
    const esc = (s: string) => s.replace(/\|/g, '\\|').replace(/\n/g, ' ');
    md += `| ${p.collection} | ${esc(p.documentId)} | ${p.fieldPath} | ${esc(p.resolvedCategory)} | ${p.matchQuality} | ${esc(p.currentExcerpt)} | ${esc(p.proposedExcerpt)} |\n`;
  }

  if (mode === 'write' && applied.length) {
    md += mainHeader('Apply results');
    const updated = applied.filter((a) => a.status === 'updated');
    const notUpdated = applied.filter((a) => a.status !== 'updated');
    md += `- Updated: ${updated.length} field(s)\n`;
    md += `- Skipped at apply time: ${notUpdated.length}\n\n`;
    for (const a of applied.slice(0, 100)) {
      md += `- ${a.collection}/${a.documentId} \`${a.fieldPath}\`: **${a.status}**${a.reason ? ` — ${a.reason}` : ''}\n`;
    }
    if (applied.length > 100) md += `\n*…and ${applied.length - 100} more.*\n`;
  }

  return md;
}

async function applyPatches(
  db: Firestore,
  eligible: ProposedReplacement[]
): Promise<{ applied: AppliedUpdate[]; documentsUpdated: number; fieldsUpdated: number }> {
  const grouped = groupPatchesForWrite(eligible);
  const eligibleByKey = new Map<string, ProposedReplacement>();
  for (const row of eligible) {
    eligibleByKey.set(`${row.collection}/${row.documentId}/${row.fieldPath}`, row);
  }

  const applied: AppliedUpdate[] = [];
  let fieldsUpdated = 0;

  const entries = [...grouped.values()];
  for (let i = 0; i < entries.length; i += BATCH_LIMIT) {
    const chunk = entries.slice(i, i + BATCH_LIMIT);
    const batch = db.batch();
    let batchOps = 0;

    for (const entry of chunk) {
      const ref = db.collection(entry.collection).doc(entry.documentId);
      const snap = await ref.get();
      if (!snap.exists) {
        for (const fieldPath of Object.keys(entry.fields)) {
          applied.push({
            collection: entry.collection,
            documentId: entry.documentId,
            fieldPath,
            status: 'skipped_conflict',
            reason: 'document missing',
          });
        }
        continue;
      }

      const live = snap.data() as Record<string, unknown>;
      const patch: Record<string, string> = {};

      for (const [fieldPath, proposedValue] of Object.entries(entry.fields)) {
        const expected = eligibleByKey.get(
          `${entry.collection}/${entry.documentId}/${fieldPath}`
        );
        if (!expected) continue;

        const liveValue = String(live[fieldPath] ?? '');

        if (liveValue !== expected.currentValue) {
          const { next, changed } = replaceStallTerminologyInText(liveValue);
          if (!changed) {
            applied.push({
              collection: entry.collection,
              documentId: entry.documentId,
              fieldPath,
              status: 'skipped_unchanged',
              reason: 'live value changed and no longer contains stall terminology',
            });
            continue;
          }
          patch[fieldPath] = next;
          applied.push({
            collection: entry.collection,
            documentId: entry.documentId,
            fieldPath,
            status: 'updated',
            reason: 'live value differed from scan; applied replacement to current text',
          });
          fieldsUpdated += 1;
          continue;
        }

        if (liveValue === proposedValue) {
          applied.push({
            collection: entry.collection,
            documentId: entry.documentId,
            fieldPath,
            status: 'skipped_unchanged',
            reason: 'already has proposed value',
          });
          continue;
        }

        patch[fieldPath] = proposedValue;
        applied.push({
          collection: entry.collection,
          documentId: entry.documentId,
          fieldPath,
          status: 'updated',
        });
        fieldsUpdated += 1;
      }

      if (Object.keys(patch).length > 0) {
        batch.update(ref, patch);
        batchOps += 1;
      }
    }

    if (batchOps > 0) {
      await batch.commit();
    }
  }

  const documentsUpdated = new Set(
    applied.filter((a) => a.status === 'updated').map((a) => `${a.collection}/${a.documentId}`)
  ).size;

  return { applied, documentsUpdated, fieldsUpdated };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const writeOptions: WriteEligibilityOptions = {
    includeAmbiguous: args.includeAmbiguous,
    includeDeleted: args.includeDeleted,
  };

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.log(
      'Note: GOOGLE_APPLICATION_CREDENTIALS is not set. Using Application Default Credentials if available.\n'
    );
  }

  if (!args.write) {
    console.log('DRY RUN ONLY — no Firestore writes. Pass --write to apply.\n');
  } else {
    console.log('WRITE MODE — applying eligible patches to Firestore.\n');
  }

  ensureAdminApp();
  const db = getFirestore();

  let scan;
  try {
    scan = await collectTas2012StallTerminologyReplacements(db);
  } catch (e: unknown) {
    console.error('Failed to read collections.', e);
    printCredentialHelp();
    process.exit(1);
  }

  const { proposed, excluded, targetCategoryIds, scopedItemCount, targetCategoryList } = scan;

  const eligible: ProposedReplacement[] = [];
  const skipped: { row: ProposedReplacement; reason: string }[] = [];

  for (const row of proposed) {
    if (isEligibleForWrite(row, writeOptions)) {
      eligible.push(row);
    } else {
      let reason = 'ineligible';
      if (row.excludedFromWrite && !writeOptions.includeDeleted) {
        reason = 'soft-deleted/archived (excluded unless --include-deleted)';
      } else if (row.matchQuality === 'ambiguous' || row.fieldPath === 'fldCitation') {
        reason = 'ambiguous fldCitation (excluded unless --include-ambiguous)';
      }
      skipped.push({ row, reason });
    }
  }

  let applied: AppliedUpdate[] = [];
  let documentsUpdated = new Set(eligible.map((e) => `${e.collection}/${e.documentId}`)).size;
  let fieldsUpdated = eligible.length;

  if (args.write) {
    const result = await applyPatches(db, eligible);
    applied = result.applied;
    documentsUpdated = result.documentsUpdated;
    fieldsUpdated = result.fieldsUpdated;
  }

  const mode = args.write ? 'write' : 'dry_run';
  const md = buildReportMarkdown({
    mode,
    proposed,
    eligible,
    skipped,
    applied,
    targetCategoryList,
    documentsUpdated,
    fieldsUpdated,
    writeOptions,
  });

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(MD_PATH, md, 'utf-8');
  fs.writeFileSync(
    JSON_PATH,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        mode,
        writeOptions,
        scope: {
          glossarySet: TAS_2012_ID,
          categories: [...TARGET_CATEGORY_NAMES],
          targetCategoryIds: [...targetCategoryIds],
          scopedItemCount,
        },
        summary: {
          totalScanned: proposed.length,
          eligible: eligible.length,
          skippedIneligible: skipped.length,
          excludedOutOfScope: excluded.length,
          documentsUpdated,
          fieldsUpdated,
          ...(() => {
            const s = summarizeReplacements(eligible);
            return {
              byCollection: s.byCollection,
              byField: s.byField,
              byCategory: s.byCategory,
              bySource: s.bySource,
            };
          })(),
        },
        eligible,
        skipped,
        applied: args.write ? applied : [],
        excluded,
      },
      null,
      2
    ),
    'utf-8'
  );

  console.log(args.write ? 'Write pass complete.' : 'Dry run complete (apply preview).');
  console.log(`  Scanned replacements: ${proposed.length}`);
  console.log(`  Eligible: ${eligible.length}`);
  console.log(`  Skipped ineligible: ${skipped.length}`);
  if (args.write) {
    console.log(`  Documents updated: ${documentsUpdated}`);
    console.log(`  Fields updated: ${fieldsUpdated}`);
  } else {
    console.log(`  Would update documents: ${documentsUpdated}`);
    console.log(`  Would update fields: ${fieldsUpdated}`);
  }
  console.log(`  Markdown: ${MD_PATH}`);
  console.log(`  JSON:   ${JSON_PATH}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
