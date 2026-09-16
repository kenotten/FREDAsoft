import { describe, expect, it } from 'vitest';
import type { Client, Facility, Inspector, Project } from '../../types';
import { emptyTdlrRegistered } from '../projectMetadataFields';
import {
  buildPmProjectOverview,
  PM_TDLR_EMPTY,
  PM_TDLR_HEADING,
} from '../pmProjectOverview';
import { PM_NOT_ASSIGNED, PM_NOT_RECORDED } from '../pmProjectSearch';

const clients: Client[] = [{ fldClientID: 'c-acme', fldClientName: 'Acme Development LLC' }];
const facilities: Facility[] = [
  {
    fldFacID: 'f-west',
    fldFacName: 'West Campus Building A',
    fldFacAddress: '100 Staff St',
    fldFacCity: 'Austin',
    fldFacState: 'TX',
    fldFacZip: '78701',
    fldClient: 'c-acme',
  },
];
const inspectors: Inspector[] = [
  { fldInspID: 'insp-review', fldInspName: 'Review RAS' },
  { fldInspID: 'insp-inspect', fldInspName: 'Inspect RAS' },
];

function rasProject(overrides: Partial<Project> = {}): Project {
  const registered = emptyTdlrRegistered();
  registered.source = 'manual';
  registered.tabsProjectNumber = 'TABS2019001234';
  registered.scopeOfWork = 'Alter interior finishes';
  registered.typeOfWork = 'Alterations';
  registered.tenantFunded = true;
  registered.site.facilityName = 'Registered Site Annex';
  registered.site.address = '9 Source Ln';
  registered.owner.name = 'Registered Owner LLC';
  registered.owner.address = '200 Owner St';
  registered.designFirm.name = 'A.B.C. Architects, Inc.';
  registered.designFirm.designProfessionalName = 'Pat Designer';
  return {
    fldProjID: 'p-tabs',
    fldClient: 'c-acme',
    fldDesigner: '',
    fldInspector: '',
    fldPlanReviewRas: 'insp-review',
    fldInspectionRas: 'insp-inspect',
    fldProjName: 'Tower Alterations',
    fldProjNumber: '26-08-00001',
    fldExternalRef: 'DP-441',
    fldPDDate: '2026-08-01',
    fldPlanReviewDate: '2026-08-02',
    fldInspectionDate: '2026-08-03',
    fldProjType: 'TAS/RAS',
    fldFacilities: ['f-west'],
    tdlrRegistered: registered,
    ...overrides,
  };
}

describe('pmProjectOverview', () => {
  it('keeps Client separate from exact TDLR Owner text', () => {
    const vm = buildPmProjectOverview(rasProject(), clients, facilities, inspectors);
    expect(vm.clientNameDisplay).toBe('Acme Development LLC');
    expect(vm.tdlr?.ownerName).toBe('Registered Owner LLC');
    expect(vm.tdlr?.ownerNameDisplay).toBe('Registered Owner LLC');
    expect(vm.tdlr?.ownerNameDisplay).not.toBe(vm.clientNameDisplay);
  });

  it('displays exact stored Design Firm text', () => {
    const vm = buildPmProjectOverview(rasProject(), clients, facilities, inspectors);
    expect(vm.tdlr?.designFirmName).toBe('A.B.C. Architects, Inc.');
    expect(vm.tdlr?.designFirmNameDisplay).toBe('A.B.C. Architects, Inc.');
  });

  it('displays a modern TABS State Project ID exactly', () => {
    const vm = buildPmProjectOverview(rasProject(), clients, facilities, inspectors);
    expect(vm.tdlr?.stateProjectId).toBe('TABS2019001234');
    expect(vm.stateProjectIdDisplay).toBe('TABS2019001234');
  });

  it('displays a legacy 8-character State Project ID without rejection', () => {
    const registered = emptyTdlrRegistered();
    registered.tabsProjectNumber = 'AB12CD34';
    const vm = buildPmProjectOverview(
      rasProject({ tdlrRegistered: registered }),
      clients,
      facilities,
      inspectors
    );
    expect(vm.tdlr?.stateProjectId).toBe('AB12CD34');
    expect(vm.tdlr?.stateProjectIdDisplay).toBe('AB12CD34');
  });

  it('does not trim or canonicalize exact source strings', () => {
    const registered = emptyTdlrRegistered();
    registered.tabsProjectNumber = ' TABS2019 004853 ';
    registered.owner.name = 'ABC Architects';
    registered.designFirm.name = 'A.B.C. Architects, Inc.';
    const vm = buildPmProjectOverview(
      rasProject({ tdlrRegistered: registered }),
      clients,
      facilities,
      inspectors
    );
    expect(vm.tdlr?.stateProjectId).toBe(' TABS2019 004853 ');
    expect(vm.tdlr?.ownerName).toBe('ABC Architects');
    expect(vm.tdlr?.designFirmName).toBe('A.B.C. Architects, Inc.');
  });

  it('shows the TDLR empty state when tdlrRegistered is absent', () => {
    const project = rasProject();
    delete (project as { tdlrRegistered?: unknown }).tdlrRegistered;
    const vm = buildPmProjectOverview(project, clients, facilities, inspectors);
    expect(vm.hasTdlrRegistered).toBe(false);
    expect(vm.tdlr).toBeNull();
    expect(vm.tdlrEmptyState).toBe(PM_TDLR_EMPTY);
    expect(PM_TDLR_HEADING).toBe('TDLR/TABS — AS RECORDED');
  });

  it('handles missing Plan Review RAS', () => {
    const vm = buildPmProjectOverview(
      rasProject({ fldPlanReviewRas: '' }),
      clients,
      facilities,
      inspectors
    );
    expect(vm.planReviewRasDisplay).toBe(PM_NOT_ASSIGNED);
    expect(vm.inspectionRasDisplay).toBe('Inspect RAS');
  });

  it('handles missing Inspection RAS', () => {
    const vm = buildPmProjectOverview(
      rasProject({ fldInspectionRas: '' }),
      clients,
      facilities,
      inspectors
    );
    expect(vm.inspectionRasDisplay).toBe(PM_NOT_ASSIGNED);
  });

  it('does not require a stakeholder match to build an overview', () => {
    const vm = buildPmProjectOverview(rasProject(), clients, facilities, inspectors);
    expect(vm.tdlr?.ownerName).toBe('Registered Owner LLC');
    expect(Object.keys(vm)).not.toContain('stakeholderMatch');
    expect(vm.facilities[0].nameDisplay).toBe('West Campus Building A');
    expect(vm.planReviewDateDisplay).toBe('2026-08-02');
    expect(vm.inspectionDateDisplay).toBe('2026-08-03');
    expect(vm.pdDateDisplay).toBe('2026-08-01');
  });

  it('does not substitute Client when Owner is blank', () => {
    const registered = emptyTdlrRegistered();
    registered.owner.name = '';
    const vm = buildPmProjectOverview(
      rasProject({ tdlrRegistered: registered }),
      clients,
      facilities,
      inspectors
    );
    expect(vm.clientNameDisplay).toBe('Acme Development LLC');
    expect(vm.tdlr?.ownerName).toBe('');
    expect(vm.tdlr?.ownerName).not.toBe(vm.clientNameDisplay);
  });

  it('uses Not assigned when no Facility is linked', () => {
    const vm = buildPmProjectOverview(
      rasProject({ fldFacilities: [], fldFacID: '' }),
      clients,
      facilities,
      inspectors
    );
    expect(vm.facilities).toEqual([{ nameDisplay: PM_NOT_ASSIGNED, addressDisplay: PM_NOT_RECORDED }]);
  });
});
