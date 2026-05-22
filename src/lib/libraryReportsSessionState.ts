import { LIBRARY_REPORTS_SESSION_STORAGE_KEY } from './storageKeys';
import type { GlossaryHierarchySetGroup, StandardsAssocSetGroup } from './libraryReportsModel';

export type LibraryReportsReportMode = 'standards' | 'glossary';

export type LibraryReportsSessionStateV1 = {
  v: 1;
  mode: LibraryReportsReportMode;
  search: string;
  expandedKeys: string[];
};

const EMPTY: LibraryReportsSessionStateV1 = {
  v: 1,
  mode: 'standards',
  search: '',
  expandedKeys: [],
};

function isReportMode(value: unknown): value is LibraryReportsReportMode {
  return value === 'standards' || value === 'glossary';
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
    return { v: 1, mode, search, expandedKeys };
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
  glossarySet: (setKey: string) => `g:set:${glossarySetKeyPart(setKey)}`,
  glossaryCategory: (setKey: string, categoryId: string) =>
    `g:cat:${glossarySetKeyPart(setKey)}:${categoryId}`,
  glossaryItem: (setKey: string, categoryId: string, itemId: string) =>
    `g:item:${glossarySetKeyPart(setKey)}:${categoryId}:${itemId}`,
  glossaryFinding: (setKey: string, findingId: string) =>
    `g:find:${glossarySetKeyPart(setKey)}:${findingId}`,
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
    };
    sessionStorage.setItem(LIBRARY_REPORTS_SESSION_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* quota / private mode — UI still works in-memory */
  }
}
