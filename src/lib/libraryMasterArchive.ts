import type { LibraryMasterUsageSummary } from './libraryMasterUsage';

export const LIBRARY_MASTER_ARCHIVE_UNUSED_HELP =
  'This removes the item from active library lists. Existing glossary pairings and project inspection records are not changed.';

export function libraryMasterArchiveBlockedMessage(
  kind: 'finding' | 'recommendation',
  summary: LibraryMasterUsageSummary | undefined
): string {
  const n = summary?.glossaryRowCount ?? 0;
  if (n <= 0) return '';
  const noun = kind === 'finding' ? 'finding' : 'recommendation';
  return `This ${noun} is used in ${n} glossary row${n === 1 ? '' : 's'}. Archive is blocked to avoid broken glossary pairings. Copy/edit instead, or retire the glossary pairings first.`;
}

/** Align with App.tsx active-list filters (`!fldDeleted && !fldIsDeleted`). */
export function masterArchiveFirestorePayload(): Record<string, boolean> {
  return {
    fldIsDeleted: true,
    fldDeleted: true,
  };
}

export function libraryMasterArchiveModalTitle(kind: 'finding' | 'recommendation'): string {
  return kind === 'finding' ? 'Archive unused library finding' : 'Archive unused library recommendation';
}

export function libraryMasterArchiveConfirmLabel(kind: 'finding' | 'recommendation'): string {
  return kind === 'finding' ? 'Archive finding' : 'Archive recommendation';
}
