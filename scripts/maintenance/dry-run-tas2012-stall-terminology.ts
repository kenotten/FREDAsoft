/**
 * DRY RUN ONLY — stall → compartment terminology in TAS 2012 Toilet Rooms / Bathing Rooms.
 *
 * No Firestore writes. Outputs:
 *   - reports/tas2012-stall-terminology-dry-run.md
 *   - reports/tas2012-stall-terminology-dry-run.json
 *
 * Credentials (same as report-glossary-integrity.ts):
 *
 *   PowerShell:
 *     $env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\service-account.json"
 *     npx tsx scripts/maintenance/dry-run-tas2012-stall-terminology.ts
 *
 * Optional:
 *     $env:FIREBASE_PROJECT_ID="your-project-id"
 */
import fs from 'fs';
import path from 'path';
import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import {
  collectTas2012StallTerminologyReplacements,
  summarizeReplacements,
  TAS_2012_ID,
  TARGET_CATEGORY_NAMES,
  type ProposedReplacement,
} from './tas2012StallTerminologyScan.ts';

export { replaceStallTerminologyInText } from './tas2012StallTerminologyScan.ts';

const REPORT_DIR = path.join(process.cwd(), 'reports');
const MD_PATH = path.join(REPORT_DIR, 'tas2012-stall-terminology-dry-run.md');
const JSON_PATH = path.join(REPORT_DIR, 'tas2012-stall-terminology-dry-run.json');

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

function buildDryRunMarkdown(
  proposed: ProposedReplacement[],
  excluded: { reason: string; collection: string; documentId: string; fieldPath: string; excerpt: string }[],
  targetCategoryList: string[]
): string {
  const activeProposed = proposed.filter((p) => !p.excludedFromWrite);
  const { byCollection, byField, byCategory, bySource } = summarizeReplacements(proposed);

  let md = `# TAS 2012 Stall → Compartment Terminology (DRY RUN)

**Status:** DRY RUN ONLY — no Firestore writes performed.

### Scope rules

- Glossary set: \`TAS_2012\` / TAS 2012 via \`resolveGlossarySetForRecord\` (id → name → type/version).
- Categories: **Toilet Rooms**, **Bathing Rooms** (by \`fldCategoryName\`, case-insensitive).
- Whole-word replacement only: \\bstalls\\b / \\bstall\\b.
- **Excluded:** \`standards\` / official citation \`content_text\`; UFAS and other sets; other categories.
- **Default writes exclude:** soft-deleted/archived rows; ambiguous \`fldCitation\` (use apply script \`--include-ambiguous\` if approved).

### Resolved target categories

${targetCategoryList.length ? targetCategoryList.map((l) => `- ${l}`).join('\n') : '- *(none found in Firestore — verify category names)*'}

### Summary counts

| Metric | Count |
|--------|------:|
| Total proposed field replacements | ${proposed.length} |
| Active (would write by default) | ${activeProposed.length} |
| Deleted/archived (reported, excluded from default writes) | ${proposed.filter((p) => p.excludedFromWrite).length} |
| Ambiguous (\`fldCitation\`, excluded from default apply) | ${proposed.filter((p) => p.matchQuality === 'ambiguous').length} |
| Out-of-scope stall hits (excluded) | ${excluded.length} |

#### By collection

${Object.entries(byCollection)
  .sort((a, b) => b[1] - a[1])
  .map(([k, v]) => `- ${k}: ${v}`)
  .join('\n') || '- (none)'}

#### By field

${Object.entries(byField)
  .sort((a, b) => b[1] - a[1])
  .map(([k, v]) => `- ${k}: ${v}`)
  .join('\n') || '- (none)'}

#### By category

${Object.entries(byCategory)
  .sort((a, b) => b[1] - a[1])
  .map(([k, v]) => `- ${k}: ${v}`)
  .join('\n') || '- (none)'}

#### By source type

${Object.entries(bySource)
  .sort((a, b) => b[1] - a[1])
  .map(([k, v]) => `- ${k}: ${v}`)
  .join('\n') || '- (none)'}

`;

  md += mainHeader('Proposed replacements (detail)');
  md += '| Collection | Doc ID | Field | Set | Category | Source | Active | Quality | Current excerpt | Proposed excerpt |\n';
  md += '|------------|--------|-------|-----|----------|--------|--------|---------|-----------------|------------------|\n';

  for (const p of proposed) {
    const esc = (s: string) => s.replace(/\|/g, '\\|').replace(/\n/g, ' ');
    md += `| ${p.collection} | ${esc(p.documentId)} | ${p.fieldPath} | ${esc(p.resolvedGlossarySet)} | ${esc(p.resolvedCategory)} | ${p.sourceType} | ${p.active ? 'yes' : 'no'} | ${p.matchQuality} | ${esc(p.currentExcerpt)} | ${esc(p.proposedExcerpt)} |\n`;
  }

  if (excluded.length) {
    md += mainHeader('Excluded matches (not proposed for write)');
    for (const e of excluded.slice(0, 100)) {
      md += `- **${e.collection}** / \`${e.documentId}\` / ${e.fieldPath}: ${e.reason}${e.excerpt ? ` — "${e.excerpt}"` : ''}\n`;
    }
    if (excluded.length > 100) md += `\n*…and ${excluded.length - 100} more.*\n`;
  }

  md += `\n---\n\n**Next step:** Run \`npx tsx scripts/maintenance/apply-tas2012-stall-terminology.ts --write\` after approval.\n`;
  return md;
}

async function main() {
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.log(
      'Note: GOOGLE_APPLICATION_CREDENTIALS is not set. Using Application Default Credentials if available.\n'
    );
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
  const activeProposed = proposed.filter((p) => !p.excludedFromWrite);
  const { byCollection, byField, byCategory, bySource } = summarizeReplacements(proposed);

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(MD_PATH, buildDryRunMarkdown(proposed, excluded, targetCategoryList), 'utf-8');
  fs.writeFileSync(
    JSON_PATH,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        mode: 'dry_run',
        scope: {
          glossarySet: TAS_2012_ID,
          categories: [...TARGET_CATEGORY_NAMES],
          targetCategoryIds: [...targetCategoryIds],
          scopedItemCount,
        },
        summary: {
          totalProposed: proposed.length,
          activeProposed: activeProposed.length,
          excludedOutOfScope: excluded.length,
          byCollection,
          byField,
          byCategory,
          bySource,
        },
        proposed,
        excluded,
      },
      null,
      2
    ),
    'utf-8'
  );

  console.log('Dry run complete.');
  console.log(`  Proposed replacements: ${proposed.length} (${activeProposed.length} active)`);
  console.log(`  Excluded out-of-scope hits: ${excluded.length}`);
  console.log(`  Markdown: ${MD_PATH}`);
  console.log(`  JSON:   ${JSON_PATH}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
