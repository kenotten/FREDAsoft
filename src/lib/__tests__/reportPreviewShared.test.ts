import { describe, expect, it } from 'vitest';
import type { Category, Facility, Finding, Glossary, Item, Location, Project, ProjectData } from '../../types';
import { filterReportProjectForPreview } from '../reportPreviewShared';

function makeProjectData(partial: Partial<ProjectData> = {}): ProjectData {
  return {
    fldPDataID: partial.fldPDataID ?? 'pd-1',
    fldPDataProject: partial.fldPDataProject ?? 'proj-1',
    fldFacility: partial.fldFacility ?? 'fac-1',
    fldData: '',
    fldLocation: 'loc-1',
    fldFindShort: '',
    fldFindLong: '',
    fldRecShort: '',
    fldRecLong: '',
    fldQTY: 1,
    fldImages: [],
    fldInspID: 'insp-1',
    fldTimestamp: '',
    ...partial,
  };
}

describe('filterReportProjectForPreview', () => {
  const project: Project = {
    fldProjID: 'proj-1',
    fldClient: 'client-1',
    fldDesigner: '',
    fldInspector: '',
    fldProjName: 'Project One',
    fldPDDate: '01/01/2026',
  };

  const facility: Facility = {
    fldFacID: 'fac-1',
    fldFacName: 'Facility One',
    fldClient: 'client-1',
  };

  const emptyGlossary: Glossary[] = [];
  const emptyCategories: Category[] = [];
  const emptyItems: Item[] = [];
  const emptyLocations: Location[] = [];
  const emptyFindings: Finding[] = [];

  it('keeps only records matching project and facility', () => {
    const projectData = [
      makeProjectData({ fldPDataID: 'match' }),
      makeProjectData({ fldPDataID: 'wrong-fac', fldFacility: 'fac-other' }),
      makeProjectData({ fldPDataID: 'wrong-proj', fldPDataProject: 'proj-other' }),
    ];

    const filtered = filterReportProjectForPreview(
      projectData,
      project,
      facility,
      emptyGlossary,
      emptyCategories,
      emptyItems,
      emptyLocations,
      emptyFindings
    );

    expect(filtered).toHaveLength(1);
    expect(filtered[0].fldPDataID).toBe('match');
  });

  it('dedupes by fldPDataID', () => {
    const duplicate = makeProjectData({ fldPDataID: 'dup' });
    const filtered = filterReportProjectForPreview(
      [duplicate, { ...duplicate }],
      project,
      facility,
      emptyGlossary,
      emptyCategories,
      emptyItems,
      emptyLocations,
      emptyFindings
    );
    expect(filtered).toHaveLength(1);
  });
});
