/**
 * Read-only: investigate orphan item ID 5d776a9b-d275-4859-8cf9-d0a732e1fc3d
 *
 *   $env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\service-account.json"
 *   npx tsx scripts/diagnostics/investigate-bad-item-id.ts
 */
import fs from 'fs';
import path from 'path';
import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const BAD_ITEM = '5d776a9b-d275-4859-8cf9-d0a732e1fc3d';
const CAT_ID = '2b83d253-9c45-4089-ad42-ab4d6f0f2346';
const FINDINGS = [
  '531893bc-1023-4e15-9742-dd9763d25b94',
  '7f86fbc8-e9b8-4ccb-be0c-3b728910955c',
];
const GLOSSARY_DOCS = [
  'c58ad716-79e8-4c6c-8d7b-bd887592a4ea',
  '6220848c-928c-4667-b489-a74f96c03e73',
  '1b7de5c5-98c7-4ffd-8415-8e392f988bd6',
];

type Row = Record<string, unknown>;

function normId(v: unknown): string {
  return String(v ?? '').trim().toLowerCase();
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
  initializeApp({
    credential: applicationDefault(),
    ...(resolveProjectId() ? { projectId: resolveProjectId() } : {}),
  });
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

function findItem(items: Row[], id: unknown): Row | undefined {
  const key = normId(id);
  return items.find((i) => normId(i.fldItemID) === key || normId(i.id) === key);
}

function row(id: string, data: Row | undefined): string {
  if (!data) return `${id}: NOT FOUND`;
  return JSON.stringify(data, null, 2);
}

async function loadAll(name: string): Promise<Row[]> {
  const snap = await getFirestore().collection(name).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function main(): Promise<void> {
  ensureAdminApp();
  const lines: string[] = ['Read-only investigate-bad-item-id', `Bad item: ${BAD_ITEM}`, ''];

  const [items, findings, glossary, projectData] = await Promise.all([
    loadAll('items'),
    loadAll('findings'),
    loadAll('glossary'),
    loadAll('projectData'),
  ]);

  lines.push('=== 1. ITEM SEARCH FOR BAD ID ===');
  const byDoc = items.find((i) => normId(i.id) === normId(BAD_ITEM));
  const byFld = items.find((i) => normId(i.fldItemID) === normId(BAD_ITEM));
  lines.push(`document id match: ${byDoc ? 'YES (deleted=' + Boolean(byDoc.fldDeleted || byDoc.fldIsDeleted) + ')' : 'NO'}`);
  if (byDoc) lines.push(row('item-doc', byDoc));
  lines.push(`fldItemID match: ${byFld ? 'YES' : 'NO'}`);
  if (byFld && byFld !== byDoc) lines.push(row('item-fld', byFld));

  const nameHits = items.filter((i) => {
    const n = String(i.fldItemName ?? '').toLowerCase();
    return n.includes('general') || n === 'general';
  });
  lines.push(`\nItems named "General" (any category): ${nameHits.length}`);
  for (const i of nameHits) {
    lines.push(
      `  - ${i.fldItemName} fldItemID=${i.fldItemID} doc=${i.id} fldCatID=${i.fldCatID} deleted=${Boolean(i.fldDeleted || i.fldIsDeleted)}`
    );
  }

  const catItems = items.filter((i) => normId(i.fldCatID) === normId(CAT_ID));
  const activeCatItems = catItems.filter((i) => !i.fldDeleted && !i.fldIsDeleted);
  lines.push(`\n=== 4. ITEMS UNDER TOILET & BATHING ROOMS (${CAT_ID}) ===`);
  lines.push(`total: ${catItems.length} active: ${activeCatItems.length}`);
  for (const i of [...activeCatItems].sort((a, b) =>
    String(a.fldItemName ?? '').localeCompare(String(b.fldItemName ?? ''))
  )) {
    lines.push(
      `  ${i.fldItemName} | fldItemID=${i.fldItemID} | doc=${i.id} | deleted=${Boolean(i.fldDeleted || i.fldIsDeleted)}`
    );
  }

  const typos = activeCatItems
    .map((i) => ({
      i,
      dist: levenshtein(normId(BAD_ITEM), normId(i.fldItemID || i.id)),
    }))
    .filter((x) => x.dist <= 4)
    .sort((a, b) => a.dist - b.dist);
  lines.push('\nEdit-distance typo candidates (active, same category, dist≤4):');
  if (typos.length === 0) lines.push('  (none)');
  for (const { i, dist } of typos) {
    lines.push(`  dist=${dist} ${i.fldItemName} [${i.fldItemID}]`);
  }

  lines.push('\n=== 2. AFFECTED FINDINGS ===');
  for (const fid of FINDINGS) {
    const f =
      findings.find((x) => normId(x.fldFindID) === normId(fid)) ||
      findings.find((x) => normId(x.id) === normId(fid));
    lines.push(`\n--- finding ${fid} ---`);
    if (!f) {
      lines.push('NOT FOUND');
      continue;
    }
    lines.push(`fldFindShort: ${f.fldFindShort ?? ''}`);
    lines.push(`fldFindLong: ${String(f.fldFindLong ?? '').slice(0, 200)}`);
    lines.push(`fldItem: ${f.fldItem ?? ''}`);
    lines.push(`fldCatID: ${f.fldCatID ?? '(unset)'}`);
    lines.push(`fldDeleted: ${f.fldDeleted ?? false} fldIsDeleted: ${f.fldIsDeleted ?? false}`);
    lines.push(`fldStandards: ${JSON.stringify(f.fldStandards ?? [])}`);
    lines.push(`fldGlossarySetId: ${f.fldGlossarySetId ?? '(unset)'}`);
  }

  lines.push('\n=== 3. AFFECTED GLOSSARY DOCS ===');
  for (const gid of GLOSSARY_DOCS) {
    const g = glossary.find((x) => normId(x.id) === normId(gid));
    lines.push(`\n--- glossary ${gid} ---`);
    if (!g) {
      lines.push('NOT FOUND');
      continue;
    }
    lines.push(`fldGlosId: ${g.fldGlosId ?? ''}`);
    lines.push(`fldCat: ${g.fldCat ?? ''}`);
    lines.push(`fldItem: ${g.fldItem ?? ''}`);
    lines.push(`fldFind: ${g.fldFind ?? ''}`);
    lines.push(`fldRec: ${g.fldRec ?? ''} fldRecID: ${g.fldRecID ?? ''}`);
    lines.push(`fldGlossarySetId: ${g.fldGlossarySetId ?? ''} name: ${g.fldGlossarySetName ?? ''}`);
    lines.push(`fldDeleted: ${g.fldDeleted ?? false} fldIsDeleted: ${g.fldIsDeleted ?? false}`);
    const pd = projectData.filter((d) => normId(d.fldData) === normId(g.fldGlosId || g.id));
    if (pd.length) {
      lines.push(`linked projectData (${pd.length}):`);
      for (const d of pd.slice(0, 5)) {
        lines.push(`  ${d.fldPDataID} findShort=${d.fldFindShort ?? ''} recShort=${d.fldRecShort ?? ''}`);
      }
    }
  }

  lines.push('\n=== 5. SIBLING GLOSSARY ROWS (same finding, valid item) ===');
  for (const fid of FINDINGS) {
    lines.push(`\nFinding ${fid}:`);
    const siblings = glossary.filter((g) => normId(g.fldFind) === normId(fid));
    lines.push(`  total glossary rows: ${siblings.length}`);
    const valid: Row[] = [];
    for (const g of siblings) {
      const it = findItem(items, g.fldItem);
      if (it) valid.push(g);
    }
    lines.push(`  rows with resolvable fldItem: ${valid.length}`);
    const seen = new Set<string>();
    for (const g of valid) {
      const it = findItem(items, g.fldItem)!;
      const key = normId(it.fldItemID || it.id);
      if (seen.has(key)) continue;
      seen.add(key);
      lines.push(
        `  VALID: glossary ${g.id} → item "${it.fldItemName}" [${it.fldItemID}] cat=${it.fldCatID}`
      );
    }
    if (valid.length === 0) {
      lines.push('  (no valid siblings — infer from finding text + category items)');
    }
  }

  lines.push('\n=== 6. ALL GLOSSARY ROWS USING BAD fldItem ===');
  const badGlos = glossary.filter((g) => normId(g.fldItem) === normId(BAD_ITEM));
  lines.push(`count: ${badGlos.length}`);
  for (const g of badGlos) {
    const it = findItem(items, g.fldItem);
    lines.push(
      `  glos ${g.id} find=${g.fldFind} rec=${g.fldRec || g.fldRecID} itemResolves=${!!it}`
    );
  }

  const text = lines.join('\n');
  console.log(text);
  const outDir = path.join(process.cwd(), 'reports', 'diagnostics');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `investigate-bad-item-${Date.now()}.txt`);
  fs.writeFileSync(outPath, text, 'utf-8');
  console.log(`\nWrote ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
