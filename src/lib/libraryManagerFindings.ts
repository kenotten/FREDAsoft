import type { Category, Finding, Item } from '../types';

/** Navigation-only pseudo-category id for the unassigned findings drill-down. */
export const LIBRARY_UNASSIGNED_FINDINGS_CAT_ID = '__library_unassigned_findings__';

export const LIBRARY_UNASSIGNED_FINDINGS_LABEL = 'Unassigned Findings';

function normId(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

export function isActiveLibraryMaster(row: {
  fldDeleted?: boolean;
  fldIsDeleted?: boolean;
}): boolean {
  return row.fldDeleted !== true && row.fldIsDeleted !== true;
}

export function effectiveMasterFldItem(
  masterId: string,
  storedFldItem: unknown,
  edits: Record<string, Record<string, unknown>>
): string {
  const patch = edits[masterId];
  if (patch && 'fldItem' in patch) {
    return String(patch.fldItem ?? '').trim();
  }
  return String(storedFldItem ?? '').trim();
}

export function effectiveFindingFldItem(
  finding: Finding,
  edits: Record<string, Record<string, unknown>>,
  findingId?: string
): string {
  const id = findingId ?? finding.fldFindID ?? finding.id;
  return effectiveMasterFldItem(id, finding.fldItem, edits);
}

export function isValidActiveItemId(itemId: string, items: Item[]): boolean {
  const key = normId(itemId);
  if (!key) return false;
  return items.some(
    (item) =>
      isActiveLibraryMaster(item) &&
      (normId(item.fldItemID) === key || normId(item.id) === key)
  );
}

export function isUnassignedFinding(
  finding: Finding,
  items: Item[],
  edits: Record<string, Record<string, unknown>>
): boolean {
  if (!isActiveLibraryMaster(finding)) return false;
  const findingId = finding.fldFindID || finding.id;
  const itemId = effectiveFindingFldItem(finding, edits, findingId);
  return !isValidActiveItemId(itemId, items);
}

export function unassignedFindingItemStatusLabel(
  finding: Finding,
  items: Item[],
  edits: Record<string, Record<string, unknown>>
): string {
  const findingId = finding.fldFindID || finding.id;
  const itemId = effectiveFindingFldItem(finding, edits, findingId);
  if (!itemId) return 'No item assigned (fldItem is empty)';
  if (!isValidActiveItemId(itemId, items)) {
    return `Invalid or missing item reference: ${itemId}`;
  }
  return '';
}

export function countUnassignedFindings(
  findings: Finding[],
  items: Item[],
  edits: Record<string, Record<string, unknown>>
): number {
  return findings.filter((f) => isUnassignedFinding(f, items, edits)).length;
}

export function resolveItemAssignmentPathLabel(
  itemId: string,
  items: Item[],
  categories: Category[]
): string | null {
  if (!isValidActiveItemId(itemId, items)) return null;
  const key = normId(itemId);
  const item = items.find(
    (i) =>
      isActiveLibraryMaster(i) &&
      (normId(i.fldItemID) === key || normId(i.id) === key)
  );
  if (!item) return null;
  const cat = categories.find(
    (c) => normId(c.fldCategoryID || c.id) === normId(item.fldCatID)
  );
  const catName = cat?.fldCategoryName ?? '(unknown category)';
  const itemName = item.fldItemName ?? itemId;
  return `${catName} → ${itemName}`;
}
