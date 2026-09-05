import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  Inspector,
  Location,
  MasterStandard,
  Project,
  ProjectData
} from '../../types';
import { emptyTdlrRegistered } from '../projectMetadataFields';
import { buildReportViewModel } from '../reportAdapter';
import { filterRecordsForReportProfile, selectReportProfile } from '../reportProfile';
import {
  RAS_INSPECTION_ALTERATION_NARRATIVE_FALLBACK,
  RAS_INSPECTION_NEW_CONSTRUCTION_NARRATIVE_FALLBACK
} from '../rasInspectionNarrative';
import { resolveFacilityReportNarrative } from '../reportPreviewShared';
import { saveRasWorkMode } from '../rasWorkModeStorage';
import {
  buildWebReportFindingPresentation,
  filterWebReportRecordsForProfile,
  formatWebReportProfessionalValue,
  getWebReportPresentation,
  resolveWebReportHeadingDate,
  resolveWebReportNarrative,
  resolveWebReportProfile,
  resolveWebReportWorkMode
} from '../webReportPresentation';
import { deriveWebReportFilterOptions } from '../webReportFilters';
import { includedRecordsHavePhotoAddendumPhotos } from '../webReportPhotoAddendum';
import { buildWebReportReferencedStandardsView } from '../webReportStandards';
import type { WebReportRecordView } from '../webReportTree';

function makeRecord(partial: Partial<ProjectData> & { fldPDataID: string }): ProjectData {
  return {
    fldPDataProject: 'proj-1',
    fldFacility: 'fac-1',
    fldData: '',
    fldLocation: 'loc-1',
    fldFindShort: 'Short finding',
    fldFindLong: 'Finding body',
    fldRecShort: 'FIXTURE REC SHORT',
    fldRecLong: 'FIXTURE REC LONG MUST NOT APPEAR ON RAS',
    fldQTY: 1,
    fldUnitCost: 777,
    fldTotalCost: 777,
    fldImages: [],
    fldInspID: 'insp-1',
    fldTimestamp: '',
    ...partial
  } as ProjectData;
}

const mixedRecords: ProjectData[] = [
  makeRecord({
    fldPDataID: 'pr',
    fldWorkProduct: 'plan_review',
    fldFindLong: 'Plan review finding',
    fldLocation: 'loc-break',
    fldSheet: 'A3.3',
    fldStandards: ['std-review'],
    fldImages: ['pr0.jpg', 'pr1.jpg', 'pr2.jpg']
  }),
  makeRecord({
    fldPDataID: 'ins',
    fldWorkProduct: 'inspection',
    fldFindLong: 'Inspection finding',
    fldSheet: 'SHOULD-NOT-SHOW-ON-INSPECTION',
    fldStandards: ['std-inspect'],
    fldImages: ['ins0.jpg', 'ins1.jpg', 'ins2.jpg']
  }),
  makeRecord({
    fldPDataID: 'legacy',
    fldFindLong: 'Legacy TAS finding'
  }),
  makeRecord({
    fldPDataID: 'blank',
    fldWorkProduct: '  ' as ProjectData['fldWorkProduct'],
    fldFindLong: 'Blank work product finding'
  }),
  makeRecord({
    fldPDataID: 'assess',
    fldWorkProduct: 'assessment',
    fldFindLong: 'Assessment finding',
    fldStandards: ['std-assess']
  })
];

const locations: Location[] = [
  { fldLocID: 'loc-1', fldLocName: 'Lobby', fldFacID: 'fac-1', fldProjectID: 'proj-1' },
  { fldLocID: 'loc-break', fldLocName: 'Break Room', fldFacID: 'fac-1', fldProjectID: 'proj-1' }
];

const inspectors: Inspector[] = [
  { fldInspID: 'insp-review', fldInspName: 'Kenneth F. Otten', fldTitle: 'RAS', fldRasNumber: '149' },
  { fldInspID: 'insp-inspect', fldInspName: 'Inspection RAS', fldTitle: 'RAS', fldRasNumber: '200' },
  { fldInspID: 'insp-assessment', fldInspName: 'Assessment Inspector', fldTitle: 'Inspector' }
];

function rasProject(overrides: Partial<Project> = {}): Project {
  const registered = emptyTdlrRegistered();
  registered.scopeOfWork = 'TABS Scope MUST NOT BE NARRATIVE';
  registered.typeOfWork = 'New Construction';
  return {
    fldProjID: 'proj-1',
    fldClient: 'client-1',
    fldDesigner: '',
    fldInspector: 'insp-assessment',
    fldPlanReviewRas: 'insp-review',
    fldInspectionRas: 'insp-inspect',
    fldProjName: 'Tower Alterations',
    fldProjNumber: '26-08-00001',
    fldProjType: 'TAS/RAS',
    fldPDDate: '2020-01-01',
    fldPlanReviewDate: '2026-09-01',
    fldInspectionDate: '2026-09-15',
    tdlrRegistered: registered,
    ...overrides
  };
}

function assessmentProject(): Project {
  return {
    ...rasProject(),
    fldProjType: 'Assessment',
    fldPlanReviewRas: undefined,
    fldInspectionRas: undefined,
    tdlrRegistered: undefined,
    fldNarrative: undefined
  };
}

function viewFor(record: ProjectData): WebReportRecordView {
  return {
    record: { ...record, totalCost: record.fldTotalCost ?? 0 },
    categoryName: 'Category',
    itemName: 'Item',
    locationName: locations.find((l) => l.fldLocID === record.fldLocation)?.fldLocName || record.fldLocation,
    findingShort: record.fldFindShort || '',
    citationsLabel: ''
  };
}

const standards: MasterStandard[] = [
  {
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
    fldStandardVersion: '2012'
  },
  {
    id: 'std-inspect',
    order: 2,
    chapter_name: 'Ch',
    section_num: '2',
    section_name: 'S',
    citation_num: '302.1',
    citation_name: 'Inspection only',
    content_text: 'Inspection citation',
    relation_type: 'Standard',
    fldStandardType: 'TAS',
    fldStandardVersion: '2012'
  },
  {
    id: 'std-assess',
    order: 3,
    chapter_name: 'Ch',
    section_num: '3',
    section_name: 'S',
    citation_num: '99.1',
    citation_name: 'Assessment only',
    content_text: 'Assessment citation',
    relation_type: 'Standard',
    fldStandardType: 'TAS',
    fldStandardVersion: '2012'
  }
];

describe('resolveWebReportProfile / work mode handoff', () => {
  const mem: Record<string, string> = {};
  beforeEach(() => {
    for (const k of Object.keys(mem)) delete mem[k];
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => mem[key] ?? null,
      setItem: (key: string, value: string) => {
        mem[key] = value;
      },
      removeItem: (key: string) => {
        delete mem[key];
      }
    });
  });

  it('Assessment project is always assessment even if Review mode is sticky', () => {
    expect(resolveWebReportProfile({ fldProjType: 'Assessment' }, 'plan_review')).toBe('assessment');
    expect(selectReportProfile({ fldProjType: 'Assessment' }, 'inspection')).toBe('assessment');
  });

  it('TAS/RAS uses sticky Review vs Inspection, defaulting Inspection', () => {
    expect(resolveWebReportProfile({ fldProjType: 'TAS/RAS' }, 'plan_review')).toBe('plan_review');
    expect(resolveWebReportProfile({ fldProjType: 'TAS/RAS' }, 'inspection')).toBe('inspection');
    expect(resolveWebReportProfile({ fldProjType: 'TAS/RAS' }, null)).toBe('inspection');
  });

  it('uses workspace live work mode when viewing the subscribed project', () => {
    expect(resolveWebReportWorkMode('proj-1', 'proj-1', 'plan_review')).toBe('plan_review');
    expect(resolveWebReportWorkMode('proj-1', 'proj-1', 'inspection')).toBe('inspection');
  });

  it('uses sticky storage for a locally selected other project, not a new persistence model', () => {
    saveRasWorkMode('proj-other', 'plan_review');
    expect(resolveWebReportWorkMode('proj-other', 'proj-1', 'inspection')).toBe('plan_review');
  });
});

describe('Web Report mixed-record profile filter', () => {
  it('Plan Review findings are plan_review only; secondary content does not leak', () => {
    const filtered = filterWebReportRecordsForProfile(mixedRecords, 'plan_review');
    const ids = filtered.map((r) => r.fldPDataID);
    expect(ids).toEqual(['pr']);
    expect(ids).not.toContain('ins');
    expect(ids).not.toContain('legacy');
    expect(ids).not.toContain('blank');
    expect(ids).not.toContain('assess');

    const options = deriveWebReportFilterOptions(filtered, [], [], [], locations);
    expect(options.locations.map((o) => o.id)).toEqual(['loc-break']);

    const standardsView = buildWebReportReferencedStandardsView(filtered, [], standards);
    expect(standardsView.hasReferencedStandards).toBe(true);
    expect(JSON.stringify(standardsView)).toContain('201.1');
    expect(JSON.stringify(standardsView)).not.toContain('302.1');
    expect(JSON.stringify(standardsView)).not.toContain('99.1');

    expect(includedRecordsHavePhotoAddendumPhotos(filtered)).toBe(true);
    expect(includedRecordsHavePhotoAddendumPhotos(filtered.filter((r) => r.fldPDataID === 'legacy'))).toBe(
      false
    );
  });

  it('Inspection findings are inspection + blank/missing; excludes plan_review and assessment', () => {
    const filtered = filterWebReportRecordsForProfile(mixedRecords, 'inspection');
    const ids = filtered.map((r) => r.fldPDataID).sort();
    expect(ids).toEqual(['blank', 'ins', 'legacy']);
    expect(ids).not.toContain('pr');
    expect(ids).not.toContain('assess');

    const standardsView = buildWebReportReferencedStandardsView(filtered, [], standards);
    expect(JSON.stringify(standardsView)).toContain('302.1');
    expect(JSON.stringify(standardsView)).not.toContain('201.1');
    expect(JSON.stringify(standardsView)).not.toContain('99.1');
  });

  it('Assessment keeps the existing unfiltered set including mixed work products', () => {
    const filtered = filterWebReportRecordsForProfile(mixedRecords, 'assessment');
    expect(filtered.map((r) => r.fldPDataID).sort()).toEqual(
      ['assess', 'blank', 'ins', 'legacy', 'pr'].sort()
    );
    expect(filterRecordsForReportProfile(mixedRecords, 'assessment')).toEqual(mixedRecords);
  });
});

describe('Web Report RAS omissions vs Assessment', () => {
  it('RAS presentation omits Recommendation, cost, and Financial; Assessment keeps them', () => {
    const ras = getWebReportPresentation('plan_review');
    const inspection = getWebReportPresentation('inspection');
    const assessment = getWebReportPresentation('assessment');

    expect(ras.includeRecommendations).toBe(false);
    expect(ras.includeCosts).toBe(false);
    expect(ras.includeFinancial).toBe(false);
    expect(inspection.includeRecommendations).toBe(false);
    expect(inspection.includeCosts).toBe(false);
    expect(inspection.includeFinancial).toBe(false);

    expect(assessment.includeRecommendations).toBe(true);
    expect(assessment.includeCosts).toBe(true);
    expect(assessment.includeFinancial).toBe(true);
    expect(assessment.documentationLabel).toBe('Documentation');
    expect(assessment.photoAddendumLabel).toBe('Photo Addendum');
    expect(assessment.headingTitle).toBe('Report heading');
    expect(assessment.professionalLabel).toBe('Inspector');
  });

  it('RAS finding presentation omits Rec and fixture cost; Assessment keeps them', () => {
    const pr = viewFor(mixedRecords[0]!);
    const rasDisplay = buildWebReportFindingPresentation(pr, 'plan_review', [], [], locations, [], []);
    expect(rasDisplay.findingText).toBe('Plan review finding');
    expect(rasDisplay.includeRecommendation).toBe(false);
    expect(rasDisplay.includeCost).toBe(false);
    expect(rasDisplay.recommendationText).toBe('');
    expect(rasDisplay.recommendationText).not.toContain('FIXTURE REC');
    expect(JSON.stringify(rasDisplay)).not.toContain('FIXTURE REC LONG');
    expect(JSON.stringify(rasDisplay)).not.toContain('777');

    const assessDisplay = buildWebReportFindingPresentation(pr, 'assessment', [], [], locations, [], []);
    expect(assessDisplay.includeRecommendation).toBe(true);
    expect(assessDisplay.includeCost).toBe(true);
    expect(assessDisplay.recommendationText).toContain('FIXTURE REC LONG');
  });
});

describe('Web Report Location / Sheet', () => {
  it('Plan Review shows Location=Break Room and Sheet=A3.3', () => {
    const display = buildWebReportFindingPresentation(
      viewFor(mixedRecords[0]!),
      'plan_review',
      [],
      [],
      locations,
      [],
      []
    );
    expect(display.locationLabel).toBe('Break Room');
    expect(display.sheet).toBe('A3.3');
  });

  it('Inspection with fldSheet populated omits Sheet', () => {
    const display = buildWebReportFindingPresentation(
      viewFor(mixedRecords[1]!),
      'inspection',
      [],
      [],
      locations,
      [],
      []
    );
    expect(display.locationLabel).toBe('Lobby');
    expect(display.sheet).toBeUndefined();
    expect(JSON.stringify(display)).not.toContain('SHOULD-NOT-SHOW-ON-INSPECTION');
  });

  it('Assessment does not introduce Sheet', () => {
    const display = buildWebReportFindingPresentation(
      viewFor(mixedRecords[0]!),
      'assessment',
      [],
      [],
      locations,
      [],
      []
    );
    expect(display.sheet).toBeUndefined();
    expect(display.locationLabel).toBe('Break Room');
  });
});

describe('Web Report Narrative', () => {
  it('Inspection New Construction with no authored narrative uses 201.1 fallback', () => {
    const text = resolveWebReportNarrative('inspection', rasProject(), 'fac-1');
    expect(text).toBe(RAS_INSPECTION_NEW_CONSTRUCTION_NARRATIVE_FALLBACK);
    expect(text).toContain('201.1 Scope.');
    expect(text).not.toBe('TABS Scope MUST NOT BE NARRATIVE');
  });

  it('Inspection Alteration with no authored narrative uses 202.3/202.4 fallback', () => {
    const project = rasProject();
    project.tdlrRegistered = { ...project.tdlrRegistered!, typeOfWork: 'Alteration' };
    const text = resolveWebReportNarrative('inspection', project, 'fac-1');
    expect(text).toBe(RAS_INSPECTION_ALTERATION_NARRATIVE_FALLBACK);
    expect(text).toContain('202.3 Alterations.');
    expect(text).toContain('202.4 Alterations');
  });

  it('authored facility narrative wins over Type-of-Work fallback', () => {
    const project = rasProject({
      fldFacilityNarratives: { 'fac-1': 'Authored facility narrative' }
    });
    expect(resolveWebReportNarrative('inspection', project, 'fac-1')).toBe('Authored facility narrative');
  });

  it('Plan Review empty narrative is No project narrative provided.', () => {
    const project = rasProject({ fldNarrative: undefined, fldFacilityNarratives: undefined });
    expect(resolveWebReportNarrative('plan_review', project, 'fac-1')).toBe(
      'No project narrative provided.'
    );
    expect(resolveWebReportNarrative('plan_review', project, 'fac-1')).not.toBe(
      'TABS Scope MUST NOT BE NARRATIVE'
    );
  });

  it('Assessment empty narrative keeps the existing facility fallback', () => {
    const project = assessmentProject();
    const text = resolveWebReportNarrative('assessment', project, 'fac-1');
    expect(text).toBe(resolveFacilityReportNarrative(project, 'fac-1'));
    expect(text).toBe('No project narrative provided.');
  });
});

describe('Web Report terminology and identity', () => {
  it('Plan Review uses Violations + Image; Inspection uses Violations + Photo; Assessment Documentation', () => {
    expect(getWebReportPresentation('plan_review').documentationLabel).toBe('Violations');
    expect(getWebReportPresentation('plan_review').documentationHierarchyLabel).toBe(
      'Violations hierarchy (display only)'
    );
    expect(getWebReportPresentation('plan_review').imageTerminology.singular).toBe('Image');
    expect(getWebReportPresentation('plan_review').photoAddendumLabel).toBe('Image Addendum');
    expect(getWebReportPresentation('inspection').documentationLabel).toBe('Violations');
    expect(getWebReportPresentation('inspection').documentationHierarchyLabel).toBe(
      'Violations hierarchy (display only)'
    );
    expect(getWebReportPresentation('inspection').imageTerminology.singular).toBe('Photo');
    expect(getWebReportPresentation('inspection').photoAddendumLabel).toBe('Photo Addendum');
    expect(getWebReportPresentation('assessment').documentationLabel).toBe('Documentation');
    expect(getWebReportPresentation('assessment').documentationHierarchyLabel).toBe(
      'Documentation hierarchy (display only)'
    );
    expect(getWebReportPresentation('assessment').imageTerminology.singular).toBe('Photo');
    expect(getWebReportPresentation('assessment').documentationLabel).not.toBe('Violations');
  });

  it('report titles are Plan Review Report / Inspection Report; Assessment heading unchanged', () => {
    expect(getWebReportPresentation('plan_review').headingTitle).toBe('Plan Review Report');
    expect(getWebReportPresentation('inspection').headingTitle).toBe('Inspection Report');
    expect(getWebReportPresentation('assessment').headingTitle).toBe('Report heading');
    expect(getWebReportPresentation('assessment').viewerTitle).toBe('Web Report Viewer');
  });

  it('professional identity is role-specific with no cross-role fallback', () => {
    const reviewVm = buildReportViewModel({
      profile: 'plan_review',
      project: rasProject(),
      inspectors
    });
    expect(reviewVm.professional.id).toBe('insp-review');
    expect(formatWebReportProfessionalValue('plan_review', reviewVm.professional)).toBe(
      'Kenneth F. Otten, RAS #149'
    );
    expect(formatWebReportProfessionalValue('plan_review', reviewVm.professional)).not.toContain(
      'Inspection RAS'
    );

    const inspectEmpty = buildReportViewModel({
      profile: 'inspection',
      project: rasProject({ fldInspectionRas: '' }),
      inspectors
    });
    expect(inspectEmpty.professional.id).toBe('');
    expect(formatWebReportProfessionalValue('inspection', inspectEmpty.professional)).toBe('TBD');

    const assessVm = buildReportViewModel({
      profile: 'assessment',
      project: assessmentProject(),
      inspectors
    });
    expect(assessVm.professional.id).toBe('insp-assessment');
    expect(formatWebReportProfessionalValue('assessment', assessVm.professional)).toBe(
      'Assessment Inspector, Inspector'
    );
  });

  it('Assessment heading date stays facility/project PD date; RAS uses profile date', () => {
    expect(
      resolveWebReportHeadingDate('assessment', '2026-09-15', '2019-12-31', '2020-01-01')
    ).toBe('2019-12-31');
    expect(resolveWebReportHeadingDate('plan_review', '2026-09-01', '2019-12-31', '2020-01-01')).toBe(
      '2026-09-01'
    );
    expect(resolveWebReportHeadingDate('inspection', '2026-09-15', '2019-12-31', '2020-01-01')).toBe(
      '2026-09-15'
    );
  });

  it('view-model project identity is fldProjName for all profiles', () => {
    expect(buildReportViewModel({ profile: 'plan_review', project: rasProject() }).projectName).toBe(
      'Tower Alterations'
    );
    expect(buildReportViewModel({ profile: 'inspection', project: rasProject() }).projectName).toBe(
      'Tower Alterations'
    );
    expect(buildReportViewModel({ profile: 'assessment', project: assessmentProject() }).projectName).toBe(
      'Tower Alterations'
    );
  });
});
