import type { Finding, Item } from '../types';

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

export function effectiveFindingFldItem(
  finding: Finding,
  edits: Record<string, Record<string, unknown>>,
  findingId?: string
): string {
  const id = findingId ?? finding.fldFindID ?? finding.id;
  const patch = edits[id];
  if (patch && 'fldItem' in patch) {
    return String(patch.fldItem ?? '').trim();
  }
  return String(finding.fldItem ?? '').trim();
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
