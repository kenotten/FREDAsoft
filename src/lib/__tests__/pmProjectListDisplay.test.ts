import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ProjectList } from '../../components/pm/ProjectList';
import { emptyTdlrRegistered } from '../projectMetadataFields';
import {
  selectPmProjectListRows,
  type PmProjectTypeFilter,
} from '../pmProjectSearch';
import type { Client, Facility, Inspector, Project } from '../../types';

const clients: Client[] = [
  { fldClientID: 'c-acme', fldClientName: 'Acme Development LLC' },
  { fldClientID: 'c-harris', fldClientName: 'Harris County Facilities' },
];

const facilities: Facility[] = [
  {
    fldFacID: 'f-west',
    fldFacName: 'West Campus Building A',
    fldClient: 'c-acme',
  },
  {
    fldFacID: 'f-harris',
    fldFacName: 'Harris Civic Center',
    fldClient: 'c-harris',
  },
];

const inspectors: Inspector[] = [
  { fldInspID: 'insp-review', fldInspName: 'Review RAS' },
  { fldInspID: 'insp-inspect', fldInspName: 'Inspect RAS' },
];

function project(overrides: Partial<Project> = {}): Project {
  const registered = emptyTdlrRegistered();
  registered.tabsProjectNumber = overrides.tdlrRegistered?.tabsProjectNumber ?? '';
  return {
    fldProjID: 'p-default',
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

const projects: Project[] = [
  project({
    fldProjID: 'p-harris-courthouse',
    fldProjName: 'Harris County Courthouse',
    fldProjNumber: '26-09-00010',
    fldClient: 'c-harris',
    fldFacilities: ['f-harris'],
    fldProjType: 'TAS/RAS',
  }),
  project({
    fldProjID: 'p-harris-gym',
    fldProjName: 'Harris ISD Gym',
    fldProjNumber: '26-08-00020',
    fldClient: 'c-harris',
    fldFacilities: ['f-harris'],
    fldProjType: 'Assessment',
  }),
  project({
    fldProjID: 'p-tower',
    fldProjName: 'Tower Alterations',
    fldProjNumber: '26-07-00001',
    fldProjType: 'TAS/RAS',
  }),
  project({
    fldProjID: 'p-warehouse',
    fldProjName: 'Legacy Warehouse',
    fldProjNumber: '19-01-00001',
    fldProjType: 'Assessment',
  }),
];

/** Same derivation the production PM list uses: one rows array drives count and table. */
function renderPmList(query: string, typeFilter: PmProjectTypeFilter = 'all') {
  const rows = selectPmProjectListRows(projects, clients, facilities, inspectors, query, typeFilter);
  const html = renderToStaticMarkup(
    createElement(ProjectList, {
      rows,
      query,
      onOpenProject: () => undefined,
    })
  );
  return {
    rows,
    visibleCount: rows.length,
    totalCount: projects.length,
    countText: `${rows.length} of ${projects.length} projects`,
    names: rows.map((row) => row.projectNameDisplay),
    ids: rows.map((row) => row.projectId),
    html,
    bodyRowCount: countBodyRows(html),
  };
}

function countBodyRows(html: string): number {
  const start = html.indexOf('<tbody');
  if (start < 0) return 0;
  const innerStart = html.indexOf('>', start) + 1;
  const end = html.indexOf('</tbody>', innerStart);
  const inner = html.slice(innerStart, end);
  return (inner.match(/<tr\b/g) || []).length;
}

describe('PM list search display', () => {
  it('A: initial list shows multiple rows with matching count', () => {
    const initial = renderPmList('', 'all');
    expect(initial.visibleCount).toBe(4);
    expect(initial.bodyRowCount).toBe(4);
    expect(initial.names).toEqual([
      'Harris County Courthouse',
      'Harris ISD Gym',
      'Tower Alterations',
      'Legacy Warehouse',
    ]);
    expect(initial.countText).toBe('4 of 4 projects');
  });

  it('B–E: search narrows visible rows immediately without a type toggle; count stays in sync', () => {
    const initial = renderPmList('', 'all');
    const searched = renderPmList('harris', 'all');

    expect(searched.visibleCount).toBe(2);
    expect(searched.visibleCount).toBeLessThan(initial.visibleCount);
    expect(searched.bodyRowCount).toBe(searched.visibleCount);
    expect(searched.countText).toBe('2 of 4 projects');
    expect(searched.names).toEqual(['Harris County Courthouse', 'Harris ISD Gym']);
    expect(searched.html).toContain('Harris County Courthouse');
    expect(searched.html).toContain('Harris ISD Gym');
    expect(searched.html).not.toContain('Tower Alterations');
    expect(searched.html).not.toContain('Legacy Warehouse');
  });

  it('clears search and restores the full list without a type toggle', () => {
    const searched = renderPmList('harris', 'all');
    const restored = renderPmList('', 'all');
    expect(searched.visibleCount).toBe(2);
    expect(restored.visibleCount).toBe(4);
    expect(restored.bodyRowCount).toBe(4);
    expect(restored.html).toContain('Tower Alterations');
    expect(restored.html).toContain('Legacy Warehouse');
  });

  it('applies type and search together without requiring a later type toggle', () => {
    const combined = renderPmList('harris', 'Assessment');
    expect(combined.ids).toEqual(['p-harris-gym']);
    expect(combined.bodyRowCount).toBe(1);
    expect(combined.countText).toBe('1 of 4 projects');
    expect(combined.html).toContain('Harris ISD Gym');
    expect(combined.html).not.toContain('Harris County Courthouse');
  });

  it('type toggle after search does not change search-only semantics', () => {
    const searchOnly = renderPmList('harris', 'all');
    const typeAway = renderPmList('harris', 'TAS/RAS');
    const typeBack = renderPmList('harris', 'all');

    expect(typeAway.ids).toEqual(['p-harris-courthouse']);
    expect(typeBack.ids).toEqual(searchOnly.ids);
    expect(typeBack.bodyRowCount).toBe(searchOnly.bodyRowCount);
    expect(typeBack.html).toContain('Harris ISD Gym');
    expect(typeBack.html).toContain('Harris County Courthouse');
  });
});
