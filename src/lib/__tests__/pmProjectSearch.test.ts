import { describe, expect, it } from 'vitest';
import { emptyTdlrRegistered } from '../projectMetadataFields';
import {
  comparePmProjectsByOcgDesc,
  PM_NOT_ASSIGNED,
  PM_NOT_RECORDED,
  pmCompactSearchText,
  pmQueryMatches,
  projectMatchesPmSearch,
  selectPmProjectListRows,
} from '../pmProjectSearch';
import type { Client, Facility, Inspector, Project } from '../../types';

const clients: Client[] = [
  { fldClientID: 'c-acme', fldClientName: 'Acme Development LLC' },
  { fldClientID: 'c-blank', fldClientName: '' },
];

const facilities: Facility[] = [
  {
    fldFacID: 'f-west',
    fldFacName: 'West Campus Building A',
    fldClient: 'c-acme',
  },
];

const inspectors: Inspector[] = [
  { fldInspID: 'insp-review', fldInspName: 'Review RAS' },
  { fldInspID: 'insp-inspect', fldInspName: 'Inspect RAS' },
];

function rasProject(overrides: Partial<Project> = {}): Project {
  const registered = emptyTdlrRegistered();
  registered.tabsProjectNumber = 'TABS2019001234';
  registered.site.facilityName = 'Registered Site Annex';
  registered.owner.name = 'Registered Owner LLC';
  return {
    fldProjID: 'p-tabs',
    fldClient: 'c-acme',
    fldDesigner: '',
    fldInspector: '',
    fldPlanReviewRas: 'insp-review',
    fldInspectionRas: 'insp-inspect',
    fldProjName: 'Tower Alterations',
    fldProjNumber: '26-08-00001',
    fldPDDate: '2026-08-01',
    fldProjType: 'TAS/RAS',
    fldFacilities: ['f-west'],
    tdlrRegistered: registered,
    ...overrides,
  };
}

function legacyProject(): Project {
  const registered = emptyTdlrRegistered();
  registered.tabsProjectNumber = 'AB12CD34';
  return rasProject({
    fldProjID: 'p-legacy',
    fldProjName: 'Legacy Warehouse',
    fldProjNumber: '04-06-1234',
    tdlrRegistered: registered,
  });
}

describe('pmProjectSearch', () => {
  it('searches Project Name case-insensitively', () => {
    const rows = selectPmProjectListRows([rasProject()], clients, facilities, inspectors, 'tower ALTERATIONS');
    expect(rows).toHaveLength(1);
    expect(rows[0].projectNameDisplay).toBe('Tower Alterations');
  });

  it('searches OCG #', () => {
    const rows = selectPmProjectListRows([rasProject()], clients, facilities, inspectors, '26-08-00001');
    expect(rows).toHaveLength(1);
    expect(rows[0].ocgNumberDisplay).toBe('26-08-00001');
  });

  it('searches modern TABS State Project ID', () => {
    const rows = selectPmProjectListRows([rasProject()], clients, facilities, inspectors, 'TABS2019001234');
    expect(rows).toHaveLength(1);
    expect(rows[0].stateProjectIdDisplay).toBe('TABS2019001234');
  });

  it('searches legacy 8-character State Project ID', () => {
    const rows = selectPmProjectListRows([legacyProject()], clients, facilities, inspectors, 'AB12CD34');
    expect(rows).toHaveLength(1);
    expect(rows[0].stateProjectIdDisplay).toBe('AB12CD34');
  });

  it('searches Client', () => {
    const rows = selectPmProjectListRows([rasProject()], clients, facilities, inspectors, 'acme development');
    expect(rows).toHaveLength(1);
    expect(rows[0].clientNameDisplay).toBe('Acme Development LLC');
  });

  it('searches Facility name', () => {
    const rows = selectPmProjectListRows([rasProject()], clients, facilities, inspectors, 'west campus');
    expect(rows).toHaveLength(1);
  });

  it('searches TDLR/TABS site name', () => {
    const rows = selectPmProjectListRows([rasProject()], clients, facilities, inspectors, 'registered site annex');
    expect(rows).toHaveLength(1);
  });

  it('matches TABS numbers when the query omits punctuation/spacing', () => {
    expect(pmQueryMatches('tabs 2019-001234', ['TABS2019001234'])).toBe(true);
    expect(pmCompactSearchText('TABS2019001234')).toBe('tabs2019001234');
    const rows = selectPmProjectListRows([rasProject()], clients, facilities, inspectors, 'tabs 2019-001234');
    expect(rows).toHaveLength(1);
    expect(rows[0].stateProjectIdDisplay).toBe('TABS2019001234');
  });

  it('does not change the displayed State Project ID after a compact search', () => {
    const stored = 'TABS2019001234';
    const project = rasProject();
    expect(project.tdlrRegistered?.tabsProjectNumber).toBe(stored);
    const rows = selectPmProjectListRows([project], clients, facilities, inspectors, 'tabs2019001234');
    expect(rows[0].stateProjectId).toBe(stored);
    expect(rows[0].stateProjectIdDisplay).toBe(stored);
  });

  it('includes projects with a blank State Project ID in unfiltered results', () => {
    const registered = emptyTdlrRegistered();
    registered.tabsProjectNumber = '';
    const project = rasProject({ tdlrRegistered: registered, fldProjName: 'No State Id' });
    const rows = selectPmProjectListRows([project], clients, facilities, inspectors, '');
    expect(rows).toHaveLength(1);
    expect(rows[0].stateProjectIdDisplay).toBe(PM_NOT_RECORDED);
  });

  it('includes projects with a blank Client', () => {
    const project = rasProject({ fldClient: '', fldProjName: 'No Client' });
    const rows = selectPmProjectListRows([project], clients, facilities, inspectors, '');
    expect(rows[0].clientNameDisplay).toBe(PM_NOT_RECORDED);
  });

  it('includes projects missing tdlrRegistered', () => {
    const project = rasProject();
    delete (project as { tdlrRegistered?: unknown }).tdlrRegistered;
    const rows = selectPmProjectListRows([project], clients, facilities, inspectors, 'tower');
    expect(rows).toHaveLength(1);
    expect(rows[0].stateProjectIdDisplay).toBe(PM_NOT_RECORDED);
  });

  it('does not require a search hit on missing tdlrRegistered when querying a TABS number', () => {
    const project = rasProject({ fldProjName: 'No Source' });
    delete (project as { tdlrRegistered?: unknown }).tdlrRegistered;
    expect(projectMatchesPmSearch(project, 'TABS2019001234', clients, facilities)).toBe(false);
  });

  it('sorts OCG numbers descending with blanks last and name as secondary', () => {
    const a = rasProject({ fldProjID: 'p1', fldProjNumber: '24-01-00001', fldProjName: 'Alpha' });
    const b = rasProject({ fldProjID: 'p2', fldProjNumber: '26-08-00001', fldProjName: 'Beta' });
    const c = rasProject({ fldProjID: 'p3', fldProjNumber: '', fldProjName: 'Zed' });
    const d = rasProject({ fldProjID: 'p4', fldProjNumber: '26-08-00001', fldProjName: 'Aaa' });
    const sorted = [a, b, c, d].sort(comparePmProjectsByOcgDesc);
    expect(sorted.map((p) => p.fldProjID)).toEqual(['p4', 'p2', 'p1', 'p3']);
  });

  it('selectPmProjectListRows applies OCG descending sort', () => {
    const older = rasProject({ fldProjID: 'old', fldProjNumber: '19-01-00001', fldProjName: 'Older' });
    const newer = rasProject({ fldProjID: 'new', fldProjNumber: '26-09-00002', fldProjName: 'Newer' });
    const rows = selectPmProjectListRows([older, newer], clients, facilities, inspectors, '');
    expect(rows.map((r) => r.projectId)).toEqual(['new', 'old']);
  });

  it('does not invent a Facility name when none are linked', () => {
    const rows = selectPmProjectListRows(
      [rasProject({ fldFacilities: [], fldFacID: '' })],
      clients,
      facilities,
      inspectors,
      ''
    );
    expect(rows[0].facilityDisplay).toBe(PM_NOT_ASSIGNED);
  });
});
