import { describe, expect, it } from 'vitest';
import type { Category, Facility, Finding, Glossary, Item, Location, MasterStandard, Project, ProjectData } from '../../types';
import {
  formatRasSectionHeading,
  formatRasSectionPageNumber,
  getProfileScopedPreviewRecords,
  getReportSectionAvailabilityForProfile,
  normalizeReportBodySectionSelection,
  rasBodyPageNumber,
  rasBodySectionHeading,
} from '../reportBodyPipeline';
import { getRasLetteredSections } from '../reportProfile';

function makeProjectData(partial: Partial<ProjectData> & { fldPDataID: string }): ProjectData {
  return {
    fldPDataProject: 'proj-1',
    fldFacility: 'fac-1',
    fldData: '',
    fldLocation: 'loc-1',
    fldFindShort: '',
    fldFindLong: 'Finding text',
    fldRecShort: 'Rec short',
    fldRecLong: 'DO NOT SHOW REC BODY',
    fldQTY: 1,
    fldUnitCost: 999,
    fldTotalCost: 999,
    fldImages: [],
    fldInspID: 'insp-1',
    fldTimestamp: '',
    ...partial,
  };
}

const project: Project = {
  fldProjID: 'proj-1',
  fldClient: 'client-1',
  fldDesigner: '',
  fldInspector: '',
  fldProjName: 'Tower',
  fldPDDate: '01/01/2026',
};

const facility: Facility = {
  fldFacID: 'fac-1',
  fldFacName: 'Operational Facility',
  fldClient: 'client-1',
};

const emptyGlossary: Glossary[] = [];
const emptyCategories: Category[] = [];
const emptyItems: Item[] = [];
const emptyLocations: Location[] = [{ fldLocID: 'loc-1', fldLocName: "Men's Restroom", fldFacID: 'fac-1', fldProjectID: 'proj-1' }];
const emptyFindings: Finding[] = [];

const reviewOnlyStandard: MasterStandard = {
  id: 'std-review',
  order: 1,
  chapter_name: 'Ch',
  section_num: '1',
  section_name: 'S',
  citation_num: '201.1',
  citation_name: 'Review only',
  content_text: 'Review citation',
  relation_type: 'Standard',
  fldStandardType: 'TAS',
  fldStandardVersion: '2012',
};

const inspectOnlyStandard: MasterStandard = {
  ...reviewOnlyStandard,
  id: 'std-inspect',
  citation_num: '302.1',
  citation_name: 'Inspection only',
  content_text: 'Inspection citation',
};

const mixedRecords: ProjectData[] = [
  makeProjectData({
    fldPDataID: 'pr',
    fldWorkProduct: 'plan_review',
    fldFindLong: 'Plan review finding',
    fldSheet: 'A2.1',
    fldStandards: ['std-review'],
    fldImages: ['pr0.jpg', 'pr1.jpg', 'pr2.jpg'],
  }),
  makeProjectData({
    fldPDataID: 'ins',
    fldWorkProduct: 'inspection',
    fldFindLong: 'Inspection finding',
    fldSheet: 'SHOULD-NOT-SHOW',
    fldStandards: ['std-inspect'],
    fldImages: ['ins0.jpg', 'ins1.jpg', 'ins2.jpg'],
  }),
  makeProjectData({
    fldPDataID: 'legacy',
    fldFindLong: 'Legacy TAS finding',
    fldImages: ['leg0.jpg'],
  }),
  makeProjectData({
    fldPDataID: 'assess',
    fldWorkProduct: 'assessment',
    fldFindLong: 'Assessment finding',
  }),
];

describe('getProfileScopedPreviewRecords', () => {
  it('Plan Review includes only explicit plan_review rows', () => {
    const ids = getProfileScopedPreviewRecords(
      mixedRecords,
      project,
      facility,
      emptyGlossary,
      emptyCategories,
      emptyItems,
      emptyLocations,
      emptyFindings,
      'plan_review'
    ).map((r) => r.fldPDataID);
    expect(ids).toEqual(['pr']);
  });

  it('Inspection includes inspection plus legacy missing work product, not plan_review or assessment', () => {
    const ids = getProfileScopedPreviewRecords(
      mixedRecords,
      project,
      facility,
      emptyGlossary,
      emptyCategories,
      emptyItems,
      emptyLocations,
      emptyFindings,
      'inspection'
    ).map((r) => r.fldPDataID);
    expect(ids.sort()).toEqual(['ins', 'legacy']);
  });

  it('Assessment keeps the unfiltered project/facility record set', () => {
    const ids = getProfileScopedPreviewRecords(
      mixedRecords,
      project,
      facility,
      emptyGlossary,
      emptyCategories,
      emptyItems,
      emptyLocations,
      emptyFindings,
      'assessment'
    ).map((r) => r.fldPDataID);
    expect(ids.sort()).toEqual(['assess', 'ins', 'legacy', 'pr']);
  });
});

describe('getReportSectionAvailabilityForProfile mixed records', () => {
  it('Plan Review addendum/standards come only from plan_review rows', () => {
    const availability = getReportSectionAvailabilityForProfile(
      mixedRecords,
      project,
      facility,
      emptyGlossary,
      [reviewOnlyStandard, inspectOnlyStandard],
      emptyCategories,
      emptyItems,
      emptyLocations,
      emptyFindings,
      'plan_review'
    );
    expect(availability.hasPhotoAddendum).toBe(true);
    expect(availability.hasReferencedStandards).toBe(true);
  });

  it('Inspection does not pick up Plan Review-only extra images when Inspection rows have none extra', () => {
    const inspectionOnly = mixedRecords.map((r) =>
      r.fldPDataID === 'ins' ? { ...r, fldImages: ['ins0.jpg'] } : r
    );
    const availability = getReportSectionAvailabilityForProfile(
      inspectionOnly,
      project,
      facility,
      emptyGlossary,
      [reviewOnlyStandard, inspectOnlyStandard],
      emptyCategories,
      emptyItems,
      emptyLocations,
      emptyFindings,
      'inspection'
    );
    expect(availability.hasPhotoAddendum).toBe(false);
  });
});

describe('normalizeReportBodySectionSelection', () => {
  it('forces Financial off for Plan Review even when stale state is true', () => {
    const sel = normalizeReportBodySectionSelection('plan_review', {
      financial: true,
      documentation: true,
      narrative: true,
    });
    expect(sel.financial).toBe(false);
  });

  it('forces Financial off for Inspection even when stale state is true', () => {
    const sel = normalizeReportBodySectionSelection('inspection', { financial: true });
    expect(sel.financial).toBe(false);
  });

  it('Assessment keeps Financial available and default-checked', () => {
    expect(normalizeReportBodySectionSelection('assessment', undefined).financial).toBe(true);
    expect(normalizeReportBodySectionSelection('assessment', { financial: true }).financial).toBe(true);
  });

  it('Assessment can still uncheck Financial', () => {
    expect(normalizeReportBodySectionSelection('assessment', { financial: false }).financial).toBe(false);
  });
});

describe('RAS sequential section headings', () => {
  it('Narrative + Findings + Standards letters A / B / C', () => {
    const lettered = getRasLetteredSections('inspection', { hasReferencedStandards: true });
    expect(lettered.map((s) => `${s.letter} ${s.title}`)).toEqual([
      'A Narrative',
      'B Findings',
      'C Referenced Standards',
    ]);
    expect(formatRasSectionHeading('A', 'Narrative')).toBe('A — Narrative');
    expect(rasBodySectionHeading(lettered, 'findings', 'Documentation Section')).toBe('B — Findings');
    expect(rasBodyPageNumber(lettered, 'findings', 1, '1')).toBe('B1');
  });

  it('Narrative + Findings + Standards + Addendum letters A / B / C / D', () => {
    const lettered = getRasLetteredSections('plan_review', {
      hasReferencedStandards: true,
      hasImageAddendum: true,
    });
    expect(lettered.map((s) => `${s.letter} ${s.title}`)).toEqual([
      'A Narrative',
      'B Findings',
      'C Referenced Standards',
      'D Image Addendum',
    ]);
    expect(formatRasSectionPageNumber('D', 2)).toBe('D2');
  });

  it('Narrative + Findings + Addendum letters A / B / C with no gap', () => {
    const lettered = getRasLetteredSections('inspection', { hasImageAddendum: true });
    expect(lettered.map((s) => `${s.letter} ${s.title}`)).toEqual([
      'A Narrative',
      'B Findings',
      'C Photo Addendum',
    ]);
  });
});
