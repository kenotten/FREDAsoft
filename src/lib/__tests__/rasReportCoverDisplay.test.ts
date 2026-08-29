import { describe, expect, it } from 'vitest';
import { emptyTdlrRegistered } from '../projectMetadataFields';
import { buildReportViewModel } from '../reportAdapter';
import {
  buildRasCoverDisplayModel,
  buildRasCoverLayout,
  formatRasCoverDate,
  formatRasProfessionalLine,
  formatTenantFundsProvided,
  rasCoverFooterIdentityText,
  usesRasCover,
} from '../rasReportCoverDisplay';
import type { Client, Facility, Inspector, Project } from '../../types';

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

const fredaFacility: Facility = {
  fldFacID: 'fac-1',
  fldFacName: 'FREDA Facility Name',
  fldClient: 'client-1',
  fldFacAddress: '999 FREDA Ave',
  fldFacCity: 'Houston',
  fldFacState: 'TX',
  fldFacZip: '77095',
  fldInspectionDate: '2019-12-31',
};

describe('usesRasCover', () => {
  it('is false for Assessment and true for both RAS profiles', () => {
    expect(usesRasCover('assessment')).toBe(false);
    expect(usesRasCover('plan_review')).toBe(true);
    expect(usesRasCover('inspection')).toBe(true);
  });
});

describe('formatRasProfessionalLine', () => {
  it('displays Name, RAS # with raw stored number', () => {
    expect(formatRasProfessionalLine('Kenneth F. Otten', '149')).toBe('Kenneth F. Otten, RAS #149');
  });

  it('does not invent a number or name', () => {
    expect(formatRasProfessionalLine('Kenneth F. Otten', '')).toBe('Kenneth F. Otten');
    expect(formatRasProfessionalLine('', '149')).toBe('RAS #149');
    expect(formatRasProfessionalLine('', '')).toBe('');
  });
});

describe('formatTenantFundsProvided', () => {
  it('renders Yes, No, or blank — never Unknown', () => {
    expect(formatTenantFundsProvided(true)).toBe('Yes');
    expect(formatTenantFundsProvided(false)).toBe('No');
    expect(formatTenantFundsProvided(null)).toBe('');
    expect(formatTenantFundsProvided(undefined)).toBe('');
  });
});

describe('formatRasCoverDate', () => {
  it('formats UTC dates and leaves missing dates blank (not TBD)', () => {
    expect(formatRasCoverDate('2026-09-01')).toBe('September 1, 2026');
    expect(formatRasCoverDate('')).toBe('');
    expect(formatRasCoverDate('   ')).toBe('');
  });
});

describe('RAS cover display sources', () => {
  it('Plan Review cover uses profile title, 2012 TAS, Review RAS, and Plan Review Date', () => {
    const vm = buildReportViewModel({
      profile: 'plan_review',
      project: rasProject(),
      facility: fredaFacility,
      inspectors,
      client,
    });
    const cover = buildRasCoverDisplayModel(vm);
    expect(cover).not.toBeNull();
    expect(cover!.title).toBe('Plan Review Report');
    expect(cover!.standardsLine).toBe('2012 Texas Accessibility Standards');
    expect(cover!.rasNameLine).toBe('Kenneth F. Otten, RAS #149');
    expect(cover!.dateLabel).toBe('Plan Review Date:');
    expect(cover!.dateValue).toBe('September 1, 2026');
    expect(cover!.typeOfWork).toBe('Alterations');
    expect(cover!.ocgProjectNumber).toBe('26-08-00001');
    expect(cover!.tabsProjectNumber).toBe('TABS20XX004853');
    expect(cover!.designFirmName).toBe('A.B.C. Architects, Inc.');
    expect(cover!.projectName).toBe('Tower Alterations');
    expect(cover!.heroProjectName).toBe('Tower Alterations');
    expect(cover!.heroProjectName).toBe(cover!.projectName);
  });

  it('Inspection cover uses Inspection title, Inspection RAS, and Inspection Date', () => {
    const vm = buildReportViewModel({
      profile: 'inspection',
      project: rasProject(),
      facility: fredaFacility,
      inspectors,
      client,
    });
    const cover = buildRasCoverDisplayModel(vm);
    expect(cover!.title).toBe('Inspection Report');
    expect(cover!.standardsLine).toBe('2012 Texas Accessibility Standards');
    expect(cover!.rasNameLine).toBe('Inspection RAS, RAS #200');
    expect(cover!.dateLabel).toBe('Inspection Date:');
    expect(cover!.dateValue).toBe('September 15, 2026');
    expect(cover!.heroProjectName).toBe('Tower Alterations');
    expect(cover!.heroProjectName).not.toBe('Registered Facility');
    expect(cover!.facilityName).toBe('Registered Facility');
    expect(cover!.footerIdentityText).toBe('');
  });

  it('reads Project Description from TABS Scope, not fldProjDescription', () => {
    const vm = buildReportViewModel({
      profile: 'inspection',
      project: rasProject(),
      inspectors,
      client,
    });
    const cover = buildRasCoverDisplayModel(vm)!;
    expect(cover.projectDescription).toBe('TABS registered scope');
    expect(cover.projectDescription).not.toBe('FREDA leftover description');
  });

  it('reads Facility from tdlrRegistered.site, not FREDA Facility', () => {
    const vm = buildReportViewModel({
      profile: 'plan_review',
      project: rasProject(),
      facility: fredaFacility,
      inspectors,
    });
    const cover = buildRasCoverDisplayModel(vm)!;
    expect(cover.facilityName).toBe('Registered Facility');
    expect(cover.projectAddress).toBe('100 Main');
    expect(cover.cityStateZip).toBe('Austin, TX 78701');
    expect(cover.facilityName).not.toBe(fredaFacility.fldFacName);
    expect(cover.projectAddress).not.toBe(fredaFacility.fldFacAddress);
  });

  it('uses fldProjName as the top hero, not registered or FREDA Facility Name', () => {
    const project = rasProject();
    const vm = buildReportViewModel({
      profile: 'plan_review',
      project,
      facility: fredaFacility,
      inspectors,
    });
    const cover = buildRasCoverDisplayModel(vm)!;
    expect(cover.heroProjectName).toBe(project.fldProjName);
    expect(cover.heroProjectName).toBe('Tower Alterations');
    expect(cover.heroProjectName).not.toBe(cover.facilityName);
    expect(cover.heroProjectName).not.toBe('Registered Facility');
    expect(cover.heroProjectName).not.toBe(fredaFacility.fldFacName);
    expect(cover.heroProjectName).not.toBe(project.fldProjDescription);
    expect(cover.facilityName).toBe('Registered Facility');
  });

  it('omits bottom-left repeated identity on the RAS cover', () => {
    const vm = buildReportViewModel({
      profile: 'inspection',
      project: rasProject(),
      facility: fredaFacility,
      inspectors,
    });
    const cover = buildRasCoverDisplayModel(vm)!;
    expect(rasCoverFooterIdentityText()).toBe('');
    expect(cover.footerIdentityText).toBe('');
    expect(cover.footerIdentityText).not.toBe(cover.facilityName);
    expect(cover.footerIdentityText).not.toBe(cover.projectName);
    expect(cover.footerIdentityText).not.toBe(cover.heroProjectName);
    expect(cover.footerIdentityText).not.toBe(fredaFacility.fldFacName);
  });

  it('reads Owner from tdlrRegistered.owner, never Client', () => {
    const vm = buildReportViewModel({
      profile: 'inspection',
      project: rasProject(),
      inspectors,
      client,
    });
    const cover = buildRasCoverDisplayModel(vm)!;
    expect(cover.ownerName).toBe('Registered Owner LLC');
    expect(cover.ownerAddress).toBe('200 Owner St');
    expect(cover.ownerName).not.toBe(client.fldClientName);
  });

  it('does not put Architect/DP project number on the cover model', () => {
    const vm = buildReportViewModel({
      profile: 'inspection',
      project: rasProject(),
      inspectors,
    });
    const cover = buildRasCoverDisplayModel(vm)!;
    expect(JSON.stringify(cover)).not.toContain('ARCH-99');
    expect(vm.architectProjectNumber).toBe('ARCH-99');
  });

  it('renders blanks for missing registered data — no TBD and no substitutions', () => {
    const project = rasProject({
      tdlrRegistered: undefined,
      fldPlanReviewRas: '',
      fldInspectionRas: '',
      fldPlanReviewDate: '',
      fldInspectionDate: '',
      fldProjNumber: '',
    });
    const vm = buildReportViewModel({
      profile: 'inspection',
      project,
      facility: fredaFacility,
      inspectors: [],
      client,
    });
    expect(() => buildRasCoverDisplayModel(vm)).not.toThrow();
    const cover = buildRasCoverDisplayModel(vm)!;
    expect(cover.projectDescription).toBe('');
    expect(cover.facilityName).toBe('');
    expect(cover.ownerName).toBe('');
    expect(cover.rasNameLine).toBe('');
    expect(cover.dateValue).toBe('');
    expect(cover.tenantFundsProvided).toBe('');
    expect(cover.ocgProjectNumber).toBe('');
    expect(cover.tabsProjectNumber).toBe('');
    expect(cover.dateValue).not.toBe('TBD');
    expect(cover.ownerName).not.toBe(client.fldClientName);
    expect(cover.facilityName).not.toBe(fredaFacility.fldFacName);
    expect(cover.projectDescription).not.toBe(project.fldProjDescription);
  });

  it('groups OCG, PROJECT, and OWNER into the established paired cover structure', () => {
    const vm = buildReportViewModel({
      profile: 'plan_review',
      project: rasProject(),
      facility: fredaFacility,
      inspectors,
      client,
    });
    const layout = buildRasCoverLayout(buildRasCoverDisplayModel(vm)!);

    expect(layout.ocgInformation).toHaveLength(3);
    expect(layout.ocgInformation[0]).toEqual({
      kind: 'pair',
      left: { label: 'RAS Name / #:', value: 'Kenneth F. Otten, RAS #149' },
      right: { label: 'Design Firm:', value: 'A.B.C. Architects, Inc.' },
    });
    expect(layout.ocgInformation[1]).toEqual({
      kind: 'pair',
      left: { label: 'Plan Review Date:', value: 'September 1, 2026' },
      right: { label: 'Type of Work:', value: 'Alterations' },
    });
    expect(layout.ocgInformation[2]).toEqual({
      kind: 'pair',
      left: { label: 'OCG Project #:', value: '26-08-00001' },
      right: { label: 'TABS #:', value: 'TABS20XX004853' },
    });

    expect(layout.projectInformation.map((row) => row.kind)).toEqual([
      'span',
      'span',
      'pair',
      'span',
      'span',
    ]);
    expect(layout.projectInformation[0]).toMatchObject({
      kind: 'span',
      label: 'Project Name:',
      value: 'Tower Alterations',
    });
    expect(layout.projectInformation[1]).toMatchObject({
      kind: 'span',
      label: 'Facility Name:',
      value: 'Registered Facility',
    });
    expect(layout.projectInformation[2]).toEqual({
      kind: 'pair',
      left: { label: 'Project Address:', value: '100 Main' },
      right: { label: 'City/State/ZIP:', value: 'Austin, TX 78701' },
    });
    expect(layout.projectInformation[3]).toMatchObject({
      kind: 'span',
      label: 'Project Description:',
      value: 'TABS registered scope',
      wrap: true,
    });
    expect(layout.projectInformation[4]).toMatchObject({
      kind: 'span',
      label: 'Tenant Funds:',
      value: 'Yes',
    });
    expect(JSON.stringify(layout.projectInformation)).not.toContain('Tenant Funds Provided');
    expect(JSON.stringify(layout.projectInformation)).not.toContain('Type of Work');

    expect(layout.ownerInformation[0]).toMatchObject({
      kind: 'span',
      label: 'Name:',
      value: 'Registered Owner LLC',
    });
    expect(layout.ownerInformation[1]).toMatchObject({
      kind: 'span',
      label: 'Address:',
      value: '200 Owner St',
    });
    expect(layout.ownerInformation[2]).toEqual({
      kind: 'pair',
      left: { label: 'City:', value: 'Austin' },
      right: { label: 'State/ZIP:', value: 'TX 78702' },
    });
    expect(layout.ownerInformation[2].kind).toBe(layout.projectInformation[2].kind);
    expect(layout.ownerInformation[0]).not.toMatchObject({ value: client.fldClientName });
  });

  it('uses Tenant Funds: label with Yes/No/blank values', () => {
    const yes = buildRasCoverLayout(
      buildRasCoverDisplayModel(
        buildReportViewModel({ profile: 'inspection', project: rasProject(), inspectors })
      )!
    );
    expect(yes.projectInformation[4]).toMatchObject({ label: 'Tenant Funds:', value: 'Yes' });

    const noProject = rasProject();
    noProject.tdlrRegistered = { ...noProject.tdlrRegistered!, tenantFunded: false };
    const no = buildRasCoverLayout(
      buildRasCoverDisplayModel(
        buildReportViewModel({ profile: 'inspection', project: noProject, inspectors })
      )!
    );
    expect(no.projectInformation[4]).toMatchObject({ label: 'Tenant Funds:', value: 'No' });

    const blankProject = rasProject();
    blankProject.tdlrRegistered = { ...blankProject.tdlrRegistered!, tenantFunded: null };
    const blank = buildRasCoverLayout(
      buildRasCoverDisplayModel(
        buildReportViewModel({ profile: 'inspection', project: blankProject, inspectors })
      )!
    );
    expect(blank.projectInformation[4]).toMatchObject({ label: 'Tenant Funds:', value: '' });
  });

  it('pairs Inspection Date with Type of Work on OCG row 2', () => {
    const vm = buildReportViewModel({
      profile: 'inspection',
      project: rasProject(),
      inspectors,
    });
    const layout = buildRasCoverLayout(buildRasCoverDisplayModel(vm)!);
    expect(layout.ocgInformation[1].left).toEqual({
      label: 'Inspection Date:',
      value: 'September 15, 2026',
    });
    expect(layout.ocgInformation[1].right.label).toBe('Type of Work:');
    expect(layout.ocgInformation[0].left.value).toBe('Inspection RAS, RAS #200');
  });

  it('returns null for Assessment view-models (Assessment cover stays in ReportPreview)', () => {
    const vm = buildReportViewModel({
      profile: 'assessment',
      project: rasProject({ fldProjType: 'Assessment', tdlrRegistered: undefined }),
      inspectors,
      client,
    });
    expect(vm.ras).toBeNull();
    expect(buildRasCoverDisplayModel(vm)).toBeNull();
    expect(usesRasCover('assessment')).toBe(false);
  });
});
