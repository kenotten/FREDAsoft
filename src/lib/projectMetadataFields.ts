/**
 * Project / Inspector metadata helpers for RAS cover fields.
 * Persistence only — RAS report rendering is separate.
 */

import type { TdlrRegistered, TdlrRegisteredSource } from '../types';

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

/** Store RAS registration digits/token only — not a `RAS 149` display string. Inspector credential field only. */
export function normalizeRasNumber(value: FormDataEntryValue | null): string {
  const raw = parseOptionalString(value);
  return raw.replace(/^(ras[\s#:\-]*)/i, '').trim();
}

export function isAssessmentProjectType(value: FormDataEntryValue | null | undefined): boolean {
  return parseOptionalString(value ?? null) === 'Assessment';
}

export function emptyTdlrRegistered(): TdlrRegistered {
  return {
    source: 'manual',
    tabsProjectNumber: '',
    scopeOfWork: '',
    tenantFunded: null,
    typeOfWork: '',
    site: {
      facilityName: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      county: '',
    },
    owner: {
      name: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      contactName: '',
    },
    designFirm: {
      name: '',
      designProfessionalName: '',
    },
  };
}

function parseTdlrSource(value: FormDataEntryValue | null): TdlrRegisteredSource {
  const raw = parseOptionalString(value);
  if (raw === 'tabs' || raw === 'export') return raw;
  return 'manual';
}

/** Complete nested object for TAS/RAS save — avoids partial Firestore map merges. */
export function buildTdlrRegisteredFromForm(form: FormData): TdlrRegistered {
  return {
    source: parseTdlrSource(form.get('tdlrSource')),
    tabsProjectNumber: parseOptionalString(form.get('tdlrTabsProjectNumber')),
    scopeOfWork: parseOptionalString(form.get('tdlrScopeOfWork')),
    tenantFunded: parseTenantFunded(form.get('tdlrTenantFunded')),
    typeOfWork: parseOptionalString(form.get('tdlrTypeOfWork')),
    site: {
      facilityName: parseOptionalString(form.get('tdlrSiteFacilityName')),
      address: parseOptionalString(form.get('tdlrSiteAddress')),
      city: parseOptionalString(form.get('tdlrSiteCity')),
      state: parseOptionalString(form.get('tdlrSiteState')),
      zip: parseOptionalString(form.get('tdlrSiteZip')),
      county: parseOptionalString(form.get('tdlrSiteCounty')),
    },
    owner: {
      name: parseOptionalString(form.get('tdlrOwnerName')),
      address: parseOptionalString(form.get('tdlrOwnerAddress')),
      city: parseOptionalString(form.get('tdlrOwnerCity')),
      state: parseOptionalString(form.get('tdlrOwnerState')),
      zip: parseOptionalString(form.get('tdlrOwnerZip')),
      contactName: parseOptionalString(form.get('tdlrOwnerContactName')),
    },
    designFirm: {
      name: parseOptionalString(form.get('tdlrDesignFirmName')),
      designProfessionalName: parseOptionalString(form.get('tdlrDesignProfessionalName')),
    },
  };
}

export type ProjectMetadataSaveInput = {
  fldProjID: string;
  fldProjName: FormDataEntryValue | null;
  fldProjNumber: FormDataEntryValue | null;
  fldExternalRef: FormDataEntryValue | null;
  fldPDDate: FormDataEntryValue | null;
  fldInspector: FormDataEntryValue | null;
  fldPlanReviewRas?: FormDataEntryValue | null;
  fldInspectionRas?: FormDataEntryValue | null;
  fldPlanReviewDate?: FormDataEntryValue | null;
  fldInspectionDate?: FormDataEntryValue | null;
  fldProjType: FormDataEntryValue | null;
  fldProjDescription: FormDataEntryValue | null;
  tdlrRegistered?: TdlrRegistered | null;
  fldClient: string;
  fldFacilities: FormDataEntryValue[];
};

export type ProjectSavePayload = {
  fldProjID: string;
  fldProjName: FormDataEntryValue | null;
  fldProjNumber: FormDataEntryValue | null;
  fldExternalRef: FormDataEntryValue | null;
  fldPDDate: FormDataEntryValue | null;
  fldProjType: string;
  fldClient: string;
  fldFacilities: FormDataEntryValue[];
  fldInspector?: FormDataEntryValue | null;
  fldProjDescription?: FormDataEntryValue | null;
  fldPlanReviewRas?: string;
  fldInspectionRas?: string;
  fldPlanReviewDate?: string;
  fldInspectionDate?: string;
  tdlrRegistered?: TdlrRegistered;
};

export function buildProjectSavePayload(input: ProjectMetadataSaveInput): ProjectSavePayload {
  const fldProjType = parseOptionalString(input.fldProjType) || 'TAS/RAS';
  const base = {
    fldProjID: input.fldProjID,
    fldProjName: input.fldProjName,
    fldProjNumber: input.fldProjNumber,
    fldExternalRef: input.fldExternalRef,
    fldPDDate: input.fldPDDate,
    fldProjType,
    fldClient: input.fldClient,
    fldFacilities: input.fldFacilities,
  };

  if (isAssessmentProjectType(fldProjType)) {
    return {
      ...base,
      fldInspector: input.fldInspector,
      fldProjDescription: input.fldProjDescription,
    };
  }

  const tdlrRegistered = input.tdlrRegistered ?? emptyTdlrRegistered();
  return {
    ...base,
    fldPlanReviewRas: parseOptionalString(input.fldPlanReviewRas ?? null),
    fldInspectionRas: parseOptionalString(input.fldInspectionRas ?? null),
    fldPlanReviewDate: parseOptionalString(input.fldPlanReviewDate ?? null),
    fldInspectionDate: parseOptionalString(input.fldInspectionDate ?? null),
    tdlrRegistered,
    // TAS/RAS copy of TABS Scope (including ""). Authoritative value remains tdlrRegistered.scopeOfWork.
    fldProjDescription: tdlrRegistered.scopeOfWork,
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
