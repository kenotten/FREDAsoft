/**
 * Custom vs glossary projectData identity.
 *
 * fldData is the only identity of a specific glossary row.
 * fldPDataCategoryID / fldPDataItemID are Category/Item path snapshots (custom
 * records and glossary fallback when no complete glossary row was selected).
 */

export type ProjectDataRecordSourceInput = {
  fldData?: unknown;
  fldRecordSource?: unknown;
  fldPDataCategoryID?: unknown;
  fldPDataItemID?: unknown;
};

function trimmed(value: unknown): string {
  return String(value ?? '').trim();
}

function recordSource(rec: ProjectDataRecordSourceInput): string {
  return trimmed(rec.fldRecordSource);
}

/**
 * Custom when:
 * - fldRecordSource === 'custom', or
 * - source is not explicitly 'glossary' AND fldData is blank AND both PData Category/Item IDs are present
 *   (legacy custom records that never stored fldRecordSource).
 *
 * Explicit fldRecordSource === 'glossary' is never treated as custom.
 */
export function isCustomProjectDataRecord(
  rec: ProjectDataRecordSourceInput | null | undefined
): boolean {
  if (!rec) return false;
  const source = recordSource(rec);
  if (source === 'custom') return true;
  if (source === 'glossary') return false;
  const fldDataBlank = !trimmed(rec.fldData);
  const hasPDataCatItem = Boolean(trimmed(rec.fldPDataCategoryID) && trimmed(rec.fldPDataItemID));
  return fldDataBlank && hasPDataCatItem;
}

export function categoryItemIdsFromProjectDataRecord(
  rec: ProjectDataRecordSourceInput,
  glos?: { fldCat?: unknown; fldItem?: unknown } | null
): { categoryId: string; itemId: string } {
  if (isCustomProjectDataRecord(rec)) {
    return {
      categoryId: trimmed(rec.fldPDataCategoryID),
      itemId: trimmed(rec.fldPDataItemID)
    };
  }
  return {
    categoryId: trimmed(glos?.fldCat) || trimmed(rec.fldPDataCategoryID),
    itemId: trimmed(glos?.fldItem) || trimmed(rec.fldPDataItemID)
  };
}

export function resolveProjectDataSaveIdentity(args: {
  isCustomMode: boolean;
  categoryId?: string;
  itemId?: string;
  fldDataResolved?: string;
}): {
  fldData: string;
  fldRecordSource: 'glossary' | 'custom';
  fldPDataCategoryID: string;
  fldPDataItemID: string;
} {
  const categoryId = trimmed(args.categoryId);
  const itemId = trimmed(args.itemId);
  if (args.isCustomMode) {
    return {
      fldData: '',
      fldRecordSource: 'custom',
      fldPDataCategoryID: categoryId,
      fldPDataItemID: itemId
    };
  }
  return {
    fldData: trimmed(args.fldDataResolved),
    fldRecordSource: 'glossary',
    fldPDataCategoryID: categoryId,
    fldPDataItemID: itemId
  };
}
