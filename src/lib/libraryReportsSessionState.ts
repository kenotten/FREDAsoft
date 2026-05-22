import { LIBRARY_REPORTS_SESSION_STORAGE_KEY } from './storageKeys';
import type {
  GlossaryHierarchySetGroup,
  StandardsAssocCatItemSetGroup,
  StandardsAssocSetGroup,
  StandardsAssocViewMode,
} from './libraryReportsModel';

export type LibraryReportsReportMode = 'standards' | 'glossary' | 'glossary_audit';

export type LibraryReportsSessionStateV1 = {
  v: 1;
  mode: LibraryReportsReportMode;
  search: string;
  expandedKeys: string[];
  /** Standards Associations only: hide citations with no finding/rec links */
  hideUnassociatedCitations: boolean;
  /** Standards Associations layout: citation order vs category/item hierarchy */
  standardsAssocViewMode: StandardsAssocViewMode;
};

const EMPTY: LibraryReportsSessionStateV1 = {
  v: 1,
  mode: 'standards',
  search: '',
  expandedKeys: [],
  hideUnassociatedCitations: false,
  standardsAssocViewMode: 'citation_order',
};

function isReportMode(value: unknown): value is LibraryReportsReportMode {
  return value === 'standards' || value === 'glossary' || value === 'glossary_audit';
}

function isStandardsAssocViewMode(value: unknown): value is StandardsAssocViewMode {
  return value === 'citation_order' || value === 'category_item';
}

export function loadLibraryReportsSessionState(): LibraryReportsSessionStateV1 {
  if (typeof sessionStorage === 'undefined') return { ...EMPTY, expandedKeys: [] };
  try {
    const raw = sessionStorage.getItem(LIBRARY_REPORTS_SESSION_STORAGE_KEY);
    if (!raw) return { ...EMPTY, expandedKeys: [] };
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return { ...EMPTY, expandedKeys: [] };
    const o = parsed as Record<string, unknown>;
    if (o.v !== 1) return { ...EMPTY, expandedKeys: [] };
    const mode = isReportMode(o.mode) ? o.mode : EMPTY.mode;
    const search = typeof o.search === 'string' ? o.search : '';
    const expandedKeys = Array.isArray(o.expandedKeys)
      ? o.expandedKeys.filter((k): k is string => typeof k === 'string' && k.trim() !== '')
      : [];
    const hideUnassociatedCitations =
      typeof o.hideUnassociatedCitations === 'boolean' ? o.hideUnassociatedCitations : false;
    const standardsAssocViewMode = isStandardsAssocViewMode(o.standardsAssocViewMode)
      ? o.standardsAssocViewMode
      : EMPTY.standardsAssocViewMode;
    return { v: 1, mode, search, expandedKeys, hideUnassociatedCitations, standardsAssocViewMode };
  } catch {
    return { ...EMPTY, expandedKeys: [] };
  }
}

function glossarySetKeyPart(setKey: string): string {
  return setKey || '__unassigned__';
}

export const libraryReportsSectionKeys = {
  standardsSet: (setKey: string) => `s:set:${setKey}`,
  standardsCitation: (standardId: string) => `s:std:${standardId}`,
  standardsCatItemSet: (setKey: string) => `sc:set:${setKey}`,
  standardsCatItemCategory: (setKey: string, categoryId: string) =>
    `sc:cat:${setKey}:${categoryId}`,
  standardsCatItemItem: (setKey: string, categoryId: string, itemId: string) =>
    `sc:item:${setKey}:${categoryId}:${itemId}`,
  standardsCatItemCitation: (
    setKey: string,
    categoryId: string,
    itemId: string,
    standardId: string
  ) => `sc:std:${setKey}:${categoryId}:${itemId}:${standardId}`,
  glossarySet: (setKey: string) => `g:set:${glossarySetKeyPart(setKey)}`,
  glossaryCategory: (setKey: string, categoryId: string) =>
    `g:cat:${glossarySetKeyPart(setKey)}:${categoryId}`,
  glossaryItem: (setKey: string, categoryId: string, itemId: string) =>
    `g:item:${glossarySetKeyPart(setKey)}:${categoryId}:${itemId}`,
  glossaryFinding: (setKey: string, findingId: string) =>
    `g:find:${glossarySetKeyPart(setKey)}:${findingId}`,
  glossaryAuditStatus: (status: string) => `a:status:${status}`,
};

export function collectStandardsExpandedKeys(groups: StandardsAssocSetGroup[]): string[] {
  const keys: string[] = [];
  for (const g of groups) {
    keys.push(libraryReportsSectionKeys.standardsSet(g.setKey));
    for (const s of g.standards) {
      keys.push(libraryReportsSectionKeys.standardsCitation(s.standardId));
    }
  }
  return keys;
}

export function collectStandardsCatItemExpandedKeys(
  groups: StandardsAssocCatItemSetGroup[]
): string[] {
  const keys: string[] = [];
  for (const g of groups) {
    keys.push(libraryReportsSectionKeys.standardsCatItemSet(g.setKey));
    for (const cat of g.categories) {
      keys.push(libraryReportsSectionKeys.standardsCatItemCategory(g.setKey, cat.categoryId));
      for (const item of cat.items) {
        keys.push(
          libraryReportsSectionKeys.standardsCatItemItem(g.setKey, cat.categoryId, item.itemId)
        );
        for (const c of item.citations) {
          keys.push(
            libraryReportsSectionKeys.standardsCatItemCitation(
              g.setKey,
              cat.categoryId,
              item.itemId,
              c.standardId
            )
          );
        }
      }
    }
  }
  return keys;
}

export function collectGlossarySetMetadataAuditExpandedKeys(statuses: string[]): string[] {
  return statuses.map((s) => libraryReportsSectionKeys.glossaryAuditStatus(s));
}

export function collectGlossaryExpandedKeys(groups: GlossaryHierarchySetGroup[]): string[] {
  const keys: string[] = [];
  for (const setGroup of groups) {
    keys.push(libraryReportsSectionKeys.glossarySet(setGroup.setKey));
    for (const cat of setGroup.categories) {
      keys.push(libraryReportsSectionKeys.glossaryCategory(setGroup.setKey, cat.categoryId));
      for (const item of cat.items) {
        keys.push(
          libraryReportsSectionKeys.glossaryItem(setGroup.setKey, cat.categoryId, item.itemId)
        );
        for (const f of item.findings) {
          keys.push(libraryReportsSectionKeys.glossaryFinding(setGroup.setKey, f.findingId));
        }
      }
    }
  }
  return keys;
}

export function saveLibraryReportsSessionState(state: LibraryReportsSessionStateV1): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    const payload: LibraryReportsSessionStateV1 = {
      v: 1,
      mode: state.mode,
      search: state.search,
      expandedKeys: state.expandedKeys.filter((k) => k.trim() !== ''),
      hideUnassociatedCitations: state.hideUnassociatedCitations,
      standardsAssocViewMode: state.standardsAssocViewMode,
    };
    sessionStorage.setItem(LIBRARY_REPORTS_SESSION_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* quota / private mode — UI still works in-memory */
  }
}
