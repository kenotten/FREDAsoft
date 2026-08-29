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
