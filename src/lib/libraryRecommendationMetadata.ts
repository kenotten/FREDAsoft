import { lookupRecUsage, type LibraryMasterUsageIndex } from './libraryMasterUsage';
import { isActiveLibraryMaster, isValidActiveItemId, resolveItemAssignmentPathLabel } from './libraryManagerFindings';
import type { Category, Item, MasterRecommendation } from '../types';

export type LibraryRecommendationViewFilter = 'all' | 'unused' | 'metadata_cleanup';

export const LIBRARY_RECOMMENDATION_FILTER_LABELS: Record<LibraryRecommendationViewFilter, string> = {
  all: 'All Recommendations',
  unused: 'Unused Recommendations',
  metadata_cleanup: 'Item Metadata Cleanup',
};

export const LIBRARY_RECOMMENDATION_UNUSED_HELP =
  'Unused = no active glossary rows. Suggested finding links are not counted.';

export const LIBRARY_RECOMMENDATION_ASSOCIATED_ITEMS_HELP =
  'Associated items are metadata for organizing and finding this recommendation. Glossary rows remain the source of truth for approved pairings.';

export const LIBRARY_RECOMMENDATION_PENDING_ASSOCIATED_ITEMS_HELP =
  'Pending associated item metadata changes. Save Changes to apply.';

export type RecommendationMetadataCleanupIssue = 'none' | 'empty' | 'invalid';

function normId(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

/** Normalize and dedupe item id strings (preserves first-seen casing). */
export function normalizeAssociatedItemIds(raw: unknown): string[] {
  const rawList: unknown[] = Array.isArray(raw)
    ? raw
    : typeof raw === 'string' && String(raw).trim()
      ? [raw]
      : raw && typeof raw === 'object'
        ? Object.values(raw as object)
        : [];

  const seen = new Set<string>();
  const out: string[] = [];
  for (const entry of rawList) {
    const id = String(entry ?? '').trim();
    if (!id) continue;
    const key = normId(id);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(id);
  }
  return out;
}

/**
 * Deduped associated item ids: fldAssociatedItemIds plus legacy fldItem when present.
 * Pass edits to include pending fldAssociatedItemIds patch only (does not read fldItem from edits).
 */
export function getRecommendationAssociatedItemIds(
  rec: MasterRecommendation,
  edits?: Record<string, Record<string, unknown>>,
  recId?: string
): string[] {
  const id = String(recId ?? rec.fldRecID ?? rec.id ?? '').trim();
  if (edits?.[id] && 'fldAssociatedItemIds' in edits[id]) {
    return normalizeAssociatedItemIds(edits[id].fldAssociatedItemIds);
  }

  const merged = normalizeAssociatedItemIds(rec.fldAssociatedItemIds);
  const legacy = String(rec.fldItem ?? '').trim();
  if (legacy && !merged.some((m) => normId(m) === normId(legacy))) {
    merged.push(legacy);
  }
  return merged;
}

/** Persisted/saved record only (for metadata cleanup filter visibility until save). */
export function getPersistedRecommendationAssociatedItemIds(
  rec: MasterRecommendation
): string[] {
  return getRecommendationAssociatedItemIds(rec);
}

export function hasPendingAssociatedItemIdsEdit(
  masterId: string,
  edits: Record<string, Record<string, unknown>>
): boolean {
  const patch = edits[masterId];
  return Boolean(patch && 'fldAssociatedItemIds' in patch);
}

export function recommendationMetadataCleanupIssuePersisted(
  rec: MasterRecommendation,
  items: Item[]
): { issue: RecommendationMetadataCleanupIssue; invalidIds: string[] } {
  if (!isActiveLibraryMaster(rec)) {
    return { issue: 'none', invalidIds: [] };
  }
  const ids = getPersistedRecommendationAssociatedItemIds(rec);
  if (ids.length === 0) {
    return { issue: 'empty', invalidIds: [] };
  }
  const invalidIds = ids.filter((itemId) => !isValidActiveItemId(itemId, items));
  if (invalidIds.length > 0) {
    return { issue: 'invalid', invalidIds };
  }
  return { issue: 'none', invalidIds: [] };
}

export function matchesRecommendationMetadataCleanupFilter(
  rec: MasterRecommendation,
  items: Item[]
): boolean {
  const { issue } = recommendationMetadataCleanupIssuePersisted(rec, items);
  return issue !== 'none';
}

export function recommendationMetadataCleanupStatusLabel(
  rec: MasterRecommendation,
  items: Item[]
): string {
  const { issue, invalidIds } = recommendationMetadataCleanupIssuePersisted(rec, items);
  if (issue === 'empty') return 'No associated item metadata';
  if (issue === 'invalid') {
    return `Invalid associated item id(s): ${invalidIds.join(', ')}`;
  }
  return '';
}

export function recommendationPendingAssociatedItemsMessage(
  rec: MasterRecommendation,
  items: Item[],
  categories: Category[],
  edits: Record<string, Record<string, unknown>>
): string | null {
  const recId = rec.fldRecID || rec.id;
  if (!hasPendingAssociatedItemIdsEdit(recId, edits)) return null;
  const pending = getRecommendationAssociatedItemIds(rec, edits, recId);
  const paths = pending.map(
    (itemId) => resolveItemAssignmentPathLabel(itemId, items, categories) ?? itemId
  );
  if (paths.length === 0) {
    return 'Pending associated item metadata changes (cleared list). Save Changes to apply.';
  }
  return `Pending associated item metadata changes. Save Changes to apply. Staged: ${paths.join('; ')}.`;
}

function usageSummaryItemContextLabels(summary: {
  rows: { categoryName: string; itemName: string }[];
}): string[] {
  const seen = new Set<string>();
  const labels: string[] = [];
  for (const row of summary.rows) {
    const label = `${row.categoryName} → ${row.itemName}`;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    labels.push(label);
  }
  return labels.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

function usageSummaryItemIds(summary: {
  rows: { itemId: string }[];
}): string[] {
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const row of summary.rows) {
    const id = String(row.itemId ?? '').trim();
    if (!id || id === '(unknown)') continue;
    const key = normId(id);
    if (seen.has(key)) continue;
    seen.add(key);
    ids.push(id);
  }
  return ids;
}

export function glossaryUsageItemContextLabels(
  recId: string,
  usageIndex: LibraryMasterUsageIndex
): string[] {
  const summary = lookupRecUsage(usageIndex, recId);
  if (!summary) return [];
  return usageSummaryItemContextLabels(summary);
}

export function glossaryUsageItemContextLabelsFromSummary(
  summary: { rows: { categoryName: string; itemName: string }[] } | undefined
): string[] {
  if (!summary?.rows?.length) return [];
  return usageSummaryItemContextLabels(summary);
}

export function glossaryUsageItemIds(
  recId: string,
  usageIndex: LibraryMasterUsageIndex
): string[] {
  const summary = lookupRecUsage(usageIndex, recId);
  if (!summary) return [];
  return usageSummaryItemIds(summary);
}

export function glossaryUsageItemIdsFromSummary(
  summary: { rows: { itemId: string }[] } | undefined
): string[] {
  if (!summary?.rows?.length) return [];
  return usageSummaryItemIds(summary);
}

export function isUnusedRecommendation(
  rec: MasterRecommendation,
  usageIndex: LibraryMasterUsageIndex
): boolean {
  if (!isActiveLibraryMaster(rec)) return false;
  const summary = lookupRecUsage(usageIndex, rec.fldRecID || rec.id);
  return !summary || summary.glossaryRowCount === 0;
}

export function countUnusedRecommendations(
  recommendations: MasterRecommendation[],
  usageIndex: LibraryMasterUsageIndex
): number {
  return recommendations.filter((r) => isUnusedRecommendation(r, usageIndex)).length;
}

export function countMetadataCleanupRecommendations(
  recommendations: MasterRecommendation[],
  items: Item[]
): number {
  return recommendations.filter((r) => matchesRecommendationMetadataCleanupFilter(r, items)).length;
}

export function countMetadataCleanupBreakdown(
  recommendations: MasterRecommendation[],
  items: Item[]
): { total: number; empty: number; invalid: number } {
  let empty = 0;
  let invalid = 0;
  for (const rec of recommendations) {
    const { issue } = recommendationMetadataCleanupIssuePersisted(rec, items);
    if (issue === 'empty') empty += 1;
    else if (issue === 'invalid') invalid += 1;
  }
  return { total: empty + invalid, empty, invalid };
}

/** True when edits for a master touch only metadata fields (no shared wording warning). */
export function isRecommendationMetadataOnlyEdit(
  patch: Record<string, unknown>
): boolean {
  const keys = Object.keys(patch);
  if (keys.length === 0) return false;
  return keys.every((k) => k === 'fldAssociatedItemIds');
}
