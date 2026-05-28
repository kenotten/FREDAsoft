import type { LibraryMasterUsageSummary } from './libraryMasterUsage';
import { masterArchiveFirestorePayload, masterRestoreFirestorePayload } from './libraryMasterLifecycle';

export { masterArchiveFirestorePayload, masterRestoreFirestorePayload };

export const LIBRARY_MASTER_ARCHIVE_HELP =
  'Archiving hides this master from active Library Manager lists. Existing glossary pairings and saved inspection records are not changed.';

export function libraryMasterArchiveUsageWarning(
  kind: 'finding' | 'recommendation',
  summary: LibraryMasterUsageSummary | undefined
): string {
  const n = summary?.glossaryRowCount ?? 0;
  if (n <= 0) return '';
  const noun = kind === 'finding' ? 'finding' : 'recommendation';
  const sets =
    summary!.setLabels.length > 0
      ? summary!.setLabels.join(', ')
      : 'Unassigned / Legacy';
  return `This ${noun} is used in ${n} glossary row${n === 1 ? '' : 's'} (${sets}). Archiving hides it from active library lists only; existing glossary rows and inspection records are not changed.`;
}

export function libraryMasterArchiveModalTitle(kind: 'finding' | 'recommendation'): string {
  return kind === 'finding' ? 'Archive library finding' : 'Archive library recommendation';
}

export function libraryMasterArchiveConfirmLabel(kind: 'finding' | 'recommendation'): string {
  return kind === 'finding' ? 'Archive finding' : 'Archive recommendation';
}

export function libraryMasterRestoreConfirmLabel(kind: 'finding' | 'recommendation'): string {
  return kind === 'finding' ? 'Restore finding' : 'Restore recommendation';
}
