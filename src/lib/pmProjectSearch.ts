/**
 * Read-only PM Slice 1 search/sort helpers.
 * Comparison keys are in-memory only — never persist or overwrite source strings.
 */

import type { Client, Facility, Inspector, Project } from '../types';

export const PM_NOT_RECORDED = 'Not recorded';
export const PM_NOT_ASSIGNED = 'Not assigned';

export type PmProjectTypeFilter = 'all' | 'TAS/RAS' | 'Assessment';

export interface PmProjectListRow {
  projectId: string;
  ocgNumber: string;
  ocgNumberDisplay: string;
  projectName: string;
  projectNameDisplay: string;
  stateProjectId: string;
  stateProjectIdDisplay: string;
  clientName: string;
  clientNameDisplay: string;
  facilityDisplay: string;
  facilityNames: string[];
  siteName: string;
  planReviewRasDisplay: string;
  inspectionRasDisplay: string;
  projectType: string;
  projectTypeDisplay: string;
}

function asText(value: unknown): string {
  return typeof value === 'string' ? value : value == null ? '' : String(value);
}

export function pmSourceText(value: unknown): string {
  return asText(value);
}

export function pmDisplayOr(value: unknown, emptyLabel: string): string {
  const text = asText(value).trim();
  return text ? text : emptyLabel;
}

/** Folded comparison key: lowercase, collapsed space. Source strings are not modified. */
export function pmFoldedSearchText(value: unknown): string {
  return asText(value).toLowerCase().replace(/\u00a0/g, ' ').trim().replace(/\s+/g, ' ');
}

/** Punctuation-stripped comparison key. In-memory only. */
export function pmCompactSearchText(value: unknown): string {
  return pmFoldedSearchText(value).replace(/[^a-z0-9]+/g, '');
}

export function pmQueryMatches(query: string, values: unknown[]): boolean {
  const foldedQuery = pmFoldedSearchText(query);
  if (!foldedQuery) return true;
  const compactQuery = pmCompactSearchText(query);
  return values.some((value) => {
    const folded = pmFoldedSearchText(value);
    if (folded && folded.includes(foldedQuery)) return true;
    if (compactQuery) {
      const compact = pmCompactSearchText(value);
      if (compact && compact.includes(compactQuery)) return true;
    }
    return false;
  });
}

export function pmStateProjectId(project: Pick<Project, 'tdlrRegistered'> | null | undefined): string {
  return asText(project?.tdlrRegistered?.tabsProjectNumber);
}

export function pmProjectTypeLabel(project: Pick<Project, 'fldProjType'> | null | undefined): string {
  return asText(project?.fldProjType).trim();
}

function clientNameById(clients: Client[], clientId: string): string {
  const id = clientId.trim();
  if (!id) return '';
  return asText(clients.find((c) => c.fldClientID === id)?.fldClientName).trim();
}

function inspectorNameById(inspectors: Inspector[], inspectorId: string | undefined): string {
  const id = asText(inspectorId).trim();
  if (!id) return '';
  return asText(inspectors.find((i) => i.fldInspID === id)?.fldInspName).trim();
}

function facilityIdsForProject(project: Project): string[] {
  const fromArray = Array.isArray(project.fldFacilities)
    ? project.fldFacilities.map((id) => asText(id).trim()).filter(Boolean)
    : [];
  if (fromArray.length) return [...new Set(fromArray)];
  const legacy = asText(project.fldFacID).trim();
  return legacy ? [legacy] : [];
}

function facilityNamesForProject(project: Project, facilities: Facility[]): string[] {
  const byId = new Map(facilities.map((f) => [f.fldFacID, asText(f.fldFacName).trim()]));
  return facilityIdsForProject(project)
    .map((id) => byId.get(id) || '')
    .filter(Boolean);
}

function formatFacilityDisplay(names: string[]): string {
  if (!names.length) return PM_NOT_ASSIGNED;
  if (names.length === 1) return names[0];
  return `${names[0]} (+${names.length - 1})`;
}

export function resolvePmRasDisplay(inspectors: Inspector[], inspectorId: string | undefined): string {
  const id = asText(inspectorId).trim();
  if (!id) return PM_NOT_ASSIGNED;
  return pmDisplayOr(inspectorNameById(inspectors, id), PM_NOT_ASSIGNED);
}

export function buildPmProjectListRow(
  project: Project,
  clients: Client[],
  facilities: Facility[],
  inspectors: Inspector[]
): PmProjectListRow {
  const ocgNumber = asText(project.fldProjNumber);
  const projectName = asText(project.fldProjName);
  const stateProjectId = pmStateProjectId(project);
  const clientName = clientNameById(clients, asText(project.fldClient));
  const facilityNames = facilityNamesForProject(project, facilities);
  const siteName = asText(project.tdlrRegistered?.site?.facilityName);
  const projectType = pmProjectTypeLabel(project);
  return {
    projectId: asText(project.fldProjID),
    ocgNumber,
    ocgNumberDisplay: pmDisplayOr(ocgNumber, PM_NOT_RECORDED),
    projectName,
    projectNameDisplay: pmDisplayOr(projectName, PM_NOT_RECORDED),
    stateProjectId,
    stateProjectIdDisplay: pmDisplayOr(stateProjectId, PM_NOT_RECORDED),
    clientName,
    clientNameDisplay: pmDisplayOr(clientName, PM_NOT_RECORDED),
    facilityDisplay: formatFacilityDisplay(facilityNames),
    facilityNames,
    siteName,
    planReviewRasDisplay: resolvePmRasDisplay(inspectors, project.fldPlanReviewRas),
    inspectionRasDisplay: resolvePmRasDisplay(inspectors, project.fldInspectionRas),
    projectType,
    projectTypeDisplay: pmDisplayOr(projectType, PM_NOT_RECORDED),
  };
}

export function projectMatchesPmTypeFilter(
  project: Pick<Project, 'fldProjType'>,
  typeFilter: PmProjectTypeFilter
): boolean {
  if (typeFilter === 'all') return true;
  return pmProjectTypeLabel(project) === typeFilter;
}

export function projectMatchesPmSearch(
  project: Project,
  query: string,
  clients: Client[],
  facilities: Facility[]
): boolean {
  if (!pmFoldedSearchText(query)) return true;
  const row = buildPmProjectListRow(project, clients, facilities, []);
  return pmQueryMatches(query, [
    row.projectName,
    row.ocgNumber,
    row.stateProjectId,
    row.clientName,
    ...row.facilityNames,
    row.siteName,
  ]);
}

/** OCG # descending; blanks last; Project Name ascending as stable secondary. */
export function comparePmProjectsByOcgDesc(a: Project, b: Project): number {
  const ocgA = asText(a.fldProjNumber).trim();
  const ocgB = asText(b.fldProjNumber).trim();
  if (ocgA && ocgB) {
    const ocgCmp = ocgB.localeCompare(ocgA, undefined, { numeric: true, sensitivity: 'base' });
    if (ocgCmp !== 0) return ocgCmp;
  } else if (ocgA && !ocgB) {
    return -1;
  } else if (!ocgA && ocgB) {
    return 1;
  }
  const nameCmp = asText(a.fldProjName).localeCompare(asText(b.fldProjName), undefined, {
    sensitivity: 'base',
  });
  if (nameCmp !== 0) return nameCmp;
  return asText(a.fldProjID).localeCompare(asText(b.fldProjID));
}

export function selectPmProjectListRows(
  projects: Project[],
  clients: Client[],
  facilities: Facility[],
  inspectors: Inspector[],
  query: string,
  typeFilter: PmProjectTypeFilter = 'all'
): PmProjectListRow[] {
  return projects
    .filter((project) => projectMatchesPmTypeFilter(project, typeFilter))
    .filter((project) => projectMatchesPmSearch(project, query, clients, facilities))
    .sort(comparePmProjectsByOcgDesc)
    .map((project) => buildPmProjectListRow(project, clients, facilities, inspectors));
}
