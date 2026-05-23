/**
 * Shared scan + whole-word replacement for TAS 2012 Toilet Rooms / Bathing Rooms stall → compartment cleanup.
 */
import type { Firestore } from 'firebase-admin/firestore';
import { resolveGlossarySetForRecord, resolveGlossarySetLabelForKey } from '../../src/lib/glossarySets.ts';
import { getRecommendationAssociatedItemIds } from '../../src/lib/libraryRecommendationMetadata.ts';

export const TAS_2012_ID = 'TAS_2012';
export const TARGET_CATEGORY_NAMES = new Set(['toilet rooms', 'bathing rooms']);

/** Fields marked ambiguous in dry-run; excluded from default writes. */
export const AMBIGUOUS_WRITE_FIELDS = new Set(['fldCitation']);

/** Whole-word stall / stalls only (not install, stalling, etc.). */
export const STALL_MATCH_RE = /\bstalls\b|\bstall\b/gi;

export type SourceType = 'master_library' | 'glossary_row' | 'projectData';

export type ProposedReplacement = {
  collection: string;
  documentId: string;
  fieldPath: string;
  currentValue: string;
  proposedValue: string;
  currentExcerpt: string;
  proposedExcerpt: string;
  resolvedGlossarySet: string;
  resolvedCategory: string;
  sourceType: SourceType;
  active: boolean;
  deletedOrArchived: boolean;
  matchQuality: 'straightforward' | 'ambiguous';
  excludedFromWrite: boolean;
  exclusionReason?: string;
};

export type ExcludedMatch = {
  reason: string;
  collection: string;
  documentId: string;
  fieldPath: string;
  excerpt: string;
};

export type StallTerminologyScanResult = {
  proposed: ProposedReplacement[];
  excluded: ExcludedMatch[];
  targetCategoryIds: Set<string>;
  scopedItemCount: number;
  targetCategoryList: string[];
};

type Row = { id: string; data: Record<string, unknown>; soft: boolean };

export function norm(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

export function normKey(v: unknown): string {
  return norm(v).toLowerCase();
}

function isSoftDeleted(data: Record<string, unknown>): boolean {
  return data.fldDeleted === true || data.fldIsDeleted === true || data.fldIsArchived === true;
}

function isTas2012Set(data: Record<string, unknown>): boolean {
  const resolved = resolveGlossarySetForRecord(data);
  return resolved.setKey.toUpperCase() === TAS_2012_ID;
}

function resolvedSetLabel(data: Record<string, unknown>): string {
  return resolveGlossarySetForRecord(data).setLabel;
}

export async function fetchAllRows(db: Firestore, name: string): Promise<Row[]> {
  const snap = await db.collection(name).get();
  const out: Row[] = [];
  snap.forEach((d) => {
    const data = d.data() as Record<string, unknown>;
    out.push({ id: d.id, data, soft: isSoftDeleted(data) });
  });
  return out;
}

function capitalizeLike(sourceWord: string, replacement: string): string {
  if (sourceWord === sourceWord.toUpperCase()) return replacement.toUpperCase();
  if (sourceWord.length > 0 && sourceWord[0] === sourceWord[0].toUpperCase()) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

function replaceStallWord(word: string): string {
  const lower = word.toLowerCase();
  if (lower === 'stalls') return capitalizeLike(word, 'compartments');
  if (lower === 'stall') return capitalizeLike(word, 'compartment');
  return word;
}

export function replaceStallTerminologyInText(text: string): { next: string; changed: boolean } {
  if (!text || !STALL_MATCH_RE.test(text)) {
    return { next: text, changed: false };
  }
  STALL_MATCH_RE.lastIndex = 0;
  let changed = false;
  const next = text.replace(STALL_MATCH_RE, (match) => {
    const rep = replaceStallWord(match);
    if (rep !== match) changed = true;
    return rep;
  });
  return { next, changed };
}

function excerptAroundMatch(text: string, maxLen = 120): string {
  const re = new RegExp(STALL_MATCH_RE.source, STALL_MATCH_RE.flags);
  const m = re.exec(text);
  if (!m || m.index === undefined) return text.slice(0, maxLen);
  const start = Math.max(0, m.index - 40);
  const end = Math.min(text.length, m.index + m[0].length + 40);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < text.length ? '…' : '';
  return prefix + text.slice(start, end) + suffix;
}

function scanStringField(input: {
  collection: string;
  documentId: string;
  fieldPath: string;
  value: string;
  resolvedGlossarySet: string;
  resolvedCategory: string;
  sourceType: SourceType;
  soft: boolean;
  excludedFromWrite: boolean;
  exclusionReason?: string;
  matchQuality?: 'straightforward' | 'ambiguous';
}): ProposedReplacement | null {
  const { next, changed } = replaceStallTerminologyInText(input.value);
  if (!changed) return null;
  return {
    collection: input.collection,
    documentId: input.documentId,
    fieldPath: input.fieldPath,
    currentValue: input.value,
    proposedValue: next,
    currentExcerpt: excerptAroundMatch(input.value),
    proposedExcerpt: excerptAroundMatch(next),
    resolvedGlossarySet: input.resolvedGlossarySet,
    resolvedCategory: input.resolvedCategory,
    sourceType: input.sourceType,
    active: !input.soft,
    deletedOrArchived: input.soft,
    matchQuality: input.matchQuality ?? 'straightforward',
    excludedFromWrite: input.excludedFromWrite,
    exclusionReason: input.exclusionReason,
  };
}

export type WriteEligibilityOptions = {
  includeAmbiguous?: boolean;
  includeDeleted?: boolean;
};

export function isEligibleForWrite(
  row: ProposedReplacement,
  options: WriteEligibilityOptions = {}
): boolean {
  if (row.excludedFromWrite && !options.includeDeleted) return false;
  if (row.matchQuality === 'ambiguous' && !options.includeAmbiguous) return false;
  if (AMBIGUOUS_WRITE_FIELDS.has(row.fieldPath) && !options.includeAmbiguous) return false;
  return true;
}

export async function collectTas2012StallTerminologyReplacements(
  db: Firestore
): Promise<StallTerminologyScanResult> {
  const [glossary, projectData, findings, recommendations, categories, items] = await Promise.all([
    fetchAllRows(db, 'glossary'),
    fetchAllRows(db, 'projectData'),
    fetchAllRows(db, 'findings'),
    fetchAllRows(db, 'recommendations'),
    fetchAllRows(db, 'categories'),
    fetchAllRows(db, 'items'),
  ]);

  const catById = new Map<string, Row>();
  const targetCategoryIds = new Set<string>();
  const categoryNameById = new Map<string, string>();

  for (const c of categories) {
    const cid = norm(c.data.fldCategoryID) || c.id;
    const name = norm(c.data.fldCategoryName);
    catById.set(normKey(cid), c);
    catById.set(normKey(c.id), c);
    categoryNameById.set(normKey(cid), name);
    if (TARGET_CATEGORY_NAMES.has(name.toLowerCase())) {
      targetCategoryIds.add(normKey(cid));
    }
  }

  const itemById = new Map<string, Row>();
  const scopedItemIds = new Set<string>();

  for (const i of items) {
    const iid = norm(i.data.fldItemID) || i.id;
    itemById.set(normKey(iid), i);
    itemById.set(normKey(i.id), i);
    const catKey = normKey(i.data.fldCatID);
    if (targetCategoryIds.has(catKey)) {
      scopedItemIds.add(normKey(iid));
    }
  }

  function categoryNameForItemId(itemId: string): string {
    const item = itemById.get(normKey(itemId));
    if (!item) return '(unknown item)';
    const catKey = normKey(item.data.fldCatID);
    return categoryNameById.get(catKey) || norm(catById.get(catKey)?.data.fldCategoryName) || '(unknown category)';
  }

  function categoryNameForCatId(catId: string): string {
    return categoryNameById.get(normKey(catId)) || norm(catById.get(normKey(catId))?.data.fldCategoryName) || '(unknown category)';
  }

  function isTargetCategoryId(catId: string): boolean {
    return targetCategoryIds.has(normKey(catId));
  }

  const findingById = new Map<string, Row>();
  for (const f of findings) {
    findingById.set(normKey(f.data.fldFindID), f);
    findingById.set(normKey(f.id), f);
  }

  const recById = new Map<string, Row>();
  for (const r of recommendations) {
    recById.set(normKey(r.data.fldRecID), r);
    recById.set(normKey(r.id), r);
  }

  const glossaryByDataKey = new Map<string, Row>();
  for (const g of glossary) {
    const glos = norm(g.data.fldGlosId);
    if (glos) glossaryByDataKey.set(normKey(glos), g);
    glossaryByDataKey.set(normKey(g.id), g);
  }

  const glossaryInScope = new Set<string>();
  const recIdsViaGlossaryInScope = new Set<string>();

  for (const g of glossary) {
    if (!isTas2012Set(g.data)) continue;
    const catId = norm(g.data.fldCat);
    if (!isTargetCategoryId(catId)) continue;
    glossaryInScope.add(g.id);
    glossaryInScope.add(normKey(g.data.fldGlosId));
    const recId = norm(g.data.fldRec) || norm(g.data.fldRecID);
    if (recId) recIdsViaGlossaryInScope.add(normKey(recId));
  }

  const findingFields = ['fldFindShort', 'fldFindLong'] as const;
  const recFields = ['fldRecShort', 'fldRecLong', 'fldCitation'] as const;
  const projectDataFields = ['fldFindShort', 'fldFindLong', 'fldRecShort', 'fldRecLong'] as const;

  function resolveGlossaryRow(data: Record<string, unknown>): Row | undefined {
    const k = normKey(data.fldData);
    if (!k) return undefined;
    return glossaryByDataKey.get(k);
  }

  function isLegacyProjectDataCitationRow(data: Record<string, unknown>): boolean {
    return Object.prototype.hasOwnProperty.call(data, 'citation_num');
  }

  function pickProjectDataScanFields(data: Record<string, unknown>): Record<string, string> {
    const out: Record<string, string> = {};
    for (const field of projectDataFields) {
      const v = norm(data[field]);
      if (v) out[field] = v;
    }
    return out;
  }

  const proposed: ProposedReplacement[] = [];
  const excluded: ExcludedMatch[] = [];

  for (const f of findings) {
    if (!isTas2012Set(f.data)) continue;
    const itemId = norm(f.data.fldItem);
    if (!scopedItemIds.has(normKey(itemId))) continue;

    const catName = categoryNameForItemId(itemId);
    const setLabel = resolvedSetLabel(f.data);
    const docId = norm(f.data.fldFindID) || f.id;

    for (const field of findingFields) {
      const value = norm(f.data[field]);
      if (!value) continue;
      const row = scanStringField({
        collection: 'findings',
        documentId: docId,
        fieldPath: field,
        value,
        resolvedGlossarySet: setLabel,
        resolvedCategory: catName,
        sourceType: 'master_library',
        soft: f.soft,
        excludedFromWrite: f.soft,
        exclusionReason: f.soft ? 'soft-deleted/archived (excluded from default writes)' : undefined,
      });
      if (row) proposed.push(row);
    }
  }

  for (const r of recommendations) {
    if (!isTas2012Set(r.data)) continue;
    const docId = norm(r.data.fldRecID) || r.id;
    const recKey = normKey(docId);

    const associatedIds = getRecommendationAssociatedItemIds(
      r.data as unknown as import('../../src/types').MasterRecommendation
    );
    const fldItem = norm(r.data.fldItem);
    const inScopeViaItem =
      (fldItem && scopedItemIds.has(normKey(fldItem))) ||
      associatedIds.some((id) => scopedItemIds.has(normKey(id)));
    const inScopeViaGlossary = recIdsViaGlossaryInScope.has(recKey);

    if (!inScopeViaItem && !inScopeViaGlossary) continue;

    let catName = '(multiple / via glossary)';
    if (inScopeViaGlossary) {
      const gRow = glossary.find(
        (g) =>
          glossaryInScope.has(g.id) &&
          normKey(norm(g.data.fldRec) || norm(g.data.fldRecID)) === recKey
      );
      if (gRow) catName = categoryNameForCatId(norm(gRow.data.fldCat));
    } else if (fldItem) {
      catName = categoryNameForItemId(fldItem);
    } else if (associatedIds.length > 0) {
      catName = categoryNameForItemId(associatedIds[0]);
    }

    const setLabel = resolvedSetLabel(r.data);

    for (const field of recFields) {
      const value = norm(r.data[field]);
      if (!value) continue;
      const row = scanStringField({
        collection: 'recommendations',
        documentId: docId,
        fieldPath: field,
        value,
        resolvedGlossarySet: setLabel,
        resolvedCategory: catName,
        sourceType: 'master_library',
        soft: r.soft,
        excludedFromWrite: r.soft,
        exclusionReason: r.soft ? 'soft-deleted/archived (excluded from default writes)' : undefined,
        matchQuality: field === 'fldCitation' ? 'ambiguous' : 'straightforward',
      });
      if (row) proposed.push(row);
    }
  }

  for (const c of categories) {
    const cid = norm(c.data.fldCategoryID) || c.id;
    if (!isTargetCategoryId(cid)) continue;
    const name = norm(c.data.fldCategoryName);
    const row = scanStringField({
      collection: 'categories',
      documentId: cid,
      fieldPath: 'fldCategoryName',
      value: name,
      resolvedGlossarySet: 'TAS 2012 (category in scope; no set field on category)',
      resolvedCategory: name,
      sourceType: 'master_library',
      soft: c.soft,
      excludedFromWrite: c.soft,
      exclusionReason: c.soft ? 'soft-deleted/archived (excluded from default writes)' : undefined,
    });
    if (row) proposed.push(row);
  }

  for (const i of items) {
    const iid = norm(i.data.fldItemID) || i.id;
    if (!scopedItemIds.has(normKey(iid))) continue;
    const name = norm(i.data.fldItemName);
    const catName = categoryNameForItemId(iid);
    const row = scanStringField({
      collection: 'items',
      documentId: iid,
      fieldPath: 'fldItemName',
      value: name,
      resolvedGlossarySet: 'TAS 2012 (item in scope; set resolved via linked masters/glossary)',
      resolvedCategory: catName,
      sourceType: 'master_library',
      soft: i.soft,
      excludedFromWrite: i.soft,
      exclusionReason: i.soft ? 'soft-deleted/archived (excluded from default writes)' : undefined,
    });
    if (row) proposed.push(row);
  }

  const glossaryStringFields = ['fldGlossarySetName'] as const;
  for (const g of glossary) {
    if (!glossaryInScope.has(g.id) && !glossaryInScope.has(normKey(g.data.fldGlosId))) continue;
    const catName = categoryNameForCatId(norm(g.data.fldCat));
    const setLabel = resolvedSetLabel(g.data);
    for (const field of glossaryStringFields) {
      const value = norm(g.data[field]);
      if (!value) continue;
      const row = scanStringField({
        collection: 'glossary',
        documentId: norm(g.data.fldGlosId) || g.id,
        fieldPath: field,
        value,
        resolvedGlossarySet: setLabel,
        resolvedCategory: catName,
        sourceType: 'glossary_row',
        soft: g.soft,
        excludedFromWrite: g.soft,
        exclusionReason: g.soft ? 'soft-deleted/archived (excluded from default writes)' : undefined,
      });
      if (row) proposed.push(row);
    }
  }

  for (const pd of projectData) {
    if (isLegacyProjectDataCitationRow(pd.data)) {
      excluded.push({
        reason: 'legacy citation-shaped projectData row (skipped)',
        collection: 'projectData',
        documentId: norm(pd.data.fldPDataID) || pd.id,
        fieldPath: '(document)',
        excerpt: '',
      });
      continue;
    }

    const glos = resolveGlossaryRow(pd.data);
    let setLabel = '';
    let catId = norm(pd.data.fldPDataCategoryID);
    let inScope = false;

    if (glos && glossaryInScope.has(glos.id)) {
      inScope = true;
      setLabel = resolvedSetLabel(glos.data);
      catId = norm(glos.data.fldCat) || catId;
    } else if (glos && isTas2012Set(glos.data) && isTargetCategoryId(norm(glos.data.fldCat))) {
      inScope = true;
      setLabel = resolvedSetLabel(glos.data);
      catId = norm(glos.data.fldCat);
    } else {
      const masterFindId = norm(pd.data.fldPDataMasterFindID);
      const masterRecId = norm(pd.data.fldPDataMasterRecID);
      const findRow = masterFindId ? findingById.get(normKey(masterFindId)) : undefined;
      const recRow = masterRecId ? recById.get(normKey(masterRecId)) : undefined;
      const setRow = findRow || recRow;
      if (setRow && isTas2012Set(setRow.data)) {
        const itemId =
          norm(pd.data.fldPDataItemID) ||
          norm(findRow?.data.fldItem) ||
          norm(recRow?.data.fldItem) ||
          '';
        if (scopedItemIds.has(normKey(itemId)) || isTargetCategoryId(catId)) {
          inScope = true;
          setLabel = resolvedSetLabel(setRow.data);
          if (!catId && itemId) {
            const item = itemById.get(normKey(itemId));
            catId = norm(item?.data.fldCatID);
          }
        }
      }
    }

    if (!inScope || !isTargetCategoryId(catId)) {
      if (STALL_MATCH_RE.test(JSON.stringify(pickProjectDataScanFields(pd.data)))) {
        STALL_MATCH_RE.lastIndex = 0;
        const catName = categoryNameForCatId(catId) || '(out of scope)';
        excluded.push({
          reason: `out of scope (set=${setLabel || 'unknown'}, category=${catName})`,
          collection: 'projectData',
          documentId: norm(pd.data.fldPDataID) || pd.id,
          fieldPath: '(scan)',
          excerpt: excerptAroundMatch(norm(pd.data.fldFindShort) || norm(pd.data.fldRecShort)),
        });
      }
      continue;
    }

    const catName = categoryNameForCatId(catId);
    const docId = norm(pd.data.fldPDataID) || pd.id;

    for (const field of projectDataFields) {
      const value = norm(pd.data[field]);
      if (!value) continue;
      const row = scanStringField({
        collection: 'projectData',
        documentId: docId,
        fieldPath: field,
        value,
        resolvedGlossarySet: setLabel || resolveGlossarySetLabelForKey(TAS_2012_ID),
        resolvedCategory: catName,
        sourceType: 'projectData',
        soft: pd.soft,
        excludedFromWrite: pd.soft,
        exclusionReason: pd.soft ? 'soft-deleted/archived (excluded from default writes)' : undefined,
      });
      if (row) proposed.push(row);
    }
  }

  const targetCategoryList = [...categories]
    .filter((c) => targetCategoryIds.has(normKey(norm(c.data.fldCategoryID) || c.id)))
    .map((c) => `${norm(c.data.fldCategoryName)} (${norm(c.data.fldCategoryID) || c.id})`);

  return {
    proposed,
    excluded,
    targetCategoryIds,
    scopedItemCount: scopedItemIds.size,
    targetCategoryList,
  };
}

export function summarizeReplacements(proposed: ProposedReplacement[]) {
  const byCollection: Record<string, number> = {};
  const byField: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  const bySource: Record<string, number> = {};

  for (const p of proposed) {
    byCollection[p.collection] = (byCollection[p.collection] || 0) + 1;
    byField[p.fieldPath] = (byField[p.fieldPath] || 0) + 1;
    byCategory[p.resolvedCategory] = (byCategory[p.resolvedCategory] || 0) + 1;
    bySource[p.sourceType] = (bySource[p.sourceType] || 0) + 1;
  }

  return { byCollection, byField, byCategory, bySource };
}

export function groupPatchesForWrite(
  eligible: ProposedReplacement[]
): Map<string, { collection: string; documentId: string; fields: Record<string, string> }> {
  const map = new Map<string, { collection: string; documentId: string; fields: Record<string, string> }>();
  for (const row of eligible) {
    const key = `${row.collection}/${row.documentId}`;
    let entry = map.get(key);
    if (!entry) {
      entry = { collection: row.collection, documentId: row.documentId, fields: {} };
      map.set(key, entry);
    }
    entry.fields[row.fieldPath] = row.proposedValue;
  }
  return map;
}
