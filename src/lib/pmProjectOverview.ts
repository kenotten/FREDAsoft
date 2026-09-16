/**
 * Read-only PM Slice 1 Project Overview view-model.
 * Displays exact stored TDLR/TABS strings. Does not normalize or substitute Client/Owner.
 */

import type { Client, Facility, Inspector, Project } from '../types';
import {
  PM_NOT_ASSIGNED,
  PM_NOT_RECORDED,
  pmDisplayOr,
  pmSourceText,
  pmStateProjectId,
  resolvePmRasDisplay,
} from './pmProjectSearch';

export const PM_TDLR_HEADING = 'TDLR/TABS — AS RECORDED';
export const PM_TDLR_HELPER =
  'These values reflect the project information recorded with TDLR and are displayed exactly as stored.';
export const PM_TDLR_EMPTY =
  'No TDLR/TABS source information is recorded for this FREDA Project.';

export interface PmAddressDisplay {
  line: string;
  city: string;
  state: string;
  zip: string;
  county?: string;
}

export interface PmProjectOverviewVm {
  projectId: string;
  projectNameDisplay: string;
  ocgNumberDisplay: string;
  stateProjectIdDisplay: string;
  projectTypeDisplay: string;
  externalRefDisplay: string | null;
  clientNameDisplay: string;
  clientId: string;
  facilities: Array<{
    nameDisplay: string;
    addressDisplay: string;
  }>;
  hasTdlrRegistered: boolean;
  tdlrEmptyState: string | null;
  tdlr: {
    stateProjectId: string;
    stateProjectIdDisplay: string;
    ownerName: string;
    ownerNameDisplay: string;
    ownerAddress: PmAddressDisplay;
    ownerContactDisplay: string;
    designFirmName: string;
    designFirmNameDisplay: string;
    designProfessionalDisplay: string;
    siteNameDisplay: string;
    siteAddress: PmAddressDisplay;
    scopeOfWorkDisplay: string;
    typeOfWorkDisplay: string;
    tenantFundedDisplay: string;
    sourceDisplay: string;
  } | null;
  planReviewRasDisplay: string;
  inspectionRasDisplay: string;
  planReviewDateDisplay: string;
  inspectionDateDisplay: string;
  pdDateDisplay: string;
}

function asText(value: unknown): string {
  return typeof value === 'string' ? value : value == null ? '' : String(value);
}

function formatAddress(parts: {
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  county?: string;
}): PmAddressDisplay {
  return {
    line: asText(parts.address).trim(),
    city: asText(parts.city).trim(),
    state: asText(parts.state).trim(),
    zip: asText(parts.zip).trim(),
    county: asText(parts.county).trim() || undefined,
  };
}

function formatAddressLine(address: PmAddressDisplay): string {
  const cityStateZip = [address.city, address.state, address.zip].filter(Boolean).join(' ');
  const bits = [address.line, cityStateZip, address.county].filter(Boolean);
  return bits.length ? bits.join(', ') : PM_NOT_RECORDED;
}

function tenantFundedDisplay(value: boolean | null | undefined): string {
  if (value === true) return 'Yes';
  if (value === false) return 'No';
  return PM_NOT_RECORDED;
}

function facilityIdsForProject(project: Project): string[] {
  const fromArray = Array.isArray(project.fldFacilities)
    ? project.fldFacilities.map((id) => asText(id).trim()).filter(Boolean)
    : [];
  if (fromArray.length) return [...new Set(fromArray)];
  const legacy = asText(project.fldFacID).trim();
  return legacy ? [legacy] : [];
}

export function formatPmAddressDisplay(address: PmAddressDisplay): string {
  return formatAddressLine(address);
}

export function buildPmProjectOverview(
  project: Project,
  clients: Client[],
  facilities: Facility[],
  inspectors: Inspector[]
): PmProjectOverviewVm {
  const clientId = asText(project.fldClient).trim();
  const clientName = asText(clients.find((c) => c.fldClientID === clientId)?.fldClientName).trim();
  const facilityById = new Map(facilities.map((f) => [f.fldFacID, f]));
  const facilityViews = facilityIdsForProject(project).map((id) => {
    const facility = facilityById.get(id);
    const address = formatAddress({
      address: facility?.fldFacAddress,
      city: facility?.fldFacCity,
      state: facility?.fldFacState,
      zip: facility?.fldFacZip,
    });
    return {
      nameDisplay: pmDisplayOr(facility?.fldFacName, PM_NOT_ASSIGNED),
      addressDisplay: facility ? formatAddressLine(address) : PM_NOT_RECORDED,
    };
  });

  const registered = project.tdlrRegistered;
  const hasTdlrRegistered = registered != null;
  const stateProjectId = pmStateProjectId(project);

  return {
    projectId: asText(project.fldProjID),
    projectNameDisplay: pmDisplayOr(project.fldProjName, PM_NOT_RECORDED),
    ocgNumberDisplay: pmDisplayOr(project.fldProjNumber, PM_NOT_RECORDED),
    stateProjectIdDisplay: pmDisplayOr(stateProjectId, PM_NOT_RECORDED),
    projectTypeDisplay: pmDisplayOr(project.fldProjType, PM_NOT_RECORDED),
    externalRefDisplay: asText(project.fldExternalRef).trim()
      ? asText(project.fldExternalRef).trim()
      : null,
    clientNameDisplay: pmDisplayOr(clientName, PM_NOT_RECORDED),
    clientId,
    facilities: facilityViews.length
      ? facilityViews
      : [{ nameDisplay: PM_NOT_ASSIGNED, addressDisplay: PM_NOT_RECORDED }],
    hasTdlrRegistered,
    tdlrEmptyState: hasTdlrRegistered ? null : PM_TDLR_EMPTY,
    tdlr: hasTdlrRegistered
      ? {
          stateProjectId,
          stateProjectIdDisplay: stateProjectId,
          ownerName: pmSourceText(registered.owner?.name),
          ownerNameDisplay: pmSourceText(registered.owner?.name),
          ownerAddress: formatAddress(registered.owner ?? {}),
          ownerContactDisplay: pmSourceText(registered.owner?.contactName),
          designFirmName: pmSourceText(registered.designFirm?.name),
          designFirmNameDisplay: pmSourceText(registered.designFirm?.name),
          designProfessionalDisplay: pmSourceText(registered.designFirm?.designProfessionalName),
          siteNameDisplay: pmSourceText(registered.site?.facilityName),
          siteAddress: formatAddress(registered.site ?? {}),
          scopeOfWorkDisplay: pmSourceText(registered.scopeOfWork),
          typeOfWorkDisplay: pmSourceText(registered.typeOfWork),
          tenantFundedDisplay: tenantFundedDisplay(registered.tenantFunded),
          sourceDisplay: pmSourceText(registered.source),
        }
      : null,
    planReviewRasDisplay: resolvePmRasDisplay(inspectors, project.fldPlanReviewRas),
    inspectionRasDisplay: resolvePmRasDisplay(inspectors, project.fldInspectionRas),
    planReviewDateDisplay: pmDisplayOr(project.fldPlanReviewDate, PM_NOT_RECORDED),
    inspectionDateDisplay: pmDisplayOr(project.fldInspectionDate, PM_NOT_RECORDED),
    pdDateDisplay: pmDisplayOr(project.fldPDDate, PM_NOT_RECORDED),
  };
}
