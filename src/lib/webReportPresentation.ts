/**
 * Web Report presentation helpers (Slice D).
 * Resolves an explicit ReportProfile and presentation labels.
 * Does not invent RAS business rules — reuses reportProfile / adapter / narrative helpers.
 */

import type { Category, Glossary, Item, Location, MasterStandard, Project } from '../types';
import { buildRasFindingCardDisplay, type RasFindingCardDisplay } from './rasFindingCardDisplay';
import {
  filterRecordsForReportProfile,
  getReportProfileSemantics,
  isRasReportProfile,
  selectReportProfile,
  type ReportImageTerminology,
  type ReportProfile,
} from './reportProfile';
import { getReportSectionDialogLabels } from './reportSectionAvailability';
import { resolveReportNarrative } from './reportPreviewShared';
import type { ReportProfessionalVm } from './reportAdapter';
import { loadRasWorkMode } from './rasWorkModeStorage';
import type { RasWorkMode } from './workProduct';
import type { WebReportRecordView } from './webReportTree';

export type WebReportPresentation = {
  profile: ReportProfile;
  /** Viewer chrome. Assessment keeps the current surface title. */
  viewerTitle: string;
  /** Heading-card title. Assessment keeps "Report heading". */
  headingTitle: string;
  reportTitle: string;
  documentationLabel: string;
  documentationHierarchyLabel: string;
  photoAddendumLabel: string;
  imageTerminology: ReportImageTerminology;
  professionalLabel: string;
  dateLabel: string;
  headingGroupLabel: string;
  includeFinancial: boolean;
  includeRecommendations: boolean;
  includeCosts: boolean;
  includeSheet: boolean;
};

export type WebReportFindingPresentation = {
  findingText: string;
  locationLabel: string;
  sheet: string | undefined;
  includeRecommendation: boolean;
  includeCost: boolean;
  recommendationText: string;
  imageUrls: string[];
  imageAlts: string[];
  rasDisplay: RasFindingCardDisplay | null;
};

/**
 * Sticky RAS work mode for the project being viewed.
 * Workspace live mode wins when the viewer is on the subscribed project.
 * A local project change uses that project's existing sticky mode — not persisted on Project.
 */
export function resolveWebReportWorkMode(
  localProjectId: string | null | undefined,
  subscribedProjectId: string | null | undefined,
  workspaceRasWorkMode?: RasWorkMode | null
): RasWorkMode {
  const local = String(localProjectId || '').trim();
  const subscribed = String(subscribedProjectId || '').trim();
  const sameProject =
    Boolean(local) &&
    Boolean(subscribed) &&
    local.toLowerCase() === subscribed.toLowerCase();
  if (sameProject && (workspaceRasWorkMode === 'plan_review' || workspaceRasWorkMode === 'inspection')) {
    return workspaceRasWorkMode;
  }
  return loadRasWorkMode(local || subscribed);
}

export function resolveWebReportProfile(
  project: Pick<Project, 'fldProjType'> | null | undefined,
  rasWorkMode?: RasWorkMode | null
): ReportProfile {
  return selectReportProfile(project, rasWorkMode);
}

export function getWebReportPresentation(profile: ReportProfile): WebReportPresentation {
  const semantics = getReportProfileSemantics(profile);
  const dialogLabels = getReportSectionDialogLabels(profile);
  if (!isRasReportProfile(profile)) {
    return {
      profile,
      viewerTitle: 'Web Report Viewer',
      headingTitle: 'Report heading',
      reportTitle: semantics.title,
      documentationLabel: 'Documentation',
      documentationHierarchyLabel: 'Documentation hierarchy (display only)',
      photoAddendumLabel: 'Photo Addendum',
      imageTerminology: semantics.imageTerminology,
      professionalLabel: 'Inspector',
      dateLabel: 'Inspection date',
      headingGroupLabel: 'Inspection',
      includeFinancial: true,
      includeRecommendations: true,
      includeCosts: true,
      includeSheet: false,
    };
  }
  return {
    profile,
    viewerTitle: 'Web Report Viewer',
    headingTitle: semantics.title,
    reportTitle: semantics.title,
    documentationLabel: dialogLabels.documentation,
    documentationHierarchyLabel: 'Findings hierarchy (display only)',
    photoAddendumLabel: semantics.imageTerminology.addendum,
    imageTerminology: semantics.imageTerminology,
    professionalLabel: semantics.professionalRoleLabel,
    dateLabel: semantics.dateLabel,
    headingGroupLabel: profile === 'plan_review' ? 'Plan Review' : 'Inspection',
    includeFinancial: semantics.includeFinancial,
    includeRecommendations: semantics.includeRecommendations,
    includeCosts: semantics.includeCosts,
    includeSheet: semantics.includeSheet,
  };
}

export function filterWebReportRecordsForProfile<T extends { fldWorkProduct?: unknown }>(
  records: T[] | null | undefined,
  profile: ReportProfile
): T[] {
  return filterRecordsForReportProfile(records, profile);
}

export function resolveWebReportNarrative(
  profile: ReportProfile,
  project: Pick<Project, 'fldFacilityNarratives' | 'fldNarrative' | 'tdlrRegistered'> | null | undefined,
  facilityId: string
): string {
  if (!project) return '';
  return resolveReportNarrative(profile, project, facilityId);
}

export function formatWebReportProfessionalValue(
  profile: ReportProfile,
  professional: ReportProfessionalVm | { name: string; title: string; rasNumber: string } | null | undefined
): string {
  const name = typeof professional?.name === 'string' ? professional.name.trim() : '';
  if (!name) return 'TBD';
  if (!isRasReportProfile(profile)) {
    const title = typeof professional?.title === 'string' ? professional.title.trim() : '';
    return title ? `${name}, ${title}` : name;
  }
  const rasNumber = typeof professional?.rasNumber === 'string' ? professional.rasNumber.trim() : '';
  return rasNumber ? `${name}, RAS #${rasNumber}` : name;
}

export function buildWebReportFindingPresentation(
  view: WebReportRecordView,
  profile: ReportProfile,
  glossary: Glossary[],
  standards: MasterStandard[],
  locations: Location[],
  categories: Category[],
  items: Item[]
): WebReportFindingPresentation {
  const { record } = view;
  if (!isRasReportProfile(profile)) {
    const images = Array.isArray(record.fldImages) ? record.fldImages.slice(0, 2) : [];
    return {
      findingText: record.fldFindLong || view.findingShort,
      locationLabel: view.locationName,
      sheet: undefined,
      includeRecommendation: true,
      includeCost: true,
      recommendationText: record.fldRecLong || record.fldRecShort || '',
      imageUrls: images,
      imageAlts: images.map(() => ''),
      rasDisplay: null,
    };
  }
  const rasDisplay = buildRasFindingCardDisplay(
    record,
    profile,
    glossary,
    standards,
    locations,
    categories,
    items
  );
  return {
    findingText: rasDisplay.findingText,
    locationLabel: rasDisplay.locationLabel,
    sheet: rasDisplay.sheet,
    includeRecommendation: false,
    includeCost: false,
    recommendationText: '',
    imageUrls: rasDisplay.imageUrls,
    imageAlts: rasDisplay.imageAlts,
    rasDisplay,
  };
}

export function webReportPhotoCountLabel(profile: ReportProfile, count: number): string {
  const { singular, plural } = getReportProfileSemantics(profile).imageTerminology;
  const word = count === 1 ? singular.toLowerCase() : plural.toLowerCase();
  return `${count} ${word}`;
}

/** Assessment keeps current date source; RAS uses the profile date from the view-model. */
export function resolveWebReportHeadingDate(
  profile: ReportProfile,
  viewModelDate: string,
  facilityInspectionDate: string | undefined,
  projectPdDate: string | undefined
): string {
  if (isRasReportProfile(profile)) return viewModelDate;
  return facilityInspectionDate || projectPdDate || '';
}
