import { describe, expect, it } from 'vitest';
import {
  RAS_INSPECTION_ALTERATION_NARRATIVE_FALLBACK,
  RAS_INSPECTION_NARRATIVE_FALLBACK,
  RAS_INSPECTION_NEW_CONSTRUCTION_NARRATIVE_FALLBACK,
} from '../rasInspectionNarrative';
import { resolveFacilityReportNarrative, resolveReportNarrative } from '../reportPreviewShared';
import { emptyTdlrRegistered } from '../projectMetadataFields';
import type { Project } from '../../types';

function projectWithNarrative(overrides: Partial<Project> = {}): Project {
  return {
    fldProjID: 'proj-1',
    fldClient: 'c1',
    fldDesigner: '',
    fldInspector: '',
    fldProjName: 'Tower',
    fldPDDate: '',
    fldNarrative: undefined,
    fldFacilityNarratives: undefined,
    tdlrRegistered: emptyTdlrRegistered(),
    ...overrides,
  };
}

function inspectionProject(typeOfWork: string, overrides: Partial<Project> = {}): Project {
  return projectWithNarrative({
    tdlrRegistered: {
      ...emptyTdlrRegistered(),
      typeOfWork,
    },
    ...overrides,
  });
}

describe('resolveReportNarrative Inspection default', () => {
  it('uses the exact supplied default when no authored narrative exists', () => {
    const project = projectWithNarrative({
      tdlrRegistered: {
        ...emptyTdlrRegistered(),
        scopeOfWork: 'TABS registered scope MUST NOT BE NARRATIVE',
      },
    });
    const text = resolveReportNarrative('inspection', project, 'fac-1');
    expect(text).toBe(RAS_INSPECTION_NARRATIVE_FALLBACK);
    expect(text).toContain('\n\nTEXAS ACCESSIBILITY STANDARDS\n\n');
    expect(text).toContain('270 days from the date of this report.');
    expect(text).toContain('landlord´s authority');
    expect(text).not.toBe('TABS registered scope MUST NOT BE NARRATIVE');
  });

  it('uses the New Construction 201.1 fallback for typeOfWork New Construction', () => {
    const text = resolveReportNarrative(
      'inspection',
      inspectionProject('New Construction'),
      'fac-1'
    );
    expect(text).toBe(RAS_INSPECTION_NEW_CONSTRUCTION_NARRATIVE_FALLBACK);
    expect(text).toContain('201.1 Scope.');
    expect(text).toContain('newly designed and newly constructed');
    expect(text).not.toContain('202.3 Alterations.');
    expect(text).not.toContain('202.4 Alterations');
  });

  it('treats padded / mixed-case New Construction as the 201.1 fallback', () => {
    const text = resolveReportNarrative(
      'inspection',
      inspectionProject(' new construction '),
      'fac-1'
    );
    expect(text).toBe(RAS_INSPECTION_NEW_CONSTRUCTION_NARRATIVE_FALLBACK);
  });

  it('uses the 202.3/202.4 fallback for typeOfWork Alteration', () => {
    const text = resolveReportNarrative('inspection', inspectionProject('Alteration'), 'fac-1');
    expect(text).toBe(RAS_INSPECTION_ALTERATION_NARRATIVE_FALLBACK);
    expect(text).toContain('202.3 Alterations.');
    expect(text).toContain('202.4 Alterations Affecting Primary Function Areas.');
    expect(text).not.toContain('201.1 Scope.');
  });

  it('uses the 202.3/202.4 fallback for typeOfWork Alterations', () => {
    const text = resolveReportNarrative('inspection', inspectionProject('Alterations'), 'fac-1');
    expect(text).toBe(RAS_INSPECTION_ALTERATION_NARRATIVE_FALLBACK);
    expect(text).not.toContain('201.1 Scope.');
  });

  it('uses the generic Inspection fallback for Additions (not converted to Alteration)', () => {
    const text = resolveReportNarrative('inspection', inspectionProject('Additions'), 'fac-1');
    expect(text).toBe(RAS_INSPECTION_NARRATIVE_FALLBACK);
    expect(text).not.toBe(RAS_INSPECTION_NEW_CONSTRUCTION_NARRATIVE_FALLBACK);
  });

  it('uses the generic Inspection fallback for blank Type of Work', () => {
    const text = resolveReportNarrative('inspection', inspectionProject(''), 'fac-1');
    expect(text).toBe(RAS_INSPECTION_NARRATIVE_FALLBACK);
    expect(text).not.toBe(RAS_INSPECTION_NEW_CONSTRUCTION_NARRATIVE_FALLBACK);
  });

  it('uses the generic Inspection fallback for unknown Type of Work', () => {
    const text = resolveReportNarrative(
      'inspection',
      inspectionProject('Renovation/Alteration'),
      'fac-1'
    );
    expect(text).toBe(RAS_INSPECTION_NARRATIVE_FALLBACK);
    expect(text).not.toBe(RAS_INSPECTION_NEW_CONSTRUCTION_NARRATIVE_FALLBACK);
  });

  it('uses facility-specific authored narrative instead of either Type-of-Work fallback', () => {
    const project = inspectionProject('New Construction', {
      fldNarrative: 'Project-level leftover',
      fldFacilityNarratives: { 'fac-1': 'Authored facility inspection narrative' },
    });
    expect(resolveReportNarrative('inspection', project, 'fac-1')).toBe(
      'Authored facility inspection narrative'
    );
    expect(resolveReportNarrative('inspection', project, 'fac-1')).not.toBe(
      RAS_INSPECTION_NEW_CONSTRUCTION_NARRATIVE_FALLBACK
    );
    expect(resolveReportNarrative('inspection', project, 'fac-1')).not.toBe(
      RAS_INSPECTION_ALTERATION_NARRATIVE_FALLBACK
    );
  });

  it('uses existing fldNarrative instead of either Type-of-Work fallback', () => {
    const project = inspectionProject('Alterations', {
      fldNarrative: 'Authored project narrative',
    });
    expect(resolveReportNarrative('inspection', project, 'fac-1')).toBe('Authored project narrative');
    expect(resolveReportNarrative('inspection', project, 'fac-1')).not.toBe(
      RAS_INSPECTION_ALTERATION_NARRATIVE_FALLBACK
    );
    expect(resolveReportNarrative('inspection', project, 'fac-1')).not.toBe(
      RAS_INSPECTION_NEW_CONSTRUCTION_NARRATIVE_FALLBACK
    );
  });

  it('falls through to fldNarrative when facility-specific text is empty', () => {
    const project = projectWithNarrative({
      fldNarrative: 'Authored project narrative',
      fldFacilityNarratives: { 'fac-1': '   ' },
    });
    expect(resolveReportNarrative('inspection', project, 'fac-1')).toBe('Authored project narrative');
  });

  it('does not apply either Inspection fallback to Plan Review', () => {
    const project = inspectionProject('New Construction');
    const text = resolveReportNarrative('plan_review', project, 'fac-1');
    expect(text).toBe('No project narrative provided.');
    expect(text).not.toBe(RAS_INSPECTION_NEW_CONSTRUCTION_NARRATIVE_FALLBACK);
    expect(text).not.toBe(RAS_INSPECTION_ALTERATION_NARRATIVE_FALLBACK);
    expect(text).not.toContain('TEXAS ACCESSIBILITY STANDARDS');
  });

  it('does not apply either Inspection fallback to Assessment', () => {
    const project = inspectionProject('Alterations');
    const text = resolveReportNarrative('assessment', project, 'fac-1');
    expect(text).toBe(resolveFacilityReportNarrative(project, 'fac-1'));
    expect(text).toBe('No project narrative provided.');
    expect(text).not.toBe(RAS_INSPECTION_ALTERATION_NARRATIVE_FALLBACK);
    expect(text).not.toBe(RAS_INSPECTION_NEW_CONSTRUCTION_NARRATIVE_FALLBACK);
  });

  it('does not treat empty/whitespace authored text as present', () => {
    const project = projectWithNarrative({
      fldNarrative: '   ',
      fldFacilityNarratives: { 'fac-1': '' },
    });
    expect(resolveReportNarrative('inspection', project, 'fac-1')).toBe(
      RAS_INSPECTION_NARRATIVE_FALLBACK
    );
  });

  it('does not treat TABS Scope as Narrative', () => {
    const project = inspectionProject('New Construction', {
      tdlrRegistered: {
        ...emptyTdlrRegistered(),
        typeOfWork: 'New Construction',
        scopeOfWork: 'TABS registered scope MUST NOT BE NARRATIVE',
      },
    });
    const text = resolveReportNarrative('inspection', project, 'fac-1');
    expect(text).toBe(RAS_INSPECTION_NEW_CONSTRUCTION_NARRATIVE_FALLBACK);
    expect(text).not.toBe('TABS registered scope MUST NOT BE NARRATIVE');
  });

  it('preserves paragraph breaks in the Alteration Inspection default', () => {
    const text = resolveReportNarrative('inspection', inspectionProject('Alterations'), 'fac-1');
    expect(text).toBe(RAS_INSPECTION_ALTERATION_NARRATIVE_FALLBACK);
    expect(text).toContain('\n\n');
    expect(text.split('\n\n').length).toBeGreaterThan(1);
    expect(text).toContain('\n\nTEXAS ACCESSIBILITY STANDARDS\n\n');
    expect(text).toContain('EXCEPTION  2.');
  });

  it('preserves paragraph breaks in the New Construction Inspection default', () => {
    const text = resolveReportNarrative(
      'inspection',
      inspectionProject('New Construction'),
      'fac-1'
    );
    expect(text).toBe(RAS_INSPECTION_NEW_CONSTRUCTION_NARRATIVE_FALLBACK);
    expect(text).toContain('\n\n');
    expect(text.split('\n\n').length).toBeGreaterThan(1);
    expect(text).toContain('\n\nTEXAS ACCESSIBILITY STANDARDS\n\n');
    expect(text).toContain('report.  Compliance');
  });
});
