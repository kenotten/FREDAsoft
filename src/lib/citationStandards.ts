import { normalizeId } from './idUtils';

/** Citation IDs from array, object-map, or single string; trimmed, non-empty, deduped. */
export function normalizeCitationIds(value: unknown): string[] {
  if (value === undefined || value === null || value === '') return [];
  const rawValues = Array.isArray(value)
    ? value
    : typeof value === 'object'
      ? Object.values(value as object)
      : [value];
  return Array.from(
    new Set(
      rawValues
        .map((v) => String(v ?? '').trim())
        .filter((s) => s.length > 0)
    )
  );
}

function entityIdKeys(entity: any, extraFields: string[]): string[] {
  const keys = [entity?.id, ...extraFields.map((f) => entity?.[f])].map(normalizeId).filter(Boolean);
  return Array.from(new Set(keys));
}

export function findingMatchesGlossaryRow(finding: any, gRow: any): boolean {
  const rowKeys = entityIdKeys(gRow, ['fldFind', 'fldFindID']);
  if (!rowKeys.length) return false;
  const findingKeys = entityIdKeys(finding, ['fldFindID']);
  return findingKeys.some((k) => rowKeys.includes(k));
}

export function recommendationMatchesGlossaryRow(rec: any, gRow: any): boolean {
  const rowKeys = entityIdKeys(gRow, ['fldRec', 'fldRecID']);
  if (!rowKeys.length) return false;
  const recKeys = entityIdKeys(rec, ['fldRecID']);
  return recKeys.some((k) => rowKeys.includes(k));
}

export function unionFindingAndRecommendationCitationIds(finding: any, rec: any): string[] {
  return Array.from(
    new Set([
      ...normalizeCitationIds(finding?.fldStandards),
      ...normalizeCitationIds(rec?.fldStandards),
    ])
  );
}

/**
 * Glossary snapshot if usable; else union of linked master Finding + Recommendation.
 * Does not write to the glossary row.
 */
export function standardsIdsFromGlossaryRow(
  gRow: any,
  findingsList: any[],
  masterRecs: any[]
): string[] {
  const fromGlos = normalizeCitationIds(gRow?.fldStandards);
  if (fromGlos.length > 0) return fromGlos;
  const find = (findingsList || []).find((f: any) => findingMatchesGlossaryRow(f, gRow));
  const rec = (masterRecs || []).find((r: any) => recommendationMatchesGlossaryRow(r, gRow));
  return unionFindingAndRecommendationCitationIds(find, rec);
}

/** RAS: Finding / TAS citations only — not recommendation citations. */
export function findingCitationIdsFromGlossaryRow(gRow: any, findingsList: any[]): string[] {
  const find = (findingsList || []).find((f: any) => findingMatchesGlossaryRow(f, gRow));
  const fromFind = normalizeCitationIds(find?.fldStandards);
  if (fromFind.length > 0) return fromFind;
  return normalizeCitationIds(gRow?.fldStandards);
}

/**
 * Working citation IDs after the user explicitly selects/re-selects a glossary recommendation.
 * Not used when merely opening a saved record (that path keeps projectData.fldStandards).
 */
export function workingCitationIdsAfterExplicitGlossarySelection(args: {
  isRasProject: boolean;
  isExistingRecord: boolean;
  glossaryRow: unknown;
  findingsList: unknown[];
  masterRecs: unknown[];
}): string[] {
  const { isRasProject, isExistingRecord, glossaryRow, findingsList, masterRecs } = args;
  if (isRasProject) {
    return findingCitationIdsFromGlossaryRow(glossaryRow, findingsList);
  }
  if (!isExistingRecord) {
    return standardsIdsFromGlossaryRow(glossaryRow, findingsList, masterRecs);
  }
  return normalizeCitationIds((glossaryRow as { fldStandards?: unknown } | null)?.fldStandards);
}

/** Snapshot loaded when opening an existing Project Data record. Does not consult glossary/masters. */
export function savedCitationIdsOnOpenRecord(record: { fldStandards?: unknown } | null | undefined): string[] {
  return normalizeCitationIds(record?.fldStandards);
}

export function citationIdSetsEqual(a: unknown, b: unknown): boolean {
  const left = [...normalizeCitationIds(a)].sort();
  const right = [...normalizeCitationIds(b)].sort();
  if (left.length !== right.length) return false;
  return left.every((id, i) => id === right[i]);
}

export function glossaryRowMatchesDataEntryPath(
  row: unknown,
  ids: { categoryId?: string; itemId?: string; findId?: string }
): boolean {
  const g = row as { fldCat?: unknown; fldItem?: unknown; fldFind?: unknown } | null | undefined;
  return (
    Boolean(normalizeId(ids.categoryId)) &&
    Boolean(normalizeId(ids.itemId)) &&
    Boolean(normalizeId(ids.findId)) &&
    normalizeId(g?.fldCat) === normalizeId(ids.categoryId) &&
    normalizeId(g?.fldItem) === normalizeId(ids.itemId) &&
    normalizeId(g?.fldFind) === normalizeId(ids.findId)
  );
}

/**
 * Internal RAS glossary-row pick for citation refresh. Does not surface duplicate rows to the user.
 * Prefer glosId / fldData when that row still matches cat+item+find in the provided (set-filtered) list;
 * otherwise first path match — same shape as Data Entry resolveGlossaryForSelection (RAS).
 */
export function resolveGlossaryRowForRasCitationRefresh(args: {
  preferredGlossaryId?: string | null;
  categoryId?: string;
  itemId?: string;
  findId?: string;
  glossaryRows: unknown[];
}): any | undefined {
  const cat = String(args.categoryId || '').trim();
  const item = String(args.itemId || '').trim();
  const find = String(args.findId || '').trim();
  if (!cat || !item || !find) return undefined;
  const rows = Array.isArray(args.glossaryRows) ? args.glossaryRows : [];
  const pathIds = { categoryId: cat, itemId: item, findId: find };
  const preferred = normalizeId(args.preferredGlossaryId);
  if (preferred) {
    const byPreferred = rows.find(
      (g: any) => normalizeId(g?.fldGlosId || g?.id) === preferred
    );
    if (byPreferred && glossaryRowMatchesDataEntryPath(byPreferred, pathIds)) return byPreferred;
  }
  const byPath = rows.filter((g) => glossaryRowMatchesDataEntryPath(g, pathIds));
  return byPath[0];
}
