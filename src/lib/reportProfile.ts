/**
 * Beta RAS report-profile semantics (Slice A).
 * Pure config, selection, record filter, locator, and section lettering.
 * Slice B: View Report selects profile via selectReportProfile / resolveViewReportProfile.
 */

import { isAssessmentProjectType } from './projectMetadataFields';
import { parseWorkProduct, type RasWorkMode } from './workProduct';
import type { Project, ProjectData } from '../types';

export type ReportProfile = 'assessment' | 'plan_review' | 'inspection';

export const RAS_STANDARDS_LINE = '2012 Texas Accessibility Standards';

export type ReportImageTerminology = {
  singular: string;
  plural: string;
  addendum: string;
};

export type ReportProfileSemantics = {
  profile: ReportProfile;
  title: string;
  standardsLine: string;
  professionalRoleLabel: string;
  dateField: 'fldPDDate' | 'fldPlanReviewDate' | 'fldInspectionDate';
  dateLabel: string;
  includeSheet: boolean;
  includeRecommendations: boolean;
  includeCosts: boolean;
  includeFinancial: boolean;
  includeNarrative: boolean;
  imageTerminology: ReportImageTerminology;
};

export type ReportSectionKey = 'narrative' | 'findings' | 'referenced_standards' | 'image_addendum';

export type RecordLocator = {
  location: string;
  sheet?: string;
};

export type LetterAssignedSection = {
  key: ReportSectionKey;
  letter: string;
  title: string;
};

const SECTION_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function isReportProfile(value: unknown): value is ReportProfile {
  return value === 'assessment' || value === 'plan_review' || value === 'inspection';
}

/**
 * Explicit app context only. Does not inspect records, Sheet, images, author, or RAS identity.
 * TAS/RAS with omitted work mode follows the product default: Inspection.
 */
export function selectReportProfile(
  project: Pick<Project, 'fldProjType'> | null | undefined,
  rasWorkMode?: RasWorkMode | null
): ReportProfile {
  if (!project || isAssessmentProjectType(project.fldProjType)) return 'assessment';
  return rasWorkMode === 'plan_review' ? 'plan_review' : 'inspection';
}

/** View Report boundary: same explicit context as `selectReportProfile`. Does not inspect records. */
export function resolveViewReportProfile(
  project: Pick<Project, 'fldProjType'> | null | undefined,
  rasWorkMode?: RasWorkMode | null
): ReportProfile {
  return selectReportProfile(project, rasWorkMode);
}

export function getReportProfileSemantics(profile: ReportProfile): ReportProfileSemantics {
  if (profile === 'plan_review') {
    return {
      profile,
      title: 'Plan Review Report',
      standardsLine: RAS_STANDARDS_LINE,
      professionalRoleLabel: 'Plan Review RAS',
      dateField: 'fldPlanReviewDate',
      dateLabel: 'Plan Review Date',
      includeSheet: true,
      includeRecommendations: false,
      includeCosts: false,
      includeFinancial: false,
      includeNarrative: true,
      imageTerminology: { singular: 'Image', plural: 'Images', addendum: 'Image Addendum' },
    };
  }
  if (profile === 'inspection') {
    return {
      profile,
      title: 'Inspection Report',
      standardsLine: RAS_STANDARDS_LINE,
      professionalRoleLabel: 'Inspection RAS',
      dateField: 'fldInspectionDate',
      dateLabel: 'Inspection Date',
      includeSheet: false,
      includeRecommendations: false,
      includeCosts: false,
      includeFinancial: false,
      includeNarrative: true,
      imageTerminology: { singular: 'Photo', plural: 'Photos', addendum: 'Photo Addendum' },
    };
  }
  return {
    profile: 'assessment',
    title: 'Accessibility Assessment',
    standardsLine: '',
    professionalRoleLabel: 'Inspector',
    dateField: 'fldPDDate',
    dateLabel: 'Inspection Date',
    includeSheet: false,
    includeRecommendations: true,
    includeCosts: true,
    includeFinancial: true,
    includeNarrative: true,
    imageTerminology: { singular: 'Photo', plural: 'Photos', addendum: 'Photo Addendum' },
  };
}

function isMissingWorkProduct(record: { fldWorkProduct?: unknown } | null | undefined): boolean {
  return parseWorkProduct(record?.fldWorkProduct) === '';
}

/**
 * Work-product filter for records that are already Project/Facility-scoped.
 * Assessment: identity (current Assessment semantics).
 * Plan Review: explicit plan_review only (no missing-field fallback).
 * Inspection: explicit inspection plus missing/blank fldWorkProduct (legacy TAS/RAS).
 * Does not classify by author, RAS, Sheet, or images.
 */
export function filterRecordsForReportProfile<T extends { fldWorkProduct?: unknown }>(
  records: T[] | null | undefined,
  profile: ReportProfile
): T[] {
  const list = Array.isArray(records) ? records : [];
  if (profile === 'assessment') return list;
  if (profile === 'plan_review') {
    return list.filter((r) => parseWorkProduct(r.fldWorkProduct) === 'plan_review');
  }
  return list.filter((r) => {
    const explicit = parseWorkProduct(r.fldWorkProduct);
    return explicit === 'inspection' || isMissingWorkProduct(r);
  });
}

export function getRecordLocator(
  record: Pick<ProjectData, 'fldLocation' | 'fldSheet'> | null | undefined,
  profile: ReportProfile,
  locations?: { fldLocID: string; fldLocName?: string }[] | null
): RecordLocator {
  const locId = typeof record?.fldLocation === 'string' ? record.fldLocation.trim() : '';
  const named = locations?.find((l) => l.fldLocID === locId)?.fldLocName?.trim();
  const location = named || locId;
  if (profile !== 'plan_review') return { location };
  const sheet = typeof record?.fldSheet === 'string' ? record.fldSheet.trim() : '';
  return sheet ? { location, sheet } : { location };
}

export type RasSectionContentFlags = {
  hasReferencedStandards?: boolean;
  hasImageAddendum?: boolean;
};

export function listRasIncludedSections(
  profile: ReportProfile,
  content: RasSectionContentFlags = {}
): { key: ReportSectionKey; title: string }[] {
  if (profile === 'assessment') return [];
  const semantics = getReportProfileSemantics(profile);
  const sections: { key: ReportSectionKey; title: string }[] = [];
  if (semantics.includeNarrative) {
    sections.push({ key: 'narrative', title: 'Narrative' });
  }
  sections.push({ key: 'findings', title: 'Findings' });
  if (content.hasReferencedStandards) {
    sections.push({ key: 'referenced_standards', title: 'Referenced Standards' });
  }
  if (content.hasImageAddendum) {
    sections.push({ key: 'image_addendum', title: semantics.imageTerminology.addendum });
  }
  return sections;
}

/** Sequential A, B, C… for actually included RAS sections after the cover. Not Assessment lettering. */
export function assignRasSectionLetters(
  sections: { key: ReportSectionKey; title: string }[]
): LetterAssignedSection[] {
  return sections.map((section, index) => ({
    ...section,
    letter: SECTION_LETTERS[index] ?? String(index + 1),
  }));
}

export function getRasLetteredSections(
  profile: ReportProfile,
  content: RasSectionContentFlags = {}
): LetterAssignedSection[] {
  return assignRasSectionLetters(listRasIncludedSections(profile, content));
}
