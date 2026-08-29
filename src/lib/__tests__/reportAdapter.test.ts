import { describe, expect, it } from 'vitest';
import { emptyTdlrRegistered } from '../projectMetadataFields';
import { buildReportViewModel } from '../reportAdapter';
import type { Client, Inspector, Project, ProjectData } from '../../types';

function rasProject(overrides: Partial<Project> = {}): Project {
  const registered = emptyTdlrRegistered();
  registered.tabsProjectNumber = 'TABS20XX004853';
  registered.scopeOfWork = 'TABS registered scope';
  registered.typeOfWork = 'Alterations';
  registered.tenantFunded = true;
  registered.site.facilityName = 'Registered Facility';
  registered.site.address = '100 Main';
  registered.site.city = 'Austin';
  registered.site.state = 'TX';
  registered.site.zip = '78701';
  registered.owner.name = 'Registered Owner LLC';
  registered.owner.address = '200 Owner St';
  registered.owner.city = 'Austin';
  registered.owner.state = 'TX';
  registered.owner.zip = '78702';
  registered.owner.contactName = 'Pat Owner';
  registered.designFirm.name = 'A.B.C. Architects, Inc.';
  registered.designFirm.designProfessionalName = 'Jane DP';
  return {
    fldProjID: 'proj-1',
    fldClient: 'client-1',
    fldDesigner: '',
    fldInspector: 'insp-assessment',
    fldPlanReviewRas: 'insp-review',
    fldInspectionRas: 'insp-inspect',
    fldProjName: 'Tower Alterations',
    fldProjNumber: '26-08-00001',
    fldExternalRef: 'ARCH-99',
    fldProjType: 'TAS/RAS',
    fldProjDescription: 'FREDA leftover description',
    tdlrRegistered: registered,
    fldFacilities: ['fac-1'],
    fldPDDate: '2020-01-01',
    fldPlanReviewDate: '2026-09-01',
    fldInspectionDate: '2026-09-15',
    ...overrides,
  };
}

function assessmentProject(): Project {
  return {
    ...rasProject({
      fldProjType: 'Assessment',
      tdlrRegistered: undefined,
      fldPlanReviewRas: undefined,
      fldInspectionRas: undefined,
      fldProjDescription: 'FREDA Assessment description',
    }),
  };
}

const inspectors: Inspector[] = [
  { fldInspID: 'insp-review', fldInspName: 'Kenneth F. Otten', fldTitle: 'RAS', fldRasNumber: '149' },
  { fldInspID: 'insp-inspect', fldInspName: 'Inspection RAS', fldTitle: 'RAS', fldRasNumber: '200' },
  { fldInspID: 'insp-assessment', fldInspName: 'Assessment Inspector', fldTitle: 'Inspector' },
];

const client: Client = {
  fldClientID: 'client-1',
  fldClientName: 'Should Never Be RAS Owner',
  fldClientAddress: '999 Client Ave',
};

function row(partial: Partial<ProjectData> & { fldPDataID: string }): ProjectData {
  return {
    fldPDataProject: 'proj-1',
    fldFacility: 'fac-1',
    fldData: '',
    fldLocation: 'loc-1',
    fldFindShort: '',
    fldFindLong: 'Finding text',
    fldRecShort: 'Rec short',
    fldRecLong: 'Recommendation body',
    fldQTY: 1,
    fldUnitCost: 50,
    fldTotalCost: 50,
    fldImages: ['a.jpg'],
    fldInspID: 'insp-inspect',
    fldTimestamp: '',
    ...partial,
  };
}

describe('buildReportViewModel RAS sources', () => {
  it('reads Project Description from tdlrRegistered.scopeOfWork, not fldProjDescription', () => {
    const vm = buildReportViewModel({
      profile: 'inspection',
      project: rasProject(),
      inspectors,
      client,
    });
    expect(vm.ras?.projectDescription).toBe('TABS registered scope');
    expect(vm.ras?.cover.projectInformation.projectDescription).toBe('TABS registered scope');
    expect(vm.ras?.projectDescription).not.toBe('FREDA leftover description');
  });

  it('keeps Type of Work separate from Scope', () => {
    const vm = buildReportViewModel({ profile: 'inspection', project: rasProject(), inspectors });
    expect(vm.ras?.typeOfWork).toBe('Alterations');
    expect(vm.ras?.projectDescription).toBe('TABS registered scope');
    expect(vm.ras?.cover.ocgInformation.typeOfWork).toBe('Alterations');
  });

  it('reads registered Facility from tdlrRegistered.site', () => {
    const vm = buildReportViewModel({ profile: 'plan_review', project: rasProject(), inspectors });
    expect(vm.ras?.registeredFacility.facilityName).toBe('Registered Facility');
    expect(vm.ras?.registeredFacility.address).toBe('100 Main');
    expect(vm.ras?.cover.projectInformation.facilityName).toBe('Registered Facility');
  });

  it('reads Owner from tdlrRegistered.owner, never Client', () => {
    const vm = buildReportViewModel({
      profile: 'inspection',
      project: rasProject(),
      inspectors,
      client,
    });
    expect(vm.ras?.owner.name).toBe('Registered Owner LLC');
    expect(vm.ras?.cover.ownerInformation.name).toBe('Registered Owner LLC');
    expect(vm.ras?.owner.name).not.toBe(client.fldClientName);
  });

  it('reads Design Firm from tdlrRegistered.designFirm', () => {
    const vm = buildReportViewModel({ profile: 'inspection', project: rasProject(), inspectors });
    expect(vm.ras?.designFirm.name).toBe('A.B.C. Architects, Inc.');
    expect(vm.ras?.cover.ocgInformation.designFirmName).toBe('A.B.C. Architects, Inc.');
  });

  it('preserves Tenant Funded true, false, and null', () => {
    const yes = rasProject();
    yes.tdlrRegistered = { ...yes.tdlrRegistered!, tenantFunded: true };
    expect(buildReportViewModel({ profile: 'inspection', project: yes, inspectors }).ras?.tenantFunded).toBe(true);

    const no = rasProject();
    no.tdlrRegistered = { ...no.tdlrRegistered!, tenantFunded: false };
    expect(buildReportViewModel({ profile: 'inspection', project: no, inspectors }).ras?.tenantFunded).toBe(false);

    const unanswered = rasProject();
    unanswered.tdlrRegistered = { ...unanswered.tdlrRegistered!, tenantFunded: null };
    expect(buildReportViewModel({ profile: 'inspection', project: unanswered, inspectors }).ras?.tenantFunded).toBeNull();
  });

  it('reads TABS # and OCG # from registered / FREDA operational fields', () => {
    const vm = buildReportViewModel({ profile: 'inspection', project: rasProject(), inspectors });
    expect(vm.ras?.tabsProjectNumber).toBe('TABS20XX004853');
    expect(vm.ocgProjectNumber).toBe('26-08-00001');
    expect(vm.architectProjectNumber).toBe('ARCH-99');
  });

  it('resolves Plan Review professional from fldPlanReviewRas only', () => {
    const vm = buildReportViewModel({ profile: 'plan_review', project: rasProject(), inspectors });
    expect(vm.professional.id).toBe('insp-review');
    expect(vm.professional.name).toBe('Kenneth F. Otten');
    expect(vm.professional.rasNumber).toBe('149');
    expect(vm.professional.id).not.toBe('insp-inspect');
  });

  it('resolves Inspection professional from fldInspectionRas with no cross-role fallback', () => {
    const project = rasProject({ fldInspectionRas: '' });
    const vm = buildReportViewModel({ profile: 'inspection', project, inspectors });
    expect(vm.professional.id).toBe('');
    expect(vm.professional.name).toBe('');
    expect(vm.professional.rasNumber).toBe('');
  });

  it('uses Plan Review Date, not fldPDDate or facility date', () => {
    const vm = buildReportViewModel({
      profile: 'plan_review',
      project: rasProject(),
      facility: {
        fldFacID: 'fac-1',
        fldFacName: 'FREDA Fac',
        fldClient: 'client-1',
        fldInspectionDate: '2019-12-31',
      },
      inspectors,
    });
    expect(vm.date).toBe('2026-09-01');
    expect(vm.dateLabel).toBe('Plan Review Date');
    expect(vm.date).not.toBe('2020-01-01');
    expect(vm.date).not.toBe('2019-12-31');
  });

  it('uses Inspection Date, not fldPDDate or facility date', () => {
    const vm = buildReportViewModel({
      profile: 'inspection',
      project: rasProject(),
      facility: {
        fldFacID: 'fac-1',
        fldFacName: 'FREDA Fac',
        fldClient: 'client-1',
        fldInspectionDate: '2019-12-31',
      },
      inspectors,
    });
    expect(vm.date).toBe('2026-09-15');
    expect(vm.dateLabel).toBe('Inspection Date');
    expect(vm.date).not.toBe('2020-01-01');
  });
});

describe('buildReportViewModel findings and exclusions', () => {
  it('filters Plan Review records and maps Finding/TAS without Recommendation or cost', () => {
    const records = [
      row({ fldPDataID: 'pr', fldWorkProduct: 'plan_review', fldSheet: 'A2.1', fldStandards: ['std-1'] }),
      row({ fldPDataID: 'ins', fldWorkProduct: 'inspection' }),
    ];
    const vm = buildReportViewModel({
      profile: 'plan_review',
      project: rasProject(),
      inspectors,
      records,
      locations: [{ fldLocID: 'loc-1', fldLocName: 'Lobby', fldFacID: 'fac-1', fldProjectID: 'proj-1' }],
    });
    expect(vm.records.map((r) => r.fldPDataID)).toEqual(['pr']);
    expect(vm.findings).toHaveLength(1);
    expect(vm.findings[0].finding).toBe('Finding text');
    expect(vm.findings[0].standardIds).toEqual(['std-1']);
    expect(vm.findings[0].locator).toEqual({ location: 'Lobby', sheet: 'A2.1' });
    expect(vm.findings[0]).not.toHaveProperty('recommendation');
    expect(vm.findings[0]).not.toHaveProperty('cost');
    expect(vm.includeRecommendations).toBe(false);
    expect(vm.includeCosts).toBe(false);
    expect(vm.includeFinancial).toBe(false);
    expect(vm.includeNarrative).toBe(true);
  });

  it('does not mutate source records', () => {
    const records = [row({ fldPDataID: 'ins', fldWorkProduct: 'inspection', fldRecLong: 'keep rec' })];
    const original = records[0].fldRecLong;
    buildReportViewModel({ profile: 'inspection', project: rasProject(), inspectors, records });
    expect(records[0].fldRecLong).toBe(original);
  });
});

describe('buildReportViewModel missing RAS data', () => {
  it('does not throw when registered data, professional, and date are absent', () => {
    const project = rasProject({
      tdlrRegistered: undefined,
      fldPlanReviewRas: '',
      fldInspectionRas: '',
      fldPlanReviewDate: '',
      fldInspectionDate: '',
    });
    expect(() =>
      buildReportViewModel({ profile: 'inspection', project, inspectors: [], records: [] })
    ).not.toThrow();
    const vm = buildReportViewModel({ profile: 'inspection', project, inspectors: [] });
    expect(vm.ras?.projectDescription).toBe('');
    expect(vm.ras?.owner.name).toBe('');
    expect(vm.ras?.registeredFacility.facilityName).toBe('');
    expect(vm.ras?.tenantFunded).toBeNull();
    expect(vm.professional.id).toBe('');
    expect(vm.date).toBe('');
  });
});

describe('buildReportViewModel Assessment compatibility', () => {
  it('does not attach RAS cover groups or Client-as-Owner', () => {
    const vm = buildReportViewModel({
      profile: 'assessment',
      project: assessmentProject(),
      inspectors,
      client,
      records: [row({ fldPDataID: 'a', fldWorkProduct: 'assessment' })],
    });
    expect(vm.ras).toBeNull();
    expect(vm.includeRecommendations).toBe(true);
    expect(vm.includeFinancial).toBe(true);
    expect(vm.letteredSections).toEqual([]);
    expect(vm.records).toHaveLength(1);
  });
});
