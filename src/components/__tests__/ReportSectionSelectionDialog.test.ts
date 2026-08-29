import { describe, expect, it } from 'vitest';
import { offeredReportSectionDialogKeys } from '../ReportSectionSelectionDialog';
import { getSelectableReportSections } from '../../lib/reportSectionAvailability';

describe('ReportSectionSelectionDialog offered keys', () => {
  it('Assessment dialog includes Financial', () => {
    const keys = offeredReportSectionDialogKeys(
      getSelectableReportSections('assessment', {
        hasReferencedStandards: true,
        hasPhotoAddendum: true,
      })
    );
    expect(keys).toContain('financial');
  });

  it('Plan Review dialog omits Financial entirely', () => {
    const keys = offeredReportSectionDialogKeys(
      getSelectableReportSections('plan_review', {
        hasReferencedStandards: true,
        hasPhotoAddendum: true,
      })
    );
    expect(keys).not.toContain('financial');
  });

  it('Inspection dialog omits Financial entirely', () => {
    const keys = offeredReportSectionDialogKeys(
      getSelectableReportSections('inspection', {
        hasReferencedStandards: true,
        hasPhotoAddendum: true,
      })
    );
    expect(keys).not.toContain('financial');
  });
});
