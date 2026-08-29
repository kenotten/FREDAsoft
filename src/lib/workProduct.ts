/**
 * RAS / Assessment work-product discriminator and legacy fallback.
 * fldWorkProduct is the broad division; future reportInstanceId is a particular instance.
 */

import { isAssessmentProjectType } from './projectMetadataFields';

export type WorkProduct = 'assessment' | 'plan_review' | 'inspection';
export type RasWorkMode = 'plan_review' | 'inspection';

const WORK_PRODUCTS: readonly WorkProduct[] = ['assessment', 'plan_review', 'inspection'];

export function parseWorkProduct(value: unknown): WorkProduct | '' {
  const raw = typeof value === 'string' ? value.trim() : '';
  return (WORK_PRODUCTS as readonly string[]).includes(raw) ? (raw as WorkProduct) : '';
}

export function isRasWorkMode(value: unknown): value is RasWorkMode {
  return value === 'plan_review' || value === 'inspection';
}

/**
 * Explicit fldWorkProduct wins. Missing + Assessment Project → assessment.
 * Missing + TAS/RAS Project → inspection. Never infer from author, RAS, or Sheet.
 */
export function resolveRecordWorkProduct(
  record: { fldWorkProduct?: unknown } | null | undefined,
  projectType: unknown
): WorkProduct {
  const explicit = parseWorkProduct(record?.fldWorkProduct);
  if (explicit) return explicit;
  return isAssessmentProjectType(projectType as string) ? 'assessment' : 'inspection';
}

export function workProductForNewRecord(
  projectType: unknown,
  rasWorkMode: RasWorkMode | null | undefined
): WorkProduct {
  if (isAssessmentProjectType(projectType as string)) return 'assessment';
  return rasWorkMode === 'plan_review' ? 'plan_review' : 'inspection';
}

export function recordMatchesRasWorkMode(
  record: { fldWorkProduct?: unknown } | null | undefined,
  projectType: unknown,
  mode: RasWorkMode
): boolean {
  return resolveRecordWorkProduct(record, projectType) === mode;
}

/**
 * Existing explicit work product is preserved. Legacy missing field is left missing
 * (fallback continues to apply). New rows are stamped from current context.
 */
export function workProductStampForSave(args: {
  isNew: boolean;
  existingWorkProduct?: unknown;
  projectType?: unknown;
  rasWorkMode?: RasWorkMode | null;
}): WorkProduct | undefined {
  if (!args.isNew) {
    const existing = parseWorkProduct(args.existingWorkProduct);
    return existing || undefined;
  }
  return workProductForNewRecord(args.projectType, args.rasWorkMode);
}

/** Include Sheet only for Plan Review. Omit on other new rows; omit on existing non-Review so merge cannot wipe. */
export function sheetValueForSave(args: {
  isNew: boolean;
  workProduct: WorkProduct | undefined;
  existingWorkProduct?: unknown;
  formSheet?: string | null;
}): string | undefined {
  const existing = parseWorkProduct(args.existingWorkProduct);
  const effective: WorkProduct | undefined = args.isNew
    ? args.workProduct
    : existing || args.workProduct;
  if (effective === 'plan_review') {
    return typeof args.formSheet === 'string' ? args.formSheet.trim() : '';
  }
  return undefined;
}

/** Persist current form images for Assessment, Review, and Inspection. Work product does not strip images. */
export function imagesValueForSave(args: {
  isNew: boolean;
  workProduct: WorkProduct | undefined;
  formImages: string[];
}): string[] {
  return Array.isArray(args.formImages) ? args.formImages : [];
}

/** Mode switch must not wipe image state; Sheet still must not leak into Inspection. */
export function rasWorkModeSwitchClearsImages(): boolean {
  return false;
}

export function glossaryPathCompleteForSave(
  isRas: boolean,
  ids: { categoryId?: string; itemId?: string; findId?: string; recId?: string }
): boolean {
  const cat = String(ids.categoryId || '').trim();
  const item = String(ids.itemId || '').trim();
  const find = String(ids.findId || '').trim();
  const rec = String(ids.recId || '').trim();
  if (isRas) return Boolean(cat && item && find);
  return Boolean(cat && item && find && rec);
}

export function rasNewRecordConsumptionFields(): {
  fldRecShort: string;
  fldRecLong: string;
  fldUnitCost: number;
  fldTotalCost: number;
  fldQTY: number;
} {
  return {
    fldRecShort: '',
    fldRecLong: '',
    fldUnitCost: 0,
    fldTotalCost: 0,
    fldQTY: 0,
  };
}
