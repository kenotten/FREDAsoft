/**
 * Read-only: compare two projectData records (Data Entry nav #5 vs #6 or explicit fldPDataID).
 *
 * No Firestore writes. Requires Firebase Admin credentials (local only, do not commit keys).
 *
 * Usage:
 *   PowerShell:
 *     $env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\service-account.json"
 *     npx tsx scripts/diagnostics/compare-data-entry-records.ts --record5 <fldPDataID> --record6 <fldPDataID>
 *
 *   Or resolve nav positions (1-based) within project + facility:
 *     npx tsx scripts/diagnostics/compare-data-entry-records.ts --project <fldProjID> --facility <fldFacID> --nav5 5 --nav6 6
 *
 * Optional:
 *     $env:FIREBASE_PROJECT_ID="path-recovery"
 */
import fs from 'fs';
import path from 'path';
import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

type Row = Record<string, unknown>;

function printCredentialHelp(): void {
  console.error(`
Firebase Admin could not initialize. Set GOOGLE_APPLICATION_CREDENTIALS to a service account JSON (do not commit).

  PowerShell:
    $env:GOOGLE_APPLICATION_CREDENTIALS="C:\\path\\to\\service-account.json"
    npx tsx scripts/diagnostics/compare-data-entry-records.ts --record5 <id> --record6 <id>
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

function normId(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

function compareEntities(a: Row | undefined, b: Row | undefined, field: string): number {
  const orderA =
    a?.fldOrder === null || a?.fldOrder === undefined || a?.fldOrder === '' ? 999 : Number(a.fldOrder);
  const orderB =
    b?.fldOrder === null || b?.fldOrder === undefined || b?.fldOrder === '' ? 999 : Number(b.fldOrder);
  if (orderA !== orderB) return orderA - orderB;
  const nameA = String(a?.[field] ?? '').toLowerCase();
  const nameB = String(b?.[field] ?? '').toLowerCase();
  return nameA.localeCompare(nameB);
}

function getGlossaryContextForNav(d: Row, glossary: Row[]): Row | null {
  if (!String(d.fldData ?? '').trim()) return null;
  const cleanKey = normId(d.fldData);
  return (
    glossary.find((g) => {
      const byGlos = normId(g.fldGlosId) === cleanKey;
      const byId = normId(g.id) === cleanKey;
      return byGlos || byId;
    }) ?? null
  );
}

function isCustomProjectDataRecord(rec: Row): boolean {
  const fldDataBlank = !String(rec.fldData ?? '').trim();
  const hasPDataCatItem =
    !!String(rec.fldPDataCategoryID ?? '').trim() && !!String(rec.fldPDataItemID ?? '').trim();
  return rec.fldRecordSource === 'custom' || (fldDataBlank && hasPDataCatItem);
}

function getRecordContextForNav(d: Row, glossary: Row[]) {
  const glos = getGlossaryContextForNav(d, glossary);
  if (glos) {
    return {
      catId: String(glos.fldCat ?? '').trim() || 'uncategorized',
      itemId: String(glos.fldItem ?? '').trim() || 'unspecified-item',
    };
  }
  if (d.fldRecordSource === 'custom') {
    return {
      catId: String(d.fldPDataCategoryID ?? '').trim() || 'uncategorized',
      itemId: String(d.fldPDataItemID ?? '').trim() || 'unspecified-item',
    };
  }
  return { catId: 'uncategorized', itemId: 'unspecified-item' };
}

function getCategoryId(category: Row | undefined): string {
  if (!category) return '';
  return String(category.fldCategoryID ?? category.id ?? '').trim();
}

function findCategoryById(categories: Row[], id: unknown): Row | undefined {
  const key = normId(id);
  if (!key) return undefined;
  return categories.find(
    (c) => normId(getCategoryId(c)) === key || normId(c.id) === key
  );
}

function findGlossaryRow(glossary: Row[], fldData: unknown): Row | undefined {
  const key = normId(fldData);
  if (!key) return undefined;
  return glossary.find((g) => normId(g.fldGlosId) === key || normId(g.id) === key);
}

function findItemById(items: Row[], id: unknown): Row | undefined {
  const key = normId(id);
  if (!key) return undefined;
  return items.find((i) => normId(i.fldItemID) === key || normId(i.id) === key);
}

function charDiag(value: unknown): string {
  const s = String(value ?? '');
  if (!s) return '(empty)';
  const codes = [...s].slice(0, 40).map((c) => c.charCodeAt(0)).join(',');
  return `len=${s.length} codes=[${codes}]`;
}

function simulateHydrationCategoryId(rec: Row, glossary: Row[], baseCategoryId = ''): {
  isCustom: boolean;
  glosFound: boolean;
  categoryId: string;
  source: string;
} {
  const isCustom = isCustomProjectDataRecord(rec);
  if (isCustom) {
    const cid = String(rec.fldPDataCategoryID ?? '').trim() || baseCategoryId || '';
    return { isCustom: true, glosFound: false, categoryId: cid, source: 'fldPDataCategoryID (custom)' };
  }
  const targetId = normId(rec.fldData);
  const glos = glossary.find(
    (g) => normId(g.id) === targetId || normId(g.fldGlosId) === targetId
  );
  const cid =
    String(glos?.fldCat ?? '').trim() ||
    String(rec.fldPDataCategoryID ?? '').trim() ||
    baseCategoryId ||
    '';
  let source = 'none';
  if (glos?.fldCat) source = 'glossary.fldCat';
  else if (rec.fldPDataCategoryID) source = 'fldPDataCategoryID fallback';
  else if (baseCategoryId) source = 'baseSelections.categoryId fallback';
  return { isCustom: false, glosFound: !!glos, categoryId: cid, source };
}

function simulateDropdownMatch(
  categoryId: string,
  activeCategories: Row[],
  allCategories: Row[]
): {
  inActiveCategories: boolean;
  inAllCategories: boolean;
  optionValueActive: string | null;
  optionValueAll: string | null;
  wouldInjectResolvable: boolean;
} {
  const cid = normId(categoryId);
  const active = findCategoryById(activeCategories, cid);
  const all = findCategoryById(allCategories, cid);
  return {
    inActiveCategories: !!active,
    inAllCategories: !!all,
    optionValueActive: active ? getCategoryId(active) : null,
    optionValueAll: all ? getCategoryId(all) : null,
    wouldInjectResolvable: !!cid && !active && !!all,
  };
}

function parseArgs(argv: string[]) {
  const get = (flag: string) => {
    const i = argv.indexOf(flag);
    return i >= 0 ? String(argv[i + 1] ?? '').trim() : '';
  };
  return {
    record5: get('--record5'),
    record6: get('--record6'),
    project: get('--project'),
    facility: get('--facility'),
    nav5: Number(get('--nav5') || '0'),
    nav6: Number(get('--nav6') || '0'),
  };
}

async function loadCollection(db: Firestore, name: string): Promise<Row[]> {
  const snap = await db.collection(name).get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

function buildNavRecords(
  projectData: Row[],
  glossary: Row[],
  categories: Row[],
  items: Row[],
  locations: Row[],
  projectId: string,
  facilityId: string
): Row[] {
  const filtered = projectData.filter((d) => {
    if (!String(d.fldPDataID ?? '').trim()) return false;
    if (d.fldDeleted || d.fldIsDeleted) return false;
    return (
      normId(d.fldPDataProject) === normId(projectId) &&
      normId(d.fldFacility) === normId(facilityId)
    );
  });

  return [...filtered].sort((a, b) => {
    const ctxA = getRecordContextForNav(a, glossary);
    const ctxB = getRecordContextForNav(b, glossary);
    const catA = categories.find((c) => normId(c.fldCategoryID) === normId(ctxA.catId));
    const catB = categories.find((c) => normId(c.fldCategoryID) === normId(ctxB.catId));
    const resCat = compareEntities(catA, catB, 'fldCategoryName');
    if (resCat !== 0) return resCat;
    const locA = String(
      locations.find((l) => normId(l.fldLocID) === normId(a.fldLocation))?.fldLocName ?? ''
    ).toLowerCase();
    const locB = String(
      locations.find((l) => normId(l.fldLocID) === normId(b.fldLocation))?.fldLocName ?? ''
    ).toLowerCase();
    const orderLoc = locA.localeCompare(locB);
    if (orderLoc !== 0) return orderLoc;
    const itemA = items.find((i) => normId(i.fldItemID) === normId(ctxA.itemId));
    const itemB = items.find((i) => normId(i.fldItemID) === normId(ctxB.itemId));
    return compareEntities(itemA, itemB, 'fldItemID');
  });
}

function reportRecord(
  label: string,
  rec: Row,
  glossary: Row[],
  categoriesActive: Row[],
  categoriesAll: Row[],
  items: Row[]
) {
  const glos = findGlossaryRow(glossary, rec.fldData);
  const hydrate = simulateHydrationCategoryId(rec, glossary);
  const dropdown = simulateDropdownMatch(hydrate.categoryId, categoriesActive, categoriesAll);
  const catFromGlos = glos ? findCategoryById(categoriesAll, glos.fldCat) : undefined;

  const lines: string[] = [];
  lines.push(`\n========== ${label} ==========`);
  lines.push(`projectData document id: ${rec.id}`);
  lines.push(`fldPDataID: ${rec.fldPDataID}`);
  lines.push(`fldRecordSource: ${rec.fldRecordSource ?? '(unset)'}`);
  lines.push(`fldData: ${rec.fldData ?? '(empty)'}  [${charDiag(rec.fldData)}]`);
  lines.push(`fldPDataCategoryID: ${rec.fldPDataCategoryID ?? '(empty)'}  [${charDiag(rec.fldPDataCategoryID)}]`);
  lines.push(`fldPDataItemID: ${rec.fldPDataItemID ?? '(empty)'}`);
  lines.push(`fldPDataMasterFindID: ${rec.fldPDataMasterFindID ?? '(empty)'}`);
  lines.push(`fldPDataMasterRecID: ${rec.fldPDataMasterRecID ?? '(empty)'}`);
  lines.push(`fldFindShort: ${String(rec.fldFindShort ?? '').slice(0, 80)}`);
  lines.push(`fldRecShort: ${String(rec.fldRecShort ?? '').slice(0, 80)}`);
  lines.push(`fldStandards count: ${Array.isArray(rec.fldStandards) ? rec.fldStandards.length : 0}`);
  lines.push(`isCustomProjectDataRecord: ${isCustomProjectDataRecord(rec)}`);
  lines.push(`simulate hydrate categoryId: "${hydrate.categoryId}" via ${hydrate.source}`);
  lines.push(`glossary row found: ${hydrate.glosFound}`);

  if (glos) {
    lines.push('\n--- glossary row ---');
    lines.push(`  doc id: ${glos.id}`);
    lines.push(`  fldGlosId: ${glos.fldGlosId ?? '(empty)'}  [${charDiag(glos.fldGlosId)}]`);
    lines.push(`  fldGlossarySetId: ${glos.fldGlossarySetId ?? '(empty)'}`);
    lines.push(`  fldGlossarySetName: ${glos.fldGlossarySetName ?? '(empty)'}`);
    lines.push(`  fldCat: ${glos.fldCat ?? '(empty)'}  [${charDiag(glos.fldCat)}]`);
    lines.push(`  fldItem: ${glos.fldItem ?? '(empty)'}`);
    lines.push(`  fldFind: ${glos.fldFind ?? '(empty)'}`);
    lines.push(`  fldRec: ${glos.fldRec ?? '(empty)'}`);
    lines.push(`  fldRecID: ${glos.fldRecID ?? '(empty)'}`);
    lines.push(`  fldDeleted: ${glos.fldDeleted ?? false}`);
    lines.push(`  fldIsDeleted: ${glos.fldIsDeleted ?? false}`);
    lines.push(`  fldData matches fldGlosId: ${normId(rec.fldData) === normId(glos.fldGlosId)}`);
    lines.push(`  fldData matches doc id: ${normId(rec.fldData) === normId(glos.id)}`);
  } else {
    lines.push('\n--- glossary row: NOT FOUND for fldData ---');
  }

  if (catFromGlos) {
    lines.push('\n--- category (from glossary.fldCat) ---');
    lines.push(`  doc id: ${catFromGlos.id}`);
    lines.push(`  fldCategoryID: ${catFromGlos.fldCategoryID ?? '(empty)'}  [${charDiag(catFromGlos.fldCategoryID)}]`);
    lines.push(`  fldCategoryName: ${catFromGlos.fldCategoryName ?? '(empty)'}`);
    lines.push(`  fldDeleted: ${catFromGlos.fldDeleted ?? false}`);
    lines.push(`  fldIsDeleted: ${catFromGlos.fldIsDeleted ?? false}`);
    lines.push(`  fldCat matches fldCategoryID: ${normId(glos?.fldCat) === normId(catFromGlos.fldCategoryID)}`);
    lines.push(`  fldCat matches doc id: ${normId(glos?.fldCat) === normId(catFromGlos.id)}`);
  } else if (glos?.fldCat) {
    lines.push('\n--- category: NOT FOUND for glossary.fldCat ---');
  }

  const itemAll = glos ? findItemById(items, glos.fldItem) : undefined;
  if (itemAll) {
    lines.push('\n--- item (from glossary.fldItem) ---');
    lines.push(`  doc id: ${itemAll.id}`);
    lines.push(`  fldItemID: ${itemAll.fldItemID ?? '(empty)'}  [${charDiag(itemAll.fldItemID)}]`);
    lines.push(`  fldItemName: ${itemAll.fldItemName ?? '(empty)'}`);
    lines.push(`  fldCatID: ${itemAll.fldCatID ?? '(empty)'}  [${charDiag(itemAll.fldCatID)}]`);
    lines.push(`  fldDeleted: ${itemAll.fldDeleted ?? false}`);
    lines.push(`  fldIsDeleted: ${itemAll.fldIsDeleted ?? false}`);
    lines.push(`  fldItem matches fldItemID: ${normId(glos?.fldItem) === normId(itemAll.fldItemID)}`);
    lines.push(`  fldItem matches doc id: ${normId(glos?.fldItem) === normId(itemAll.id)}`);
    lines.push(`  item.fldCatID matches glossary.fldCat: ${normId(itemAll.fldCatID) === normId(glos?.fldCat)}`);
  } else if (glos?.fldItem) {
    lines.push('\n--- item: NOT FOUND for glossary.fldItem ---');
  }

  lines.push('\n--- dropdown simulation ---');
  lines.push(`  category in active (non-deleted) categories: ${dropdown.inActiveCategories}`);
  lines.push(`  category in all categories: ${dropdown.inAllCategories}`);
  lines.push(`  option value (active list): ${dropdown.optionValueActive ?? 'n/a'}`);
  lines.push(`  option value (all): ${dropdown.optionValueAll ?? 'n/a'}`);
  lines.push(`  selections.categoryId === option value (active): ${normId(hydrate.categoryId) === normId(dropdown.optionValueActive)}`);
  lines.push(`  selections.categoryId === option value (all getCategoryId): ${normId(hydrate.categoryId) === normId(dropdown.optionValueAll)}`);
  lines.push(`  uncommitted fix would inject resolvable row: ${dropdown.wouldInjectResolvable}`);

  return lines.join('\n');
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (!args.record5 && !(args.project && args.facility && args.nav5 && args.nav6)) {
    console.error(
      'Provide --record5 <fldPDataID> --record6 <fldPDataID> OR --project <id> --facility <id> --nav5 5 --nav6 6'
    );
    process.exit(1);
  }

  ensureAdminApp();
  const db = getFirestore();

  console.log('Read-only compare-data-entry-records (Firebase Admin)');
  console.log(`Project: ${resolveProjectId() ?? '(from credentials)'}`);

  const [projectData, glossary, categoriesAll, items, locations] = await Promise.all([
    loadCollection(db, 'projectData'),
    loadCollection(db, 'glossary'),
    loadCollection(db, 'categories'),
    loadCollection(db, 'items'),
    loadCollection(db, 'locations'),
  ]);

  const categoriesActive = categoriesAll.filter((c) => !c.fldDeleted && !c.fldIsDeleted);

  let rec5: Row | undefined;
  let rec6: Row | undefined;

  if (args.record5 && args.record6) {
    rec5 = projectData.find((d) => normId(d.fldPDataID) === normId(args.record5));
    rec6 = projectData.find((d) => normId(d.fldPDataID) === normId(args.record6));
    if (!rec5) console.error(`Record 5 not found: ${args.record5}`);
    if (!rec6) console.error(`Record 6 not found: ${args.record6}`);
  } else {
    const nav = buildNavRecords(
      projectData,
      glossary,
      categoriesActive,
      items,
      locations,
      args.project,
      args.facility
    );
    console.log(`\nNav records for project=${args.project} facility=${args.facility}: ${nav.length}`);
    nav.forEach((d, i) => {
      const short = String(d.fldFindShort ?? '').trim().slice(0, 50);
      console.log(`  #${i + 1} fldPDataID=${d.fldPDataID} findShort="${short}"`);
    });
    rec5 = nav[args.nav5 - 1];
    rec6 = nav[args.nav6 - 1];
    if (!rec5) console.error(`Nav index ${args.nav5} out of range`);
    if (!rec6) console.error(`Nav index ${args.nav6} out of range`);
  }

  if (!rec5 || !rec6) {
    process.exit(1);
  }

  const out: string[] = [];
  out.push(reportRecord('RECORD 5', rec5, glossary, categoriesActive, categoriesAll, items));
  out.push(reportRecord('RECORD 6', rec6, glossary, categoriesActive, categoriesAll, items));

  const h5 = simulateHydrationCategoryId(rec5, glossary);
  const h6 = simulateHydrationCategoryId(rec6, glossary);
  const g5 = findGlossaryRow(glossary, rec5.fldData);
  const g6 = findGlossaryRow(glossary, rec6.fldData);

  out.push('\n========== DIFF SUMMARY ==========');
  out.push(`custom path: record5=${isCustomProjectDataRecord(rec5)} record6=${isCustomProjectDataRecord(rec6)}`);
  out.push(`glossary row found: record5=${!!g5} record6=${!!g6}`);
  out.push(`hydrated categoryId: record5="${h5.categoryId}" record6="${h6.categoryId}"`);
  out.push(`glossary.fldCat: record5="${g5?.fldCat ?? ''}" record6="${g6?.fldCat ?? ''}"`);
  out.push(`fldCat equal: ${normId(g5?.fldCat) === normId(g6?.fldCat)}`);
  out.push(`fldGlossarySetId: record5="${g5?.fldGlossarySetId ?? ''}" record6="${g6?.fldGlossarySetId ?? ''}"`);
  out.push(`fldData matches glos (5): glosId=${normId(g5?.fldGlosId) === normId(rec5.fldData)} docId=${normId(g5?.id) === normId(rec5.fldData)}`);
  out.push(`fldData matches glos (6): glosId=${normId(g6?.fldGlosId) === normId(rec6.fldData)} docId=${normId(g6?.id) === normId(rec6.fldData)}`);

  const d5 = simulateDropdownMatch(h5.categoryId, categoriesActive, categoriesAll);
  const d6 = simulateDropdownMatch(h6.categoryId, categoriesActive, categoriesAll);
  out.push(`dropdown match active: record5=${d5.inActiveCategories} record6=${d6.inActiveCategories}`);
  out.push(`would inject resolvable: record5=${d5.wouldInjectResolvable} record6=${d6.wouldInjectResolvable}`);

  const text = out.join('\n');
  console.log(text);

  const reportDir = path.join(process.cwd(), 'reports', 'diagnostics');
  fs.mkdirSync(reportDir, { recursive: true });
  const outPath = path.join(reportDir, `compare-records-${Date.now()}.txt`);
  fs.writeFileSync(outPath, text, 'utf-8');
  console.log(`\nWrote ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
