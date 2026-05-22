import React, { useState, useMemo, useEffect, useImperativeHandle, forwardRef } from 'react';
import { 
  Search, 
  Save, 
  RotateCcw, 
  BookOpen, 
  Layers, 
  LayoutGrid, 
  ClipboardList, 
  MessageSquare,
  AlertCircle,
  Hash,
  ArrowUp,
  ArrowDown,
  ChevronRight,
  ChevronLeft,
  PanelLeftClose,
  PanelLeft,
  Info,
  Settings,
  MoreVertical,
  Quote,
  Copy,
  Archive,
  X
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Button, Card, Select } from './ui/core';
import { cn, sortEntities, MEASUREMENT_UNITS } from '../lib/utils';
import { doc, writeBatch, deleteField } from 'firebase/firestore';
import { db } from '../firebase';
import { toast } from 'sonner';
import { firestoreService, handleFirestoreError, OperationType } from '../services/firestoreService';
import { compareStandardCitations, formatStandardCitationLabel } from '../lib/standardCitationLabel';
import { Category, Item, Finding, MasterRecommendation, MasterStandard } from '../types';
import { UnsavedChangesModal } from './modals/UnsavedChangesModal';
import { StandardsBrowser } from './StandardsBrowser';
import { GLOSSARY_SET_DEFS, glossarySetById } from '../lib/glossarySets';
import {
  buildLibraryMasterUsageIndex,
  collectMasterEditImpacts,
  formatLibraryMasterUsageSummaryLine,
  libraryMasterEditImpactWarning,
  libraryMasterUnusedEditNote,
  lookupFindingUsage,
  lookupRecUsage,
  type LibraryMasterUsageSummary,
  type MasterEditImpactItem,
} from '../lib/libraryMasterUsage';
import {
  buildFindingCopyDraft,
  buildRecommendationCopyDraft,
  findingCopyCreatePayload,
  glossarySetLabelFromEntity,
  LIBRARY_MASTER_COPY_HELP,
  recommendationCopyCreatePayload,
  type FindingCopyDraft,
  type RecommendationCopyDraft,
} from '../lib/libraryMasterCopy';
import {
  LIBRARY_MASTER_ARCHIVE_UNUSED_HELP,
  libraryMasterArchiveBlockedMessage,
  libraryMasterArchiveConfirmLabel,
  libraryMasterArchiveModalTitle,
  masterArchiveFirestorePayload,
} from '../lib/libraryMasterArchive';
import {
  countUnassignedFindings,
  isActiveLibraryMaster,
  isUnassignedFinding,
  LIBRARY_UNASSIGNED_FINDINGS_CAT_ID,
  LIBRARY_UNASSIGNED_FINDINGS_LABEL,
  unassignedFindingItemStatusLabel,
} from '../lib/libraryManagerFindings';
import type { Glossary } from '../types';

const LIBRARY_GLOSSARY_CTX_FIELDS = [
  'fldGlossarySetId',
  'fldGlossarySetName',
  'fldStandardType',
  'fldStandardVersion'
] as const;

function safeLibraryStandardsArray(value: unknown): string[] {
  if (Array.isArray(value)) return value as string[];
  if (value && typeof value === 'object') return Object.values(value).filter(Boolean).map(String);
  return [];
}

function libNormId(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase();
}

function libraryCitationDisplayLabel(standard: MasterStandard | undefined, idFallback: string): string {
  if (standard) {
    const t = String(standard.fldStandardType ?? '').trim();
    const n = String(standard.citation_num ?? '').trim();
    if (t !== '' && n !== '') return `${t} ${n}`;
    if (n !== '') return n;
    const sid = String(standard.id ?? '').trim();
    if (sid !== '') return sid;
  }
  const fb = String(idFallback ?? '').trim();
  return fb ? `Unknown standard (${fb})` : 'Unknown standard';
}

/** Same ordering as modal selected list: order → type → citation_num → relation → stable index */
function sortLibraryStandardIds(ids: string[], standardsList: MasterStandard[]): string[] {
  const withIndex = ids.map((id, index) => ({
    id,
    index,
    standard: standardsList.find((st) => libNormId(st.id) === libNormId(id))
  }));
  return withIndex
    .sort((a, b) => {
      const c = compareStandardCitations(a.standard, b.standard);
      if (c !== 0) return c;
      return a.index - b.index;
    })
    .map((e) => e.id);
}

function inlineLibraryCitationChipText(standard: MasterStandard | undefined, idFallback: string): string {
  const full = libraryCitationDisplayLabel(standard, idFallback);
  return full.length > 22 ? `${full.slice(0, 20)}…` : full;
}

export interface LibraryManagerHandle {
  save: () => Promise<boolean>;
  discard: () => void;
}

interface LibraryManagerProps {
  categories: Category[];
  items: Item[];
  findings: Finding[];
  recommendations: MasterRecommendation[];
  /** Glossary rows for read-only master usage counts (fldFind / fldRec references). */
  glossary?: Glossary[];
  /** Same master standards list as Data Entry / StandardsBrowser */
  standards?: MasterStandard[];
  onDirtyChange?: (isDirty: boolean) => void;
  onNavigateAway?: (nextTab: string) => void;
}

function LibraryMasterUsagePanel({
  summary,
  kind,
}: {
  summary: LibraryMasterUsageSummary | undefined;
  kind: 'finding' | 'recommendation';
}) {
  const line = formatLibraryMasterUsageSummaryLine(summary);
  const unused = !summary || summary.glossaryRowCount === 0;

  if (unused) {
    return (
      <p
        className="text-[10px] font-medium text-zinc-500"
        title={libraryMasterUnusedEditNote()}
      >
        {libraryMasterUnusedEditNote()}
      </p>
    );
  }

  return (
    <details className="group/usage rounded-md border border-sky-100 bg-sky-50/40">
      <summary className="cursor-pointer list-none px-2 py-1.5 text-[10px] font-semibold text-sky-900 [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-1">
          <ChevronRight
            size={12}
            className="shrink-0 text-sky-600 transition-transform group-open/usage:rotate-90"
          />
          {line}
        </span>
      </summary>
      <ul className="space-y-2 border-t border-sky-100 px-2 py-2">
        {summary.rows.map((row) => (
          <li
            key={row.glossaryRowId}
            className="rounded border border-white/80 bg-white/90 px-2 py-1.5 text-[10px] text-zinc-700"
          >
            <p className="font-semibold text-zinc-800">{row.setLabel}</p>
            <p className="text-zinc-600">
              {row.categoryName} → {row.itemName}
            </p>
            <p className="text-zinc-500">
              {kind === 'finding' ? (
                <>
                  Rec: <span className="text-zinc-700">{row.pairedRecShort}</span>
                </>
              ) : (
                <>
                  Finding: <span className="text-zinc-700">{row.pairedFindingShort}</span>
                </>
              )}
            </p>
            <p className="mt-0.5 font-mono text-[9px] text-zinc-400">{row.glossaryRowId}</p>
          </li>
        ))}
      </ul>
    </details>
  );
}

function LibraryMasterEditImpactBanner({
  kind,
  summary,
}: {
  kind: 'finding' | 'recommendation';
  summary: LibraryMasterUsageSummary;
}) {
  if (!summary.glossaryRowCount) return null;
  return (
    <div
      className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-[10px] leading-snug text-amber-950"
      role="note"
    >
      <p className="font-bold uppercase tracking-wide text-amber-800">Shared library record</p>
      <p className="mt-1">{libraryMasterEditImpactWarning(kind, summary)}</p>
      <p className="mt-1 text-amber-800/90">
        Glossary sets: {summary.setLabels.join(', ') || 'Unassigned / Legacy'}
      </p>
    </div>
  );
}

function LibraryMasterSaveConfirmModal({
  isOpen,
  impacts,
  isSaving,
  onConfirm,
  onCancel,
}: {
  isOpen: boolean;
  impacts: MasterEditImpactItem[];
  isSaving: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!isOpen || impacts.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="library-master-save-confirm-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        aria-label="Cancel save"
        onClick={onCancel}
      />
      <Card className="relative z-10 w-full max-w-lg overflow-hidden border-zinc-200 p-0 shadow-2xl">
        <div className="border-b border-amber-100 bg-amber-50 px-5 py-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 shrink-0 text-amber-600" size={22} />
            <div>
              <h2
                id="library-master-save-confirm-title"
                className="text-base font-black text-zinc-900"
              >
                Confirm library save
              </h2>
              <p className="mt-2 text-sm leading-snug text-zinc-700">
                You are saving changes to shared master records that are referenced by glossary
                rows. Glossary and project inspection records are not updated automatically—only
                the master finding or recommendation documents below.
              </p>
            </div>
          </div>
        </div>
        <ul className="max-h-56 space-y-2 overflow-y-auto px-5 py-4">
          {impacts.map((item) => (
            <li
              key={`${item.kind}-${item.masterId}`}
              className="rounded-lg border border-zinc-100 bg-zinc-50/80 px-3 py-2 text-xs text-zinc-700"
            >
              <p className="font-semibold text-zinc-900">
                {item.kind === 'finding' ? 'Finding' : 'Recommendation'}: {item.displayName}
              </p>
              <p className="mt-1 leading-snug">
                {libraryMasterEditImpactWarning(
                  item.kind,
                  {
                    glossaryRowCount: item.glossaryRowCount,
                    setKeys: [],
                    setLabels: item.setLabels,
                    rows: [],
                  }
                )}
              </p>
            </li>
          ))}
        </ul>
        <div className="flex gap-2 border-t border-zinc-100 bg-zinc-50 px-5 py-4">
          <Button
            type="button"
            variant="ghost"
            className="flex-1 text-[10px] font-black uppercase tracking-widest"
            onClick={onCancel}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="flex-1 bg-black text-[10px] font-black uppercase tracking-widest text-white hover:bg-zinc-800"
            onClick={onConfirm}
            disabled={isSaving}
          >
            {isSaving ? 'Saving…' : 'Save master records'}
          </Button>
        </div>
      </Card>
    </div>
  );
}

type LibraryTab = 'categories' | 'items' | 'findings' | 'recommendations';

type LibraryCopyModalState =
  | {
      kind: 'finding';
      sourceId: string;
      sourceShort: string;
      draft: FindingCopyDraft;
      usageLine: string;
      contextLine: string;
    }
  | {
      kind: 'recommendation';
      sourceId: string;
      sourceShort: string;
      draft: RecommendationCopyDraft;
      usageLine: string;
      contextLine: string;
    };

function LibraryMasterCopyModal({
  state,
  isSaving,
  onClose,
  onDraftChange,
  onConfirm,
}: {
  state: LibraryCopyModalState;
  isSaving: boolean;
  onClose: () => void;
  onDraftChange: (draft: FindingCopyDraft | RecommendationCopyDraft) => void;
  onConfirm: () => void;
}) {
  const isFinding = state.kind === 'finding';
  const draft = state.draft;
  const shortVal = isFinding
    ? (draft as FindingCopyDraft).fldFindShort
    : (draft as RecommendationCopyDraft).fldRecShort;
  const longVal = isFinding
    ? (draft as FindingCopyDraft).fldFindLong
    : (draft as RecommendationCopyDraft).fldRecLong;
  const shortLen = shortVal.length;

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="library-master-copy-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        aria-label="Cancel copy"
        onClick={onClose}
      />
      <Card className="relative z-10 flex max-h-[min(92vh,720px)] w-full max-w-lg flex-col overflow-hidden border-zinc-200 p-0 shadow-2xl">
        <div className="shrink-0 border-b border-violet-100 bg-violet-50/80 px-5 py-4">
          <h2 id="library-master-copy-title" className="text-base font-black text-zinc-900">
            {isFinding ? 'Copy as new finding' : 'Copy as new recommendation'}
          </h2>
          <p className="mt-2 text-sm leading-snug text-zinc-700">{LIBRARY_MASTER_COPY_HELP}</p>
          <p className="mt-2 text-[11px] text-zinc-500">{state.usageLine}</p>
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div className="rounded-lg border border-zinc-100 bg-zinc-50/80 px-3 py-2 text-xs text-zinc-600">
            <p>
              <span className="font-bold text-zinc-800">Source:</span> {state.sourceShort}
            </p>
            <p className="mt-1 font-mono text-[10px] text-zinc-400">{state.sourceId}</p>
            {state.contextLine ? (
              <p className="mt-1 text-[11px] text-zinc-500">{state.contextLine}</p>
            ) : null}
          </div>
          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500">
              Short text
            </label>
            <input
              type="text"
              value={shortVal}
              onChange={(e) =>
                onDraftChange(
                  isFinding
                    ? { ...(draft as FindingCopyDraft), fldFindShort: e.target.value }
                    : { ...(draft as RecommendationCopyDraft), fldRecShort: e.target.value }
                )
              }
              className={cn(
                'mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm font-bold text-zinc-900 outline-none focus:ring-2 focus:ring-violet-500/20',
                shortLen > 120 && 'border-red-300'
              )}
            />
            <p className={cn('mt-1 text-[10px]', shortLen > 120 ? 'text-red-600' : 'text-zinc-400')}>
              {shortLen} / 120 characters
            </p>
          </div>
          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500">
              Long description
            </label>
            <textarea
              rows={4}
              value={longVal}
              onChange={(e) =>
                onDraftChange(
                  isFinding
                    ? { ...(draft as FindingCopyDraft), fldFindLong: e.target.value }
                    : { ...(draft as RecommendationCopyDraft), fldRecLong: e.target.value }
                )
              }
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-800 outline-none focus:ring-2 focus:ring-violet-500/20"
            />
          </div>
          <p className="text-[10px] leading-snug text-zinc-500">
            Citations, glossary set, measurement/unit (findings), and cost fields (recommendations) are
            copied from the source. Suggested-recommendation links are not copied—pair the new master in
            Glossary Builder when ready.
          </p>
        </div>
        <div className="flex shrink-0 gap-2 border-t border-zinc-100 bg-zinc-50 px-5 py-4">
          <Button
            type="button"
            variant="ghost"
            className="flex-1 text-[10px] font-black uppercase tracking-widest"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="flex-1 bg-violet-700 text-[10px] font-black uppercase tracking-widest text-white hover:bg-violet-800"
            onClick={onConfirm}
            disabled={isSaving || !shortVal.trim() || shortLen > 120}
          >
            {isSaving ? 'Creating…' : 'Create copy'}
          </Button>
        </div>
      </Card>
    </div>
  );
}

type LibraryArchiveModalState = {
  kind: 'finding' | 'recommendation';
  recordId: string;
  displayShort: string;
};

function LibraryMasterArchiveModal({
  state,
  isSaving,
  onClose,
  onConfirm,
}: {
  state: LibraryArchiveModalState;
  isSaving: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const title = libraryMasterArchiveModalTitle(state.kind);
  const confirmLabel = libraryMasterArchiveConfirmLabel(state.kind);

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="library-master-archive-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        aria-label="Cancel archive"
        onClick={onClose}
      />
      <Card className="relative z-10 flex max-h-[min(92vh,520px)] w-full max-w-md flex-col overflow-hidden border-zinc-200 p-0 shadow-2xl">
        <div className="shrink-0 border-b border-amber-100 bg-amber-50/80 px-5 py-4">
          <h2 id="library-master-archive-title" className="text-base font-black text-zinc-900">
            {title}
          </h2>
          <p className="mt-2 text-sm leading-snug text-zinc-700">{LIBRARY_MASTER_ARCHIVE_UNUSED_HELP}</p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="rounded-lg border border-zinc-100 bg-zinc-50/80 px-3 py-2 text-xs text-zinc-600">
            <p>
              <span className="font-bold text-zinc-800">Item:</span> {state.displayShort}
            </p>
            <p className="mt-1 font-mono text-[10px] text-zinc-400">{state.recordId}</p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2 border-t border-zinc-100 bg-zinc-50 px-5 py-4">
          <Button
            type="button"
            variant="ghost"
            className="flex-1 text-[10px] font-black uppercase tracking-widest"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="flex-1 bg-amber-800 text-[10px] font-black uppercase tracking-widest text-white hover:bg-amber-900"
            onClick={onConfirm}
            disabled={isSaving}
          >
            {isSaving ? 'Archiving…' : confirmLabel}
          </Button>
        </div>
      </Card>
    </div>
  );
}

export const LibraryManager = forwardRef<LibraryManagerHandle, LibraryManagerProps>(({ 
  categories, 
  items, 
  findings, 
  recommendations,
  glossary = [],
  standards = [],
  onDirtyChange,
  onNavigateAway
}, ref) => {
  const [activeTab, setActiveTab] = useState<LibraryTab>('categories');
  const [selectedCatId, setSelectedCatId] = useState<string>('');
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [expandedCatId, setExpandedCatId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  /** Findings / recommendations only: filter by Glossary Set (default All). */
  const [glossarySetFilter, setGlossarySetFilter] = useState<string>('ALL');
  
  // Local working state for edits
  // Map of id -> partial document update
  const [edits, setEdits] = useState<Record<string, any>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);
  /** Active finding/recommendation id for shared library citations editor */
  const [citationTargetId, setCitationTargetId] = useState<string | null>(null);
  const [masterSaveConfirmOpen, setMasterSaveConfirmOpen] = useState(false);
  const [masterSaveConfirmImpacts, setMasterSaveConfirmImpacts] = useState<MasterEditImpactItem[]>(
    []
  );
  const savePromiseResolveRef = React.useRef<((success: boolean) => void) | null>(null);
  const [copyModal, setCopyModal] = useState<LibraryCopyModalState | null>(null);
  const [isCopySaving, setIsCopySaving] = useState(false);
  const [archiveModal, setArchiveModal] = useState<LibraryArchiveModalState | null>(null);
  const [isArchiveSaving, setIsArchiveSaving] = useState(false);
  const [highlightMasterId, setHighlightMasterId] = useState<string | null>(null);

  // Intercept navigation
  const [pendingAction, setPendingAction] = useState<{ type: 'tab' | 'cat' | 'item' | 'away', value: string } | null>(null);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const confirmNavigation = (type: 'tab' | 'cat' | 'item' | 'away', value: string) => {
    if (isDirty) {
      setPendingAction({ type, value });
    } else {
      executeNavigation(type, value);
    }
  };

  const executeNavigation = (type: 'tab' | 'cat' | 'item' | 'away', value: string) => {
    switch (type) {
      case 'tab': setActiveTab(value as LibraryTab); break;
      case 'cat': 
        setSelectedCatId(value);
        setSelectedItemId('');
        break;
      case 'item': {
        setSelectedItemId(value);
        const it = items.find((i) => libNormId(i.fldItemID || (i as any).id) === libNormId(value));
        const catFromItem = String(it?.fldCatID ?? '').trim();
        if (catFromItem) setSelectedCatId(catFromItem);
        break;
      }
      case 'away': onNavigateAway?.(value); break;
    }
    setPendingAction(null);
  };

  const handleDiscardAndLeave = () => {
    setEdits({});
    setIsDirty(false);
    setCitationTargetId(null);
    if (pendingAction) {
      executeNavigation(pendingAction.type, pendingAction.value);
    }
  };

  const commitLibraryEdits = async (): Promise<boolean> => {
    if (Object.keys(edits).length === 0) return true;

    const invalidEntries = Object.entries(edits).filter(([id, fields]) => {
      const shortText = (fields as any).fldFindShort || (fields as any).fldRecShort;
      return shortText && shortText.length > 120;
    });

    if (invalidEntries.length > 0) {
      toast.error(`Cannot save: ${invalidEntries.length} record(s) exceed the 120 character limit for short text.`);
      return false;
    }

    setIsSaving(true);
    try {
      const batch = writeBatch(db);
      let count = 0;

      Object.entries(edits).forEach(([id, rawFields]) => {
        let collectionName = '';
        if (categories.some(c => (c.fldCategoryID || c.id) === id)) collectionName = 'categories';
        else if (items.some(i => (i.fldItemID || i.id) === id)) collectionName = 'items';
        else if (findings.some(f => (f.fldFindID || f.id) === id)) collectionName = 'findings';
        else if (recommendations.some(r => (r.fldRecID || r.id) === id)) collectionName = 'recommendations';

        if (collectionName) {
          const docRef = doc(db, collectionName, id);
          const fields: Record<string, unknown> = { ...(rawFields as Record<string, unknown>) };
          if (collectionName === 'findings' || collectionName === 'recommendations') {
            const touchedCtx = LIBRARY_GLOSSARY_CTX_FIELDS.some((k) => k in fields);
            const gid = fields.fldGlossarySetId;
            if (touchedCtx && (gid === '' || gid === null || gid === undefined)) {
              for (const k of LIBRARY_GLOSSARY_CTX_FIELDS) {
                fields[k] = deleteField();
              }
            }
          }
          batch.update(docRef, fields as any);
          count++;
        }
      });

      if (count > 0) {
        await batch.commit();
        toast.success(`Successfully saved ${count} records.`);
        setEdits({});
        setIsDirty(false);
      }
      return true;
    } catch (error) {
      console.error('Error saving library edits:', error);
      toast.error('Failed to save changes.');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const finishSaveConfirm = (success: boolean) => {
    savePromiseResolveRef.current?.(success);
    savePromiseResolveRef.current = null;
    setMasterSaveConfirmOpen(false);
    setMasterSaveConfirmImpacts([]);
  };

  const requestSave = async (): Promise<boolean> => {
    if (Object.keys(edits).length === 0) return true;

    const impacts = collectMasterEditImpacts(
      edits,
      masterUsageIndex,
      findings,
      recommendations
    );

    if (impacts.length > 0) {
      setMasterSaveConfirmImpacts(impacts);
      setMasterSaveConfirmOpen(true);
      return new Promise<boolean>((resolve) => {
        savePromiseResolveRef.current = resolve;
      });
    }

    return commitLibraryEdits();
  };

  const handleMasterSaveConfirm = async () => {
    const success = await commitLibraryEdits();
    finishSaveConfirm(success);
  };

  const handleMasterSaveCancel = () => {
    finishSaveConfirm(false);
  };

  useImperativeHandle(ref, () => ({
    save: requestSave,
    discard: () => {
      setEdits({});
      setIsDirty(false);
      setCitationTargetId(null);
      finishSaveConfirm(false);
    }
  }));

  const handleSaveAndLeave = async () => {
    const success = await requestSave();
    if (success && pendingAction) {
      executeNavigation(pendingAction.type, pendingAction.value);
    }
  };

  // Reset context when tab changes
  useEffect(() => {
    // Clear selections that are no longer valid for the tab
    if (activeTab === 'categories' || activeTab === 'recommendations') {
      setSelectedCatId('');
      setSelectedItemId('');
    } else if (activeTab === 'items') {
      setSelectedItemId('');
    }
  }, [activeTab]);

  // Handle local edit change
  const handleEdit = (id: string, field: string, value: any) => {
    setEdits(prev => ({
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        [field]: value
      }
    }));
    setIsDirty(true);
  };

  const applyLibraryGlossarySetToRecord = (recordId: string, setKey: string) => {
    const def = String(setKey || '').trim() ? glossarySetById(setKey) : undefined;
    setEdits((prev) => ({
      ...prev,
      [recordId]: {
        ...(prev[recordId] || {}),
        ...(def
          ? {
              fldGlossarySetId: def.id,
              fldGlossarySetName: def.name,
              fldStandardType: def.standardType,
              fldStandardVersion: def.standardVersion
            }
          : {
              fldGlossarySetId: '',
              fldGlossarySetName: '',
              fldStandardType: '',
              fldStandardVersion: ''
            })
      }
    }));
    setIsDirty(true);
  };

  // Helper to get current value (from edits or original)
  const getValue = (entity: any, field: string) => {
    const id = entity.fldCategoryID || entity.fldItemID || entity.fldFindID || entity.fldRecID || entity.id;
    if (edits[id] && edits[id][field] !== undefined) {
      return edits[id][field];
    }
    return entity[field];
  };

  const mergeFindingWithEdits = (recordId: string): Finding | undefined => {
    const entity = findings.find((f) => libNormId(f.fldFindID || f.id) === libNormId(recordId));
    if (!entity) return undefined;
    const patch = edits[recordId];
    return patch ? ({ ...entity, ...patch } as Finding) : entity;
  };

  const mergeRecommendationWithEdits = (recordId: string): MasterRecommendation | undefined => {
    const entity = recommendations.find(
      (r) => libNormId(r.fldRecID || r.id) === libNormId(recordId)
    );
    if (!entity) return undefined;
    const patch = edits[recordId];
    return patch ? ({ ...entity, ...patch } as MasterRecommendation) : entity;
  };

  const openFindingCopyModal = (recordId: string) => {
    const entity = mergeFindingWithEdits(recordId);
    if (!entity) {
      toast.error('Finding not found.');
      return;
    }
    const usage = lookupFindingUsage(masterUsageIndex, recordId);
    const usageLine =
      usage && usage.glossaryRowCount > 0
        ? `The original is used in ${usage.glossaryRowCount} glossary row${usage.glossaryRowCount === 1 ? '' : 's'}. Copying will not change those rows.`
        : 'The original is not used in any active glossary rows.';
    const item = items.find((i) => libNormId(i.fldItemID || (i as { id?: string }).id) === libNormId(entity.fldItem));
    const cat = categories.find((c) =>
      libNormId(c.fldCategoryID || (c as { id?: string }).id) === libNormId(item?.fldCatID)
    );
    const contextParts = [
      cat?.fldCategoryName,
      item?.fldItemName,
      glossarySetLabelFromEntity(entity),
    ].filter(Boolean);
    setCopyModal({
      kind: 'finding',
      sourceId: recordId,
      sourceShort: String(entity.fldFindShort || recordId).trim(),
      draft: buildFindingCopyDraft(entity),
      usageLine,
      contextLine: contextParts.length ? contextParts.join(' · ') : '',
    });
  };

  const openRecommendationCopyModal = (recordId: string) => {
    const entity = mergeRecommendationWithEdits(recordId);
    if (!entity) {
      toast.error('Recommendation not found.');
      return;
    }
    const usage = lookupRecUsage(masterUsageIndex, recordId);
    const usageLine =
      usage && usage.glossaryRowCount > 0
        ? `The original is used in ${usage.glossaryRowCount} glossary row${usage.glossaryRowCount === 1 ? '' : 's'}. Copying will not change those rows.`
        : 'The original is not used in any active glossary rows.';
    const item = entity.fldItem
      ? items.find((i) => libNormId(i.fldItemID || (i as { id?: string }).id) === libNormId(entity.fldItem))
      : undefined;
    const cat = item
      ? categories.find((c) =>
          libNormId(c.fldCategoryID || (c as { id?: string }).id) === libNormId(item?.fldCatID)
        )
      : undefined;
    const contextParts = [
      cat?.fldCategoryName,
      item?.fldItemName,
      glossarySetLabelFromEntity(entity),
    ].filter(Boolean);
    setCopyModal({
      kind: 'recommendation',
      sourceId: recordId,
      sourceShort: String(entity.fldRecShort || recordId).trim(),
      draft: buildRecommendationCopyDraft(entity),
      usageLine,
      contextLine: contextParts.length ? contextParts.join(' · ') : '',
    });
  };

  const focusCopiedMaster = (kind: 'finding' | 'recommendation', newId: string, draft: FindingCopyDraft | RecommendationCopyDraft) => {
    setHighlightMasterId(newId);
    const shortText =
      kind === 'finding'
        ? (draft as FindingCopyDraft).fldFindShort
        : (draft as RecommendationCopyDraft).fldRecShort;
    setSearchTerm(shortText.trim());
    if (kind === 'finding') {
      const itemId = String((draft as FindingCopyDraft).fldItem || '').trim();
      if (itemId) {
        const it = items.find((i) => libNormId(i.fldItemID || (i as { id?: string }).id) === libNormId(itemId));
        if (it?.fldCatID) setSelectedCatId(it.fldCatID);
        setSelectedItemId(itemId);
      }
      const setId = String((draft as FindingCopyDraft).fldGlossarySetId || '').trim();
      if (setId) setGlossarySetFilter(setId);
    } else {
      const setId = String((draft as RecommendationCopyDraft).fldGlossarySetId || '').trim();
      if (setId) setGlossarySetFilter(setId);
      else if (!setId) setGlossarySetFilter('ALL');
    }
    window.setTimeout(() => setHighlightMasterId(null), 8000);
  };

  const handleConfirmCopy = async () => {
    if (!copyModal) return;
    const shortText =
      copyModal.kind === 'finding'
        ? copyModal.draft.fldFindShort.trim()
        : (copyModal.draft as RecommendationCopyDraft).fldRecShort.trim();
    if (!shortText) {
      toast.error('Short text is required.');
      return;
    }
    if (shortText.length > 120) {
      toast.error('Short text must be 120 characters or fewer.');
      return;
    }

    setIsCopySaving(true);
    try {
      const newId = uuidv4();
      if (copyModal.kind === 'finding') {
        const payload = findingCopyCreatePayload(newId, copyModal.draft);
        await firestoreService.save('findings', payload, newId);
        focusCopiedMaster('finding', newId, copyModal.draft);
        toast.success('New finding created. Original finding and glossary links are unchanged.');
      } else {
        const payload = recommendationCopyCreatePayload(
          newId,
          copyModal.draft as RecommendationCopyDraft
        );
        await firestoreService.masterRecommendations.save(payload, newId);
        focusCopiedMaster('recommendation', newId, copyModal.draft);
        toast.success('New recommendation created. Original recommendation and glossary links are unchanged.');
      }
      setCopyModal(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, copyModal.kind === 'finding' ? 'findings' : 'recommendations');
    } finally {
      setIsCopySaving(false);
    }
  };

  const openFindingArchiveModal = (recordId: string) => {
    const usage = lookupFindingUsage(masterUsageIndex, recordId);
    if (usage && usage.glossaryRowCount > 0) return;
    const entity = mergeFindingWithEdits(recordId);
    if (!entity) {
      toast.error('Finding not found.');
      return;
    }
    setArchiveModal({
      kind: 'finding',
      recordId,
      displayShort: String(entity.fldFindShort || recordId).trim(),
    });
  };

  const openRecommendationArchiveModal = (recordId: string) => {
    const usage = lookupRecUsage(masterUsageIndex, recordId);
    if (usage && usage.glossaryRowCount > 0) return;
    const entity = mergeRecommendationWithEdits(recordId);
    if (!entity) {
      toast.error('Recommendation not found.');
      return;
    }
    setArchiveModal({
      kind: 'recommendation',
      recordId,
      displayShort: String(entity.fldRecShort || recordId).trim(),
    });
  };

  const handleConfirmArchive = async () => {
    if (!archiveModal) return;
    const usage =
      archiveModal.kind === 'finding'
        ? lookupFindingUsage(masterUsageIndex, archiveModal.recordId)
        : lookupRecUsage(masterUsageIndex, archiveModal.recordId);
    if (usage && usage.glossaryRowCount > 0) {
      toast.error(
        libraryMasterArchiveBlockedMessage(archiveModal.kind, usage)
      );
      setArchiveModal(null);
      return;
    }

    setIsArchiveSaving(true);
    try {
      const collection = archiveModal.kind === 'finding' ? 'findings' : 'recommendations';
      await firestoreService.save(
        collection,
        masterArchiveFirestorePayload(),
        archiveModal.recordId
      );
      setEdits((prev) => {
        const next = { ...prev };
        delete next[archiveModal.recordId];
        return next;
      });
      if (citationTargetId === archiveModal.recordId) {
        setCitationTargetId(null);
      }
      toast.success(
        archiveModal.kind === 'finding'
          ? 'Finding archived. It will no longer appear in active library lists.'
          : 'Recommendation archived. It will no longer appear in active library lists.'
      );
      setArchiveModal(null);
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.UPDATE,
        archiveModal.kind === 'finding' ? 'findings' : 'recommendations'
      );
    } finally {
      setIsArchiveSaving(false);
    }
  };

  const libraryRowGlossaryBadgeLabel = (record: any): string => {
    const idRaw = String(getValue(record, 'fldGlossarySetId') || '').trim();
    if (!idRaw) return 'Unassigned';
    const def = glossarySetById(idRaw);
    const name = String(getValue(record, 'fldGlossarySetName') || '').trim();
    return (name || def?.name || idRaw).trim() || 'Unassigned';
  };

  // Move item to a new position and renormalize (Task 118 behavior)
  const reorderAndNormalize = (id: string, newPosition: number, currentList: any[]) => {
    // 1. Clone list
    const list = [...currentList];
    const currentIndex = list.findIndex(item => item.id === id);
    if (currentIndex === -1) return;

    // 2. Splice out the item being moved
    const [itemToMove] = list.splice(currentIndex, 1);
    
    // 3. Insert at target position (1-based input, clamped to list bounds)
    const targetIndex = Math.max(0, Math.min(newPosition - 1, list.length));
    list.splice(targetIndex, 0, itemToMove);

    // 4. Renumber logically (1, 2, 3...) and update edits
    const nextEdits = { ...edits };
    list.forEach((item, idx) => {
      const itemId = item.id;
      const targetOrder = idx + 1;
      
      // Find original to see if order actually changed
      const original = [...categories, ...items, ...findings, ...recommendations].find(x => ((x as any).fldCategoryID || (x as any).fldItemID || (x as any).fldFindID || (x as any).fldRecID || (x as any).id) === itemId);
      
      if (original && (original as any).fldOrder !== targetOrder) {
        nextEdits[itemId] = {
          ...(nextEdits[itemId] || {}),
          fldOrder: targetOrder
        };
      }
    });

    setEdits(nextEdits);
    setIsDirty(true);
  };

  const handleNormalize = (currentList: any[]) => {
    const nextEdits = { ...edits };
    currentList.forEach((item, idx) => {
      const itemId = item.id;
      const targetOrder = idx + 1;
      
      const original = [...categories, ...items, ...findings, ...recommendations].find(x => ((x as any).fldCategoryID || (x as any).fldItemID || (x as any).fldFindID || (x as any).fldRecID || (x as any).id) === itemId);
      
      if (original && (original as any).fldOrder !== targetOrder) {
        nextEdits[itemId] = {
          ...(nextEdits[itemId] || {}),
          fldOrder: targetOrder
        };
      }
    });
    setEdits(nextEdits);
    setIsDirty(true);
    toast.info('Sequence normalized to 1, 2, 3...');
  };

  // Derived navigation lists that respect local edits (before visibleData — used for finding filters)
  const navigationCategories = useMemo(() => {
    return categories.map((c) => {
      const id = c.fldCategoryID || (c as any).id;
      const updatedFields = edits[id] || {};
      return { ...c, ...updatedFields };
    });
  }, [categories, edits]);

  const navigationItems = useMemo(() => {
    return items.map((i) => {
      const id = i.fldItemID || (i as any).id;
      const updatedFields = edits[id] || {};
      return { ...i, ...updatedFields };
    });
  }, [items, edits]);

  const unassignedFindingsCount = useMemo(
    () => countUnassignedFindings(findings, navigationItems, edits),
    [findings, navigationItems, edits]
  );

  const isUnassignedFindingsView =
    activeTab === 'findings' && selectedCatId === LIBRARY_UNASSIGNED_FINDINGS_CAT_ID;

  // Filtered and Sorted Data for display
  const visibleData = useMemo(() => {
    let base: any[] = [];
    
    if (activeTab === 'categories') {
      base = categories.map(c => ({
        ...c,
        id: c.fldCategoryID || c.id,
        displayName: getValue(c, 'fldCategoryName'),
        order: getValue(c, 'fldOrder') ?? 999
      }));
    } else if (activeTab === 'items') {
      // STRICT ID FILTERING: Must select a category
      if (!selectedCatId) return [];
      
      base = items
        .filter(i => i.fldCatID === selectedCatId)
        .map(i => ({
          ...i,
          id: i.fldItemID || i.id,
          displayName: getValue(i, 'fldItemName'),
          order: getValue(i, 'fldOrder') ?? 999,
          parentId: i.fldCatID
        }));
    } else if (activeTab === 'findings') {
      // PROGRESSIVE FILTERING: Must select at least a category (or Unassigned Findings)
      if (!selectedCatId) return [];

      if (selectedCatId === LIBRARY_UNASSIGNED_FINDINGS_CAT_ID) {
        base = findings
          .filter((f) => isUnassignedFinding(f, navigationItems, edits))
          .map((f) => ({
            ...f,
            id: f.fldFindID || f.id,
            displayName: getValue(f, 'fldFindShort'),
            order: getValue(f, 'fldOrder') ?? 999,
            parentId: f.fldItem,
          }));
      } else {
        let itemIds: string[] = [];
        if (selectedItemId) {
          itemIds = [selectedItemId];
        } else {
          itemIds = navigationItems
            .filter((i) => i.fldCatID === selectedCatId)
            .map((i) => i.fldItemID || i.id || '');
        }

        base = findings
          .filter((f) => {
            const itemFk = String(getValue(f, 'fldItem') ?? '').trim();
            return itemIds.some((id) => libNormId(id) === libNormId(itemFk));
          })
          .map((f) => ({
            ...f,
            id: f.fldFindID || f.id,
            displayName: getValue(f, 'fldFindShort'),
            order: getValue(f, 'fldOrder') ?? 999,
            parentId: f.fldItem,
          }));
      }
    } else if (activeTab === 'recommendations') {
      base = recommendations.map(r => ({
        ...r,
        id: r.fldRecID || r.id,
        displayName: getValue(r, 'fldRecShort'),
        order: getValue(r, 'fldOrder') ?? 999
      }));
    }

    // Apply Search
    if (searchTerm.trim()) {
      const lowerSearch = searchTerm.toLowerCase();
      base = base.filter(item => {
        const name = (item.displayName || '').toLowerCase();
        const id = (item.id || '').toLowerCase();
        // Also check long fields if they exist
        const longField = (getValue(item, 'fldFindLong') || getValue(item, 'fldRecLong') || '').toLowerCase();
        return name.includes(lowerSearch) || id.includes(lowerSearch) || longField.includes(lowerSearch);
      });
    }

    if (
      (activeTab === 'findings' || activeTab === 'recommendations') &&
      glossarySetFilter !== 'ALL'
    ) {
      base = base.filter((item) => {
        const gid = String(getValue(item, 'fldGlossarySetId') || '').trim();
        if (glossarySetFilter === 'UNASSIGNED') return !gid;
        return gid.toLowerCase() === glossarySetFilter.toLowerCase();
      });
    }

    // Sort by order then name
    return base.sort((a, b) => a.order - b.order || (a.displayName || '').localeCompare(b.displayName || ''));
  }, [
    activeTab,
    categories,
    items,
    findings,
    recommendations,
    selectedCatId,
    selectedItemId,
    edits,
    searchTerm,
    glossarySetFilter,
    navigationItems,
  ]);

  // Derived Breadcrumbs
  const breadcrumbs = useMemo(() => {
    const parts: string[] = [];
    if (isUnassignedFindingsView) {
      parts.push(LIBRARY_UNASSIGNED_FINDINGS_LABEL);
      return parts;
    }
    const cat = navigationCategories.find(
      (c) => (c.fldCategoryID || (c as any).id) === selectedCatId
    );
    if (cat) parts.push(cat.fldCategoryName);

    const item = navigationItems.find(
      (i) => (i.fldItemID || (i as any).id) === selectedItemId
    );
    if (item) parts.push(item.fldItemName);

    return parts;
  }, [
    selectedCatId,
    selectedItemId,
    navigationCategories,
    navigationItems,
    isUnassignedFindingsView,
  ]);

  const masterUsageIndex = useMemo(
    () =>
      buildLibraryMasterUsageIndex({
        glossary,
        findings,
        recommendations,
        categories,
        items,
      }),
    [glossary, findings, recommendations, categories, items]
  );

  const isGroupedMode =
    activeTab === 'findings' &&
    !!selectedCatId &&
    selectedCatId !== LIBRARY_UNASSIGNED_FINDINGS_CAT_ID &&
    !selectedItemId;

  const groupedFindings = useMemo(() => {
    if (!isGroupedMode) return null;
    
    // Get all items in the category, sorted alpha
    const categoryItems = items
      .filter(i => i.fldCatID === selectedCatId)
      .sort((a, b) => (a.fldItemName || '').localeCompare(b.fldItemName || ''));
    
    return categoryItems.map(item => {
      const itemId = item.fldItemID || (item as any).id;
      // Findings for this item from the already filtered & searched visibleData
      const itemFindings = visibleData.filter(f => f.parentId === itemId);
      return {
        item,
        findings: itemFindings
      };
    }).filter(group => group.findings.length > 0);
  }, [isGroupedMode, selectedCatId, items, visibleData]);

  useEffect(() => {
    if (activeTab !== 'findings' && activeTab !== 'recommendations') {
      setCitationTargetId(null);
    }
  }, [activeTab]);

  useEffect(() => {
    if (!citationTargetId) return;
    if (activeTab !== 'findings' && activeTab !== 'recommendations') return;
    const stillHere = visibleData.some((r) => r.id === citationTargetId);
    if (!stillHere) setCitationTargetId(null);
  }, [visibleData, citationTargetId, activeTab]);

  const citationTargetEntity = useMemo(() => {
    if (!citationTargetId) return null;
    return visibleData.find((r) => r.id === citationTargetId) ?? null;
  }, [visibleData, citationTargetId]);

  const displaySortedLibraryCitations = useMemo(() => {
    if (!citationTargetEntity) return [];
    const ids = safeLibraryStandardsArray(getValue(citationTargetEntity, 'fldStandards'));
    return sortLibraryStandardIds(ids, standards);
  }, [citationTargetEntity, standards, edits, visibleData]);

  const libraryCitationsUiKey = useMemo(
    () =>
      citationTargetId && (activeTab === 'findings' || activeTab === 'recommendations')
        ? `lib:cit:${activeTab}:${citationTargetId}`
        : 'lib:cit:none',
    [citationTargetId, activeTab]
  );

  /**
   * Nudge modal StandardsBrowser type/version from the citation target row: glossary set def is
   * authoritative when fldGlossarySetId is set (avoids stale fldStandardType vs sessionStorage).
   */
  const libraryCitationPreferredStandardContext = useMemo(() => {
    if (!citationTargetEntity || !citationTargetId) return undefined;

    const gid = String(getValue(citationTargetEntity, 'fldGlossarySetId') ?? '').trim();
    const def = gid ? glossarySetById(gid) : undefined;

    let type: string;
    let version: string | undefined;

    if (def) {
      type = String(def.standardType ?? '').trim();
      const v = String(def.standardVersion ?? '').trim();
      version = v || undefined;
    } else {
      type = String(getValue(citationTargetEntity, 'fldStandardType') ?? '').trim();
      const v = String(getValue(citationTargetEntity, 'fldStandardVersion') ?? '').trim();
      version = v || undefined;
    }

    if (!type) return undefined;

    return {
      type,
      version,
      syncToken: `lib-cit-ctx:${citationTargetId}:${libraryCitationsUiKey}:${type}:${version ?? ''}`,
    };
  }, [citationTargetEntity, citationTargetId, libraryCitationsUiKey, edits]);

  const citationModalBadges = useMemo(() => {
    if (!citationTargetEntity) return [] as { key: string; text: string }[];
    const badges: { key: string; text: string }[] = [];
    if (activeTab === 'findings') {
      const itemFk = String(
        citationTargetEntity.fldItem ?? citationTargetEntity.parentId ?? ''
      ).trim();
      if (itemFk) {
        const it = navigationItems.find(
          (i) => libNormId(i.fldItemID || (i as any).id) === libNormId(itemFk)
        );
        if (it) {
          const catId = String(it.fldCatID ?? '').trim();
          const cat = navigationCategories.find(
            (c) => libNormId(c.fldCategoryID || (c as any).id) === libNormId(catId)
          );
          if (cat?.fldCategoryName) badges.push({ key: 'cat', text: `Category: ${cat.fldCategoryName}` });
          const iname = String(it.fldItemName || '').trim();
          if (iname) badges.push({ key: 'item', text: `Item: ${iname}` });
        }
      }
      const findLabel = String(
        citationTargetEntity.displayName || getValue(citationTargetEntity, 'fldFindShort') || ''
      ).trim();
      if (findLabel) badges.push({ key: 'find', text: `Finding: ${findLabel}` });
    } else {
      const r = citationTargetEntity;
      const itemFk = String(r.fldItem ?? '').trim();
      if (itemFk) {
        const it = items.find((i) => libNormId(i.fldItemID || (i as any).id) === libNormId(itemFk));
        if (it) {
          const cat = categories.find((c) =>
            libNormId(c.fldCategoryID || (c as any).id) === libNormId(it.fldCatID)
          );
          if (cat?.fldCategoryName) badges.push({ key: 'cat', text: `Category: ${cat.fldCategoryName}` });
          const iname = String(it.fldItemName || '').trim();
          if (iname) badges.push({ key: 'item', text: `Item: ${iname}` });
        }
      }
      const recLabel = String(r.displayName || getValue(r, 'fldRecShort') || '').trim();
      if (recLabel) badges.push({ key: 'rec', text: `Recommendation: ${recLabel}` });
    }
    return badges;
  }, [
    citationTargetEntity,
    activeTab,
    navigationCategories,
    navigationItems,
    items,
    categories,
    edits
  ]);

  const addLibraryCitationToTarget = (standardId: string) => {
    if (!citationTargetId) return;
    const entity = visibleData.find((r) => r.id === citationTargetId);
    if (!entity) return;
    const canonical = standards.find((st) => libNormId(st.id) === libNormId(standardId));
    const idToStore = canonical?.id ?? standardId;
    if (!idToStore) return;
    const current = safeLibraryStandardsArray(getValue(entity, 'fldStandards'));
    if (current.some((id) => libNormId(id) === libNormId(idToStore))) return;
    handleEdit(citationTargetId, 'fldStandards', [...current, idToStore]);
  };

  const removeLibraryCitationFromTarget = (standardId: string) => {
    if (!citationTargetId) return;
    const entity = visibleData.find((r) => r.id === citationTargetId);
    if (!entity) return;
    const current = safeLibraryStandardsArray(getValue(entity, 'fldStandards'));
    handleEdit(
      citationTargetId,
      'fldStandards',
      current.filter((id) => libNormId(id) !== libNormId(standardId))
    );
  };

  const handleLibraryCitationsDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleLibraryCitationsDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const standardId = e.dataTransfer.getData('standardId');
    if (!standardId) return;
    addLibraryCitationToTarget(standardId);
  };

  const handleStandardsBrowserSelect = (standard: MasterStandard) => {
    if (!standard?.id) return;
    addLibraryCitationToTarget(standard.id);
  };

  const handleNormalizeAllGroups = () => {
    if (!groupedFindings) return;
    
    const nextEdits = { ...edits };
    let totalChanged = 0;
    
    groupedFindings.forEach(group => {
      group.findings.forEach((rec, idx) => {
        const itemId = rec.id;
        const targetOrder = idx + 1;
        const original = findings.find(x => (x.fldFindID || x.id) === itemId);
        
        if (original && (original as any).fldOrder !== targetOrder) {
          nextEdits[itemId] = {
            ...(nextEdits[itemId] || {}),
            fldOrder: targetOrder
          };
          totalChanged++;
        }
      });
    });
    
    if (totalChanged > 0) {
      setEdits(nextEdits);
      setIsDirty(true);
      toast.info(`Normalized ${totalChanged} records across ${groupedFindings.length} groups.`);
    }
  };

  const renderRecord = (record: any, index: number, list: any[]) => {
    const isFinding = activeTab === 'findings';
    const isRec = activeTab === 'recommendations';
    const masterUsageSummary = isFinding
      ? lookupFindingUsage(masterUsageIndex, record.id)
      : isRec
        ? lookupRecUsage(masterUsageIndex, record.id)
        : undefined;
    const masterArchiveKind = isFinding ? ('finding' as const) : isRec ? ('recommendation' as const) : null;
    const archiveBlockedMessage =
      masterArchiveKind && masterUsageSummary && masterUsageSummary.glossaryRowCount > 0
        ? libraryMasterArchiveBlockedMessage(masterArchiveKind, masterUsageSummary)
        : '';
    const archiveActionDisabled =
      !masterArchiveKind ||
      Boolean(masterUsageSummary && masterUsageSummary.glossaryRowCount > 0) ||
      isArchiveSaving ||
      isCopySaving;

    const shortField = isFinding ? 'fldFindShort' : isRec ? 'fldRecShort' : activeTab === 'categories' ? 'fldCategoryName' : 'fldItemName';
    const shortValue = record.displayName || '';
    const charCount = shortValue.length;
    
    // Zone identification for findings/recs
    const isFindingOrRec = isFinding || isRec;
    const zone = {
      color: 'text-zinc-300',
      bgColor: 'bg-transparent',
      label: ''
    };

    if (isFindingOrRec) {
      if (charCount > 120) {
        zone.color = 'text-red-500';
        zone.bgColor = 'bg-red-50';
        zone.label = 'Too long';
      } else if (charCount > 100) {
        zone.color = 'text-amber-500';
        zone.bgColor = 'bg-amber-50';
        zone.label = 'Verbose';
      } else if (charCount > 45) {
        zone.color = 'text-slate-500';
        zone.bgColor = 'bg-slate-50';
        zone.label = 'Standard';
      } else {
        zone.color = 'text-green-500';
        zone.bgColor = 'bg-green-50';
        zone.label = 'Mobile-friendly';
      }
    }

    const isOverLimit = isFindingOrRec && charCount > 120;

    const findingUnitVal = isFinding ? String(getValue(record, 'fldUnitType') ?? '').trim() : '';
    const findingUnitInList =
      findingUnitVal !== '' &&
      MEASUREMENT_UNITS.includes(findingUnitVal as (typeof MEASUREMENT_UNITS)[number]);

    const isHighlighted = highlightMasterId === record.id;

    return (
      <div
        key={record.id}
        className={cn(
          'flex flex-col gap-1.5 p-3 hover:bg-zinc-50 transition-all group border-b border-zinc-100 last:border-0',
          isHighlighted && 'bg-violet-50/80 ring-2 ring-inset ring-violet-300'
        )}
      >
        <div className="flex items-center gap-3">
          <div className="w-14 text-center">
            <input 
              type="number"
              value={record.order}
              onChange={(e) => {
                const val = e.target.value === '' ? 999 : parseInt(e.target.value);
                reorderAndNormalize(record.id, isNaN(val) ? 999 : val, list);
              }}
              className="w-full bg-zinc-100 border border-zinc-200 rounded-lg py-1 px-1.5 text-center font-mono text-[11px] focus:bg-white focus:ring-2 focus:ring-black/5 outline-none"
            />
          </div>
          <div className="flex-1 min-w-0 relative">
            <input 
              type="text"
              value={shortValue}
              onChange={(e) => handleEdit(record.id, shortField, e.target.value)}
              className={cn(
                "w-full bg-transparent border-b border-transparent hover:border-zinc-200 focus:border-zinc-900 focus:outline-none py-0.5 font-bold text-zinc-900 text-sm transition-all",
                isOverLimit && "text-red-600 border-red-500 hover:border-red-500 focus:border-red-600"
              )}
            />
            {isFindingOrRec && (
              <div
                className="mt-1 flex flex-wrap items-center gap-1.5 pointer-events-auto"
                title={!String(getValue(record, 'fldGlossarySetId') || '').trim() ? 'Legacy: no Glossary Set tag' : undefined}
              >
                <span className="inline-flex rounded border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest text-violet-800">
                  Master library
                </span>
                <span
                  className={cn(
                    'inline-flex max-w-[11rem] truncate rounded-full border px-2 py-0.5 text-[8px] font-black uppercase tracking-widest',
                    String(getValue(record, 'fldGlossarySetId') || '').trim()
                      ? 'border-indigo-200 bg-indigo-50 text-indigo-800'
                      : 'border-zinc-200 bg-zinc-100 text-zinc-500'
                  )}
                >
                  {libraryRowGlossaryBadgeLabel(record)}
                </span>
                <select
                  value={String(getValue(record, 'fldGlossarySetId') || '').trim()}
                  onChange={(e) => applyLibraryGlossarySetToRecord(record.id, e.target.value)}
                  className="max-w-[10rem] rounded-md border border-zinc-200 bg-white py-0.5 pl-1.5 pr-6 text-[9px] font-bold text-zinc-700 outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Unassigned</option>
                  {GLOSSARY_SET_DEFS.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {isFindingOrRec && (
              <div className="absolute right-0 -top-2 flex items-center gap-1 pointer-events-none">
                <span className={cn("text-[7px] font-black uppercase tracking-widest px-1 py-0.25 rounded-full border", zone.color, zone.bgColor, zone.color.replace('text-', 'border-').replace('500', '200'))}>
                  {zone.label}
                </span>
                <div className={cn(
                  "text-[8px] font-black uppercase tracking-tighter px-0.5 rounded transition-colors",
                  zone.color
                )}>
                  {charCount} / 120
                </div>
              </div>
            )}
          </div>
          <div className="w-40 text-[9px] font-mono text-zinc-400 bg-zinc-50 px-2 py-0.5 rounded truncate border border-zinc-100">
            {record.id}
          </div>
          <div className="w-20 flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
            <button 
              onClick={() => reorderAndNormalize(record.id, index, list)}
              disabled={index === 0}
              className="p-1 hover:bg-zinc-200 rounded text-zinc-400 hover:text-black disabled:opacity-30"
            >
              <ArrowUp size={12} />
            </button>
            <button 
              onClick={() => reorderAndNormalize(record.id, index + 2, list)}
              disabled={index === list.length - 1}
              className="p-1 hover:bg-zinc-200 rounded text-zinc-400 hover:text-black disabled:opacity-30"
            >
              <ArrowDown size={12} />
            </button>
          </div>
        </div>

        {(isFinding || isRec) && (
          <div className="ml-16 mr-20 flex flex-wrap items-center gap-2 pb-1">
            <button
              type="button"
              title={isFinding ? 'Copy as new finding' : 'Copy as new recommendation'}
              onClick={() =>
                isFinding ? openFindingCopyModal(record.id) : openRecommendationCopyModal(record.id)
              }
              disabled={isCopySaving || isArchiveSaving}
              className="inline-flex items-center gap-1.5 rounded-md border border-violet-200 bg-violet-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-violet-800 transition-colors hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Copy size={12} aria-hidden />
              Copy
            </button>
            <button
              type="button"
              title={
                archiveBlockedMessage ||
                (isFinding ? 'Archive unused finding' : 'Archive unused recommendation')
              }
              onClick={() =>
                isFinding
                  ? openFindingArchiveModal(record.id)
                  : openRecommendationArchiveModal(record.id)
              }
              disabled={archiveActionDisabled}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider transition-colors disabled:cursor-not-allowed',
                archiveBlockedMessage
                  ? 'border-zinc-200 bg-zinc-50 text-zinc-400'
                  : 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 disabled:opacity-40'
              )}
            >
              <Archive size={12} aria-hidden />
              {archiveBlockedMessage ? 'Archive blocked' : 'Archive'}
            </button>
          </div>
        )}

        {(isFinding || isRec) && (
          <div className="ml-16 mr-20 space-y-2">
            {masterUsageSummary && masterUsageSummary.glossaryRowCount > 0 ? (
              <LibraryMasterEditImpactBanner
                kind={isFinding ? 'finding' : 'recommendation'}
                summary={masterUsageSummary}
              />
            ) : null}
            {isFinding && isUnassignedFindingsView ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2.5 space-y-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-amber-800">
                  Assign to category / item
                </p>
                <p className="text-[10px] leading-snug text-amber-900/90">
                  {unassignedFindingItemStatusLabel(
                    record as Finding,
                    navigationItems,
                    edits
                  )}
                </p>
                <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">
                  Item
                </label>
                <select
                  value={String(getValue(record, 'fldItem') || '').trim()}
                  onChange={(e) => handleEdit(record.id, 'fldItem', e.target.value)}
                  className="w-full max-w-md rounded-md border border-zinc-200 bg-white py-1.5 pl-2 pr-8 text-[11px] font-semibold text-zinc-800 outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value="">Select category → item…</option>
                  {sortEntities(navigationCategories, 'fldCategoryName').map((cat) => {
                    const catId = cat.fldCategoryID || (cat as { id?: string }).id;
                    const catItems = sortEntities(
                      navigationItems.filter(
                        (i) =>
                          isActiveLibraryMaster(i) &&
                          libNormId(i.fldCatID) === libNormId(catId)
                      ),
                      'fldItemName'
                    );
                    if (catItems.length === 0) return null;
                    return (
                      <optgroup key={catId} label={cat.fldCategoryName}>
                        {catItems.map((item) => {
                          const itemId = item.fldItemID || (item as { id?: string }).id;
                          return (
                            <option key={itemId} value={itemId}>
                              {item.fldItemName}
                            </option>
                          );
                        })}
                      </optgroup>
                    );
                  })}
                </select>
                <p className="text-[9px] text-zinc-500">
                  Saves with <span className="font-semibold">Save Changes</span> — updates this finding
                  only.
                </p>
              </div>
            ) : null}
            <textarea 
              rows={3}
              value={getValue(record, isFinding ? 'fldFindLong' : 'fldRecLong') || ''}
              onChange={(e) => {
                const field = isFinding ? 'fldFindLong' : 'fldRecLong';
                handleEdit(record.id, field, e.target.value);
              }}
              placeholder="Long description (auto-expands)..."
              className="w-full bg-zinc-50/50 hover:bg-zinc-50 focus:bg-white border border-transparent hover:border-zinc-200 focus:border-zinc-300 rounded text-[11px] text-zinc-600 p-2 transition-all min-h-[60px] max-h-[300px] overflow-y-auto resize-none leading-normal"
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = Math.min(300, Math.max(60, target.scrollHeight)) + 'px';
              }}
            />
            {isFinding && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Measurement Type</label>
                  <input
                    type="text"
                    value={getValue(record, 'fldMeasurementType') ?? ''}
                    onChange={(e) => handleEdit(record.id, 'fldMeasurementType', e.target.value)}
                    placeholder="Slope, Width, Height, Count, Area, Clearance"
                    className="w-full bg-zinc-100 border border-zinc-200 rounded py-1 px-2 text-[11px] outline-none focus:bg-white focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Measurement Unit</label>
                  <select
                    value={findingUnitVal}
                    onChange={(e) => handleEdit(record.id, 'fldUnitType', e.target.value)}
                    className="w-full bg-zinc-100 border border-zinc-200 rounded py-1 px-2 text-[11px] outline-none focus:bg-white focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Select unit</option>
                    {MEASUREMENT_UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                    {findingUnitVal !== '' && !findingUnitInList && (
                      <option value={findingUnitVal}>{findingUnitVal}</option>
                    )}
                  </select>
                </div>
              </div>
            )}
            {isRec && (
              <div className="grid grid-cols-2 gap-4 pt-1">
                <div className="flex items-center gap-2">
                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest shrink-0">Unit Cost ($)</label>
                  <input 
                    type="number"
                    value={getValue(record, 'fldUnit') ?? 0}
                    onChange={(e) => handleEdit(record.id, 'fldUnit', Number(e.target.value))}
                    className="flex-1 bg-zinc-100 border border-zinc-200 rounded py-1 px-2 text-[11px] outline-none focus:bg-white focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest shrink-0">Cost Unit Type</label>
                  <div className="flex-1 flex gap-1">
                    <select
                      value={getValue(record, 'fldUOM') || ''}
                      onChange={(e) => handleEdit(record.id, 'fldUOM', e.target.value)}
                      className="w-20 bg-zinc-100 border border-zinc-200 rounded py-1 px-2 text-[11px] outline-none focus:bg-white focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">(None)</option>
                      <option value="EA">EA</option>
                      <option value="LF">LF</option>
                      <option value="SF">SF</option>
                      <option value="LS">LS</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
            <div className="flex min-w-0 items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setCitationTargetId(record.id)}
                className={cn(
                  'inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest transition-colors',
                  citationTargetId === record.id
                    ? 'border-blue-400 bg-blue-50 text-blue-800'
                    : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50'
                )}
              >
                <Quote size={12} />
                Library citations
                {safeLibraryStandardsArray(getValue(record, 'fldStandards')).length > 0 ? (
                  <span className="rounded-full bg-zinc-900 text-white px-1.5 py-0 text-[9px] tabular-nums">
                    {safeLibraryStandardsArray(getValue(record, 'fldStandards')).length}
                  </span>
                ) : null}
              </button>
              {(() => {
                const rowIds = sortLibraryStandardIds(
                  safeLibraryStandardsArray(getValue(record, 'fldStandards')),
                  standards
                );
                if (rowIds.length === 0) return null;
                return (
                  <div className="min-h-[28px] min-w-0 flex-1 overflow-x-auto overflow-y-hidden [-ms-overflow-style:none] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1">
                    <div className="flex w-max items-center gap-1 py-0.5 pr-1">
                      {rowIds.map((cid) => {
                        const s = standards.find((st) => libNormId(st.id) === libNormId(cid));
                        const title = libraryCitationDisplayLabel(s, cid);
                        const compact = inlineLibraryCitationChipText(s, cid);
                        return (
                          <span
                            key={cid}
                            role="presentation"
                            title={title}
                            className="max-w-[10rem] shrink-0 truncate rounded-full border border-zinc-200 bg-zinc-100/90 px-2 py-0.5 font-mono text-[9px] font-semibold text-zinc-700"
                          >
                            {compact}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
            {isOverLimit && (
              <div className="mt-0.5 text-[9px] font-bold text-red-500 uppercase tracking-widest flex items-center">
                <AlertCircle size={10} className="mr-1" /> Limit Exceeded
              </div>
            )}
            {isFinding && (
              <LibraryMasterUsagePanel kind="finding" summary={masterUsageSummary} />
            )}
            {isRec && (
              <LibraryMasterUsagePanel kind="recommendation" summary={masterUsageSummary} />
            )}
            {archiveBlockedMessage ? (
              <p className="text-[10px] leading-snug text-amber-900/90 rounded border border-amber-100 bg-amber-50/80 px-2 py-1.5">
                {archiveBlockedMessage}
              </p>
            ) : null}
          </div>
        )}
      </div>
    );
  };

  const handleCancel = () => {
    setEdits({});
    setIsDirty(false);
    setCitationTargetId(null);
    toast.info('Changes discarded.');
  };

  const getEmptyStateMessage = () => {
    if (activeTab === 'items' && !selectedCatId) return 'Select a Category to view Items.';
    if (activeTab === 'findings' && !selectedCatId) {
      return 'Select a Category or Unassigned Findings to view findings.';
    }
    if (isUnassignedFindingsView) {
      return searchTerm.trim()
        ? 'No unassigned findings match your search.'
        : 'No findings with a missing or invalid item assignment.';
    }
    return 'No records found for the current search or selection.';
  };

  return (
    <div className="flex flex-col h-full bg-zinc-50 overflow-hidden">
      {/* Consolidated Toolbar */}
      <div className="bg-white border-b border-zinc-200 px-4 py-1.5 shrink-0 flex items-center justify-between sticky top-0 z-30 gap-4 shadow-sm">
        <div className="flex items-center gap-3 shrink-0">
          <BookOpen className="text-blue-500" size={18} />
          <h1 className="text-sm font-black text-zinc-900 tracking-tight uppercase">
            Library
          </h1>
        </div>

        <div className="flex-1 flex items-center gap-3 max-w-3xl px-4 border-x border-zinc-100">
          <button 
            onClick={() => setIsNavCollapsed(!isNavCollapsed)}
            className="p-1.5 hover:bg-zinc-100 rounded-md text-zinc-400 hover:text-zinc-900 transition-colors shrink-0"
            title={isNavCollapsed ? "Expand Navigation" : "Collapse Navigation"}
          >
            {isNavCollapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
          </button>

          <div className="relative w-44 shrink-0">
            <select 
              value={activeTab}
              onChange={(e) => confirmNavigation('tab', e.target.value)}
              className="w-full bg-zinc-100 border-none rounded-lg py-1.5 pl-3 pr-8 text-[11px] font-black uppercase tracking-widest focus:ring-2 focus:ring-black/5 outline-none appearance-none cursor-pointer"
            >
              <option value="categories">Categories</option>
              <option value="items">Items</option>
              <option value="findings">Findings</option>
              <option value="recommendations">Recommendations</option>
            </select>
            <ChevronRight size={12} className="absolute right-2 top-1/2 -translate-y-1/2 rotate-90 text-zinc-400 pointer-events-none" />
          </div>

          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
            <input 
              type="text"
              placeholder="Search library..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-100 border-none rounded-lg py-1.5 pl-8 pr-4 text-xs focus:ring-2 focus:ring-black/5 outline-none placeholder:text-zinc-400"
            />
          </div>

          {(activeTab === 'findings' || activeTab === 'recommendations') && (
            <div className="relative w-[11.5rem] shrink-0">
              <select
                value={glossarySetFilter}
                onChange={(e) => setGlossarySetFilter(e.target.value || 'ALL')}
                className="w-full appearance-none bg-amber-50/80 border border-amber-100 rounded-lg py-1.5 pl-2 pr-7 text-[10px] font-black uppercase tracking-tight text-zinc-800 focus:ring-2 focus:ring-black/5 outline-none cursor-pointer"
                title="Filter by Glossary Set"
              >
                <option value="ALL">All sets</option>
                <option value="UNASSIGNED">Unassigned / Legacy</option>
                {GLOSSARY_SET_DEFS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
              <ChevronRight size={12} className="absolute right-2 top-1/2 -translate-y-1/2 rotate-90 text-zinc-400 pointer-events-none" />
            </div>
          )}

          {breadcrumbs.length > 0 && (
            <div className="hidden lg:flex items-center gap-1.5 text-[9px] font-bold text-zinc-400 uppercase tracking-widest shrink-0 max-w-[200px] overflow-hidden">
              <ChevronRight size={10} className="text-zinc-300" />
              {breadcrumbs.map((part, idx) => (
                <React.Fragment key={idx}>
                  <span className="truncate">{part}</span>
                  {idx < breadcrumbs.length - 1 && <ChevronRight size={8} className="text-zinc-300" />}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="relative group">
            <button className="p-1.5 hover:bg-zinc-100 rounded-md text-zinc-400 hover:text-zinc-900 transition-colors">
              <Settings size={16} />
            </button>
            <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-zinc-200 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 py-1">
              <button 
                onClick={() => isGroupedMode ? handleNormalizeAllGroups() : handleNormalize(visibleData)}
                disabled={visibleData.length === 0}
                className="w-full text-left px-4 py-2 text-[11px] font-black uppercase tracking-widest text-zinc-600 hover:bg-zinc-50 hover:text-black flex items-center gap-2 disabled:opacity-30"
              >
                <Hash size={14} /> Normalize Order
              </button>
            </div>
          </div>

          <div className="h-4 w-px bg-zinc-200 mx-1" />

          <Button variant="ghost" size="sm" onClick={handleCancel} disabled={!isDirty || isSaving} className="h-8 px-2.5 text-[10px] font-black uppercase tracking-widest">
            Discard
          </Button>
          <Button size="sm" onClick={() => void requestSave()} disabled={!isDirty || isSaving} className={cn("h-8 px-4 text-[10px] font-black uppercase tracking-widest", isDirty ? "bg-black text-white hover:bg-zinc-800" : "bg-zinc-100 text-zinc-400")}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar / Navigation - Only visible if activeTab supports it */}
        {(activeTab === 'items' || activeTab === 'findings') && (
          <div className={cn(
            "flex flex-col border-r border-zinc-200 bg-white transition-all duration-300 overflow-hidden shrink-0",
            isNavCollapsed ? "w-0 opacity-0" : "w-72"
          )}>
            <div className="p-3 border-b border-zinc-100 bg-zinc-50/50 shrink-0">
              <h3 className="text-[9px] font-black text-zinc-400 uppercase tracking-widest flex items-center">
                <ChevronRight size={10} className="mr-1" /> Navigation Drill-down
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-4">
              {/* Items Tab Navigation (Categories List) */}
              {activeTab === 'items' && (
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest pl-2">Select Category</label>
                  <div className="space-y-0.5">
                    {sortEntities(navigationCategories, 'fldCategoryName').map(cat => {
                      const catId = cat.fldCategoryID || (cat as any).id;
                      const isSelected = selectedCatId === catId;
                      return (
                        <button 
                          key={catId}
                          onClick={() => {
                            confirmNavigation('cat', catId);
                          }}
                          className={cn(
                            "w-full text-left px-3 py-1.5 rounded-lg text-xs transition-all flex items-center justify-between group",
                            isSelected 
                              ? "bg-blue-50 text-blue-700 font-bold" 
                              : "text-zinc-600 hover:bg-zinc-100"
                          )}
                        >
                          <span className="truncate">{cat.fldCategoryName}</span>
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Findings Tab Navigation (Expandable Tree) */}
              {activeTab === 'findings' && (
                <div className="space-y-3">
                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest pl-2 block">Category Hierarchy</label>
                  <button
                    type="button"
                    onClick={() => confirmNavigation('cat', LIBRARY_UNASSIGNED_FINDINGS_CAT_ID)}
                    className={cn(
                      'mb-2 flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-xs transition-all',
                      isUnassignedFindingsView
                        ? 'border-amber-300 bg-amber-50 font-bold text-amber-900'
                        : 'border-zinc-200 bg-white text-zinc-700 hover:border-amber-200 hover:bg-amber-50/50'
                    )}
                  >
                    <span className="truncate">{LIBRARY_UNASSIGNED_FINDINGS_LABEL}</span>
                    <span
                      className={cn(
                        'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black tabular-nums',
                        unassignedFindingsCount > 0
                          ? 'bg-amber-200 text-amber-900'
                          : 'bg-zinc-100 text-zinc-500'
                      )}
                    >
                      {unassignedFindingsCount}
                    </span>
                  </button>
                  <p className="px-2 text-[9px] leading-snug text-zinc-500">
                    Findings with no item, or an item that no longer exists. Assign via Category →
                    Item, then Save Changes.
                  </p>
                  <div className="space-y-0.5">
                    {sortEntities(navigationCategories, 'fldCategoryName').map(cat => {
                      const catId = cat.fldCategoryID || (cat as any).id;
                      const isExpanded = expandedCatId === catId;
                      const isSelected = selectedCatId === catId;
                      
                      return (
                        <div key={catId} className="space-y-0.5">
                          <div className={cn(
                            "flex items-center rounded-lg transition-all pr-2",
                            isSelected ? "bg-blue-50/50" : "hover:bg-zinc-100"
                          )}>
                            {/* Chevron for expansion */}
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedCatId(isExpanded ? '' : catId);
                              }}
                              className="p-1.5 text-zinc-400 hover:text-zinc-900 transition-colors"
                            >
                              <ChevronRight 
                                size={14} 
                                className={cn("transition-transform duration-200", isExpanded && "rotate-90")} 
                              />
                            </button>

                            {/* Label for selection */}
                            <button 
                              onClick={() => {
                                confirmNavigation('cat', catId);
                              }}
                              className={cn(
                                "flex-1 text-left py-1.5 text-xs truncate",
                                isSelected ? "text-blue-700 font-bold" : "text-zinc-600"
                              )}
                            >
                              {cat.fldCategoryName}
                            </button>
                            
                            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                          </div>

                          {/* Expanded Items */}
                          {isExpanded && (
                            <div className="ml-5 pl-1.5 border-l border-zinc-100 space-y-0.5 py-0.5">
                              {/* All Items option */}
                              <button
                                onClick={() => {
                                  confirmNavigation('cat', catId);
                                }}
                                className={cn(
                                  "w-full text-left px-2.5 py-1 rounded text-[10px] transition-all",
                                  isSelected && !selectedItemId 
                                    ? "bg-zinc-200 text-zinc-900 font-bold" 
                                    : "text-zinc-500 hover:bg-zinc-50"
                                )}
                              >
                                All Items in Category
                              </button>

                              {/* Category Items */}
                              {sortEntities(navigationItems.filter(i => i.fldCatID === catId), 'fldItemName').map(item => {
                                const itemId = item.fldItemID || (item as any).id;
                                const isItemActive = selectedItemId === itemId;
                                return (
                                  <button 
                                    key={itemId}
                                    onClick={() => {
                                      confirmNavigation('item', itemId);
                                    }}
                                    className={cn(
                                      "w-full text-left px-2.5 py-1 rounded text-[10px] transition-all flex items-center justify-between",
                                      isItemActive 
                                        ? "bg-indigo-50 text-indigo-700 font-bold" 
                                        : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700"
                                    )}
                                  >
                                    <span className="truncate">{item.fldItemName}</span>
                                    {isItemActive && <div className="w-1 h-1 rounded-full bg-indigo-500" />}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main List Panel */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <Card className="flex-1 overflow-hidden flex flex-col border-zinc-200 rounded-none border-x-0 border-t-0 shadow-none bg-white min-h-0">
            <div className="flex items-center gap-3 px-4 py-2 bg-zinc-900 text-white text-[9px] font-black uppercase tracking-widest shrink-0">
              <div className="w-14 text-center">Order</div>
              <div className="flex-1">Display Name / Short Text</div>
              <div className="w-40">ID (ReadOnly)</div>
              <div className="w-28 text-right pr-2">Actions</div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-zinc-100">
              {(activeTab === 'findings' || activeTab === 'recommendations') && (
                <div className="border-b border-zinc-100 bg-zinc-50/80 px-4 py-2 text-[10px] leading-snug text-zinc-600">
                  <span className="font-bold text-zinc-800">Shared library masters.</span> Edits save to
                  the finding or recommendation document only. Glossary rows keep their own citations and
                  references; inspection records keep saved text until re-saved in Data Entry.
                </div>
              )}
              {isUnassignedFindingsView ? (
                <div className="border-b border-amber-100 bg-amber-50/80 px-4 py-2 text-[10px] leading-snug text-amber-900">
                  <span className="font-bold">Unassigned / invalid item.</span> These findings are not
                  listed under any category until you assign a valid item below and save (updates{' '}
                  <span className="font-mono">fldItem</span> only).
                </div>
              ) : null}
              {visibleData.length > 0 ? (
                isGroupedMode ? (
                  groupedFindings?.map(group => (
                    <div key={group.item.fldItemID || (group.item as any).id} className="flex flex-col">
                      <div className="bg-zinc-50/80 px-4 py-1.5 border-y border-zinc-100 flex items-center justify-between sticky top-0 z-10 backdrop-blur-sm">
                        <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest flex items-center">
                          <Layers size={10} className="mr-1.5 text-indigo-400" /> {group.item.fldItemName}
                        </span>
                        <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest bg-white px-1.5 py-0.5 rounded border border-zinc-200">
                          {group.findings.length} findings
                        </span>
                      </div>
                      <div className="divide-y divide-zinc-100/50">
                        {group.findings.map((record, index) => renderRecord(record, index, group.findings))}
                      </div>
                    </div>
                  ))
                ) : (
                  visibleData.map((record, index) => renderRecord(record, index, visibleData))
                )
              ) : (
                <div className="flex flex-col items-center justify-center p-12 text-zinc-400 text-center">
                  <ClipboardList size={32} className="mb-3 opacity-10" />
                  <p className="text-xs font-bold text-zinc-900 uppercase tracking-widest">{getEmptyStateMessage()}</p>
                  <p className="text-[10px] text-zinc-500 mt-1 max-w-[240px]">Contextual filtering narrows the editable scope of the library.</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {(activeTab === 'findings' || activeTab === 'recommendations') &&
        citationTargetId &&
        citationTargetEntity && (
          <div
            className="fixed inset-0 z-[140] flex items-center justify-center p-4 sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="library-citation-modal-title"
          >
            <button
              type="button"
              className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
              aria-label="Close citation editor"
              onClick={() => setCitationTargetId(null)}
            />
            <div
              className="relative z-10 flex max-h-[min(92vh,880px)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="shrink-0 border-b border-zinc-100 bg-gradient-to-r from-blue-50/80 to-white px-5 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h2
                      id="library-citation-modal-title"
                      className="text-base font-black uppercase tracking-tight text-zinc-900"
                    >
                      {activeTab === 'findings'
                        ? 'Finding citation defaults'
                        : 'Recommendation citation defaults'}
                    </h2>
                    <p className="mt-1 truncate font-mono text-[11px] text-zinc-500">{citationTargetEntity.id}</p>
                    <p className="mt-2 text-[11px] leading-snug text-zinc-500">
                      Changes stay pending until you use <span className="font-semibold text-zinc-700">Save Changes</span>{' '}
                      in the Library toolbar. Only master citation defaults on this record are updated—not
                      glossary rows or project inspection records.
                    </p>
                    {(() => {
                      const usageSummary =
                        activeTab === 'findings'
                          ? lookupFindingUsage(masterUsageIndex, citationTargetId)
                          : lookupRecUsage(masterUsageIndex, citationTargetId);
                      if (!usageSummary?.glossaryRowCount) return null;
                      return (
                        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50/90 px-3 py-2 text-[11px] leading-snug text-amber-950">
                          {libraryMasterEditImpactWarning(
                            activeTab === 'findings' ? 'finding' : 'recommendation',
                            usageSummary
                          )}
                        </div>
                      );
                    })()}
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-9 shrink-0 px-4 text-[10px] font-black uppercase tracking-widest"
                    onClick={() => setCitationTargetId(null)}
                  >
                    Close
                  </Button>
                </div>
                {citationModalBadges.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {citationModalBadges.map((b, idx) => (
                      <span
                        key={`${b.key}-${idx}`}
                        className="inline-flex max-w-full items-center rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-zinc-700"
                      >
                        <span className="truncate">{b.text}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto p-4 lg:grid-cols-12 lg:gap-5 lg:p-5">
                <div className="flex min-h-0 flex-col space-y-2 lg:col-span-5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                    Selected citations
                  </p>
                  <div
                    className={cn(
                      'flex min-h-[14rem] flex-1 flex-col rounded-xl border-2 border-dashed border-zinc-200 bg-zinc-50/50 p-3 transition-colors lg:min-h-[20rem]',
                      'hover:border-zinc-300'
                    )}
                    onDragOver={handleLibraryCitationsDragOver}
                    onDrop={handleLibraryCitationsDrop}
                  >
                    {displaySortedLibraryCitations.length === 0 ? (
                      <p className="flex flex-1 items-center justify-center py-6 text-center text-xs italic text-zinc-400">
                        Drop a citation here or add one with + in the Standards Library.
                      </p>
                    ) : (
                      <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                        {displaySortedLibraryCitations.map((id) => {
                          const s = standards.find((st) => libNormId(st.id) === libNormId(id));
                          const label = libraryCitationDisplayLabel(s, id);
                          return (
                            <li
                              key={id}
                              className="flex items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs"
                            >
                              <span className="truncate font-medium text-zinc-800" title={label}>
                                {label}
                              </span>
                              <button
                                type="button"
                                className="shrink-0 rounded-md p-1 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600"
                                title="Remove citation"
                                onClick={() => removeLibraryCitationFromTarget(id)}
                              >
                                <X size={14} />
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>
                <div className="flex min-h-0 min-w-0 flex-col space-y-2 lg:col-span-7">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                    Standards Library
                  </p>
                  <StandardsBrowser
                    standards={standards}
                    onSelect={handleStandardsBrowserSelect}
                    className="h-[min(58vh,520px)] min-h-[20rem] shrink-0 border border-zinc-200 bg-white lg:h-[min(62vh,560px)]"
                    showSearchClear
                    showBulkExpandControls={false}
                    treeExpansionMode="accordion"
                    enableAutoExpand502={false}
                    uiResetKey={libraryCitationsUiKey}
                    persistUiStateKey={libraryCitationsUiKey}
                    standardSelectionPersistKey="library-citations-standards"
                    preferredStandardContext={libraryCitationPreferredStandardContext}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

      <LibraryMasterSaveConfirmModal
        isOpen={masterSaveConfirmOpen}
        impacts={masterSaveConfirmImpacts}
        isSaving={isSaving}
        onConfirm={() => void handleMasterSaveConfirm()}
        onCancel={handleMasterSaveCancel}
      />

      {copyModal ? (
        <LibraryMasterCopyModal
          state={copyModal}
          isSaving={isCopySaving}
          onClose={() => !isCopySaving && setCopyModal(null)}
          onDraftChange={(draft) => {
            setCopyModal((prev) => {
              if (!prev) return null;
              if (prev.kind === 'finding') {
                return { ...prev, draft: draft as FindingCopyDraft };
              }
              return { ...prev, draft: draft as RecommendationCopyDraft };
            });
          }}
          onConfirm={() => void handleConfirmCopy()}
        />
      ) : null}

      {archiveModal ? (
        <LibraryMasterArchiveModal
          state={archiveModal}
          isSaving={isArchiveSaving}
          onClose={() => !isArchiveSaving && setArchiveModal(null)}
          onConfirm={() => void handleConfirmArchive()}
        />
      ) : null}

      <UnsavedChangesModal 
        isOpen={!!pendingAction}
        onClose={() => setPendingAction(null)}
        onDiscard={handleDiscardAndLeave}
        onSave={handleSaveAndLeave}
        isSaving={isSaving}
      />
    </div>
  );
});
