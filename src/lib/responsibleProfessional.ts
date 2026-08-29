/**
 * Current-workflow responsible professional.
 * Assessment → fldInspector.
 * TAS/RAS + Inspection (default when work context omitted) → fldInspectionRas.
 * TAS/RAS + Plan Review → fldPlanReviewRas.
 * Does not use session inspectorId, auth uid, or cross-role fallback.
 */

import type { Inspector, Project } from '../types';
import { isAssessmentProjectType } from './projectMetadataFields';
import type { RasWorkMode } from './workProduct';

export type CurrentWorkflowRole = 'assessmentInspector' | 'inspectionRas' | 'planReviewRas';
export type MissingProfessionalPurpose = 'records' | 'continue';

type ProjectAssignmentFields = Pick<
  Project,
  'fldProjType' | 'fldInspector' | 'fldInspectionRas' | 'fldPlanReviewRas'
>;

function trimId(value: string | undefined | null): string {
  return typeof value === 'string' ? value.trim() : '';
}

function rasWorkContext(workContext?: RasWorkMode | null): RasWorkMode {
  return workContext === 'plan_review' ? 'plan_review' : 'inspection';
}

/** Sticky RAS mode for TAS/RAS; Assessment has no work-mode professional context. */
export function currentWorkflowWorkContext(
  project: Pick<Project, 'fldProjType'> | null | undefined,
  rasWorkMode?: RasWorkMode | null
): RasWorkMode | null {
  if (!project || isAssessmentProjectType(project.fldProjType)) return null;
  return rasWorkContext(rasWorkMode);
}

export function getCurrentWorkflowRole(
  project: Pick<Project, 'fldProjType'> | null | undefined,
  workContext?: RasWorkMode | null
): CurrentWorkflowRole {
  if (isAssessmentProjectType(project?.fldProjType)) return 'assessmentInspector';
  return rasWorkContext(workContext) === 'plan_review' ? 'planReviewRas' : 'inspectionRas';
}

/** Inspector/RAS directory id for the current production workflow. Empty when unassigned. */
export function getCurrentWorkflowResponsibleProfessionalId(
  project: ProjectAssignmentFields | null | undefined,
  workContext?: RasWorkMode | null
): string {
  if (!project) return '';
  if (isAssessmentProjectType(project.fldProjType)) {
    return trimId(project.fldInspector);
  }
  if (rasWorkContext(workContext) === 'plan_review') {
    return trimId(project.fldPlanReviewRas);
  }
  return trimId(project.fldInspectionRas);
}

export function resolveCurrentWorkflowResponsibleProfessional(
  project: ProjectAssignmentFields | null | undefined,
  inspectors: Inspector[] | null | undefined,
  workContext?: RasWorkMode | null
): Inspector | null {
  const id = getCurrentWorkflowResponsibleProfessionalId(project, workContext);
  if (!id || !inspectors?.length) return null;
  return inspectors.find((i) => i.fldInspID === id) || null;
}

export function currentWorkflowResponsibleProfessionalLabel(
  project: Pick<Project, 'fldProjType'> | null | undefined,
  workContext?: RasWorkMode | null
): string {
  const role = getCurrentWorkflowRole(project, workContext);
  if (role === 'assessmentInspector') return 'Responsible Inspector';
  if (role === 'planReviewRas') return 'Responsible Plan Review RAS';
  return 'Responsible Inspection RAS';
}

export function missingResponsibleProfessionalMessage(
  project: Pick<Project, 'fldProjType'> | null | undefined,
  workContext?: RasWorkMode | null,
  purpose: MissingProfessionalPurpose = 'records'
): string {
  const role = getCurrentWorkflowRole(project, workContext);
  if (purpose === 'continue') {
    if (role === 'assessmentInspector') {
      return 'Assign an Assessment Inspector to this project before continuing.';
    }
    if (role === 'planReviewRas') {
      return 'Assign a Plan Review RAS to this project before continuing.';
    }
    return 'Assign an Inspection RAS to this project before continuing.';
  }
  if (role === 'assessmentInspector') {
    return 'Assign an Assessment Inspector to this project before entering records.';
  }
  if (role === 'planReviewRas') {
    return 'Assign a Plan Review RAS to this project before entering review records.';
  }
  return 'Assign an Inspection RAS to this project before entering inspection records.';
}

/** View Report / navigation gate for the current work-mode professional. */
export function currentWorkflowReportGate(
  project: ProjectAssignmentFields | null | undefined,
  inspectors: Inspector[] | null | undefined,
  workContext?: RasWorkMode | null
): { allowed: boolean; professional: Inspector | null; message: string } {
  const professional = resolveCurrentWorkflowResponsibleProfessional(project, inspectors, workContext);
  return {
    allowed: Boolean(professional),
    professional,
    message: missingResponsibleProfessionalMessage(project, workContext, 'continue'),
  };
}
