/**
 * Project / Inspector metadata helpers for RAS cover fields.
 * Persistence only — RAS report rendering is separate.
 */

export function parseOptionalString(value: FormDataEntryValue | null): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Three-state Tenant Funded: true / false / null (unanswered).
 * Form select values: `true` | `false` | ``.
 */
export function parseTenantFunded(value: FormDataEntryValue | null): boolean | null {
  if (value === null || typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true' || normalized === 'yes') return true;
  if (normalized === 'false' || normalized === 'no') return false;
  return null;
}

export function tenantFundedSelectValue(value: boolean | null | undefined): string {
  if (value === true) return 'true';
  if (value === false) return 'false';
  return '';
}

/** Store RAS registration digits/token only — not a `RAS 149` display string. */
export function normalizeRasNumber(value: FormDataEntryValue | null): string {
  const raw = parseOptionalString(value);
  return raw.replace(/^(ras[\s#:\-]*)/i, '').trim();
}

export type ProjectMetadataSaveInput = {
  fldProjID: string;
  fldProjName: FormDataEntryValue | null;
  fldProjNumber: FormDataEntryValue | null;
  fldExternalRef: FormDataEntryValue | null;
  fldTabsProjectNumber: FormDataEntryValue | null;
  fldPDDate: FormDataEntryValue | null;
  fldInspector: FormDataEntryValue | null;
  fldProjType: FormDataEntryValue | null;
  fldProjDescription: FormDataEntryValue | null;
  fldTenantFunded: FormDataEntryValue | null;
  fldClient: string;
  fldFacilities: FormDataEntryValue[];
};

export function buildProjectSavePayload(input: ProjectMetadataSaveInput) {
  return {
    fldProjID: input.fldProjID,
    fldProjName: input.fldProjName,
    fldProjNumber: input.fldProjNumber,
    fldExternalRef: input.fldExternalRef,
    fldTabsProjectNumber: parseOptionalString(input.fldTabsProjectNumber),
    fldPDDate: input.fldPDDate,
    fldInspector: input.fldInspector,
    fldProjType: input.fldProjType,
    fldProjDescription: input.fldProjDescription,
    fldTenantFunded: parseTenantFunded(input.fldTenantFunded),
    fldClient: input.fldClient,
    fldFacilities: input.fldFacilities,
  };
}

export type InspectorMetadataSaveInput = {
  fldInspID: string;
  fldInspName: FormDataEntryValue | null;
  fldTitle: FormDataEntryValue | null;
  fldCredentials: FormDataEntryValue | null;
  fldRasNumber: FormDataEntryValue | null;
};

export function buildInspectorSavePayload(input: InspectorMetadataSaveInput) {
  return {
    fldInspID: input.fldInspID,
    fldInspName: input.fldInspName,
    fldTitle: input.fldTitle,
    fldCredentials: input.fldCredentials,
    fldRasNumber: normalizeRasNumber(input.fldRasNumber),
  };
}
