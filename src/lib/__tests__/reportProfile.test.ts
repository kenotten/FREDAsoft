import { describe, expect, it } from 'vitest';
import {
  assignRasSectionLetters,
  filterRecordsForReportProfile,
  getRasLetteredSections,
  getRecordLocator,
  getReportProfileSemantics,
  resolveViewReportProfile,
  selectReportProfile,
} from '../reportProfile';

describe('selectReportProfile', () => {
  it('selects assessment for Assessment projects', () => {
    expect(selectReportProfile({ fldProjType: 'Assessment' }, 'plan_review')).toBe('assessment');
    expect(selectReportProfile({ fldProjType: 'Assessment' }, 'inspection')).toBe('assessment');
  });

  it('selects plan_review for TAS/RAS + Review context', () => {
    expect(selectReportProfile({ fldProjType: 'TAS/RAS' }, 'plan_review')).toBe('plan_review');
  });

  it('selects inspection for TAS/RAS + Inspection context', () => {
    expect(selectReportProfile({ fldProjType: 'TAS/RAS' }, 'inspection')).toBe('inspection');
  });

  it('does not infer from omitted records/sheet — TAS/RAS without mode defaults to inspection', () => {
    expect(selectReportProfile({ fldProjType: 'TAS/RAS' }, null)).toBe('inspection');
  });

  it('switches Review ↔ Inspection from sticky work mode only', () => {
    const project = { fldProjType: 'TAS/RAS' as const };
    expect(selectReportProfile(project, 'plan_review')).toBe('plan_review');
    expect(selectReportProfile(project, 'inspection')).toBe('inspection');
    expect(resolveViewReportProfile(project, 'plan_review')).toBe('plan_review');
    expect(resolveViewReportProfile(project, 'inspection')).toBe('inspection');
  });

  it('does not infer profile from records — only project type + sticky work mode', () => {
    const project = { fldProjType: 'TAS/RAS' as const };
    expect(selectReportProfile(project, 'inspection')).toBe('inspection');
    expect(selectReportProfile(project, 'plan_review')).toBe('plan_review');
    expect(resolveViewReportProfile(project, 'inspection')).toBe('inspection');
  });
});

describe('filterRecordsForReportProfile', () => {
  const mixed = [
    { id: 'pr', fldWorkProduct: 'plan_review' as const },
    { id: 'ins', fldWorkProduct: 'inspection' as const },
    { id: 'as', fldWorkProduct: 'assessment' as const },
    { id: 'legacy' },
    { id: 'blank', fldWorkProduct: '  ' },
  ];

  it('Plan Review includes explicit plan_review only', () => {
    const ids = filterRecordsForReportProfile(mixed, 'plan_review').map((r) => r.id);
    expect(ids).toEqual(['pr']);
  });

  it('Plan Review excludes legacy missing', () => {
    const legacy: Array<{ id: string; fldWorkProduct?: unknown }> = [{ id: 'legacy' }];
    expect(filterRecordsForReportProfile(legacy, 'plan_review')).toEqual([]);
  });

  it('Inspection includes explicit inspection', () => {
    const ids = filterRecordsForReportProfile(mixed, 'inspection').map((r) => r.id);
    expect(ids).toContain('ins');
  });

  it('Inspection includes legacy missing TAS/RAS rows', () => {
    const ids = filterRecordsForReportProfile(mixed, 'inspection').map((r) => r.id);
    expect(ids).toContain('legacy');
    expect(ids).toContain('blank');
  });

  it('Inspection excludes plan_review and explicit assessment', () => {
    const ids = filterRecordsForReportProfile(mixed, 'inspection').map((r) => r.id);
    expect(ids).not.toContain('pr');
    expect(ids).not.toContain('as');
  });

  it('Assessment preserves passed records', () => {
    expect(filterRecordsForReportProfile(mixed, 'assessment')).toEqual(mixed);
  });
});

describe('getReportProfileSemantics', () => {
  it('Plan Review excludes rec/cost/financial and includes Narrative', () => {
    const s = getReportProfileSemantics('plan_review');
    expect(s.title).toBe('Plan Review Report');
    expect(s.standardsLine).toBe('2012 Texas Accessibility Standards');
    expect(s.includeRecommendations).toBe(false);
    expect(s.includeCosts).toBe(false);
    expect(s.includeFinancial).toBe(false);
    expect(s.includeNarrative).toBe(true);
    expect(s.includeSheet).toBe(true);
    expect(s.imageTerminology).toEqual({
      singular: 'Image',
      plural: 'Images',
      addendum: 'Image Addendum',
    });
  });

  it('Inspection uses Photo terminology and Inspection Date', () => {
    const s = getReportProfileSemantics('inspection');
    expect(s.title).toBe('Inspection Report');
    expect(s.dateLabel).toBe('Inspection Date');
    expect(s.dateField).toBe('fldInspectionDate');
    expect(s.includeSheet).toBe(false);
    expect(s.includeFinancial).toBe(false);
    expect(s.imageTerminology.addendum).toBe('Photo Addendum');
    expect(s.imageTerminology.singular).toBe('Photo');
  });

  it('Assessment preserves rec/cost/financial', () => {
    const s = getReportProfileSemantics('assessment');
    expect(s.includeRecommendations).toBe(true);
    expect(s.includeCosts).toBe(true);
    expect(s.includeFinancial).toBe(true);
  });
});

describe('getRecordLocator', () => {
  const locations = [{ fldLocID: 'loc-1', fldLocName: 'Restroom' }];

  it('Plan Review exposes Location + optional Sheet', () => {
    expect(
      getRecordLocator({ fldLocation: 'loc-1', fldSheet: 'A2.1' }, 'plan_review', locations)
    ).toEqual({ location: 'Restroom', sheet: 'A2.1' });
  });

  it('Inspection exposes Location only', () => {
    expect(
      getRecordLocator({ fldLocation: 'loc-1', fldSheet: 'A2.1' }, 'inspection', locations)
    ).toEqual({ location: 'Restroom' });
  });
});

describe('RAS section lettering', () => {
  it('assigns A then B then C to included sections', () => {
    const lettered = getRasLetteredSections('inspection', { hasReferencedStandards: true });
    expect(lettered.map((s) => s.letter)).toEqual(['A', 'B', 'C']);
    expect(lettered[0]).toMatchObject({ key: 'narrative', title: 'Narrative' });
    expect(lettered[1]).toMatchObject({ key: 'findings', title: 'Findings' });
    expect(lettered[2]).toMatchObject({ key: 'referenced_standards' });
  });

  it('adds D when addendum is included', () => {
    const lettered = getRasLetteredSections('plan_review', {
      hasReferencedStandards: true,
      hasImageAddendum: true,
    });
    expect(lettered.map((s) => s.letter)).toEqual(['A', 'B', 'C', 'D']);
    expect(lettered[3].title).toBe('Image Addendum');
  });

  it('omitted optional section closes letter gaps', () => {
    const lettered = getRasLetteredSections('inspection', { hasImageAddendum: true });
    expect(lettered.map((s) => `${s.letter} ${s.title}`)).toEqual([
      'A Narrative',
      'B Findings',
      'C Photo Addendum',
    ]);
  });

  it('does not hard-code Standards as A', () => {
    const lettered = assignRasSectionLetters([
      { key: 'findings', title: 'Findings' },
      { key: 'referenced_standards', title: 'Referenced Standards' },
    ]);
    expect(lettered[0].letter).toBe('A');
    expect(lettered[0].key).toBe('findings');
    expect(lettered[1].letter).toBe('B');
  });

  it('does not letter Assessment sections', () => {
    expect(getRasLetteredSections('assessment', { hasReferencedStandards: true })).toEqual([]);
  });

  it('omitting Narrative closes the letter gap so Findings is A', () => {
    const lettered = getRasLetteredSections(
      'plan_review',
      { hasReferencedStandards: true, hasImageAddendum: true },
      { narrative: false, findings: true }
    );
    expect(lettered.map((s) => `${s.letter} ${s.title}`)).toEqual([
      'A Findings',
      'B Referenced Standards',
      'C Image Addendum',
    ]);
  });
});
