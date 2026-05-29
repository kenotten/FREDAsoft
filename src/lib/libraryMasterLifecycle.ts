/** Master finding / recommendation archive lifecycle (distinct from soft delete). */

import type { Finding, Glossary, MasterRecommendation } from '../types';

export function isArchivedLibraryMaster(row: { fldIsArchived?: boolean } | null | undefined): boolean {
  return row?.fldIsArchived === true;
}

/** Not soft-deleted; archived masters remain resolvable for existing references. */
export function isResolvableLibraryMaster(row: {
  fldDeleted?: boolean;
  fldIsDeleted?: boolean;
} | null | undefined): boolean {
  return row != null && row.fldDeleted !== true && row.fldIsDeleted !== true;
}

/** Active for new library selection workflows (not soft-deleted, not archived). */
export function isSelectableLibraryMaster(row: {
  fldDeleted?: boolean;
  fldIsDeleted?: boolean;
  fldIsArchived?: boolean;
} | null | undefined): boolean {
  return (
    isResolvableLibraryMaster(row) &&
    row!.fldIsArchived !== true
  );
}

export function masterArchiveFirestorePayload(): { fldIsArchived: true } {
  return { fldIsArchived: true };
}

export function masterRestoreFirestorePayload(): { fldIsArchived: false } {
  return { fldIsArchived: false };
}

export function formatArchivedMasterLabel(text: string): string {
  const t = String(text ?? '').trim();
  if (!t) return '(archived)';
  return `${t} (archived)`;
}

export function normMasterLibraryId(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

export function buildFindingByIdMap(findings: Finding[]): Map<string, Finding> {
  const map = new Map<string, Finding>();
  for (const f of findings) {
    const key = normMasterLibraryId(f.fldFindID || f.id);
    if (key) map.set(key, f);
  }
  return map;
}

export function buildRecByIdMap(recommendations: MasterRecommendation[]): Map<string, MasterRecommendation> {
  const map = new Map<string, MasterRecommendation>();
  for (const r of recommendations) {
    const key = normMasterLibraryId(r.fldRecID || r.id);
    if (key) map.set(key, r);
  }
  return map;
}

/** True when both glossary FK masters exist and are selectable (new path pools). */
export function glossaryRowHasSelectableMasters(
  g: Glossary | Record<string, unknown>,
  findingById: Map<string, Finding>,
  recById: Map<string, MasterRecommendation>
): boolean {
  const findKey = normMasterLibraryId((g as Glossary).fldFind);
  const recKey = normMasterLibraryId(
    (g as Glossary).fldRec || (g as Record<string, unknown>).fldRecID
  );
  if (!findKey || !recKey) return false;
  const finding = findingById.get(findKey);
  const rec = recById.get(recKey);
  if (!finding || !rec) return false;
  return isSelectableLibraryMaster(finding) && isSelectableLibraryMaster(rec);
}

const OUTSIDE_SELECTED_SET_SUFFIX = ' (outside selected set)';

/** Finding dropdown label: archived suffix, else outside-set suffix when not in selectable pool. */
export function masterFindingOptionLabel(
  finding: Finding | null | undefined,
  inSelectablePool: boolean
): string {
  const short = String(finding?.fldFindShort || finding?.fldFindID || '').trim();
  const fallback = String(finding?.fldFindID || 'Finding').trim();
  if (!finding) return '(unknown finding)';
  if (isArchivedLibraryMaster(finding)) return formatArchivedMasterLabel(short || fallback);
  if (!inSelectablePool) return `${short || fallback}${OUTSIDE_SELECTED_SET_SUFFIX}`;
  return short || fallback;
}

/** Recommendation dropdown label: archived suffix, else outside-set suffix when not in selectable pool. */
export function masterRecOptionLabel(
  rec: MasterRecommendation | null | undefined,
  inSelectablePool: boolean,
  opts?: { includeLongPreview?: boolean; longMax?: number }
): string {
  const short = String(rec?.fldRecShort || rec?.fldRecID || '').trim();
  const fallback = String(rec?.fldRecID || 'Recommendation').trim();
  if (!rec) return '(unknown recommendation)';
  const long = String(rec.fldRecLong || '').trim();
  const tail =
    opts?.includeLongPreview && long
      ? ` | ${long.substring(0, opts.longMax ?? 60)}${long.length > (opts.longMax ?? 60) ? '...' : ''}`
      : '';
  if (isArchivedLibraryMaster(rec)) return formatArchivedMasterLabel(short || fallback) + tail;
  if (!inSelectablePool) return `${short || fallback}${tail}${OUTSIDE_SELECTED_SET_SUFFIX}`;
  return (short || fallback) + tail;
}
