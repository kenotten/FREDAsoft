import { describe, expect, it } from 'vitest';
import { getReportProfileSemantics, selectReportProfile } from '../reportProfile';
import {
  getReportSectionDialogLabels,
  getSelectableReportSections,
  listOfferedReportSectionKeys,
  type ReportSectionContentAvailability,
} from '../reportSectionAvailability';

const withContent: ReportSectionContentAvailability = {
  hasReferencedStandards: true,
  hasPhotoAddendum: true,
};

const withoutOptionalContent: ReportSectionContentAvailability = {
  hasReferencedStandards: false,
  hasPhotoAddendum: false,
};

describe('getSelectableReportSections', () => {
  it('Assessment offers Financial (checked-available, not hidden)', () => {
    const availability = getSelectableReportSections('assessment', withContent);
    expect(availability.hasFinancial).toBe(true);
    expect(listOfferedReportSectionKeys(availability)).toContain('financial');
    expect(getReportProfileSemantics('assessment').includeFinancial).toBe(true);
  });

  it('Plan Review excludes Financial from the offered set', () => {
    const availability = getSelectableReportSections('plan_review', withContent);
    expect(availability.hasFinancial).toBe(false);
    expect(listOfferedReportSectionKeys(availability)).not.toContain('financial');
  });

  it('Inspection excludes Financial from the offered set', () => {
    const availability = getSelectableReportSections('inspection', withContent);
    expect(availability.hasFinancial).toBe(false);
    expect(listOfferedReportSectionKeys(availability)).not.toContain('financial');
  });

  it('RAS Financial is absent, not merely disabled', () => {
    for (const profile of ['plan_review', 'inspection'] as const) {
      const keys = listOfferedReportSectionKeys(getSelectableReportSections(profile, withContent));
      expect(keys).not.toContain('financial');
      expect(keys).toEqual(['cover', 'narrative', 'documentation', 'referencedStandards', 'photoAddendum']);
    }
  });

  it('switching Review ↔ Inspection does not reintroduce Financial', () => {
    const project = { fldProjType: 'TAS/RAS' as const };
    const review = selectReportProfile(project, 'plan_review');
    const inspection = selectReportProfile(project, 'inspection');
    expect(review).toBe('plan_review');
    expect(inspection).toBe('inspection');

    const reviewKeys = listOfferedReportSectionKeys(getSelectableReportSections(review, withContent));
    const inspectionKeys = listOfferedReportSectionKeys(
      getSelectableReportSections(inspection, withContent)
    );
    expect(reviewKeys).not.toContain('financial');
    expect(inspectionKeys).not.toContain('financial');
    expect(reviewKeys).toEqual(inspectionKeys);
  });

  it('Assessment remains unchanged when optional addenda are absent', () => {
    const availability = getSelectableReportSections('assessment', withoutOptionalContent);
    expect(availability.hasFinancial).toBe(true);
    expect(availability.hasReferencedStandards).toBe(false);
    expect(availability.hasPhotoAddendum).toBe(false);
    expect(listOfferedReportSectionKeys(availability)).toEqual([
      'cover',
      'narrative',
      'documentation',
      'financial',
    ]);
  });

  it('dialog labels: Assessment Documentation / Photo addendum; RAS Findings and addendum terms', () => {
    expect(getReportSectionDialogLabels('assessment')).toEqual({
      documentation: 'Documentation',
      photoAddendum: 'Photo addendum',
    });
    expect(getReportSectionDialogLabels('plan_review')).toEqual({
      documentation: 'Findings',
      photoAddendum: 'Image Addendum',
    });
    expect(getReportSectionDialogLabels('inspection')).toEqual({
      documentation: 'Findings',
      photoAddendum: 'Photo Addendum',
    });
  });

  it('passes through content availability without inferring Review vs Inspection', () => {
    const planReview = getSelectableReportSections('plan_review', withoutOptionalContent);
    const inspection = getSelectableReportSections('inspection', withoutOptionalContent);
    expect(planReview).toEqual({
      hasFinancial: false,
      hasReferencedStandards: false,
      hasPhotoAddendum: false,
    });
    expect(inspection).toEqual(planReview);
  });
});
