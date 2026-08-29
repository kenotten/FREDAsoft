import { describe, expect, it } from 'vitest';
import { RAS_INSPECTION_NARRATIVE_FALLBACK } from '../rasInspectionNarrative';
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

  it('uses facility-specific authored narrative instead of the default', () => {
    const project = projectWithNarrative({
      fldNarrative: 'Project-level leftover',
      fldFacilityNarratives: { 'fac-1': 'Authored facility inspection narrative' },
    });
    expect(resolveReportNarrative('inspection', project, 'fac-1')).toBe(
      'Authored facility inspection narrative'
    );
    expect(resolveReportNarrative('inspection', project, 'fac-1')).not.toBe(
      RAS_INSPECTION_NARRATIVE_FALLBACK
    );
  });

  it('uses existing fldNarrative instead of the default', () => {
    const project = projectWithNarrative({
      fldNarrative: 'Authored project narrative',
    });
    expect(resolveReportNarrative('inspection', project, 'fac-1')).toBe('Authored project narrative');
    expect(resolveReportNarrative('inspection', project, 'fac-1')).not.toBe(
      RAS_INSPECTION_NARRATIVE_FALLBACK
    );
  });

  it('falls through to fldNarrative when facility-specific text is empty', () => {
    const project = projectWithNarrative({
      fldNarrative: 'Authored project narrative',
      fldFacilityNarratives: { 'fac-1': '   ' },
    });
    expect(resolveReportNarrative('inspection', project, 'fac-1')).toBe('Authored project narrative');
  });

  it('does not apply the Inspection default to Plan Review', () => {
    const project = projectWithNarrative();
    const text = resolveReportNarrative('plan_review', project, 'fac-1');
    expect(text).toBe('No project narrative provided.');
    expect(text).not.toBe(RAS_INSPECTION_NARRATIVE_FALLBACK);
    expect(text).not.toContain('TEXAS ACCESSIBILITY STANDARDS');
  });

  it('does not apply the Inspection default to Assessment', () => {
    const project = projectWithNarrative();
    const text = resolveReportNarrative('assessment', project, 'fac-1');
    expect(text).toBe(resolveFacilityReportNarrative(project, 'fac-1'));
    expect(text).toBe('No project narrative provided.');
    expect(text).not.toBe(RAS_INSPECTION_NARRATIVE_FALLBACK);
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

  it('preserves paragraph breaks in the Inspection default', () => {
    const text = resolveReportNarrative('inspection', projectWithNarrative(), 'fac-1');
    expect(text).toBe(RAS_INSPECTION_NARRATIVE_FALLBACK);
    expect(text).toContain('\n\n');
    expect(text.split('\n\n').length).toBeGreaterThan(1);
    expect(text).toContain('EXCEPTION  2.');
  });
});
