import { describe, expect, it } from 'vitest';
import type { Inspector, Project } from '../../types';
import {
  currentWorkflowResponsibleProfessionalLabel,
  getCurrentWorkflowResponsibleProfessionalId,
  getCurrentWorkflowRole,
  missingResponsibleProfessionalMessage,
  resolveCurrentWorkflowResponsibleProfessional,
} from '../responsibleProfessional';

const inspectors: Inspector[] = [
  { fldInspID: 'insp-assess', fldInspName: 'Assessment Person' },
  { fldInspID: 'insp-inspect', fldInspName: 'Inspection RAS' },
  { fldInspID: 'insp-review', fldInspName: 'Plan Review RAS' },
  { fldInspID: 'insp-session', fldInspName: 'Session Picker' },
];

const assessment: Project = {
  fldProjID: 'p-a',
  fldClient: 'c1',
  fldDesigner: '',
  fldInspector: 'insp-assess',
  fldProjName: 'Site A',
  fldPDDate: '2026-08-29',
  fldProjType: 'Assessment',
};

const ras: Project = {
  fldProjID: 'p-r',
  fldClient: 'c1',
  fldDesigner: '',
  fldInspector: 'insp-assess',
  fldPlanReviewRas: 'insp-review',
  fldInspectionRas: 'insp-inspect',
  fldProjName: 'TABS Tower',
  fldPDDate: '2026-08-29',
  fldProjType: 'TAS/RAS',
};

describe('current workflow responsible professional', () => {
  it('Assessment resolves fldInspector', () => {
    expect(getCurrentWorkflowRole(assessment)).toBe('assessmentInspector');
    expect(getCurrentWorkflowResponsibleProfessionalId(assessment)).toBe('insp-assess');
    expect(resolveCurrentWorkflowResponsibleProfessional(assessment, inspectors)?.fldInspID).toBe(
      'insp-assess'
    );
  });

  it('TAS/RAS current workflow resolves fldInspectionRas', () => {
    expect(getCurrentWorkflowRole(ras)).toBe('inspectionRas');
    expect(getCurrentWorkflowResponsibleProfessionalId(ras)).toBe('insp-inspect');
    expect(resolveCurrentWorkflowResponsibleProfessional(ras, inspectors)?.fldInspID).toBe(
      'insp-inspect'
    );
  });

  it('TAS/RAS does not resolve fldInspector as Inspection RAS', () => {
    const leftover = { ...ras, fldInspectionRas: '', fldInspector: 'insp-assess' };
    expect(getCurrentWorkflowResponsibleProfessionalId(leftover)).toBe('');
    expect(resolveCurrentWorkflowResponsibleProfessional(leftover, inspectors)).toBeNull();
  });

  it('TAS/RAS does not fall back to fldPlanReviewRas', () => {
    const reviewOnly = { ...ras, fldInspectionRas: '', fldPlanReviewRas: 'insp-review' };
    expect(getCurrentWorkflowResponsibleProfessionalId(reviewOnly)).toBe('');
    expect(resolveCurrentWorkflowResponsibleProfessional(reviewOnly, inspectors)).toBeNull();
  });

  it('missing Assessment Inspector produces no responsible professional', () => {
    const missing = { ...assessment, fldInspector: '' };
    expect(getCurrentWorkflowResponsibleProfessionalId(missing)).toBe('');
    expect(resolveCurrentWorkflowResponsibleProfessional(missing, inspectors)).toBeNull();
    expect(missingResponsibleProfessionalMessage(missing)).toBe(
      'Assign an Assessment Inspector to this project before entering records.'
    );
  });

  it('missing Inspection RAS produces no responsible professional', () => {
    const missing = { ...ras, fldInspectionRas: '  ' };
    expect(getCurrentWorkflowResponsibleProfessionalId(missing)).toBe('');
    expect(resolveCurrentWorkflowResponsibleProfessional(missing, inspectors)).toBeNull();
    expect(missingResponsibleProfessionalMessage(missing)).toBe(
      'Assign an Inspection RAS to this project before entering inspection records.'
    );
  });

  it('projectData authorship id is Assessment Inspector for Assessment', () => {
    expect(getCurrentWorkflowResponsibleProfessionalId(assessment)).toBe(assessment.fldInspector);
  });

  it('projectData authorship id is Inspection RAS for TAS/RAS', () => {
    expect(getCurrentWorkflowResponsibleProfessionalId(ras)).toBe(ras.fldInspectionRas);
  });

  it('session selections.inspectorId cannot override Project assignment', () => {
    const sessionInspectorId = 'insp-session';
    const id = getCurrentWorkflowResponsibleProfessionalId(assessment);
    expect(id).toBe('insp-assess');
    expect(id).not.toBe(sessionInspectorId);
    expect(getCurrentWorkflowResponsibleProfessionalId(ras)).not.toBe(sessionInspectorId);
  });

  it('auth uid cannot become fldInspID through the resolution helper', () => {
    const authUid = 'firebase-auth-uid';
    expect(getCurrentWorkflowResponsibleProfessionalId(assessment)).not.toBe(authUid);
    expect(getCurrentWorkflowResponsibleProfessionalId(ras)).not.toBe(authUid);
    expect(getCurrentWorkflowResponsibleProfessionalId(ras)).toBe('insp-inspect');
  });

  it('same professional may occupy both RAS assignments without Inspection resolving Plan Review', () => {
    const same = {
      ...ras,
      fldPlanReviewRas: 'insp-inspect',
      fldInspectionRas: 'insp-inspect',
    };
    expect(getCurrentWorkflowResponsibleProfessionalId(same)).toBe('insp-inspect');
    expect(same.fldPlanReviewRas).toBe(same.fldInspectionRas);
  });

  it('labels match current workflow', () => {
    expect(currentWorkflowResponsibleProfessionalLabel(assessment)).toBe('Responsible Inspector');
    expect(currentWorkflowResponsibleProfessionalLabel(ras)).toBe('Responsible Inspection RAS');
  });
});
