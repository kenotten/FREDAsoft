import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import ProjectDataEntry from '../../components/ProjectDataEntry';
import { FREDASOFT_RAS_WORK_MODE_STORAGE_KEY } from '../storageKeys';

const noop = () => undefined;

const memory = new Map<string, string>();
const localStorageStub = {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => {
    memory.set(key, String(value));
  },
  removeItem: (key: string) => {
    memory.delete(key);
  },
  clear: () => {
    memory.clear();
  },
};

function installLocalStorageStub() {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: localStorageStub,
  });
}

const baseProps = {
  projectData: [],
  glossary: [],
  items: [],
  findings: [],
  recommendations: [],
  masterRecommendations: [],
  standards: [],
  locations: [],
  unitTypes: [],
  mergedCategories: [],
  inspectors: [],
  onSave: noop,
  onReset: noop,
  onSelectionChange: noop,
  onDirtyChange: noop,
  selections: {
    projectId: 'p1',
    facilityId: 'f1',
    clientId: 'c1',
    categoryId: '',
    itemId: '',
    findId: '',
    recId: '',
    glosId: '',
    locationId: '',
    dataEntryMode: 'glossary',
  },
};

const rasProject = {
  fldProjID: 'p1',
  fldProjType: 'TAS/RAS',
  fldInspector: '',
  fldInspectionRas: 'insp-inspect',
  fldPlanReviewRas: 'insp-review',
  fldClient: 'c1',
  fldDesigner: '',
  fldProjName: 'TABS Tower',
  fldPDDate: '2026-08-29',
};

const rasInspectors = [
  { fldInspID: 'insp-inspect', fldInspName: 'Inspection RAS' },
  { fldInspID: 'insp-review', fldInspName: 'Plan Review RAS' },
];

function renderDataEntry(overrides: Record<string, unknown> = {}) {
  return renderToString(
    createElement(ProjectDataEntry, {
      ...baseProps,
      ...overrides,
    })
  );
}

function hasVisibleSheetField(html: string): boolean {
  return />Sheet<\/label>/.test(html) && html.includes('placeholder="A2.1"');
}

describe('ProjectDataEntry initialization', () => {
  it('renders for Assessment without throwing', () => {
    installLocalStorageStub();
    memory.clear();
    expect(() =>
      renderToString(
        createElement(ProjectDataEntry, {
          ...baseProps,
          project: {
            fldProjID: 'p1',
            fldProjType: 'Assessment',
            fldInspector: 'insp-1',
            fldClient: 'c1',
            fldDesigner: '',
            fldProjName: 'Site A',
            fldPDDate: '2026-08-29',
          },
          inspector: { fldInspID: 'insp-1', fldInspName: 'Pat' },
          inspectors: [{ fldInspID: 'insp-1', fldInspName: 'Pat' }],
        })
      )
    ).not.toThrow();
  });

  it('renders for TAS/RAS Inspection without throwing', () => {
    installLocalStorageStub();
    memory.clear();
    expect(() =>
      renderToString(
        createElement(ProjectDataEntry, {
          ...baseProps,
          project: rasProject,
          inspector: rasInspectors[0],
          inspectors: rasInspectors,
        })
      )
    ).not.toThrow();
  });

  it('renders for TAS/RAS Review without throwing when Plan Review RAS is assigned', () => {
    installLocalStorageStub();
    memory.clear();
    memory.set(FREDASOFT_RAS_WORK_MODE_STORAGE_KEY, JSON.stringify({ p1: 'plan_review' }));
    expect(() =>
      renderToString(
        createElement(ProjectDataEntry, {
          ...baseProps,
          project: rasProject,
          inspector: rasInspectors[1],
          inspectors: rasInspectors,
        })
      )
    ).not.toThrow();
  });

  it('renders when the required RAS assignment is missing instead of crashing', () => {
    installLocalStorageStub();
    memory.clear();
    expect(() =>
      renderToString(
        createElement(ProjectDataEntry, {
          ...baseProps,
          project: { ...rasProject, fldInspectionRas: '', fldPlanReviewRas: '' },
          inspector: null,
          inspectors: [],
        })
      )
    ).not.toThrow();
  });

  it('renders while project/facility/inspector directory are still empty', () => {
    installLocalStorageStub();
    memory.clear();
    expect(() =>
      renderToString(
        createElement(ProjectDataEntry, {
          ...baseProps,
          project: null,
          facility: null,
          inspector: null,
          inspectors: [],
          selections: { ...baseProps.selections, projectId: '', facilityId: '' },
        })
      )
    ).not.toThrow();
  });
});

describe('ProjectDataEntry Review Sheet visibility', () => {
  it('Assessment does not render Sheet', () => {
    installLocalStorageStub();
    memory.clear();
    const html = renderDataEntry({
      project: {
        fldProjID: 'p1',
        fldProjType: 'Assessment',
        fldInspector: 'insp-1',
        fldClient: 'c1',
        fldDesigner: '',
        fldProjName: 'Site A',
        fldPDDate: '2026-08-29',
      },
      inspector: { fldInspID: 'insp-1', fldInspName: 'Pat' },
      inspectors: [{ fldInspID: 'insp-1', fldInspName: 'Pat' }],
    });
    expect(hasVisibleSheetField(html)).toBe(false);
  });

  it('TAS/RAS Inspection does not render Sheet', () => {
    installLocalStorageStub();
    memory.clear();
    const html = renderDataEntry({
      project: rasProject,
      inspector: rasInspectors[0],
      inspectors: rasInspectors,
    });
    expect(hasVisibleSheetField(html)).toBe(false);
  });

  it('TAS/RAS Review renders optional Sheet bound to fldSheet on the live Location row', () => {
    installLocalStorageStub();
    memory.clear();
    memory.set(FREDASOFT_RAS_WORK_MODE_STORAGE_KEY, JSON.stringify({ p1: 'plan_review' }));
    const html = renderDataEntry({
      project: rasProject,
      inspector: rasInspectors[1],
      inspectors: rasInspectors,
    });
    expect(html).toContain('Location / Area');
    expect(hasVisibleSheetField(html)).toBe(true);
    expect(html).toMatch(/>Sheet<\/label>[\s\S]{0,400}?placeholder="A2.1"/);
    expect(html).not.toMatch(/>Sheet<\/label>[\s\S]{0,400}?required/);
  });
});
