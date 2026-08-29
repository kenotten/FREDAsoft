import { describe, expect, it } from 'vitest';
import { rasCoverFooterIdentityText } from '../rasReportCoverDisplay';
import { getReportFooterIdentity } from '../reportPreviewShared';

const PROJECT_NAME = 'TDLR Registered Project Name';
const FREDA_FACILITY = 'Operational FREDA Facility';
const REGISTERED_FACILITY = 'Registered Facility';

describe('getReportFooterIdentity', () => {
  it('uses Project Name on Plan Review body pages', () => {
    expect(getReportFooterIdentity('plan_review', PROJECT_NAME, FREDA_FACILITY)).toBe(PROJECT_NAME);
  });

  it('uses Project Name on Inspection body pages', () => {
    expect(getReportFooterIdentity('inspection', PROJECT_NAME, FREDA_FACILITY)).toBe(PROJECT_NAME);
  });

  it('does not use FREDA Facility name on RAS body pages', () => {
    const planReview = getReportFooterIdentity('plan_review', PROJECT_NAME, FREDA_FACILITY);
    const inspection = getReportFooterIdentity('inspection', PROJECT_NAME, FREDA_FACILITY);
    expect(planReview).not.toBe(FREDA_FACILITY);
    expect(inspection).not.toBe(FREDA_FACILITY);
  });

  it('does not use registered Facility name on RAS body pages', () => {
    const identity = getReportFooterIdentity('plan_review', PROJECT_NAME, REGISTERED_FACILITY);
    expect(identity).toBe(PROJECT_NAME);
    expect(identity).not.toBe(REGISTERED_FACILITY);
    expect(getReportFooterIdentity('inspection', PROJECT_NAME, REGISTERED_FACILITY)).not.toBe(
      REGISTERED_FACILITY
    );
  });

  it('yields a blank identity when RAS Project Name is missing', () => {
    expect(getReportFooterIdentity('plan_review', '', FREDA_FACILITY)).toBe('');
    expect(getReportFooterIdentity('plan_review', '   ', FREDA_FACILITY)).toBe('');
    expect(getReportFooterIdentity('plan_review', null, FREDA_FACILITY)).toBe('');
    expect(getReportFooterIdentity('plan_review', undefined, REGISTERED_FACILITY)).toBe('');
    expect(getReportFooterIdentity('inspection', '', FREDA_FACILITY)).toBe('');
    expect(getReportFooterIdentity('inspection', null, REGISTERED_FACILITY)).toBe('');
  });

  it('keeps Assessment footer as FREDA Facility name', () => {
    expect(getReportFooterIdentity('assessment', PROJECT_NAME, FREDA_FACILITY)).toBe(FREDA_FACILITY);
    expect(getReportFooterIdentity('assessment', '', FREDA_FACILITY)).toBe(FREDA_FACILITY);
    expect(getReportFooterIdentity('assessment', PROJECT_NAME, REGISTERED_FACILITY)).toBe(
      REGISTERED_FACILITY
    );
  });
});

describe('RAS cover footer remains omitted', () => {
  it('stays blank and is not Project Name or any Facility name', () => {
    expect(rasCoverFooterIdentityText()).toBe('');
    expect(rasCoverFooterIdentityText()).not.toBe(PROJECT_NAME);
    expect(rasCoverFooterIdentityText()).not.toBe(FREDA_FACILITY);
    expect(rasCoverFooterIdentityText()).not.toBe(REGISTERED_FACILITY);
  });
});
