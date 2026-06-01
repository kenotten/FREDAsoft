/**
 * Read-only: deep dive on projectData rows with unresolved_item (glossary.fldItem).
 *
 *   $env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\service-account.json"
 *   npx tsx scripts/diagnostics/diagnose-unresolved-items.ts --ids id1,id2,id3
 */
import fs from 'fs';
import path from 'path';
import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

type Row = Record<string, unknown>;

const DEFAULT_IDS = [
  '1394576c-4d3e-460f-9259-0981768f3652',
  '43975418-5989-442f-b3f4-30131db691f3',
  '5b9215c2-553d-46ec-acc7-4e6705ca4560',
  'b09388db-8241-4602-a292-6a3c9e88a162',
  'ece56a1d-6250-4aa0-836e-063afaf42fc0',
];

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

function findItem(items: Row[], id: unknown): { item?: Row; by: string } {
  const key = normId(id);
  if (!key) return { by: 'empty' };
  for (const i of items) {
    if (normId(i.fldItemID) === key) return { item: i, by: 'fldItemID' };
    if (normId(i.id) === key) return { item: i, by: 'document id' };
  }
  return { by: 'not found' };
}

function parseArgs(argv: string[]): string[] {
  const i = argv.indexOf('--ids');
  if (i >= 0 && argv[i + 1]) {
    return String(argv[i + 1])
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return DEFAULT_IDS;
}

async function load(name: string): Promise<Row[]> {
  const snap = await getFirestore().collection(name).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function main(): Promise<void> {
  const ids = parseArgs(process.argv.slice(2));
  ensureAdminApp();
  console.log('Read-only diagnose-unresolved-items (no Firestore writes)\n');

  const [projectData, glossary, categories, items, locations, facilities, findings] =
    await Promise.all([
      load('projectData'),
      load('glossary'),
      load('categories'),
      load('items'),
      load('locations'),
      load('facilities'),
      load('findings'),
    ]);

  const glossaryByKey = new Map<string, Row>();
  for (const g of glossary) {
    const k1 = normId(g.fldGlosId);
    const k2 = normId(g.id);
    if (k1) glossaryByKey.set(k1, g);
    if (k2) glossaryByKey.set(k2, g);
  }

  const categoryByKey = new Map<string, Row>();
  for (const c of categories) {
    const k1 = normId(c.fldCategoryID);
    const k2 = normId(c.id);
    if (k1) categoryByKey.set(k1, c);
    if (k2) categoryByKey.set(k2, c);
  }

  const findingByKey = new Map<string, Row>();
  for (const f of findings) {
    const k1 = normId(f.fldFindID);
    const k2 = normId(f.id);
    if (k1) findingByKey.set(k1, f);
    if (k2) findingByKey.set(k2, f);
  }

  const facilityByKey = new Map<string, Row>();
  for (const f of facilities) {
    const k = normId(f.fldFacID);
    if (k) facilityByKey.set(k, f);
  }

  const locationByKey = new Map<string, Row>();
  for (const l of locations) {
    const k = normId(l.fldLocID);
    if (k) locationByKey.set(k, l);
  }

  const lines: string[] = [];

  for (const pid of ids) {
    const rec = projectData.find((d) => normId(d.fldPDataID) === normId(pid));
    lines.push(`\n${'='.repeat(72)}`);
    lines.push(`fldPDataID: ${pid}`);
    if (!rec) {
      lines.push('ERROR: projectData row not found');
      continue;
    }

    const fac = facilityByKey.get(normId(rec.fldFacility));
    const loc = locationByKey.get(normId(rec.fldLocation));
    const fldData = String(rec.fldData ?? '').trim();
    const glos = glossaryByKey.get(normId(fldData));
    const badItem = glos ? String(glos.fldItem ?? '').trim() : '';

    lines.push(`facility: ${fac?.fldFacName ?? '?'} [${rec.fldFacility}]`);
    lines.push(`location: ${loc?.fldLocName ?? '?'} [${rec.fldLocation}]`);
    lines.push(`fldFindShort: ${rec.fldFindShort ?? ''}`);
    lines.push(`fldRecShort: ${rec.fldRecShort ?? ''}`);
    lines.push(`fldData: ${fldData}`);

    if (!glos) {
      lines.push('glossary: NOT FOUND');
      continue;
    }

    lines.push(`glossary doc id: ${glos.id}`);
    lines.push(`fldGlosId: ${glos.fldGlosId ?? ''}`);
    lines.push(`fldGlossarySetId: ${glos.fldGlossarySetId ?? ''}`);
    lines.push(`fldGlossarySetName: ${glos.fldGlossarySetName ?? ''}`);
    lines.push(`fldCat: ${glos.fldCat ?? ''}`);
    lines.push(`fldItem (bad): ${badItem}`);
    lines.push(`fldFind: ${glos.fldFind ?? ''}`);
    lines.push(`fldRec: ${glos.fldRec ?? ''}`);
    lines.push(`fldRecID: ${glos.fldRecID ?? ''}`);
    lines.push(`fldDeleted: ${glos.fldDeleted ?? false} fldIsDeleted: ${glos.fldIsDeleted ?? false}`);

    const cat = categoryByKey.get(normId(glos.fldCat));
    lines.push(
      `category: ${cat?.fldCategoryName ?? '(unresolved)'} [${glos.fldCat}] deleted=${Boolean(cat?.fldDeleted || cat?.fldIsDeleted)}`
    );

    const itemLookup = findItem(items, badItem);
    lines.push(`item lookup (bad id): ${itemLookup.by}${itemLookup.item ? ` → ${itemLookup.item.fldItemName}` : ''}`);

    const findKey = normId(glos.fldFind);
    const masterFind = findingByKey.get(findKey);
    if (masterFind) {
      lines.push(
        `master finding: ${masterFind.fldFindShort ?? ''} | finding.fldItem=${masterFind.fldItem ?? ''}`
      );
      const itemFromFind = findItem(items, masterFind.fldItem);
      if (itemFromFind.item) {
        lines.push(
          `→ item from finding.fldItem: ${itemFromFind.item.fldItemName} [${itemFromFind.item.fldItemID ?? itemFromFind.item.id}] (via ${itemFromFind.by})`
        );
      }
    } else {
      lines.push('master finding: NOT FOUND');
    }

    const siblings = glossary.filter(
      (g) =>
        normId(g.fldFind) === findKey &&
        normId(g.fldCat) === normId(glos.fldCat) &&
        normId(g.fldItem) !== normId(badItem) &&
        findItem(items, g.fldItem).item
    );
    if (siblings.length) {
      lines.push('sibling glossary rows (same cat+find, valid item):');
      const seen = new Set<string>();
      for (const s of siblings) {
        const iid = normId(s.fldItem);
        if (seen.has(iid)) continue;
        seen.add(iid);
        const it = findItem(items, s.fldItem).item!;
        lines.push(`  - ${it.fldItemName} [${it.fldItemID ?? it.id}] (glossary ${s.fldGlosId ?? s.id})`);
      }
    }

    const catItems = items.filter((i) => normId(i.fldCatID) === normId(glos.fldCat));
    const typos: { id: string; name: string; dist: number }[] = [];
    for (const i of catItems) {
      const iid = normId(i.fldItemID || i.id);
      const d = levenshtein(normId(badItem), iid);
      if (d <= 3) typos.push({ id: String(i.fldItemID || i.id), name: String(i.fldItemName ?? ''), dist: d });
    }
    if (typos.length) {
      lines.push('typo candidates (same category, edit distance ≤3):');
      for (const t of typos.sort((a, b) => a.dist - b.dist)) {
        lines.push(`  - ${t.name} [${t.id}] dist=${t.dist}`);
      }
    }
  }

  const text = lines.join('\n');
  console.log(text);
  const outDir = path.join(process.cwd(), 'reports', 'diagnostics');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `unresolved-items-${Date.now()}.txt`);
  fs.writeFileSync(outPath, text, 'utf-8');
  console.log(`\nWrote ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
