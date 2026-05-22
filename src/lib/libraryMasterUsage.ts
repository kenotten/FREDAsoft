import type { Category, Finding, Glossary, Item, MasterRecommendation } from '../types';
import {
  GLOSSARY_SET_DEFS,
  resolveGlossarySetForRecord,
  resolveGlossarySetLabelForKey,
} from './glossarySets';

export function libraryMasterUsageNormId(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

export type LibraryMasterUsageDetailRow = {
  glossaryRowId: string;
  setKey: string;
  setLabel: string;
  categoryId: string;
  categoryName: string;
  itemId: string;
  itemName: string;
  pairedFindingShort: string;
  pairedRecShort: string;
  pathLabel: string;
};

export type LibraryMasterUsageSummary = {
  glossaryRowCount: number;
  setKeys: string[];
  setLabels: string[];
  rows: LibraryMasterUsageDetailRow[];
};

export type LibraryMasterUsageIndex = {
  byFindingId: Record<string, LibraryMasterUsageSummary>;
  byRecId: Record<string, LibraryMasterUsageSummary>;
};

function isActiveGlossaryRow(g: Glossary): boolean {
  return g.fldDeleted !== true && g.fldIsDeleted !== true;
}

function findingMasterKey(f: Finding): string {
  return libraryMasterUsageNormId(f.fldFindID || f.id);
}

function recMasterKey(r: MasterRecommendation): string {
  return libraryMasterUsageNormId(r.fldRecID || r.id);
}

function compareDetailRows(a: LibraryMasterUsageDetailRow, b: LibraryMasterUsageDetailRow): number {
  const set = a.setLabel.localeCompare(b.setLabel, undefined, { sensitivity: 'base' });
  if (set !== 0) return set;
  const path = a.pathLabel.localeCompare(b.pathLabel, undefined, { sensitivity: 'base' });
  if (path !== 0) return path;
  return a.glossaryRowId.localeCompare(b.glossaryRowId, undefined, { sensitivity: 'base' });
}

function orderedSetLabels(setKeys: string[]): { setKeys: string[]; setLabels: string[] } {
  const unique = Array.from(new Set(setKeys.filter(Boolean)));
  const defOrder = GLOSSARY_SET_DEFS.map((d) => d.id);
  const orderedKeys = [
    ...defOrder.filter((id) => unique.includes(id)),
    ...unique.filter((k) => !defOrder.includes(k)).sort(),
  ];
  if (setKeys.includes('')) {
    orderedKeys.unshift('');
  }
  const keys = orderedKeys.filter((k, i, arr) => arr.indexOf(k) === i);
  return {
    setKeys: keys,
    setLabels: keys.map((k) => resolveGlossarySetLabelForKey(k)),
  };
}

function finalizeSummary(rows: LibraryMasterUsageDetailRow[]): LibraryMasterUsageSummary {
  const setKeys = rows.map((r) => r.setKey);
  const { setKeys: orderedKeys, setLabels } = orderedSetLabels(setKeys);
  const sorted = [...rows].sort(compareDetailRows);
  return {
    glossaryRowCount: sorted.length,
    setKeys: orderedKeys,
    setLabels,
    rows: sorted,
  };
}

function appendRow(
  map: Record<string, LibraryMasterUsageDetailRow[]>,
  key: string,
  row: LibraryMasterUsageDetailRow
) {
  if (!key) return;
  if (!map[key]) map[key] = [];
  map[key].push(row);
}

/**
 * Read-only index: glossary rows → master finding / recommendation usage.
 */
export function buildLibraryMasterUsageIndex(input: {
  glossary: Glossary[];
  findings: Finding[];
  recommendations: MasterRecommendation[];
  categories: Category[];
  items: Item[];
}): LibraryMasterUsageIndex {
  const { glossary, findings, recommendations, categories, items } = input;

  const findingById = new Map<string, Finding>();
  for (const f of findings) {
    const k = findingMasterKey(f);
    if (k) findingById.set(k, f);
  }

  const recById = new Map<string, MasterRecommendation>();
  for (const r of recommendations) {
    const k = recMasterKey(r);
    if (k) recById.set(k, r);
  }

  const catById = new Map(
    categories.map((c) => [libraryMasterUsageNormId(c.fldCategoryID || c.id), c])
  );
  const itemById = new Map(items.map((i) => [libraryMasterUsageNormId(i.fldItemID || i.id), i]));

  const findingRows: Record<string, LibraryMasterUsageDetailRow[]> = {};
  const recRows: Record<string, LibraryMasterUsageDetailRow[]> = {};

  for (const g of glossary) {
    if (!isActiveGlossaryRow(g)) continue;

    const glossaryRowId = String(g.fldGlosId ?? g.id ?? '').trim();
    if (!glossaryRowId) continue;

    const findKey = libraryMasterUsageNormId(g.fldFind);
    const recKey = libraryMasterUsageNormId(g.fldRec);
    const resolved = resolveGlossarySetForRecord(g);
    const setKey = resolved.setKey;
    const setLabel = resolved.setLabel;

    const cat = catById.get(libraryMasterUsageNormId(g.fldCat));
    const item = itemById.get(libraryMasterUsageNormId(g.fldItem));
    const categoryName = cat?.fldCategoryName ?? '(unknown category)';
    const itemName = item?.fldItemName ?? '(unknown item)';
    const categoryId = String(cat?.fldCategoryID ?? g.fldCat ?? '').trim() || '(unknown)';
    const itemId = String(item?.fldItemID ?? g.fldItem ?? '').trim() || '(unknown)';

    const finding = findKey ? findingById.get(findKey) : undefined;
    const rec = recKey ? recById.get(recKey) : undefined;
    const pairedFindingShort = finding?.fldFindShort ?? '(unknown finding)';
    const pairedRecShort = rec?.fldRecShort ?? '(unknown recommendation)';
    const pathLabel = `${categoryName} → ${itemName}`;

    const detail: LibraryMasterUsageDetailRow = {
      glossaryRowId,
      setKey,
      setLabel,
      categoryId,
      categoryName,
      itemId,
      itemName,
      pairedFindingShort,
      pairedRecShort,
      pathLabel,
    };

    appendRow(findingRows, findKey, detail);
    appendRow(recRows, recKey, detail);
  }

  const byFindingId: Record<string, LibraryMasterUsageSummary> = {};
  for (const [key, rows] of Object.entries(findingRows)) {
    byFindingId[key] = finalizeSummary(rows);
  }

  const byRecId: Record<string, LibraryMasterUsageSummary> = {};
  for (const [key, rows] of Object.entries(recRows)) {
    byRecId[key] = finalizeSummary(rows);
  }

  return { byFindingId, byRecId };
}

export function lookupFindingUsage(
  index: LibraryMasterUsageIndex,
  findingId: string | undefined | null
): LibraryMasterUsageSummary | undefined {
  const key = libraryMasterUsageNormId(findingId);
  if (!key) return undefined;
  return index.byFindingId[key];
}

export function lookupRecUsage(
  index: LibraryMasterUsageIndex,
  recId: string | undefined | null
): LibraryMasterUsageSummary | undefined {
  const key = libraryMasterUsageNormId(recId);
  if (!key) return undefined;
  return index.byRecId[key];
}

/** Compact one-line label for Library Manager rows. */
export function formatLibraryMasterUsageSummaryLine(
  summary: LibraryMasterUsageSummary | undefined
): string {
  if (!summary || summary.glossaryRowCount === 0) return 'Unused';
  const n = summary.glossaryRowCount;
  const sets =
    summary.setLabels.length > 0
      ? summary.setLabels.join(', ')
      : 'Unassigned / Legacy';
  return `Used in ${n} glossary row${n === 1 ? '' : 's'} · ${sets}`;
}
