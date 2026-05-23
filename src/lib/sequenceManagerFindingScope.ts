import {
  GLOSSARY_SET_DEFS,
  GLOSSARY_SET_UNASSIGNED_LABEL,
  glossarySetById,
  resolveGlossarySetForRecord,
  resolveGlossarySetLabelForKey,
} from './glossarySets';
import type { Finding } from '../types';

export const SEQUENCE_FINDING_SET_FILTER_ALL = 'ALL';
export const SEQUENCE_FINDING_SET_FILTER_UNASSIGNED = 'UNASSIGNED';

/** Initial Findings tab set selection (persists until user changes it). */
export const SEQUENCE_INITIAL_FINDING_SET_FILTER =
  GLOSSARY_SET_DEFS.find((d) => d.id === 'TAS_2012')?.id ??
  GLOSSARY_SET_DEFS[0]?.id ??
  SEQUENCE_FINDING_SET_FILTER_ALL;

export function findingSetFilterDisplayLabel(filter: string): string {
  if (filter === SEQUENCE_FINDING_SET_FILTER_ALL) return 'All sets';
  if (filter === SEQUENCE_FINDING_SET_FILTER_UNASSIGNED) return GLOSSARY_SET_UNASSIGNED_LABEL;
  return glossarySetById(filter)?.name ?? resolveGlossarySetLabelForKey(filter);
}

export function sequenceFindingsEmptyStateMessage(input: {
  selectedCatId: string;
  selectedItemId: string;
  selectedFindingSetFilter: string;
}): string {
  const { selectedCatId, selectedItemId, selectedFindingSetFilter } = input;
  if (!selectedCatId || !selectedItemId) {
    return 'Select category and item to view findings for the selected glossary set.';
  }
  const setLabel = findingSetFilterDisplayLabel(selectedFindingSetFilter);
  if (selectedFindingSetFilter === SEQUENCE_FINDING_SET_FILTER_ALL) {
    return 'No findings for this category/item.';
  }
  return `No ${setLabel} findings for this category/item.`;
}

export function findingsForItemScope(findings: Finding[], itemId: string): Finding[] {
  const key = String(itemId ?? '').trim();
  if (!key) return [];
  return findings.filter((f) => String(f.fldItem ?? '').trim() === key);
}

export function findingGlossarySetKey(finding: Finding): string {
  return resolveGlossarySetForRecord(finding).setKey;
}

export function findingGlossarySetLabel(finding: Finding): string {
  return resolveGlossarySetForRecord(finding).setLabel;
}

export function findingMatchesGlossarySetFilter(finding: Finding, filter: string): boolean {
  if (filter === SEQUENCE_FINDING_SET_FILTER_ALL) return true;
  const setKey = findingGlossarySetKey(finding);
  if (filter === SEQUENCE_FINDING_SET_FILTER_UNASSIGNED) return !setKey;
  return setKey.toLowerCase() === String(filter ?? '').trim().toLowerCase();
}

export function distinctGlossarySetKeysInItemScope(findings: Finding[], itemId: string): string[] {
  const seen = new Set<string>();
  for (const f of findingsForItemScope(findings, itemId)) {
    seen.add(findingGlossarySetKey(f));
  }
  return Array.from(seen);
}

export function itemScopeHasMultipleGlossarySets(findings: Finding[], itemId: string): boolean {
  return distinctGlossarySetKeysInItemScope(findings, itemId).length > 1;
}

export { GLOSSARY_SET_UNASSIGNED_LABEL };
