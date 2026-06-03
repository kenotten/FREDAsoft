type ProjectDataTrashRow = {
  citation_num?: unknown;
  fldIsDeleted?: unknown;
  fldDeleted?: unknown;
};

/** Legacy citation-shaped rows stored in projectData (not inspection records). */
export function isLegacyCitationProjectDataRow(row: ProjectDataTrashRow): boolean {
  return Boolean(row.citation_num);
}

export function filterValidProjectDataRows<T extends ProjectDataTrashRow>(rows: T[]): T[] {
  return rows.filter((d) => !isLegacyCitationProjectDataRow(d));
}

export function isSoftDeletedProjectDataRow(row: ProjectDataTrashRow): boolean {
  return row.fldIsDeleted === true || row.fldDeleted === true;
}

/** Soft-deleted inspection rows for admin Trash (excludes legacy citation imports). */
export function filterDeletedInspectionRecords<T extends ProjectDataTrashRow>(rows: T[]): T[] {
  return filterValidProjectDataRows(rows).filter(isSoftDeletedProjectDataRow);
}
