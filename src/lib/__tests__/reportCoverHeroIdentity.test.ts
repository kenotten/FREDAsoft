import { describe, expect, it } from 'vitest';
import { rasCoverFooterIdentityText } from '../rasReportCoverDisplay';
import { getReportCoverHeroIdentity, getReportFooterIdentity } from '../reportPreviewShared';
import type { Facility, Project } from '../../types';

const PROJECT_NAME = 'Assessment Project Hero';
const FACILITY_NAME = 'Operational FREDA Facility';
const CLIENT_NAME = 'Should Not Appear As Hero';
const OCG_PROJECT_NUMBER = '26-08-00001';
const TABS_NUMBER = 'TABS20XX004853';

const project: Pick<Project, 'fldProjName' | 'fldProjNumber'> = {
  fldProjName: PROJECT_NAME,
  fldProjNumber: OCG_PROJECT_NUMBER,
};

const facility: Pick<Facility, 'fldFacName'> = {
  fldFacName: FACILITY_NAME,
};

describe('getReportCoverHeroIdentity', () => {
  it('uses project.fldProjName as the Assessment cover hero', () => {
    expect(getReportCoverHeroIdentity('assessment', project, facility)).toBe(PROJECT_NAME);
    expect(getReportCoverHeroIdentity('assessment', project, facility)).toBe(project.fldProjName);
  });

  it('does not use facility.fldFacName as the Assessment cover hero', () => {
    const hero = getReportCoverHeroIdentity('assessment', project, facility);
    expect(hero).not.toBe(FACILITY_NAME);
    expect(hero).not.toBe(facility.fldFacName);
  });

  it('keeps Plan Review cover hero as fldProjName', () => {
    expect(getReportCoverHeroIdentity('plan_review', project, facility)).toBe(PROJECT_NAME);
    expect(getReportCoverHeroIdentity('plan_review', project, facility)).not.toBe(FACILITY_NAME);
  });

  it('keeps Inspection cover hero as fldProjName', () => {
    expect(getReportCoverHeroIdentity('inspection', project, facility)).toBe(PROJECT_NAME);
    expect(getReportCoverHeroIdentity('inspection', project, facility)).not.toBe(FACILITY_NAME);
  });

  it('does not use Client, OCG Project #, or TABS # as the hero', () => {
    const hero = getReportCoverHeroIdentity('assessment', project, facility);
    expect(hero).not.toBe(CLIENT_NAME);
    expect(hero).not.toBe(OCG_PROJECT_NUMBER);
    expect(hero).not.toBe(TABS_NUMBER);
  });

  it('yields a blank hero when Project Name is missing — no Facility fallback', () => {
    expect(getReportCoverHeroIdentity('assessment', { fldProjName: '' }, facility)).toBe('');
    expect(getReportCoverHeroIdentity('assessment', { fldProjName: '   ' }, facility)).toBe('');
    expect(
      getReportCoverHeroIdentity('assessment', { fldProjName: undefined as unknown as string }, facility)
    ).toBe('');
    expect(getReportCoverHeroIdentity('plan_review', { fldProjName: '' }, facility)).toBe('');
    expect(getReportCoverHeroIdentity('inspection', { fldProjName: '' }, { fldFacName: FACILITY_NAME })).toBe(
      ''
    );
    expect(getReportCoverHeroIdentity('assessment', { fldProjName: '' }, facility)).not.toBe(FACILITY_NAME);
  });
});

describe('Assessment Facility information remains outside the hero', () => {
  it('keeps Assessment body footer as Facility Name', () => {
    expect(getReportFooterIdentity('assessment', PROJECT_NAME, FACILITY_NAME)).toBe(FACILITY_NAME);
    expect(getReportCoverHeroIdentity('assessment', project, facility)).not.toBe(
      getReportFooterIdentity('assessment', PROJECT_NAME, FACILITY_NAME)
    );
  });

  it('does not change RAS cover footer omission', () => {
    expect(rasCoverFooterIdentityText()).toBe('');
    expect(rasCoverFooterIdentityText()).not.toBe(PROJECT_NAME);
    expect(rasCoverFooterIdentityText()).not.toBe(FACILITY_NAME);
  });
});
