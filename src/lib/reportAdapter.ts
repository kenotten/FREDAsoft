/**
 * RAS report data adapter / view-model (Slice A).
 * Pure functions — no React, no Firestore, no mutation of source objects.
 * Slice B: LayoutOrchestrator builds the view-model; RAS cover consumes it.
 */

import type { Client, Facility, Inspector, Location, Project, ProjectData } from '../types';
import { getRecordStandardIds, resolveFacilityReportNarrative } from './reportPreviewShared';
import {
  filterRecordsForReportProfile,
  getRasLetteredSections,
  getRecordLocator,
  getReportProfileSemantics,
  type LetterAssignedSection,
  type RecordLocator,
  type ReportProfile,
  type RasSectionContentFlags,
} from './reportProfile';
import { resolveCurrentWorkflowResponsibleProfessional } from './responsibleProfessional';
import type { RasWorkMode } from './workProduct';
import type { Glossary } from '../types';

export type RasRegisteredFacilityVm = {
  facilityName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  county: string;
};

export type RasOwnerVm = {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  contactName: string;
};

export type RasDesignFirmVm = {
  name: string;
  designProfessionalName: string;
};

export type ReportProfessionalVm = {
  id: string;
  name: string;
  title: string;
  rasNumber: string;
};

export type RasFindingVm = {
  id: string;
  finding: string;
  standardIds: string[];
  locator: RecordLocator;
  images: string[];
};

export type RasCoverGroupsVm = {
  header: {
    title: string;
    standardsLine: string;
  };
  ocgInformation: {
    professionalName: string;
    rasNumber: string;
    professionalRoleLabel: string;
    designFirmName: string;
    date: string;
    dateLabel: string;
    typeOfWork: string;
    ocgProjectNumber: string;
    tabsProjectNumber: string;
  };
  projectInformation: {
    projectName: string;
    facilityName: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    projectDescription: string;
    tenantFunded: boolean | null;
  };
  ownerInformation: RasOwnerVm;
};

export type ReportViewModel = {
  profile: ReportProfile;
  title: string;
  standardsLine: string;
  projectName: string;
  ocgProjectNumber: string;
  architectProjectNumber: string;
  includeRecommendations: boolean;
  includeCosts: boolean;
  includeFinancial: boolean;
  includeNarrative: boolean;
  includeSheet: boolean;
  imageTerminology: ReturnType<typeof getReportProfileSemantics>['imageTerminology'];
  professional: ReportProfessionalVm;
  date: string;
  dateLabel: string;
  narrative: string;
  records: ProjectData[];
  findings: RasFindingVm[];
  letteredSections: LetterAssignedSection[];
  /** RAS registered sources. Null for Assessment (ReportPreview keeps current Assessment cover). */
  ras: null | {
    projectDescription: string;
    typeOfWork: string;
    tabsProjectNumber: string;
    tenantFunded: boolean | null;
    registeredFacility: RasRegisteredFacilityVm;
    designFirm: RasDesignFirmVm;
    owner: RasOwnerVm;
    cover: RasCoverGroupsVm;
  };
};

export type BuildReportViewModelInput = {
  profile: ReportProfile;
  project: Project;
  facility?: Facility | null;
  inspectors?: Inspector[] | null;
  records?: ProjectData[] | null;
  client?: Client | null;
  locations?: Location[] | null;
  glossary?: Glossary[] | null;
  sectionContent?: RasSectionContentFlags;
};

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function rasWorkModeForProfile(profile: ReportProfile): RasWorkMode | null {
  if (profile === 'plan_review') return 'plan_review';
  if (profile === 'inspection') return 'inspection';
  return null;
}

function emptyProfessional(): ReportProfessionalVm {
  return { id: '', name: '', title: '', rasNumber: '' };
}

function resolveProfessional(
  profile: ReportProfile,
  project: Project,
  inspectors: Inspector[] | null | undefined
): ReportProfessionalVm {
  const workContext = rasWorkModeForProfile(profile);
  const row = resolveCurrentWorkflowResponsibleProfessional(project, inspectors ?? [], workContext);
  if (!row) return emptyProfessional();
  return {
    id: text(row.fldInspID),
    name: text(row.fldInspName),
    title: text(row.fldTitle),
    rasNumber: text(row.fldRasNumber),
  };
}

function resolveRasDate(profile: ReportProfile, project: Project): string {
  if (profile === 'plan_review') return text(project.fldPlanReviewDate);
  if (profile === 'inspection') return text(project.fldInspectionDate);
  return text(project.fldPDDate);
}

function toFindingVm(
  record: ProjectData,
  profile: ReportProfile,
  locations: Location[] | null | undefined,
  glossary: Glossary[] | null | undefined
): RasFindingVm {
  const cleanKey = (record.fldData || '').trim().toLowerCase();
  const glos = glossary?.find((g) => (g.fldGlosId || '').trim().toLowerCase() === cleanKey);
  return {
    id: text(record.fldPDataID),
    finding: text(record.fldFindLong) || text(record.fldFindShort),
    standardIds: getRecordStandardIds(record, glos),
    locator: getRecordLocator(record, profile, locations),
    images: Array.isArray(record.fldImages) ? record.fldImages.slice() : [],
  };
}

/**
 * Semantic report view-model. Assessment returns a compatible shell without RAS cover groups
 * so current Assessment PDF behavior is not encoded as Client-as-Owner here.
 */
export function buildReportViewModel(input: BuildReportViewModelInput): ReportViewModel {
  const profile = input.profile;
  const semantics = getReportProfileSemantics(profile);
  const project = input.project;
  const records = filterRecordsForReportProfile(input.records, profile);
  const professional = resolveProfessional(profile, project, input.inspectors);
  const date = resolveRasDate(profile, project);
  const facilityId = text(input.facility?.fldFacID);
  const narrative = resolveFacilityReportNarrative(project, facilityId);

  const findings = records.map((record) =>
    toFindingVm(record, profile, input.locations, input.glossary)
  );

  const letteredSections =
    profile === 'assessment' ? [] : getRasLetteredSections(profile, input.sectionContent);

  const base: ReportViewModel = {
    profile,
    title: semantics.title,
    standardsLine: semantics.standardsLine,
    projectName: text(project.fldProjName),
    ocgProjectNumber: text(project.fldProjNumber),
    architectProjectNumber: text(project.fldExternalRef),
    includeRecommendations: semantics.includeRecommendations,
    includeCosts: semantics.includeCosts,
    includeFinancial: semantics.includeFinancial,
    includeNarrative: semantics.includeNarrative,
    includeSheet: semantics.includeSheet,
    imageTerminology: semantics.imageTerminology,
    professional,
    date,
    dateLabel: semantics.dateLabel,
    narrative,
    records,
    findings,
    letteredSections,
    ras: null,
  };

  if (profile === 'assessment') {
    return base;
  }

  const registered = project.tdlrRegistered;
  const site = registered?.site;
  const owner = registered?.owner;
  const designFirm = registered?.designFirm;
  const registeredFacility: RasRegisteredFacilityVm = {
    facilityName: text(site?.facilityName),
    address: text(site?.address),
    city: text(site?.city),
    state: text(site?.state),
    zip: text(site?.zip),
    county: text(site?.county),
  };
  const ownerVm: RasOwnerVm = {
    name: text(owner?.name),
    address: text(owner?.address),
    city: text(owner?.city),
    state: text(owner?.state),
    zip: text(owner?.zip),
    contactName: text(owner?.contactName),
  };
  const designFirmVm: RasDesignFirmVm = {
    name: text(designFirm?.name),
    designProfessionalName: text(designFirm?.designProfessionalName),
  };
  const projectDescription = text(registered?.scopeOfWork);
  const typeOfWork = text(registered?.typeOfWork);
  const tenantFunded = registered?.tenantFunded ?? null;
  const tabsProjectNumber = text(registered?.tabsProjectNumber);

  const cover: RasCoverGroupsVm = {
    header: {
      title: semantics.title,
      standardsLine: semantics.standardsLine,
    },
    ocgInformation: {
      professionalName: professional.name,
      rasNumber: professional.rasNumber,
      professionalRoleLabel: semantics.professionalRoleLabel,
      designFirmName: designFirmVm.name,
      date,
      dateLabel: semantics.dateLabel,
      typeOfWork,
      ocgProjectNumber: text(project.fldProjNumber),
      tabsProjectNumber,
    },
    projectInformation: {
      projectName: text(project.fldProjName),
      facilityName: registeredFacility.facilityName,
      address: registeredFacility.address,
      city: registeredFacility.city,
      state: registeredFacility.state,
      zip: registeredFacility.zip,
      projectDescription,
      tenantFunded,
    },
    ownerInformation: ownerVm,
  };

  return {
    ...base,
    ras: {
      projectDescription,
      typeOfWork,
      tabsProjectNumber,
      tenantFunded,
      registeredFacility,
      designFirm: designFirmVm,
      owner: ownerVm,
      cover,
    },
  };
}
