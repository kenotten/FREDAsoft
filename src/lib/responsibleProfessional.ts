/**
 * Current-workflow responsible professional.
 * Assessment → fldInspector.
 * TAS/RAS Data Entry (Inspection until Review mode exists) → fldInspectionRas.
 * Does not use session inspectorId, auth uid, fldPlanReviewRas, or fldInspector on TAS/RAS.
 */

import type { Inspector, Project } from '../types';
import { isAssessmentProjectType } from './projectMetadataFields';

export type CurrentWorkflowRole = 'assessmentInspector' | 'inspectionRas';

type ProjectAssignmentFields = Pick<
  Project,
  'fldProjType' | 'fldInspector' | 'fldInspectionRas' | 'fldPlanReviewRas'
>;

function trimId(value: string | undefined | null): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function getCurrentWorkflowRole(
  project: Pick<Project, 'fldProjType'> | null | undefined
): CurrentWorkflowRole {
  return isAssessmentProjectType(project?.fldProjType) ? 'assessmentInspector' : 'inspectionRas';
}

/** Inspector/RAS directory id for the current production workflow. Empty when unassigned. */
export function getCurrentWorkflowResponsibleProfessionalId(
  project: ProjectAssignmentFields | null | undefined
): string {
  if (!project) return '';
  if (isAssessmentProjectType(project.fldProjType)) {
    return trimId(project.fldInspector);
  }
  return trimId(project.fldInspectionRas);
}

export function resolveCurrentWorkflowResponsibleProfessional(
  project: ProjectAssignmentFields | null | undefined,
  inspectors: Inspector[] | null | undefined
): Inspector | null {
  const id = getCurrentWorkflowResponsibleProfessionalId(project);
  if (!id || !inspectors?.length) return null;
  return inspectors.find((i) => i.fldInspID === id) || null;
}

export function currentWorkflowResponsibleProfessionalLabel(
  project: Pick<Project, 'fldProjType'> | null | undefined
): string {
  return getCurrentWorkflowRole(project) === 'assessmentInspector'
    ? 'Responsible Inspector'
    : 'Responsible Inspection RAS';
}

export function missingResponsibleProfessionalMessage(
  project: Pick<Project, 'fldProjType'> | null | undefined
): string {
  if (getCurrentWorkflowRole(project) === 'assessmentInspector') {
    return 'Assign an Assessment Inspector to this project before entering records.';
  }
  return 'Assign an Inspection RAS to this project before entering inspection records.';
}
