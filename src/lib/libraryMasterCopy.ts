import type { Finding, MasterRecommendation } from '../types';
import { glossarySetById } from './glossarySets';

export const LIBRARY_MASTER_COPY_HELP =
  'Copy creates a new master library item. Existing glossary pairings remain linked to the original.';

export function glossarySetLabelFromEntity(entity: {
  fldGlossarySetId?: string | null;
  fldGlossarySetName?: string | null;
}): string {
  const idRaw = String(entity.fldGlossarySetId ?? '').trim();
  if (!idRaw) return 'Unassigned';
  const def = glossarySetById(idRaw);
  const name = String(entity.fldGlossarySetName ?? '').trim();
  return (name || def?.name || idRaw).trim() || 'Unassigned';
}

export function normalizeLibraryStandardsCopy(value: unknown): string[] {
  if (!value) return [];
  const raw = Array.isArray(value)
    ? value
    : typeof value === 'object'
      ? Object.values(value as object)
      : [value];
  return Array.from(
    new Set(raw.map((v) => String(v ?? '').trim()).filter(Boolean))
  );
}

export function defaultCopyShortText(sourceShort: string): string {
  const s = String(sourceShort ?? '').trim();
  if (!s) return '';
  const suffix = ' (copy)';
  const max = 120;
  if (s.length + suffix.length <= max) return `${s}${suffix}`;
  return `${s.slice(0, max - suffix.length)}${suffix}`;
}

export type FindingCopyDraft = {
  fldFindShort: string;
  fldFindLong: string;
  fldItem: string;
  fldOrder: number;
  fldMeasurementType: string;
  fldUnitType: string;
  fldStandards: string[];
  fldGlossarySetId: string;
  fldGlossarySetName: string;
  fldStandardType: string;
  fldStandardVersion: string;
};

export type RecommendationCopyDraft = {
  fldRecShort: string;
  fldRecLong: string;
  fldItem: string;
  fldOrder: number;
  fldUnit: number;
  fldUOM: string;
  fldStandards: string[];
  fldGlossarySetId: string;
  fldGlossarySetName: string;
  fldStandardType: string;
  fldStandardVersion: string;
};

function glossarySetFieldsFromSource(
  source: Pick<
    Finding | MasterRecommendation,
    'fldGlossarySetId' | 'fldGlossarySetName' | 'fldStandardType' | 'fldStandardVersion'
  >
) {
  const gid = String(source.fldGlossarySetId ?? '').trim();
  const def = gid ? glossarySetById(gid) : undefined;
  if (def) {
    return {
      fldGlossarySetId: def.id,
      fldGlossarySetName: def.name,
      fldStandardType: def.standardType,
      fldStandardVersion: def.standardVersion,
    };
  }
  return {
    fldGlossarySetId: gid,
    fldGlossarySetName: String(source.fldGlossarySetName ?? '').trim(),
    fldStandardType: String(source.fldStandardType ?? '').trim(),
    fldStandardVersion: String(source.fldStandardVersion ?? '').trim(),
  };
}

export function buildFindingCopyDraft(source: Finding): FindingCopyDraft {
  const setFields = glossarySetFieldsFromSource(source);
  return {
    fldFindShort: defaultCopyShortText(source.fldFindShort ?? ''),
    fldFindLong: String(source.fldFindLong ?? ''),
    fldItem: String(source.fldItem ?? '').trim(),
    fldOrder: source.fldOrder ?? 999,
    fldMeasurementType: String(source.fldMeasurementType ?? '').trim(),
    fldUnitType: String(source.fldUnitType ?? '').trim(),
    fldStandards: normalizeLibraryStandardsCopy(source.fldStandards),
    ...setFields,
  };
}

export function buildRecommendationCopyDraft(source: MasterRecommendation): RecommendationCopyDraft {
  const setFields = glossarySetFieldsFromSource(source);
  return {
    fldRecShort: defaultCopyShortText(source.fldRecShort ?? ''),
    fldRecLong: String(source.fldRecLong ?? ''),
    fldItem: String(source.fldItem ?? '').trim(),
    fldOrder: source.fldOrder ?? 999,
    fldUnit: Number(source.fldUnit) || 0,
    fldUOM: String(source.fldUOM ?? 'EA').trim() || 'EA',
    fldStandards: normalizeLibraryStandardsCopy(source.fldStandards),
    ...setFields,
  };
}

/** Firestore create payload for a new finding master (new id). */
export function findingCopyCreatePayload(
  newId: string,
  draft: FindingCopyDraft
): Record<string, unknown> {
  return {
    fldFindID: newId,
    fldFindShort: draft.fldFindShort.trim(),
    fldFindLong: draft.fldFindLong,
    fldItem: draft.fldItem,
    fldOrder: draft.fldOrder,
    fldMeasurementType: draft.fldMeasurementType,
    fldUnitType: draft.fldUnitType,
    fldStandards: [...draft.fldStandards],
    fldSuggestedRecs: [],
    fldGlossarySetId: draft.fldGlossarySetId || null,
    fldGlossarySetName: draft.fldGlossarySetName || null,
    fldStandardType: draft.fldStandardType || null,
    fldStandardVersion: draft.fldStandardVersion || null,
  };
}

/** Firestore create payload for a new recommendation master (new id). */
export function recommendationCopyCreatePayload(
  newId: string,
  draft: RecommendationCopyDraft
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    fldRecID: newId,
    fldRecShort: draft.fldRecShort.trim(),
    fldRecLong: draft.fldRecLong,
    fldOrder: draft.fldOrder,
    fldUnit: draft.fldUnit,
    fldUOM: draft.fldUOM,
    fldStandards: [...draft.fldStandards],
    fldGlossarySetId: draft.fldGlossarySetId || null,
    fldGlossarySetName: draft.fldGlossarySetName || null,
    fldStandardType: draft.fldStandardType || null,
    fldStandardVersion: draft.fldStandardVersion || null,
  };
  if (draft.fldItem) payload.fldItem = draft.fldItem;
  return payload;
}
