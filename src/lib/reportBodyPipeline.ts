/**
 * Slice C: profile-scoped PDF body pipeline helpers.
 * Does not infer Review vs Inspection. Callers pass an explicit ReportProfile.
 * Web Report does not import this module.
 */

import type {
  Category,
  Facility,
  Finding,
  Glossary,
  Item,
  Location,
  Project,
  ProjectData,
} from '../types';
import {
  filterReportProjectForPreview,
  getReportSectionAvailability,
  type ReportRecordSortOrder,
} from './reportPreviewShared';
import {
  filterRecordsForReportProfile,
  getReportProfileSemantics,
  type LetterAssignedSection,
  type ReportProfile,
  type ReportSectionKey,
} from './reportProfile';

export function getProfileScopedPreviewRecords(
  projectData: ProjectData[],
  project: Project,
  facility: Facility,
  glossary: Glossary[],
  categories: Category[],
  items: Item[],
  locations: Location[],
  findings: Finding[],
  profile: ReportProfile,
  recordSortOrder?: ReportRecordSortOrder
): ProjectData[] {
  const scoped = filterReportProjectForPreview(
    projectData,
    project,
    facility,
    glossary,
    categories,
    items,
    locations,
    findings,
    recordSortOrder
  );
  return filterRecordsForReportProfile(scoped, profile);
}

/** Content availability from records already scoped to Project/Facility + profile. */
export function getReportSectionAvailabilityForProfile(
  projectData: ProjectData[],
  project: Project,
  facility: Facility,
  glossary: Glossary[],
  standards: Parameters<typeof getReportSectionAvailability>[4],
  categories: Category[],
  items: Item[],
  locations: Location[],
  findings: Finding[],
  profile: ReportProfile
): { hasReferencedStandards: boolean; hasPhotoAddendum: boolean } {
  const scoped = getProfileScopedPreviewRecords(
    projectData,
    project,
    facility,
    glossary,
    categories,
    items,
    locations,
    findings,
    profile
  );
  return getReportSectionAvailability(
    scoped,
    project,
    facility,
    glossary,
    standards,
    categories,
    items,
    locations,
    findings
  );
}

export type NormalizedReportBodySectionSelection = {
  cover: true;
  narrative: boolean;
  documentation: boolean;
  financial: boolean;
  referencedStandards: boolean;
  photoAddendum: boolean;
  recordSortOrder: ReportRecordSortOrder;
};

export function normalizeReportBodySectionSelection(
  profile: ReportProfile,
  selection?: Partial<NormalizedReportBodySectionSelection> | null
): NormalizedReportBodySectionSelection {
  const semantics = getReportProfileSemantics(profile);
  const recordSortOrder: ReportRecordSortOrder =
    selection?.recordSortOrder === 'location_category_item'
      ? 'location_category_item'
      : 'category_location_item';
  return {
    cover: true,
    narrative: selection?.narrative ?? true,
    documentation: selection?.documentation ?? true,
    financial: semantics.includeFinancial ? (selection?.financial ?? true) : false,
    referencedStandards: selection?.referencedStandards ?? true,
    photoAddendum: selection?.photoAddendum ?? true,
    recordSortOrder,
  };
}

export function formatRasSectionHeading(letter: string, title: string): string {
  return `${letter} — ${title}`;
}

export function formatRasSectionPageNumber(letter: string, pageIndex: number): string {
  return `${letter}${pageIndex}`;
}

export function getLetteredRasSection(
  lettered: LetterAssignedSection[],
  key: ReportSectionKey
): LetterAssignedSection | undefined {
  return lettered.find((section) => section.key === key);
}

export function rasBodySectionHeading(
  lettered: LetterAssignedSection[],
  key: ReportSectionKey,
  assessmentFallback: string
): string {
  const section = getLetteredRasSection(lettered, key);
  if (!section) return assessmentFallback;
  return formatRasSectionHeading(section.letter, section.title);
}

export function rasBodyPageNumber(
  lettered: LetterAssignedSection[],
  key: ReportSectionKey,
  pageIndex: number,
  assessmentFallback: string
): string {
  const section = getLetteredRasSection(lettered, key);
  if (!section) return assessmentFallback;
  return formatRasSectionPageNumber(section.letter, pageIndex);
}
