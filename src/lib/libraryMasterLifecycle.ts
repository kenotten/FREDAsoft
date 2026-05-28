/** Master finding / recommendation archive lifecycle (distinct from soft delete). */

export function isArchivedLibraryMaster(row: { fldIsArchived?: boolean } | null | undefined): boolean {
  return row?.fldIsArchived === true;
}

/** Active for new library selection workflows (not soft-deleted, not archived). */
export function isSelectableLibraryMaster(row: {
  fldDeleted?: boolean;
  fldIsDeleted?: boolean;
  fldIsArchived?: boolean;
}): boolean {
  return (
    row.fldDeleted !== true &&
    row.fldIsDeleted !== true &&
    row.fldIsArchived !== true
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
