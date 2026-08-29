import { describe, expect, it } from 'vitest';
import { emptyTdlrRegistered } from '../projectMetadataFields';
import {
  buildRasReportPdfSuggestedFilename,
  buildReportPdfSuggestedFilename,
  buildViewReportPdfSuggestedFilename,
  sanitizeReportPdfFilenamePart,
} from '../reportPreviewShared';
import type { Project } from '../../types';

describe('Assessment PDF filename', () => {
  it('remains Project Name - Facility Name', () => {
    expect(buildReportPdfSuggestedFilename('Test Project TC1-1', 'Main Campus')).toBe(
      'Test Project TC1-1 - Main Campus'
    );
    expect(
      buildViewReportPdfSuggestedFilename(
        'assessment',
        { fldProjName: 'Test Project TC1-1' },
        'Main Campus'
      )
    ).toBe('Test Project TC1-1 - Main Campus');
  });
});

describe('RAS PDF filename', () => {
  function rasProject(tabs: string, name: string): Pick<Project, 'fldProjName' | 'tdlrRegistered'> {
    const registered = emptyTdlrRegistered();
    registered.tabsProjectNumber = tabs;
    return { fldProjName: name, tdlrRegistered: registered };
  }

  it('Plan Review uses TABS# - Project Name - Plan Review', () => {
    const stem = buildViewReportPdfSuggestedFilename(
      'plan_review',
      rasProject('TABS123', 'My Project'),
      'SHOULD-NOT-APPEAR-FACILITY'
    );
    expect(stem).toBe('TABS123 - My Project - Plan Review');
    expect(`${stem}.pdf`).toBe('TABS123 - My Project - Plan Review.pdf');
  });

  it('Inspection uses TABS# - Project Name - Inspection', () => {
    const stem = buildViewReportPdfSuggestedFilename(
      'inspection',
      rasProject('TABS123', 'My Project'),
      'SHOULD-NOT-APPEAR-FACILITY'
    );
    expect(stem).toBe('TABS123 - My Project - Inspection');
    expect(`${stem}.pdf`).toBe('TABS123 - My Project - Inspection.pdf');
  });

  it('reads TABS # from tdlrRegistered.tabsProjectNumber and name from fldProjName', () => {
    const stem = buildRasReportPdfSuggestedFilename('inspection', 'TABS12345678', 'Test Project TC1-1');
    expect(stem).toBe('TABS12345678 - Test Project TC1-1 - Inspection');
    expect(stem).not.toContain('Facility');
  });

  it('does not include Facility Name', () => {
    const stem = buildViewReportPdfSuggestedFilename(
      'plan_review',
      rasProject('TABS12345678', 'Test Project TC1-1'),
      'Operational Facility'
    );
    expect(stem).toBe('TABS12345678 - Test Project TC1-1 - Plan Review');
    expect(stem).not.toContain('Operational Facility');
  });

  it('sanitizes invalid filename characters', () => {
    expect(sanitizeReportPdfFilenamePart('TABS1:2')).toBe('TABS1-2');
    const stem = buildRasReportPdfSuggestedFilename(
      'plan_review',
      'TABS<>123',
      'My/Project|Name'
    );
    expect(stem).toBe('TABS--123 - My-Project-Name - Plan Review');
    expect(stem).not.toMatch(/[<>:"/\\|?*]/);
  });

  it('omits missing TABS # without doubled separators', () => {
    expect(buildRasReportPdfSuggestedFilename('inspection', '', 'My Project')).toBe(
      'My Project - Inspection'
    );
    expect(buildRasReportPdfSuggestedFilename('inspection', null, 'My Project')).toBe(
      'My Project - Inspection'
    );
    expect(buildRasReportPdfSuggestedFilename('inspection', '', 'My Project')).not.toContain(' -  - ');
  });

  it('omits missing Project Name without doubled separators', () => {
    expect(buildRasReportPdfSuggestedFilename('plan_review', 'TABS123', '')).toBe(
      'TABS123 - Plan Review'
    );
  });

  it('uses report-type fallback when both TABS # and Project Name are missing', () => {
    expect(buildRasReportPdfSuggestedFilename('inspection', '', '')).toBe('Inspection Report');
    expect(buildRasReportPdfSuggestedFilename('plan_review', undefined, '   ')).toBe(
      'Plan Review Report'
    );
    expect(buildRasReportPdfSuggestedFilename('inspection', '', '')).not.toBe(' -  - Inspection');
    expect(buildRasReportPdfSuggestedFilename('inspection', null, undefined)).not.toContain(
      'undefined'
    );
  });
});
