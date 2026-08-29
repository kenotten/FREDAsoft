import { describe, expect, it } from 'vitest';
import type { Inspector, Project } from '../../types';
import {
  currentWorkflowReportGate,
  currentWorkflowResponsibleProfessionalLabel,
  currentWorkflowWorkContext,
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

  it('TAS/RAS Review resolves fldPlanReviewRas', () => {
    expect(getCurrentWorkflowRole(ras, 'plan_review')).toBe('planReviewRas');
    expect(getCurrentWorkflowResponsibleProfessionalId(ras, 'plan_review')).toBe('insp-review');
    expect(resolveCurrentWorkflowResponsibleProfessional(ras, inspectors, 'plan_review')?.fldInspID).toBe(
      'insp-review'
    );
    expect(currentWorkflowResponsibleProfessionalLabel(ras, 'plan_review')).toBe(
      'Responsible Plan Review RAS'
    );
  });

  it('TAS/RAS Inspection with explicit work context resolves fldInspectionRas', () => {
    expect(getCurrentWorkflowResponsibleProfessionalId(ras, 'inspection')).toBe('insp-inspect');
  });

  it('TAS/RAS does not resolve fldInspector as Inspection RAS', () => {
    const leftover = { ...ras, fldInspectionRas: '', fldInspector: 'insp-assess' };
    expect(getCurrentWorkflowResponsibleProfessionalId(leftover)).toBe('');
    expect(resolveCurrentWorkflowResponsibleProfessional(leftover, inspectors)).toBeNull();
  });

  it('TAS/RAS Review does not fall back to fldInspectionRas', () => {
    const inspectOnly = { ...ras, fldPlanReviewRas: '', fldInspectionRas: 'insp-inspect' };
    expect(getCurrentWorkflowResponsibleProfessionalId(inspectOnly, 'plan_review')).toBe('');
    expect(resolveCurrentWorkflowResponsibleProfessional(inspectOnly, inspectors, 'plan_review')).toBeNull();
    expect(missingResponsibleProfessionalMessage(inspectOnly, 'plan_review')).toBe(
      'Assign a Plan Review RAS to this project before entering review records.'
    );
    expect(currentWorkflowReportGate(inspectOnly, inspectors, 'plan_review').allowed).toBe(false);
  });

  it('TAS/RAS Review does not use fldInspector as work-mode professional', () => {
    const leftover = { ...ras, fldPlanReviewRas: '', fldInspector: 'insp-assess' };
    expect(getCurrentWorkflowResponsibleProfessionalId(leftover, 'plan_review')).toBe('');
    expect(resolveCurrentWorkflowResponsibleProfessional(leftover, inspectors, 'plan_review')).toBeNull();
  });

  it('TAS/RAS Inspection does not fall back to fldPlanReviewRas', () => {
    const reviewOnly = { ...ras, fldInspectionRas: '', fldPlanReviewRas: 'insp-review' };
    expect(getCurrentWorkflowResponsibleProfessionalId(reviewOnly)).toBe('');
    expect(getCurrentWorkflowResponsibleProfessionalId(reviewOnly, 'inspection')).toBe('');
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

  it('Assessment ignores RAS work context', () => {
    expect(getCurrentWorkflowResponsibleProfessionalId(assessment, 'plan_review')).toBe('insp-assess');
    expect(getCurrentWorkflowRole(assessment, 'plan_review')).toBe('assessmentInspector');
    expect(currentWorkflowWorkContext(assessment, 'plan_review')).toBeNull();
  });

  it('TAS/RAS sticky mode maps to the matching assignment field', () => {
    expect(currentWorkflowWorkContext(ras, 'plan_review')).toBe('plan_review');
    expect(currentWorkflowWorkContext(ras, 'inspection')).toBe('inspection');
    expect(currentWorkflowWorkContext(ras, null)).toBe('inspection');
  });

  it('continue messages name the missing role and never send the user to Setup', () => {
    expect(missingResponsibleProfessionalMessage(assessment, null, 'continue')).toBe(
      'Assign an Assessment Inspector to this project before continuing.'
    );
    expect(missingResponsibleProfessionalMessage(ras, 'plan_review', 'continue')).toBe(
      'Assign a Plan Review RAS to this project before continuing.'
    );
    expect(missingResponsibleProfessionalMessage(ras, 'inspection', 'continue')).toBe(
      'Assign an Inspection RAS to this project before continuing.'
    );
    const reviewContinue = missingResponsibleProfessionalMessage(ras, 'plan_review', 'continue');
    const inspectionContinue = missingResponsibleProfessionalMessage(ras, 'inspection', 'continue');
    const reviewRecords = missingResponsibleProfessionalMessage(ras, 'plan_review');
    for (const msg of [reviewContinue, inspectionContinue, reviewRecords]) {
      expect(msg.toLowerCase()).not.toContain('setup');
      expect(msg.toLowerCase()).not.toContain('active inspector');
      expect(msg.toLowerCase()).not.toMatch(/select an inspector/);
      expect(msg.toLowerCase()).not.toMatch(/add an inspector/);
    }
  });

  it('View Report gate follows current work mode with no cross-role fallback', () => {
    const reviewOnly = { ...ras, fldInspectionRas: '', fldPlanReviewRas: 'insp-review' };
    const inspectOnly = { ...ras, fldPlanReviewRas: '', fldInspectionRas: 'insp-inspect' };
    const assessmentGate = currentWorkflowReportGate(assessment, inspectors, 'plan_review');
    const reviewGate = currentWorkflowReportGate(ras, inspectors, 'plan_review');
    const inspectionGate = currentWorkflowReportGate(ras, inspectors, 'inspection');
    const reviewWithoutReviewRas = currentWorkflowReportGate(inspectOnly, inspectors, 'plan_review');
    const inspectionWithoutInspectionRas = currentWorkflowReportGate(reviewOnly, inspectors, 'inspection');

    expect(assessmentGate.allowed).toBe(true);
    expect(assessmentGate.professional?.fldInspID).toBe('insp-assess');
    expect(reviewGate.allowed).toBe(true);
    expect(reviewGate.professional?.fldInspID).toBe('insp-review');
    expect(inspectionGate.allowed).toBe(true);
    expect(inspectionGate.professional?.fldInspID).toBe('insp-inspect');
    expect(reviewWithoutReviewRas.allowed).toBe(false);
    expect(reviewWithoutReviewRas.message).toBe(
      'Assign a Plan Review RAS to this project before continuing.'
    );
    expect(inspectionWithoutInspectionRas.allowed).toBe(false);
    expect(inspectionWithoutInspectionRas.message).toBe(
      'Assign an Inspection RAS to this project before continuing.'
    );
  });

  it('TAS/RAS never uses fldInspector for either work mode', () => {
    const leftover = {
      ...ras,
      fldPlanReviewRas: '',
      fldInspectionRas: '',
      fldInspector: 'insp-assess',
    };
    expect(getCurrentWorkflowResponsibleProfessionalId(leftover, 'plan_review')).toBe('');
    expect(getCurrentWorkflowResponsibleProfessionalId(leftover, 'inspection')).toBe('');
    expect(currentWorkflowReportGate(leftover, inspectors, 'plan_review').allowed).toBe(false);
    expect(currentWorkflowReportGate(leftover, inspectors, 'inspection').allowed).toBe(false);
  });
});
