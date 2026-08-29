/**
 * Selectable report sections = report-profile semantics + content availability.
 * Does not infer Review vs Inspection; callers pass an explicit profile.
 */

import { getReportProfileSemantics, isRasReportProfile, type ReportProfile } from './reportProfile';

export type ReportSectionContentAvailability = {
  hasReferencedStandards: boolean;
  hasPhotoAddendum: boolean;
};

export type SelectableReportSections = ReportSectionContentAvailability & {
  hasFinancial: boolean;
};

export type OfferedReportSectionKey =
  | 'cover'
  | 'narrative'
  | 'documentation'
  | 'financial'
  | 'referencedStandards'
  | 'photoAddendum';

export function getSelectableReportSections(
  profile: ReportProfile,
  content: ReportSectionContentAvailability
): SelectableReportSections {
  const semantics = getReportProfileSemantics(profile);
  return {
    hasFinancial: semantics.includeFinancial,
    hasReferencedStandards: content.hasReferencedStandards,
    hasPhotoAddendum: content.hasPhotoAddendum,
  };
}

/** Keys offered in the section-selection UI. Omitted keys are absent, not disabled. */
export function listOfferedReportSectionKeys(
  availability: SelectableReportSections
): OfferedReportSectionKey[] {
  const keys: OfferedReportSectionKey[] = ['cover', 'narrative', 'documentation'];
  if (availability.hasFinancial) keys.push('financial');
  if (availability.hasReferencedStandards) keys.push('referencedStandards');
  if (availability.hasPhotoAddendum) keys.push('photoAddendum');
  return keys;
}

/** Display labels for the section dialog. Assessment strings stay as they are today. */
export function getReportSectionDialogLabels(profile: ReportProfile): {
  documentation: string;
  photoAddendum: string;
} {
  if (!isRasReportProfile(profile)) {
    return { documentation: 'Documentation', photoAddendum: 'Photo addendum' };
  }
  const semantics = getReportProfileSemantics(profile);
  return {
    documentation: 'Findings',
    photoAddendum: semantics.imageTerminology.addendum,
  };
}
