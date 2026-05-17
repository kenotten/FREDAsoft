/**
 * Phase X2 — Cross-glossary-set target dry-run preview (no Firestore writes).
 * Logic mirrors `handlePrepareTargetSetRecords` in GlossaryBuilder.
 */

import { glossarySetById } from './glossarySets';
import { normalizeForDeterministicMatch } from './textNormalize';

export function normalizeGlossaryRecordSetKey(raw: string | undefined | null): string {
  const t = String(raw ?? '').trim();
  if (!t) return '';
  const def = glossarySetById(t);
  return def ? def.id : t;
}

function normId(v: unknown): string {
  return String(v ?? '').toLowerCase().trim();
}

function normalizeStringArray(value: unknown): string[] {
  if (!value) return [];
  const rawValues = Array.isArray(value)
    ? value
    : typeof value === 'object'
      ? Object.values(value as object)
      : [value];
  return Array.from(
    new Set(
      rawValues
        .map((v) => String(v ?? '').trim())
        .filter(Boolean)
    )
  );
}

function glossarySameFourTuple(
  g: any,
  selectedCat: string,
  selectedItem: string,
  selectedFind: string,
  selectedRec: string
): boolean {
  return (
    normId(g.fldCat) === normId(selectedCat) &&
    normId(g.fldItem) === normId(selectedItem) &&
    normId(g.fldFind) === normId(selectedFind) &&
    normId(g.fldRec || g.fldRecID) === normId(selectedRec)
  );
}

function findExactGlossaryByFiveTuple(
  glossaryList: any[],
  selectedCat: string,
  selectedItem: string,
  selectedFind: string,
  selectedRec: string,
  selectedSetKey: string
): any | undefined {
  return (glossaryList || []).find(
    (g: any) =>
      glossarySameFourTuple(g, selectedCat, selectedItem, selectedFind, selectedRec) &&
      normalizeGlossaryRecordSetKey(g.fldGlossarySetId) === selectedSetKey
  );
}

export type CrossSetMasterActionKind = 'reuse' | 'create' | 'blocked_multiple';

export type CrossSetMasterAction = {
  kind: CrossSetMasterActionKind;
  /** Present when reuse or blocked_multiple */
  masterId?: string;
  shortTitle: string;
  longPreview: string;
  matchCount?: number;
  /** Target-set master standards count (reuse only); new masters would be 0 */
  standardsCount: number;
};

export type CrossSetTargetPreviewResult =
  | {
      kind: 'inactive';
      reason: string;
    }
  | {
      kind: 'ready';
      /** Dry-run only — no writes */
      dryRun: true;
      source: {
        glossarySetId: string;
        glossarySetLabel: string;
        categoryId: string;
        categoryName: string;
        itemId: string;
        itemName: string;
        findingId: string;
        findingShort: string;
        recommendationId: string;
        recommendationShort: string;
        glossaryRowId: string;
        glossaryRowStandardCount: number;
        glossaryRowImageCount: number;
      };
      target: {
        glossarySetId: string;
        glossarySetLabel: string;
        categoryId: string;
        categoryName: string;
        itemId: string;
        itemName: string;
        finding: CrossSetMasterAction;
        recommendation: CrossSetMasterAction;
        fiveTuple: {
          status: 'unknown_until_prepare' | 'available' | 'exists';
          existingGlosId?: string;
          message: string;
        };
      };
      standards: {
        crossSetInheritance: false;
        sourceGlossaryStandardsNotCopied: true;
        newMasterFindingStandards: string;
        newMasterRecStandards: string;
        proposedGlossaryStandardsSummary: string;
        findingStandardsCount: number;
        recStandardsCount: number;
        glossaryStandardsCount: number;
      };
      images: {
        targetRowWouldStartEmpty: true;
        sourceGlossaryImageCount: number;
        summary: string;
      };
      blockingErrors: string[];
      canPrepare: boolean;
    };

export type ComputeCrossSetTargetPreviewInput = {
  selectedCat: string;
  selectedItem: string;
  selectedFind: string;
  selectedRec: string;
  selectedGlossarySetId: string;
  sourceGlossarySetId: string;
  sourceGlossaryRowId: string;
  categoryName: string;
  itemName: string;
  sourceFindingShort: string;
  sourceRecShort: string;
  findings: any[];
  masterRecommendations: any[];
  glossary: any[];
};

/**
 * Pure dry-run: same match rules as Prepare Target Set Records (short + long text, target set + item).
 */
export function computeCrossSetTargetPreview(
  input: ComputeCrossSetTargetPreviewInput
): CrossSetTargetPreviewResult {
  const {
    selectedCat,
    selectedItem,
    selectedFind,
    selectedRec,
    selectedGlossarySetId,
    sourceGlossarySetId,
    sourceGlossaryRowId,
    categoryName,
    itemName,
    sourceFindingShort,
    sourceRecShort,
    findings,
    masterRecommendations,
    glossary,
  } = input;

  if (!selectedCat || !selectedItem || !selectedFind || !selectedRec) {
    return {
      kind: 'inactive',
      reason: 'Select Category, Item, Finding, and Recommendation to preview a cross-set target.',
    };
  }

  const targetSet = glossarySetById(selectedGlossarySetId);
  if (!targetSet) {
    return {
      kind: 'inactive',
      reason: 'Select a named target Glossary Set to preview cross-set actions.',
    };
  }

  const sourceSetKey = normalizeGlossaryRecordSetKey(sourceGlossarySetId);
  const targetSetKey = targetSet.id;

  if (sourceSetKey === targetSetKey) {
    return {
      kind: 'inactive',
      reason:
        'Target Glossary Set is the same as the source set. Choose a different target set for cross-set preview.',
    };
  }

  if (!sourceGlossaryRowId) {
    return {
      kind: 'inactive',
      reason:
        'Cross-set preview requires a source glossary row. Change Glossary Set from an existing source row, or open a source five-tuple first.',
    };
  }

  const sourceFinding = (findings || []).find(
    (f: any) => normId(f.id || f.fldFindID) === normId(selectedFind)
  );
  const sourceRec = (masterRecommendations || []).find(
    (r: any) => normId(r.id || r.fldRecID) === normId(selectedRec)
  );

  if (!sourceFinding || !sourceRec) {
    return {
      kind: 'inactive',
      reason: 'Source finding or recommendation not found in library data.',
    };
  }

  const sourceGlos = (glossary || []).find(
    (g: any) => String(g.fldGlosId || g.id || '').trim() === sourceGlossaryRowId
  );

  const sourceFindShortN = normalizeForDeterministicMatch(sourceFinding.fldFindShort);
  const sourceFindLongN = normalizeForDeterministicMatch(sourceFinding.fldFindLong);
  const sourceRecShortN = normalizeForDeterministicMatch(sourceRec.fldRecShort);
  const sourceRecLongN = normalizeForDeterministicMatch(sourceRec.fldRecLong);
  const sourceRecItem = String(sourceRec.fldItem || '').trim();

  const findingMatches = (findings || []).filter((f: any) => {
    const setKey = normalizeGlossaryRecordSetKey(f.fldGlossarySetId);
    if (setKey !== targetSetKey) return false;
    if (normId(f.fldItem) !== normId(selectedItem)) return false;
    return (
      normalizeForDeterministicMatch(f.fldFindShort) === sourceFindShortN &&
      normalizeForDeterministicMatch(f.fldFindLong) === sourceFindLongN
    );
  });

  const recMatches = (masterRecommendations || []).filter((r: any) => {
    const setKey = normalizeGlossaryRecordSetKey(r.fldGlossarySetId);
    if (setKey !== targetSetKey) return false;
    if (sourceRecItem) {
      if (normId(r.fldItem) !== normId(sourceRecItem)) return false;
    }
    return (
      normalizeForDeterministicMatch(r.fldRecShort) === sourceRecShortN &&
      normalizeForDeterministicMatch(r.fldRecLong) === sourceRecLongN
    );
  });

  const sourceSetLabel =
    glossarySetById(sourceSetKey)?.name || sourceSetKey || 'Unassigned / Legacy';

  let findingAction: CrossSetMasterAction;
  if (findingMatches.length > 1) {
    findingAction = {
      kind: 'blocked_multiple',
      shortTitle: sourceFinding.fldFindShort || '',
      longPreview: sourceFinding.fldFindLong || '',
      matchCount: findingMatches.length,
      standardsCount: 0,
    };
  } else if (findingMatches.length === 1) {
    const f = findingMatches[0];
    findingAction = {
      kind: 'reuse',
      masterId: String(f.id || f.fldFindID || '').trim(),
      shortTitle: f.fldFindShort || '',
      longPreview: f.fldFindLong || '',
      standardsCount: normalizeStringArray(f.fldStandards).length,
    };
  } else {
    findingAction = {
      kind: 'create',
      shortTitle: sourceFinding.fldFindShort || '',
      longPreview: sourceFinding.fldFindLong || '',
      standardsCount: 0,
    };
  }

  let recAction: CrossSetMasterAction;
  if (recMatches.length > 1) {
    recAction = {
      kind: 'blocked_multiple',
      shortTitle: sourceRec.fldRecShort || '',
      longPreview: sourceRec.fldRecLong || '',
      matchCount: recMatches.length,
      standardsCount: 0,
    };
  } else if (recMatches.length === 1) {
    const r = recMatches[0];
    recAction = {
      kind: 'reuse',
      masterId: String(r.id || r.fldRecID || '').trim(),
      shortTitle: r.fldRecShort || '',
      longPreview: r.fldRecLong || '',
      standardsCount: normalizeStringArray(r.fldStandards).length,
    };
  } else {
    recAction = {
      kind: 'create',
      shortTitle: sourceRec.fldRecShort || '',
      longPreview: sourceRec.fldRecLong || '',
      standardsCount: 0,
    };
  }

  const blockingErrors: string[] = [];

  if (findingAction.kind === 'blocked_multiple') {
    blockingErrors.push(
      `Multiple target-set findings match source text (${findingAction.matchCount}). Resolve manually before Prepare.`
    );
  }
  if (recAction.kind === 'blocked_multiple') {
    blockingErrors.push(
      `Multiple target-set recommendations match source text (${recAction.matchCount}). Resolve manually before Prepare.`
    );
  }

  let fiveTupleStatus: 'unknown_until_prepare' | 'available' | 'exists' = 'unknown_until_prepare';
  let existingGlosId: string | undefined;
  let fiveTupleMessage =
    'Target glossary row is not created by Prepare. After masters are ready, use SAVE RECORD to create the target five-tuple.';

  if (
    findingAction.kind === 'reuse' &&
    recAction.kind === 'reuse' &&
    findingAction.masterId &&
    recAction.masterId
  ) {
    const existing = findExactGlossaryByFiveTuple(
      glossary || [],
      selectedCat,
      selectedItem,
      findingAction.masterId,
      recAction.masterId,
      targetSetKey
    );
    if (existing) {
      fiveTupleStatus = 'exists';
      existingGlosId = String(existing.fldGlosId || existing.id || '').trim();
      fiveTupleMessage = `Target five-tuple already exists (glossary row ${existingGlosId}). Edit that row instead of creating a duplicate.`;
      blockingErrors.push(fiveTupleMessage);
    } else {
      fiveTupleStatus = 'available';
      fiveTupleMessage =
        'No target five-tuple yet for reused finding + recommendation in this set. SAVE RECORD after Prepare will create a new glossary row.';
    }
  } else if (findingAction.kind === 'create' || recAction.kind === 'create') {
    fiveTupleMessage =
      'Target master id(s) will be assigned on Prepare. Five-tuple collision check applies after Prepare when both ids are known.';
  }

  const findingStdCount =
    findingAction.kind === 'reuse' ? findingAction.standardsCount : 0;
  const recStdCount = recAction.kind === 'reuse' ? recAction.standardsCount : 0;
  const proposedGlossaryStdCount = new Set([
    ...(findingAction.kind === 'reuse'
      ? normalizeStringArray(findingMatches[0]?.fldStandards)
      : []),
    ...(recAction.kind === 'reuse' ? normalizeStringArray(recMatches[0]?.fldStandards) : []),
  ]).size;

  const sourceGlosStds = normalizeStringArray(sourceGlos?.fldStandards);
  const sourceImages = Array.isArray(sourceGlos?.fldImages) ? sourceGlos.fldImages : [];

  const canPrepare =
    blockingErrors.length === 0 &&
    findingAction.kind !== 'blocked_multiple' &&
    recAction.kind !== 'blocked_multiple';

  return {
    kind: 'ready',
    dryRun: true,
    source: {
      glossarySetId: sourceSetKey,
      glossarySetLabel: sourceSetLabel,
      categoryId: selectedCat,
      categoryName: categoryName || selectedCat,
      itemId: selectedItem,
      itemName: itemName || selectedItem,
      findingId: String(sourceFinding.id || sourceFinding.fldFindID || '').trim(),
      findingShort: sourceFindingShort || sourceFinding.fldFindShort || '',
      recommendationId: String(sourceRec.id || sourceRec.fldRecID || '').trim(),
      recommendationShort: sourceRecShort || sourceRec.fldRecShort || '',
      glossaryRowId: sourceGlossaryRowId,
      glossaryRowStandardCount: sourceGlosStds.length,
      glossaryRowImageCount: sourceImages.filter(Boolean).length,
    },
    target: {
      glossarySetId: targetSetKey,
      glossarySetLabel: targetSet.name,
      categoryId: selectedCat,
      categoryName: categoryName || selectedCat,
      itemId: selectedItem,
      itemName: itemName || selectedItem,
      finding: findingAction,
      recommendation: recAction,
      fiveTuple: {
        status: fiveTupleStatus,
        existingGlosId,
        message: fiveTupleMessage,
      },
    },
    standards: {
      crossSetInheritance: false,
      sourceGlossaryStandardsNotCopied: true,
      newMasterFindingStandards: '[] (on create)',
      newMasterRecStandards: '[] (on create)',
      proposedGlossaryStandardsSummary:
        proposedGlossaryStdCount > 0
          ? `After Prepare, staged glossary citations: union of target-set reused masters only (${proposedGlossaryStdCount} id(s), deduped). Source glossary row citations are not copied.`
          : 'After Prepare, staged glossary citations start empty (new masters or no standards on reused masters).',
      findingStandardsCount: findingStdCount,
      recStandardsCount: recStdCount,
      glossaryStandardsCount: proposedGlossaryStdCount,
    },
    images: {
      targetRowWouldStartEmpty: true,
      sourceGlossaryImageCount: sourceImages.filter(Boolean).length,
      summary:
        sourceImages.length > 0
          ? `Source row has ${sourceImages.filter(Boolean).length} image(s); they are not copied across sets. New target glossary row would start with fldImages: [].`
          : 'New target glossary row would start with fldImages: [] (no silent image copy).',
    },
    blockingErrors,
    canPrepare,
  };
}

export function formatCrossSetMasterActionLabel(action: CrossSetMasterAction): string {
  if (action.kind === 'reuse') {
    return `Reuse existing (${action.masterId || 'id?'}) — "${action.shortTitle}"`;
  }
  if (action.kind === 'create') {
    return `Create new — "${action.shortTitle}"`;
  }
  return `Blocked — ${action.matchCount ?? 0} matches for "${action.shortTitle}"`;
}
