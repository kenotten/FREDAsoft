/**
 * !!! VERSION 87.0 - THE OPENING FORCE FIX !!!
 */
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ref, getDownloadURL, uploadString } from 'firebase/storage';
import { storage } from '../firebase';
import { resizeImage } from '../lib/imageUtils';
import { 
  Plus, 
  Search, 
  ChevronRight, 
  ChevronDown, 
  Save, 
  Trash2, 
  RotateCcw, 
  RotateCw,
  Edit2, 
  Copy,
  ArrowUp,
  Book,
  Hash,
  Camera,
  X,
  FileText,
  ShieldCheck,
  Loader2
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { cn, sanitizeData, sortEntities, compareEntities } from '../lib/utils';
import { releaseInactiveTabPanelFocus } from '../lib/releaseInactiveTabPanelFocus';
import { Button, Select, Card, Input, Modal } from './ui/core';
import { toast } from 'sonner';
import { firestoreService, OperationType, handleFirestoreError } from '../services/firestoreService';
import { GLOSSARY_SET_DEFS, glossarySetById, glossarySetMetadataForId } from '../lib/glossarySets';
import { normalizeForDeterministicMatch } from '../lib/textNormalize';
import { compareStandardCitations, formatStandardCitationLabel } from '../lib/standardCitationLabel';
import { 
  Category, 
  Item, 
  Finding, 
  MasterRecommendation, 
  Glossary, 
  UnitType, 
  MasterStandard 
} from '../types';

type RelatedRecordScenarioId =
  | 'same_find_new_rec'
  | 'new_find_same_rec'
  | 'new_find_new_rec'
  | 'cross_set_template';

const RELATED_RECORD_SCENARIO_OPTIONS: {
  id: RelatedRecordScenarioId;
  title: string;
  description: string;
  futureMasters: string;
}[] = [
  {
    id: 'same_find_new_rec',
    title: 'Same finding + new recommendation',
    description: 'Keep the current finding; add a new recommendation and glossary row.',
    futureMasters: 'Reuse finding - create or pick recommendation',
  },
  {
    id: 'new_find_same_rec',
    title: 'New finding + same recommendation',
    description: 'Add a new finding; link the current recommendation and a new glossary row.',
    futureMasters: 'Create or pick finding - reuse recommendation',
  },
  {
    id: 'new_find_new_rec',
    title: 'New finding + new recommendation',
    description: 'Fork both masters from the selected text, then create a new glossary row.',
    futureMasters: 'Create finding - create recommendation (short titles must differ in same set)',
  },
  {
    id: 'cross_set_template',
    title: 'Cross-set related record',
    description: 'Use the Glossary Set dropdown and template banner, then Prepare Target Set Records.',
    futureMasters: 'Reuse or create masters per target set - SAVE RECORD for glossary',
  },
];

/** Empty string = Unassigned/Legacy bucket (must not match a real set id). */
function normalizeGlossaryRecordSetKey(raw: string | undefined | null): string {
  const t = String(raw ?? '').trim();
  if (!t) return '';
  const def = glossarySetById(t);
  return def ? def.id : t;
}

/** Canonical set key on a master Finding / Recommendation; empty = legacy / unassigned. */
function masterLibrarySetKey(entity: any): string {
  return normalizeGlossaryRecordSetKey(entity?.fldGlossarySetId);
}

/** Named set: master must carry the same set id. Legacy mode: only masters with no set id. */
function masterMatchesSelectedGlossarySet(master: any, selectedSetKey: string): boolean {
  const mk = masterLibrarySetKey(master);
  if (!selectedSetKey) return mk === '';
  return mk === selectedSetKey;
}

function glossaryRowRecId(g: any): string {
  return String(g?.fldRec || g?.fldRecID || '').trim().toLowerCase();
}

type LibraryDraftSnapshot = {
  findShort: string;
  findLong: string;
  recShort: string;
  recLong: string;
};

/** Survives GlossaryBuilder unmount (e.g. Explorer tab) while selections.isDirty stays true. */
const libraryDraftByIdentity = new Map<string, LibraryDraftSnapshot>();

type PendingRelatedActivation =
  | {
      kind: 'same_find_new_rec';
      selectedCat: string;
      selectedItem: string;
      selectedFind: string;
      sourceRecId: string;
      newRecId: string;
      glosId: string;
      glossarySetKey: string;
    }
  | {
      kind: 'new_find_same_rec';
      selectedCat: string;
      selectedItem: string;
      sourceFindId: string;
      newFindId: string;
      selectedRecId: string;
      glosId: string;
      glossarySetKey: string;
    }
  | {
      kind: 'new_find_new_rec';
      selectedCat: string;
      selectedItem: string;
      sourceFindId: string;
      sourceRecId: string;
      newFindId: string;
      newRecId: string;
      glosId: string;
      glossarySetKey: string;
    };

function pendingMatchesSameFindNewRecContext(
  pending: Extract<PendingRelatedActivation, { kind: 'same_find_new_rec' }>,
  selectedCat: string,
  selectedItem: string,
  selectedFind: string
): boolean {
  const n = (v: string) => String(v || '').trim().toLowerCase();
  return (
    n(pending.selectedCat) === n(selectedCat) &&
    n(pending.selectedItem) === n(selectedItem) &&
    n(pending.selectedFind) === n(selectedFind)
  );
}

function pendingMatchesNewFindSameRecContext(
  pending: Extract<PendingRelatedActivation, { kind: 'new_find_same_rec' }>,
  selectedCat: string,
  selectedItem: string,
  selectedRec: string,
  glossarySetKey: string
): boolean {
  const n = (v: string) => String(v || '').trim().toLowerCase();
  return (
    n(pending.selectedCat) === n(selectedCat) &&
    n(pending.selectedItem) === n(selectedItem) &&
    n(pending.selectedRecId) === n(selectedRec) &&
    normalizeGlossaryRecordSetKey(pending.glossarySetKey) ===
      normalizeGlossaryRecordSetKey(glossarySetKey)
  );
}

function pendingMatchesNewFindNewRecContext(
  pending: Extract<PendingRelatedActivation, { kind: 'new_find_new_rec' }>,
  selectedCat: string,
  selectedItem: string,
  glossarySetKey: string
): boolean {
  const n = (v: string) => String(v || '').trim().toLowerCase();
  return (
    n(pending.selectedCat) === n(selectedCat) &&
    n(pending.selectedItem) === n(selectedItem) &&
    normalizeGlossaryRecordSetKey(pending.glossarySetKey) ===
      normalizeGlossaryRecordSetKey(glossarySetKey)
  );
}

function glossarySameTripleContext(
  g: any,
  selectedCat: string,
  selectedItem: string,
  selectedFind: string
): boolean {
  return (
    String(g.fldCat || '').toLowerCase().trim() === String(selectedCat || '').toLowerCase().trim() &&
    String(g.fldItem || '').toLowerCase().trim() === String(selectedItem || '').toLowerCase().trim() &&
    String(g.fldFind || '').toLowerCase().trim() === String(selectedFind || '').toLowerCase().trim()
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
    String(g.fldCat || '').toLowerCase().trim() === String(selectedCat || '').toLowerCase().trim() &&
    String(g.fldItem || '').toLowerCase().trim() === String(selectedItem || '').toLowerCase().trim() &&
    String(g.fldFind || '').toLowerCase().trim() === String(selectedFind || '').toLowerCase().trim() &&
    String(g.fldRec || g.fldRecID || '').toLowerCase().trim() === String(selectedRec || '').toLowerCase().trim()
  );
}

function findExactGlossaryByFiveTuple(
  glossaryList: any[],
  selectedCat: string,
  selectedItem: string,
  selectedFind: string,
  selectedRec: string,
  selectedSetKey: string
) {
  return glossaryList.find(
    (g: any) =>
      glossarySameFourTuple(g, selectedCat, selectedItem, selectedFind, selectedRec) &&
      normalizeGlossaryRecordSetKey(g.fldGlossarySetId) === selectedSetKey
  );
}

function filterGlossaryFourTupleOtherSets(
  glossaryList: any[],
  selectedCat: string,
  selectedItem: string,
  selectedFind: string,
  selectedRec: string,
  selectedSetKey: string
) {
  return glossaryList.filter(
    (g: any) =>
      glossarySameFourTuple(g, selectedCat, selectedItem, selectedFind, selectedRec) &&
      normalizeGlossaryRecordSetKey(g.fldGlossarySetId) !== selectedSetKey
  );
}

/** Infers the set key used for 5-tuple glossary resolution (matches sync effect + SAVE). */
function glossaryKeyForExactLookup(
  glossaryList: any[],
  selectedGlossarySetId: string,
  editingGlossaryId: string | undefined,
  selectedCat: string,
  selectedItem: string,
  selectedFind: string,
  selectedRec: string
): string {
  const selectedSetKeyUi = normalizeGlossaryRecordSetKey(selectedGlossarySetId);
  let keyForExactLookup = selectedSetKeyUi;
  if (keyForExactLookup === '') {
    const gid = String(editingGlossaryId || '').trim();
    if (gid) {
      const rowById = (glossaryList || []).find(
        (g: any) => String(g.fldGlosId || g.id || '').trim() === gid
      );
      if (
        rowById &&
        glossarySameTripleContext(rowById, selectedCat, selectedItem, selectedFind)
      ) {
        keyForExactLookup = normalizeGlossaryRecordSetKey(rowById.fldGlossarySetId);
      }
    }
  }
  return keyForExactLookup;
}

/** Named set in UI: pinned row must belong to the same set. Legacy/unassigned dropdown skips this check. */
function glossaryRowMatchesPinnedSetContext(g: any, selectedGlossarySetId: string): boolean {
  const dropKey = normalizeGlossaryRecordSetKey(selectedGlossarySetId);
  if (!dropKey) return true;
  return normalizeGlossaryRecordSetKey(g.fldGlossarySetId) === dropKey;
}

/**
 * Shared active glossary row resolution for builder sync + SAVE.
 * Priority: (1) pinned row by selections.editingGlossaryId (+ cat/item/find + set; rec may lag props);
 * (2) canonical 5-tuple match via glossaryKeyForExactLookup + findExactGlossaryByFiveTuple.
 */
function resolveSyncedGlossaryRow(
  glossaryList: any[],
  selectedGlossarySetId: string,
  editingGlossaryId: string | undefined,
  selectedCat: string,
  selectedItem: string,
  selectedFind: string,
  selectedRec: string
): any | undefined {
  const list = glossaryList || [];
  const gid = String(editingGlossaryId || '').trim();
  if (gid) {
    const pinned = list.find(
      (g: any) =>
        String(g.fldGlosId || g.id || '').trim() === gid &&
        glossarySameTripleContext(g, selectedCat, selectedItem, selectedFind) &&
        glossaryRowMatchesPinnedSetContext(g, selectedGlossarySetId)
    );
    if (pinned) {
      const ctxRec = String(selectedRec || '').trim().toLowerCase();
      const pinnedRec = glossaryRowRecId(pinned);
      // Stale pin: editingGlossaryId still points at source row while selectedRec already moved (e.g. post–related-record activation).
      if (!ctxRec || !pinnedRec || pinnedRec === ctxRec) {
        return pinned;
      }
    }
  }

  const key = glossaryKeyForExactLookup(
    list,
    selectedGlossarySetId,
    editingGlossaryId,
    selectedCat,
    selectedItem,
    selectedFind,
    selectedRec
  );
  return findExactGlossaryByFiveTuple(
    list,
    selectedCat,
    selectedItem,
    selectedFind,
    selectedRec,
    key
  );
}

/** Active glossary rows (exclude soft-deleted / archived). */
function isActiveGlossaryRow(g: any): boolean {
  return (
    g.fldDeleted !== true &&
    g.fldIsDeleted !== true &&
    g.fldIsArchived !== true
  );
}

function glossaryIdentityKey(
  selectedCat: string,
  selectedItem: string,
  selectedFind: string,
  selectedRec: string
): string {
  return [
    String(selectedCat || '').toLowerCase().trim(),
    String(selectedItem || '').toLowerCase().trim(),
    String(selectedFind || '').toLowerCase().trim(),
    String(selectedRec || '').toLowerCase().trim(),
  ].join('|');
}

interface GlossaryBuilderProps {
  categories: Category[];
  items: Item[];
  findings: Finding[];
  setFindings: React.Dispatch<React.SetStateAction<Finding[]>>;
  recommendations: any[]; // Legacy recommendations
  setRecommendations: React.Dispatch<React.SetStateAction<any[]>>;
  masterRecommendations: MasterRecommendation[];
  glossary: Glossary[];
  setGlossary: React.Dispatch<React.SetStateAction<Glossary[]>>;
  unitTypes: UnitType[];
  standards: MasterStandard[];
  selections: any;
  onSelectionChange: React.Dispatch<React.SetStateAction<any>>;
  updatePreferences: (prefs: any) => void;
  setIsSynced: (val: boolean) => void;
  isUpdatingRef: React.MutableRefObject<boolean>;
  setShowStandards: (val: boolean) => void;
  showStandards: boolean;
  activeStandardTarget?: 'finding' | 'recommendation' | 'glossary';
  setActiveStandardTarget?: (val: 'finding' | 'recommendation' | 'glossary') => void;
  onAddStandard?: (s: MasterStandard, targetOverride?: 'finding' | 'recommendation' | 'glossary') => void;
  onRemoveStandard?: (target: 'finding' | 'recommendation' | 'glossary', standardId: string) => void;
  onDiscardChanges?: () => void;
  stagedFindingStds?: string[];
  stagedRecStds?: string[];
  stagedGlosStds?: string[];
  onReplaceStagedStandards?: (next: { finding: string[]; rec: string[]; glossary: string[] }) => void;
  onGlossarySetIdChange?: (setId: string) => void;
  onTemplateModeChange?: (isTemplateMode: boolean) => void;
  /** App-level activation (functional setSelections) — same shape as Glossary Explorer row open. */
  onActivateGlossaryBuilderRecord?: (item: any) => void;
}

function normStagedStandardId(v: string | undefined | null): string {
  return String(v ?? '').toLowerCase().trim();
}

/** Display order for staged citation id lists (does not mutate stored arrays). */
function sortStagedStandardIds(ids: string[], standardsList: MasterStandard[]): string[] {
  return [...ids].sort((idA, idB) => {
    const sa = standardsList.find((st) => normStagedStandardId(st.id) === normStagedStandardId(idA));
    const sb = standardsList.find((st) => normStagedStandardId(st.id) === normStagedStandardId(idB));
    const c = compareStandardCitations(sa, sb);
    if (c !== 0) return c;
    return String(idA).localeCompare(String(idB), undefined, { sensitivity: 'base' });
  });
}

export function GlossaryBuilder({
  categories = [],
  items = [],
  findings = [],
  setFindings,
  recommendations = [],
  setRecommendations,
  masterRecommendations = [],
  glossary = [],
  setGlossary,
  unitTypes = [],
  standards = [],
  selections = {},
  onSelectionChange,
  updatePreferences,
  setIsSynced,
  isUpdatingRef,
  setShowStandards,
  showStandards,
  activeStandardTarget = 'finding',
  setActiveStandardTarget,
  onAddStandard,
  onRemoveStandard,
  onDiscardChanges,
  stagedFindingStds = [],
  stagedRecStds = [],
  stagedGlosStds = [],
  onReplaceStagedStandards,
  onGlossarySetIdChange,
  onTemplateModeChange,
  onActivateGlossaryBuilderRecord
}: GlossaryBuilderProps) {
  // Base UI should always render to prevent layout shifts.
  const { selectedCat, selectedItem, selectedFind, selectedRec } = selections;
  const hasMinimumContext = !!(selectedCat && selectedItem && selectedFind && selectedRec);

  const masterRecsSource = Array.isArray(masterRecommendations) ? masterRecommendations : [];

  const [draftFindShort, setDraftFindShort] = useState('');
  const [draftFindLong, setDraftFindLong] = useState('');
  const [draftRecShort, setDraftRecShort] = useState('');
  const [draftRecLong, setDraftRecLong] = useState('');
  const libraryDirtySyncedToAppRef = useRef(false);

  const normMasterId = (v: any) => String(v ?? '').toLowerCase().trim();

  const resolveMatchedFindingForDraft = () =>
    findings?.find(
      (f: any) => normMasterId(f.id || f.fldFindID) === normMasterId(selectedFind)
    );

  const resolveMatchedRecForDraft = () =>
    masterRecsSource?.find(
      (r: any) => normMasterId(r.id || r.fldRecID) === normMasterId(selectedRec)
    );

  const libraryDraftHydrationKey = useMemo(
    () =>
      [
        normMasterId(selectedFind),
        normMasterId(selectedRec),
        normMasterId(selections.editingGlossaryId),
      ].join('|'),
    [selectedFind, selectedRec, selections.editingGlossaryId]
  );

  const persistLibraryDraftCache = (patch: Partial<LibraryDraftSnapshot>) => {
    libraryDraftByIdentity.set(libraryDraftHydrationKey, {
      findShort: patch.findShort ?? draftFindShort,
      findLong: patch.findLong ?? draftFindLong,
      recShort: patch.recShort ?? draftRecShort,
      recLong: patch.recLong ?? draftRecLong,
    });
  };

  const applyLibraryDraftSnapshot = (snapshot: LibraryDraftSnapshot) => {
    setDraftFindShort(snapshot.findShort);
    setDraftFindLong(snapshot.findLong);
    setDraftRecShort(snapshot.recShort);
    setDraftRecLong(snapshot.recLong);
  };

  const hydrateLibraryDraft = () => {
    if (selections.isDirty) {
      const cached = libraryDraftByIdentity.get(libraryDraftHydrationKey);
      if (cached) {
        applyLibraryDraftSnapshot(cached);
      }
      return;
    }

    const matchedFinding = resolveMatchedFindingForDraft();
    const matchedRec = resolveMatchedRecForDraft();
    const snapshot: LibraryDraftSnapshot = {
      findShort: matchedFinding?.fldFindShort || '',
      findLong: matchedFinding?.fldFindLong || '',
      recShort: matchedRec?.fldRecShort || '',
      recLong: matchedRec?.fldRecLong || '',
    };
    applyLibraryDraftSnapshot(snapshot);
    libraryDraftByIdentity.set(libraryDraftHydrationKey, snapshot);
    libraryDirtySyncedToAppRef.current = false;
  };

  const markLibraryDraftDirty = () => {
    if (!libraryDirtySyncedToAppRef.current) {
      libraryDirtySyncedToAppRef.current = true;
      onSelectionChange((prev: any) => (prev.isDirty ? prev : { ...prev, isDirty: true }));
    }
  };

  useEffect(() => {
    hydrateLibraryDraft();
  }, [libraryDraftHydrationKey]);

  useEffect(() => {
    if (selections.isDirty) return;
    hydrateLibraryDraft();
  }, [findings, masterRecommendations, libraryDraftHydrationKey, selections.isDirty]);

  /** Same-finding+new-rec Continue: blocks sync from restoring source row until new rec+glos land in App selections. */
  const pendingRelatedActivationRef = useRef<PendingRelatedActivation | null>(null);
  const relatedPrefillKeyRef = useRef('');
  const relatedFormTouchedRef = useRef(false);

  const [selectedGlossarySetId, setSelectedGlossarySetId] = useState<string>('');
  const [libraryGlossaryContextMismatch, setLibraryGlossaryContextMismatch] = useState(false);
  const [templateSourceSnapshot, setTemplateSourceSnapshot] = useState<{
    sourceGlossarySetId: string;
    sourceEditingGlossaryId: string;
    sourceFindingStds: string[];
    sourceRecStds: string[];
    sourceGlosStds: string[];
    sourceIdentityKey: string;
  } | null>(null);
  const [isPreparingTargetSetRecords, setIsPreparingTargetSetRecords] = useState(false);

  useEffect(() => {
    onGlossarySetIdChange?.(String(selectedGlossarySetId || '').trim());
  }, [selectedGlossarySetId, onGlossarySetIdChange]);

  useEffect(() => {
    onTemplateModeChange?.(!!templateSourceSnapshot);
  }, [templateSourceSnapshot, onTemplateModeChange]);

  useEffect(() => {
    if (!templateSourceSnapshot) return;
    const currentIdentity = glossaryIdentityKey(selectedCat, selectedItem, selectedFind, selectedRec);
    if (currentIdentity !== templateSourceSnapshot.sourceIdentityKey) {
      setTemplateSourceSnapshot(null);
    }
  }, [templateSourceSnapshot, selectedCat, selectedItem, selectedFind, selectedRec]);

  const handleRevertTemplateSource = () => {
    if (!templateSourceSnapshot) return;
    setSelectedGlossarySetId(templateSourceSnapshot.sourceGlossarySetId);
    onReplaceStagedStandards?.({
      finding: [...templateSourceSnapshot.sourceFindingStds],
      rec: [...templateSourceSnapshot.sourceRecStds],
      glossary: [...templateSourceSnapshot.sourceGlosStds],
    });
    onSelectionChange({
      ...selections,
      editingGlossaryId: templateSourceSnapshot.sourceEditingGlossaryId || '',
    });
    setTemplateSourceSnapshot(null);
    setLibraryGlossaryContextMismatch(false);
  };

  const handlePrepareTargetSetRecords = async () => {
    if (isPreparingTargetSetRecords) return;
    if (!selectedCat || !selectedItem || !selectedFind || !selectedRec) {
      toast.error('Select Category, Item, Finding, and Recommendation first.');
      return;
    }
    const targetSet = glossarySetById(selectedGlossarySetId);
    if (!targetSet) {
      toast.error('Select a target Glossary Set first.');
      return;
    }

    const sourceFinding = findings.find(
      (f: any) =>
        String(f.id || f.fldFindID || '').toLowerCase().trim() ===
        String(selectedFind || '').toLowerCase().trim()
    );
    const sourceRec = masterRecsSource.find(
      (r: any) =>
        String(r.id || r.fldRecID || '').toLowerCase().trim() ===
        String(selectedRec || '').toLowerCase().trim()
    );
    if (!sourceFinding || !sourceRec) {
      toast.error('Source Finding/Recommendation not found.');
      return;
    }

    const sourceSetId = String(templateSourceSnapshot?.sourceGlossarySetId || '').trim();
    const sourceFindShortN = normalizeForDeterministicMatch(sourceFinding.fldFindShort);
    const sourceFindLongN = normalizeForDeterministicMatch(sourceFinding.fldFindLong);
    const sourceRecShortN = normalizeForDeterministicMatch(sourceRec.fldRecShort);
    const sourceRecLongN = normalizeForDeterministicMatch(sourceRec.fldRecLong);
    const sourceRecItem = String(sourceRec.fldItem || '').trim();

    const findingMatches = (Array.isArray(findings) ? findings : []).filter((f: any) => {
      const setKey = normalizeGlossaryRecordSetKey(f.fldGlossarySetId);
      if (setKey !== targetSet.id) return false;
      if (String(f.fldItem || '').toLowerCase().trim() !== String(selectedItem || '').toLowerCase().trim()) return false;
      return (
        normalizeForDeterministicMatch(f.fldFindShort) === sourceFindShortN &&
        normalizeForDeterministicMatch(f.fldFindLong) === sourceFindLongN
      );
    });
    const recMatches = (Array.isArray(masterRecsSource) ? masterRecsSource : []).filter((r: any) => {
      const setKey = normalizeGlossaryRecordSetKey(r.fldGlossarySetId);
      if (setKey !== targetSet.id) return false;
      if (sourceRecItem) {
        if (String(r.fldItem || '').toLowerCase().trim() !== sourceRecItem.toLowerCase().trim()) return false;
      }
      return (
        normalizeForDeterministicMatch(r.fldRecShort) === sourceRecShortN &&
        normalizeForDeterministicMatch(r.fldRecLong) === sourceRecLongN
      );
    });

    if (findingMatches.length > 1) {
      toast.error('Multiple target-set Finding text matches found. Resolve manually.');
      return;
    }
    if (recMatches.length > 1) {
      toast.error('Multiple target-set Recommendation text matches found. Resolve manually.');
      return;
    }

    setIsPreparingTargetSetRecords(true);
    try {
      const copiedAt = new Date().toISOString();
      let targetFindingId = String(findingMatches[0]?.id || findingMatches[0]?.fldFindID || '').trim();
      let targetRecId = String(recMatches[0]?.id || recMatches[0]?.fldRecID || '').trim();

      if (!targetFindingId) {
        targetFindingId = uuidv4();
        const findingPayload = sanitizeData({
          fldFindID: targetFindingId,
          fldItem: selectedItem,
          fldFindShort: sourceFinding.fldFindShort || '',
          fldFindLong: sourceFinding.fldFindLong || '',
          fldOrder: sourceFinding.fldOrder ?? 999,
          fldMeasurementType: sourceFinding.fldMeasurementType || '',
          fldUnitType: sourceFinding.fldUnitType || '',
          fldSuggestedRecs: [],
          fldStandards: [],
          fldGlossarySetId: targetSet.id,
          fldGlossarySetName: targetSet.name,
          fldStandardType: targetSet.standardType,
          fldStandardVersion: targetSet.standardVersion,
          fldSourceFindingId: String(sourceFinding.id || sourceFinding.fldFindID || '').trim(),
          fldSourceGlossarySetId: sourceSetId || null,
          fldSourceCopiedAt: copiedAt,
        });
        await firestoreService.save('findings', findingPayload, targetFindingId);
        toast.success(`Created target-set Finding (${targetSet.name})`);
      } else {
        toast.success(`Reused existing target-set Finding (${targetSet.name})`);
      }

      if (!targetRecId) {
        targetRecId = uuidv4();
        const recPayload = sanitizeData({
          fldRecID: targetRecId,
          fldRecShort: sourceRec.fldRecShort || '',
          fldRecLong: sourceRec.fldRecLong || '',
          fldOrder: sourceRec.fldOrder ?? 999,
          fldUnit: Number(sourceRec.fldUnit) || 0,
          fldUOM: sourceRec.fldUOM || 'EA',
          ...(sourceRecItem ? { fldItem: sourceRecItem } : {}),
          fldStandards: [],
          fldGlossarySetId: targetSet.id,
          fldGlossarySetName: targetSet.name,
          fldStandardType: targetSet.standardType,
          fldStandardVersion: targetSet.standardVersion,
          fldSourceRecommendationId: String(sourceRec.id || sourceRec.fldRecID || '').trim(),
          fldSourceGlossarySetId: sourceSetId || null,
          fldSourceCopiedAt: copiedAt,
        });
        await firestoreService.masterRecommendations.save(recPayload, targetRecId);
        toast.success(`Created target-set Recommendation (${targetSet.name})`);
      } else {
        toast.success(`Reused existing target-set Recommendation (${targetSet.name})`);
      }

      const targetFinding = findingMatches[0] || findings.find(
        (f: any) =>
          String(f.id || f.fldFindID || '').toLowerCase().trim() === targetFindingId.toLowerCase().trim()
      );
      const targetRec = recMatches[0] || masterRecsSource.find(
        (r: any) =>
          String(r.id || r.fldRecID || '').toLowerCase().trim() === targetRecId.toLowerCase().trim()
      );

      onSelectionChange({
        ...selections,
        selectedFind: targetFindingId,
        selectedRec: targetRecId,
        editingGlossaryId: '',
        stagedFindShort: targetFinding?.fldFindShort || sourceFinding.fldFindShort || '',
        stagedFindLong: targetFinding?.fldFindLong || sourceFinding.fldFindLong || '',
        stagedRecShort: targetRec?.fldRecShort || sourceRec.fldRecShort || '',
        stagedRecLong: targetRec?.fldRecLong || sourceRec.fldRecLong || '',
        isDirty: false,
      });

      onReplaceStagedStandards?.({
        finding: findingMatches[0] ? normalizeStringArray(findingMatches[0].fldStandards) : [],
        rec: recMatches[0] ? normalizeStringArray(recMatches[0].fldStandards) : [],
        glossary: [],
      });
    } catch (error) {
      console.error('Prepare target-set records error:', error);
      toast.error('Failed to prepare target-set records');
    } finally {
      setIsPreparingTargetSetRecords(false);
    }
  };

  const normalizeStringArray = (value: any): string[] => {
    if (!value) return [];

    const rawValues = Array.isArray(value)
      ? value
      : typeof value === 'object'
        ? Object.values(value)
        : [value];

    return Array.from(
      new Set(
        rawValues
          .filter(Boolean)
          .map(v => String(v).trim())
          .filter(Boolean)
      )
    );
  };

  const setSelectedCat = (val: string) => {
    if (val === selections.selectedCat) return;
    const newS = { ...selections, selectedCat: val, selectedItem: '', selectedFind: '', selectedRec: '' };
    onSelectionChange(newS);
    updatePreferences({ glossaryBuilderSelections: newS });
  };
  const setSelectedItem = (val: string) => {
    if (val === selections.selectedItem) return;
    const newS = { ...selections, selectedItem: val, selectedFind: '', selectedRec: '' };
    onSelectionChange(newS);
    updatePreferences({ glossaryBuilderSelections: newS });
  };
  const setSelectedFind = (val: string) => {
    if (val === selections.selectedFind) return;
    isUpdatingRef.current = true;
    const matchedFinding = findings?.find(f => (f.id || f.fldFindID) === val);
    const newS = { 
      ...selections, 
      selectedFind: val, 
      selectedRec: '',
      stagedFindShort: matchedFinding?.fldFindShort || "",
      stagedFindLong: matchedFinding?.fldFindLong || "",
      isDirty: false // Reset dirty when intentionally switching finding
    };
    onSelectionChange(newS);
    updatePreferences({ glossaryBuilderSelections: newS });
    setTimeout(() => { isUpdatingRef.current = false; }, 500);
  };
  const setSelectedRec = (val: string) => {
    if (val === selections.selectedRec) return;
    isUpdatingRef.current = true;
    const matchedRec = masterRecsSource?.find(r => (r.id || r.fldRecID) === val);
    onSelectionChange((prev: any) => {
      const newS = {
        ...prev,
        selectedRec: val,
        stagedRecShort: matchedRec?.fldRecShort || '',
        stagedRecLong: matchedRec?.fldRecLong || '',
        isDirty: false
      };
      updatePreferences({ glossaryBuilderSelections: newS });
      return newS;
    });
    setTimeout(() => { isUpdatingRef.current = false; }, 500);
  };

  // Sync glossary overrides to selections when combination + glossary set changes (5-tuple product model).
  useEffect(() => {
    if (!selectedCat || !selectedItem || !selectedFind || !selectedRec) {
      setLibraryGlossaryContextMismatch(false);
      return;
    }
    if (selections.isDirty) return;

    const pendingActivation = pendingRelatedActivationRef.current;
    if (
      pendingActivation?.kind === 'same_find_new_rec' &&
      pendingMatchesSameFindNewRecContext(pendingActivation, selectedCat, selectedItem, selectedFind)
    ) {
      const propRec = String(selectedRec || '').trim().toLowerCase();
      const propGlos = String(selections.editingGlossaryId || '').trim().toLowerCase();
      const sourceRec = String(pendingActivation.sourceRecId || '').trim().toLowerCase();
      const newRec = String(pendingActivation.newRecId || '').trim().toLowerCase();
      const newGlos = String(pendingActivation.glosId || '').trim().toLowerCase();

      if (propRec === sourceRec) {
        return;
      }

      if (propRec === newRec) {
        if (propGlos !== newGlos) {
          onSelectionChange((prev: any) => ({
            ...prev,
            selectedRec: pendingActivation.newRecId,
            editingGlossaryId: pendingActivation.glosId,
            isDirty: false
          }));
          return;
        }
        pendingRelatedActivationRef.current = null;
      } else {
        return;
      }
    }

    if (
      pendingActivation?.kind === 'new_find_same_rec' &&
      pendingMatchesNewFindSameRecContext(
        pendingActivation,
        selectedCat,
        selectedItem,
        selectedRec,
        selectedGlossarySetId
      )
    ) {
      const propFind = String(selectedFind || '').trim().toLowerCase();
      const propGlos = String(selections.editingGlossaryId || '').trim().toLowerCase();
      const sourceFind = String(pendingActivation.sourceFindId || '').trim().toLowerCase();
      const newFind = String(pendingActivation.newFindId || '').trim().toLowerCase();
      const newGlos = String(pendingActivation.glosId || '').trim().toLowerCase();

      if (propFind === sourceFind) {
        return;
      }

      if (propFind === newFind) {
        if (propGlos !== newGlos) {
          onSelectionChange((prev: any) => ({
            ...prev,
            selectedFind: pendingActivation.newFindId,
            editingGlossaryId: pendingActivation.glosId,
            isDirty: false
          }));
          return;
        }
        pendingRelatedActivationRef.current = null;
      } else {
        return;
      }
    }

    if (
      pendingActivation?.kind === 'new_find_new_rec' &&
      pendingMatchesNewFindNewRecContext(
        pendingActivation,
        selectedCat,
        selectedItem,
        selectedGlossarySetId
      )
    ) {
      const propFind = String(selectedFind || '').trim().toLowerCase();
      const propRec = String(selectedRec || '').trim().toLowerCase();
      const propGlos = String(selections.editingGlossaryId || '').trim().toLowerCase();
      const sourceFind = String(pendingActivation.sourceFindId || '').trim().toLowerCase();
      const sourceRec = String(pendingActivation.sourceRecId || '').trim().toLowerCase();
      const newFind = String(pendingActivation.newFindId || '').trim().toLowerCase();
      const newRec = String(pendingActivation.newRecId || '').trim().toLowerCase();
      const newGlos = String(pendingActivation.glosId || '').trim().toLowerCase();

      if (propFind === sourceFind || propRec === sourceRec) {
        return;
      }

      if (propFind === newFind && propRec === newRec) {
        if (propGlos !== newGlos) {
          onSelectionChange((prev: any) => ({
            ...prev,
            selectedFind: pendingActivation.newFindId,
            selectedRec: pendingActivation.newRecId,
            editingGlossaryId: pendingActivation.glosId,
            isDirty: false
          }));
          return;
        }
        pendingRelatedActivationRef.current = null;
      } else {
        return;
      }
    }

    /** User-selected set in dropdown; '' = Unassigned/Legacy. */
    const selectedSetKeyUi = normalizeGlossaryRecordSetKey(selectedGlossarySetId);

    const resolved = resolveSyncedGlossaryRow(
      glossary || [],
      selectedGlossarySetId,
      selections.editingGlossaryId,
      selectedCat,
      selectedItem,
      selectedFind,
      selectedRec
    );
    const otherSetRows = filterGlossaryFourTupleOtherSets(
      glossary || [],
      selectedCat,
      selectedItem,
      selectedFind,
      selectedRec,
      selectedSetKeyUi
    );

    const matchedFinding = findings?.find(f =>
      String(f.id || f.fldFindID || '').toLowerCase().trim() === String(selectedFind || '').toLowerCase().trim()
    );
    const matchedRec = masterRecsSource?.find(r =>
      String(r.id || r.fldRecID || '').toLowerCase().trim() === String(selectedRec || '').toLowerCase().trim()
    );

    if (resolved) {
      if (templateSourceSnapshot) {
        setTemplateSourceSnapshot(null);
      }
      setLibraryGlossaryContextMismatch(false);
      setSelectedGlossarySetId(normalizeGlossaryRecordSetKey(resolved.fldGlossarySetId));
      const exactFindId = String(resolved.fldFind || '').trim();
      const exactRecId = String(resolved.fldRec || resolved.fldRecID || '').trim();

      const resolvedGlosId = String(resolved.fldGlosId || resolved.id || '').trim();
      const contextRec = String(selectedRec || '').trim().toLowerCase();
      const resolvedRec = exactRecId.toLowerCase();
      const recMismatch =
        Boolean(contextRec && resolvedRec && contextRec !== resolvedRec);
      const pendingNow = pendingRelatedActivationRef.current;
      const pendingBlocksSourceWrite =
        Boolean(
          pendingNow?.kind === 'same_find_new_rec' &&
            pendingMatchesSameFindNewRecContext(pendingNow, selectedCat, selectedItem, selectedFind) &&
            resolvedRec === String(pendingNow.sourceRecId || '').trim().toLowerCase()
        ) ||
        Boolean(
          pendingNow?.kind === 'new_find_same_rec' &&
            pendingMatchesNewFindSameRecContext(
              pendingNow,
              selectedCat,
              selectedItem,
              selectedRec,
              selectedSetKeyUi
            ) &&
            exactFindId.toLowerCase() === String(pendingNow.sourceFindId || '').trim().toLowerCase()
        ) ||
        Boolean(
          pendingNow?.kind === 'new_find_new_rec' &&
            pendingMatchesNewFindNewRecContext(
              pendingNow,
              selectedCat,
              selectedItem,
              selectedSetKeyUi
            ) &&
            exactFindId.toLowerCase() === String(pendingNow.sourceFindId || '').trim().toLowerCase() &&
            resolvedRec === String(pendingNow.sourceRecId || '').trim().toLowerCase()
        );

      if (recMismatch || pendingBlocksSourceWrite) {
        return;
      }

      onSelectionChange((prev: any) => ({
        ...prev,
        selectedFind: exactFindId || prev.selectedFind,
        selectedRec: exactRecId || prev.selectedRec,
        fldUnitCost: resolved.fldUnitCost ?? undefined,
        fldUnitType: resolved.fldUnitType ?? undefined,
        stagedFindShort: matchedFinding?.fldFindShort || '',
        stagedFindLong: matchedFinding?.fldFindLong || '',
        stagedRecShort: matchedRec?.fldRecShort || '',
        stagedRecLong: matchedRec?.fldRecLong || '',
        editingGlossaryId: resolvedGlosId || prev.editingGlossaryId || '',
        images: resolved.fldImages || [],
        isDirty: false
      }));
      return;
    }

    if (otherSetRows.length > 0) {
      const templateRow = otherSetRows[0];
      const resolveLibSetId = (raw: string | undefined) => {
        const t = String(raw || '').trim();
        if (!t) return '';
        return glossarySetById(t)?.id || t;
      };
      const fCanon = resolveLibSetId(matchedFinding?.fldGlossarySetId);
      const rCanon = resolveLibSetId(matchedRec?.fldGlossarySetId);
      const fKey = fCanon.toLowerCase();
      const rKey = rCanon.toLowerCase();
      let mismatch = false;
      if (fKey && rKey && fKey !== rKey) {
        mismatch = true;
      }
      setLibraryGlossaryContextMismatch(mismatch);

      onSelectionChange((prev: any) => ({
        ...prev,
        fldUnitCost: undefined,
        fldUnitType: undefined,
        stagedFindShort: matchedFinding?.fldFindShort || '',
        stagedFindLong: matchedFinding?.fldFindLong || '',
        stagedRecShort: matchedRec?.fldRecShort || '',
        stagedRecLong: matchedRec?.fldRecLong || '',
        editingGlossaryId: '',
        images: Array.isArray(templateRow?.fldImages) ? templateRow.fldImages : [],
        isDirty: false
      }));
      return;
    }

    const resolveLibSetId = (raw: string | undefined) => {
      const t = String(raw || '').trim();
      if (!t) return '';
      return glossarySetById(t)?.id || t;
    };
    const fCanon = resolveLibSetId(matchedFinding?.fldGlossarySetId);
    const rCanon = resolveLibSetId(matchedRec?.fldGlossarySetId);
    const fKey = fCanon.toLowerCase();
    const rKey = rCanon.toLowerCase();
    let nextId = '';
    let mismatch = false;
    if (fKey && rKey && fKey !== rKey) {
      mismatch = true;
      nextId = fCanon;
    } else if (fKey) {
      nextId = fCanon;
    } else if (rKey) {
      nextId = rCanon;
    }
    setSelectedGlossarySetId(nextId);
    setLibraryGlossaryContextMismatch(mismatch);

    onSelectionChange((prev: any) => ({
      ...prev,
      fldUnitCost: undefined,
      fldUnitType: undefined,
      stagedFindShort: matchedFinding?.fldFindShort || '',
      stagedFindLong: matchedFinding?.fldFindLong || '',
      stagedRecShort: matchedRec?.fldRecShort || '',
      stagedRecLong: matchedRec?.fldRecLong || '',
      editingGlossaryId: '',
      images: [],
      isDirty: false
    }));
  }, [
    selectedCat,
    selectedItem,
    selectedFind,
    selectedRec,
    selectedGlossarySetId,
    glossary,
    findings,
    masterRecommendations,
    selections.isDirty,
    selections.editingGlossaryId
  ]);

  const [newType, setNewType] = useState<'category' | 'item' | 'finding' | 'recommendation' | 'glossary_record' | 'link_recommendation' | null>(null);

  const [formData, setFormData] = useState({
    catName: '', catOrder: '', itemName: '', itemOrder: '', findShort: '', findLong: '', findOrder: '', fldUnitType: '', recShort: '', recLong: '', recOrder: '', unit: '', uom: '',
    fldUnitCostOverride: '', fldUnitTypeOverride: ''
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [relatedRecordModalOpen, setRelatedRecordModalOpen] = useState(false);
  const relatedRecordModalCloseRef = useRef<HTMLButtonElement>(null);
  const [relatedRecordScenario, setRelatedRecordScenario] = useState<RelatedRecordScenarioId | null>(null);
  const [relatedNewRecShort, setRelatedNewRecShort] = useState('');
  const [relatedNewRecLong, setRelatedNewRecLong] = useState('');
  const [relatedNewRecUnit, setRelatedNewRecUnit] = useState('0');
  const [relatedNewRecUom, setRelatedNewRecUom] = useState('EA');
  const [relatedNewFindShort, setRelatedNewFindShort] = useState('');
  const [relatedNewFindLong, setRelatedNewFindLong] = useState('');
  const [relatedRecordSaving, setRelatedRecordSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string, collection: string, label: string, type: 'delete' | 'unassociate', isAssociated?: boolean } | null>(null);

  const handleDeleteAction = async () => {
    if (!confirmDelete) return;
    try {
      if (confirmDelete.type === 'delete') {
        await firestoreService.delete(confirmDelete.collection, confirmDelete.id);
        if (confirmDelete.collection === 'categories') setSelectedCat('');
        if (confirmDelete.collection === 'items') setSelectedItem('');
        if (confirmDelete.collection === 'findings') setSelectedFind('');
        if (confirmDelete.collection === 'recommendations') setSelectedRec('');
        if (confirmDelete.collection === 'glossary') {
          onSelectionChange({
            ...selections,
            selectedItem: '',
            selectedFind: '',
            selectedRec: '',
            images: [],
            isDirty: false
          });
        }
      } else {
        const field = confirmDelete.collection === 'items' ? 'fldCatID' : 
                      confirmDelete.collection === 'findings' ? 'fldItem' : 'fldFind';
        await firestoreService.save(confirmDelete.collection, { [field]: '' }, confirmDelete.id);
        if (confirmDelete.collection === 'items') setSelectedItem('');
        if (confirmDelete.collection === 'findings') setSelectedFind('');
        if (confirmDelete.collection === 'recommendations') setSelectedRec('');
      }
      setConfirmDelete(null);
      toast.success('Action completed successfully.');
    } catch (error) {
      console.error('Error in delete action:', error);
      toast.error('Error performing action.');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    isUpdatingRef.current = true;
    const loadingToast = toast.loading('Compressing and uploading images...');
    const uploadPromises = Array.from(files).map(async (file) => {
      if (images.length >= 4) return null;
      const storageRef = ref(storage, `images/master/${Date.now()}_${file.name}`);
      try {
        const resizedBase64 = await resizeImage(file, 1600, 1600);
        const snapshot = await uploadString(storageRef, resizedBase64, 'data_url');
        const url = await getDownloadURL(snapshot.ref);
        return url;
      } catch (error) {
        console.error('Error uploading image (master):', error);
        toast.error(`Failed to upload ${file.name}`);
        return null;
      }
    });
    const urls = await Promise.all(uploadPromises);
    toast.dismiss(loadingToast);
    const validUrls = urls.filter((url): url is string => url !== null);
    setImages(prev => [...prev, ...validUrls].slice(0, 4));
    if (e.target) e.target.value = '';
    setTimeout(() => { isUpdatingRef.current = false; }, 1000);
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeStandard = (type: 'finding' | 'recommendation' | 'glossary', standardId: string) => {
    if (onRemoveStandard) {
      onRemoveStandard(type, standardId);
    }
  };

  const handleDropStandard = async (e: React.DragEvent, type: 'finding' | 'recommendation' | 'glossary') => {
    e.preventDefault();
    const standardId = e.dataTransfer.getData('standardId');
    if (!standardId) return;

    if (onAddStandard) {
      const standard = standards.find(s => s.id === standardId);
      if (standard) {
        onAddStandard(standard, type);
      }
    }
  };

  const images = Array.isArray(selections.images) ? selections.images : [];
  const setImages = (val: string[] | ((prev: string[]) => string[]), markDirty = true) => {
    const next = typeof val === 'function' ? val(images) : val;
    onSelectionChange({ ...selections, images: next, isDirty: markDirty });
  };

  const isDirty = selections.isDirty || false;
  const setIsDirty = (val: boolean | ((prev: boolean) => boolean)) => {
    const next = typeof val === 'function' ? val(isDirty) : val;
    onSelectionChange({ ...selections, isDirty: next });
  };

  const filteredItems = items.filter((i: any) => i.fldCatID === selectedCat);

  const categorySelectOptions = useMemo(() => {
    const seen = new Set<string>();
    const filtered = (Array.isArray(categories) ? [...categories] : []).filter((c: any) => {
      const id = c.fldCategoryID;
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
    return sortEntities(filtered, 'fldCategoryName').map((c: any) => ({
      value: c.fldCategoryID,
      label: c.fldCategoryName,
    }));
  }, [categories]);

  const itemSelectOptions = useMemo(() => {
    const seen = new Set<string>();
    const filtered = (Array.isArray(filteredItems) ? [...filteredItems] : []).filter((i: any) => {
      const id = i.fldItemID;
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
    return sortEntities(filtered, 'fldItemName').map((i: any) => ({
      value: i.fldItemID,
      label: i.fldItemName,
    }));
  }, [filteredItems]);

  const handleAddNew = async () => {
    if (!selectedCat || !selectedItem || !selectedFind || !selectedRec) {
      toast.error('Please select Category, Item, Finding, and Recommendation');
      return;
    }

    try {
      setIsSynced(false);
      const matchedRec = masterRecsSource?.find(r => (r.id || r.fldRecID || "").toLowerCase().trim() === (selectedRec || "").toLowerCase().trim());
      
      // COMMIT STAGED CHANGES TO MASTER LIBRARY
      if (selectedFind) {
        const finding = findings.find(f => (f.id || f.fldFindID) === selectedFind);
        if (finding) {
          const findingPayload = sanitizeData({ 
            fldStandards: normalizeStringArray(stagedFindingStds),
            fldFindShort: draftFindShort,
            fldFindLong: draftFindLong
          });
          await firestoreService.save('findings', findingPayload, finding.fldFindID);
        }
      }

      if (selectedRec) {
        const recommendation = masterRecsSource.find(r => (r.id || r.fldRecID) === selectedRec);
        if (recommendation) {
          const recPayload = sanitizeData({ 
            fldStandards: normalizeStringArray(stagedRecStds),
            fldRecShort: draftRecShort,
            fldRecLong: draftRecLong
          });
          await firestoreService.masterRecommendations.save(recPayload, recommendation.fldRecID);
        }
      }

      const payload: any = { 
        fldCat: selectedCat,
        fldItem: selectedItem,
        fldFind: selectedFind,
        fldRec: selectedRec,
        ...glossarySetMetadataForId(selectedGlossarySetId),
        fldImages: images,
        fldUnitCost: selections.fldUnitCost !== undefined ? selections.fldUnitCost : null,
        fldUnitType: selections.fldUnitType !== undefined ? selections.fldUnitType : null,
        fldStandards: normalizeStringArray(stagedGlosStds)
      };

      const glossaryRowNow = resolveSyncedGlossaryRow(
        glossary || [],
        selectedGlossarySetId,
        selections.editingGlossaryId,
        selectedCat,
        selectedItem,
        selectedFind,
        selectedRec
      );
      const updateId = glossaryRowNow
        ? String(glossaryRowNow.fldGlosId || glossaryRowNow.id || '').trim()
        : '';

      if (updateId) {
        await firestoreService.glossary.save(sanitizeData(payload), updateId);
        toast.success('Glossary record and master citations updated!');
      } else {
        const glosId = uuidv4();
        const newGlos = sanitizeData({
          ...payload,
          fldGlosId: glosId
        });
        await firestoreService.glossary.save(newGlos, glosId);
        toast.success('Glossary record created and master citations committed!');
      }
      setIsDirty(false);
      libraryDirtySyncedToAppRef.current = false;
      libraryDraftByIdentity.delete(libraryDraftHydrationKey);
      onSelectionChange({ 
        ...selections, 
        selectedItem: '', 
        selectedFind: '', 
        selectedRec: '', 
        editingGlossaryId: '',
        images: [], 
        isDirty: false 
      });
    } catch (error) {
      const glossaryRowForErr = resolveSyncedGlossaryRow(
        glossary || [],
        selectedGlossarySetId,
        selections.editingGlossaryId,
        selectedCat,
        selectedItem,
        selectedFind,
        selectedRec
      );
      handleFirestoreError(
        error,
        glossaryRowForErr ? OperationType.UPDATE : OperationType.CREATE,
        'glossary'
      );
    }
  };

  const handleClearAll = () => {
    libraryDraftByIdentity.delete(libraryDraftHydrationKey);
    setDraftFindShort('');
    setDraftFindLong('');
    setDraftRecShort('');
    setDraftRecLong('');
    libraryDirtySyncedToAppRef.current = false;
    onSelectionChange({ 
      ...selections, 
      selectedItem: '', 
      selectedFind: '', 
      selectedRec: '', 
      editingGlossaryId: '', 
      images: [], 
      stagedFindShort: '',
      stagedFindLong: '',
      stagedRecShort: '',
      stagedRecLong: '',
      isDirty: false 
    });
  };

  const saveNewGlossaryRecord = async () => {
    if (selectedCat && selectedItem && selectedFind && selectedRec) {
      toast.error(
        'Use + Finding, + Recommendation, Search (link), or change Glossary Set and SAVE RECORD for related rows—not bulk copy here.'
      );
      setNewType(null);
      return;
    }
    try {
      let findId = selectedFind;
      if (!selectedFind) {
        findId = uuidv4();
        const findingPayload = sanitizeData({
          fldFindID: findId, 
          fldItem: selectedItem || '', 
          fldFindShort: formData.findShort || '', 
          fldFindLong: formData.findLong || '', 
          fldOrder: formData.findOrder === '' ? 999 : (parseInt(formData.findOrder) || 999),
          fldUnitType: formData.fldUnitType || '', 
          fldStandards: [],
          fldSuggestedRecs: []
        });
        await firestoreService.save('findings', findingPayload, findId);
      }
      
      const recId = uuidv4();
      const recPayload = sanitizeData({
        fldRecID: recId, 
        fldRecShort: formData.recShort || '', 
        fldRecLong: formData.recLong || '', 
        fldOrder: formData.recOrder === '' ? 999 : (parseInt(formData.recOrder) || 999),
        fldUnit: Number(formData.unit) || 0, 
        fldUOM: formData.uom || 'EA', 
        fldStandards: []
      });
      
      // ✅ DECIDED: Write exclusively to master_recommendations
      await firestoreService.masterRecommendations.save(recPayload, recId);
      
      // Link to finding
      const finding = findings?.find(f => String(f.id || f.fldFindID || "").toLowerCase().trim() === String(findId || "").toLowerCase().trim());
      const suggested = [...(Array.isArray(finding?.fldSuggestedRecs) ? finding.fldSuggestedRecs : []), recId];
      await firestoreService.save('findings', { fldSuggestedRecs: suggested }, findId);

      const glosId = uuidv4();
      const matchedFinding = findings?.find(f => String(f.id || f.fldFindID || "").toLowerCase().trim() === String(selectedFind || "").toLowerCase().trim());
      const matchedRec = masterRecsSource?.find(r => (r.id || r.fldRecID || "").toLowerCase().trim() === (selectedRec || "").toLowerCase().trim());
      
      const glosStds = Array.from(new Set([
        ...normalizeStringArray(matchedFinding?.fldStandards),
        ...normalizeStringArray(matchedRec?.fldStandards)
      ]));

      const glossaryPayload = sanitizeData({
        fldGlosId: glosId, 
        ...glossarySetMetadataForId(selectedGlossarySetId),
        fldCat: selectedCat || '', 
        fldItem: selectedItem || '', 
        fldFind: findId || '', 
        fldRec: recId || '', 
        fldImages: images || [], 
        fldStandards: glosStds
      });
      await firestoreService.save('glossary', glossaryPayload, glosId);
      
      onSelectionChange({ ...selections, selectedItem: selectedItem, selectedFind: findId, selectedRec: recId, images: images || [], isDirty: false });
      setNewType(null);
      toast.success('Glossary record created!');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'glossary');
    }
  };

  const saveNewCategory = async () => {
    try {
      const id = editingId || uuidv4();
      // FORCE the payload structure to be literal
      const payload = { 
        fldCategoryID: id, 
        fldCategoryName: formData.catName, 
        fldOrder: formData.catOrder === '' ? 999 : Number(formData.catOrder) 
      };
      
      // Use direct firestoreService call
      const result = await firestoreService.save('categories', payload, id);
      
      setNewType(null);
      setEditingId(null);
      setSelectedCat(id);
      toast.success(editingId ? 'Category updated!' : 'Category created!');
    } catch (error) {
      console.error('CRITICAL SAVE ERROR:', error);
      handleFirestoreError(error, editingId ? OperationType.UPDATE : OperationType.CREATE, 'categories');
    }
  };

  const saveNewItem = async () => {
    try {
      const id = editingId || uuidv4();
      const payload = sanitizeData({ fldItemID: id, fldItemName: formData.itemName, fldCatID: selectedCat, fldOrder: formData.itemOrder === '' ? 999 : Number(formData.itemOrder) });
      await firestoreService.save('items', payload, id);
      setNewType(null);
      setEditingId(null);
      setSelectedItem(id);
      toast.success(editingId ? 'Item updated!' : 'Item created!');
    } catch (error) {
      handleFirestoreError(error, editingId ? OperationType.UPDATE : OperationType.CREATE, 'items');
    }
  };

  const saveNewFinding = async () => {
    try {
      const id = editingId || uuidv4();
      const payload = sanitizeData({ 
        fldFindID: id, 
        fldItem: selectedItem, 
        fldFindShort: formData.findShort, 
        fldFindLong: formData.findLong, 
        fldOrder: formData.findOrder === '' ? 999 : Number(formData.findOrder),
        fldUnitType: formData.fldUnitType,
        fldSuggestedRecs: (() => {
          const raw = editingId ? (findings?.find(f => String(f.id || f.fldFindID || "").toLowerCase().trim() === String(id || "").toLowerCase().trim())?.fldSuggestedRecs) : [];
          if (Array.isArray(raw)) return raw;
          if (raw === undefined || raw === null || raw === '') return [];
          return [raw];
        })(),
        fldStandards: editingId ? normalizeStringArray(findings?.find(f => String(f.id || f.fldFindID || "").toLowerCase().trim() === String(id || "").toLowerCase().trim())?.fldStandards) : []
      });
      await firestoreService.save('findings', payload, id);
      setNewType(null);
      setEditingId(null);
      setSelectedFind(id);
      toast.success(editingId ? 'Finding updated!' : 'Finding created!');
    } catch (error) {
      handleFirestoreError(error, editingId ? OperationType.UPDATE : OperationType.CREATE, 'findings');
    }
  };

  const saveNewRecommendation = async () => {
    if (!formData.recShort.trim()) {
      toast.error("Title cannot be blank");
      return;
    }
    try {
      const id = editingId || uuidv4();
      const payload = sanitizeData({ 
        fldRecID: id, 
        fldRecShort: formData.recShort, 
        fldRecLong: formData.recLong, 
        fldOrder: formData.recOrder === '' ? 999 : (parseInt(formData.recOrder) || 999),
        fldUnit: Number(formData.unit) || 0, 
        fldUOM: formData.uom,
        fldStandards: editingId ? normalizeStringArray(masterRecommendations?.find(r => (r.id || r.fldRecID || "").toLowerCase().trim() === (id || "").toLowerCase().trim())?.fldStandards) : []
      });
      
      await firestoreService.masterRecommendations.save(payload, id);
      
      if (!editingId && selectedFind) {
        const finding = findings.find(f => String(f.id || f.fldFindID || "").toLowerCase().trim() === String(selectedFind || "").toLowerCase().trim());
        if (finding) {
          const suggested = [...(Array.isArray(finding.fldSuggestedRecs) ? finding.fldSuggestedRecs : []), id];
          await firestoreService.save('findings', { fldSuggestedRecs: suggested }, selectedFind);
        }
      }

      setNewType(null);
      setEditingId(null);
      setSelectedRec(id);
      toast.success(editingId ? 'Master Recommendation updated!' : 'New Master Recommendation created!');
    } catch (error) {
      handleFirestoreError(error, editingId ? OperationType.UPDATE : OperationType.CREATE, 'recommendations');
    }
  };

  const handleUpdateFinding = async (findId: string, updates: any) => {
    const sanitizedUpdates = { ...updates };

    if ('fldSuggestedRecs' in sanitizedUpdates) {
      const value = sanitizedUpdates.fldSuggestedRecs;

      if (Array.isArray(value)) {
        sanitizedUpdates.fldSuggestedRecs = value;
      } else if (value === undefined || value === null || value === '') {
        sanitizedUpdates.fldSuggestedRecs = [];
      } else {
        sanitizedUpdates.fldSuggestedRecs = [value];
      }
    }

    try {
      await firestoreService.save('findings', sanitizedUpdates, findId);
      setFindings(prev =>
        prev.map(f =>
          String(f.id || f.fldFindID || '').toLowerCase().trim() === String(findId || '').toLowerCase().trim()
            ? { ...f, ...sanitizedUpdates }
            : f
        )
      );
    } catch (error) {
      console.error('Update Finding Error:', error);
      handleFirestoreError(error, OperationType.UPDATE, `findings/${findId}`);
    }
  };

  const handleLinkRecommendation = async (recId: string) => {
    if (!selectedFind) {
      toast.error('No finding selected to link to.');
      return;
    }
    if (!recId) {
      toast.error('Invalid recommendation selected.');
      return;
    }
    try {
      const finding = findings.find(f => String(f.id || f.fldFindID || '').trim() === String(selectedFind || '').trim());
      if (finding) {
        const rawSuggested = finding.fldSuggestedRecs;
        let currentSuggested: string[] = [];

        if (Array.isArray(rawSuggested)) {
          currentSuggested = rawSuggested;
        } else if (rawSuggested !== undefined && rawSuggested !== null && rawSuggested !== '') {
          currentSuggested = [rawSuggested];
        }

        if (!currentSuggested.includes(recId)) {
          const suggested = [...currentSuggested, recId];
          await handleUpdateFinding(selectedFind, { fldSuggestedRecs: suggested });
          setSelectedRec(recId);
          toast.success('Recommendation linked to finding');
        } else {
          toast.info('Already linked');
        }
      } else {
        toast.error('Finding not found in local state.');
      }
      setNewType(null);
    } catch (error) {
      console.error('Link Recommendation Error:', error);
      handleFirestoreError(error, OperationType.UPDATE, `findings/${selectedFind}`);
    }
  };

  const handleUnlinkSuggestion = async (findId: string, recId: string) => {
    const finding = findings.find(f => (f.id || f.fldFindID) === findId);
    if (!finding) return;

    // ARCHIE'S LAW: Explicit array enforcement for unlinking
    const rawRecs = finding.fldSuggestedRecs;
    let currentRecs: string[] = [];
    
    if (Array.isArray(rawRecs)) {
      currentRecs = rawRecs;
    } else if (rawRecs !== undefined && rawRecs !== null && rawRecs !== '') {
      currentRecs = [rawRecs];
    }

    const updatedRecs = currentRecs.filter(id => String(id).trim() !== String(recId).trim());

    try {
      await handleUpdateFinding(findId, { fldSuggestedRecs: updatedRecs });
      if (selectedRec === recId) setSelectedRec('');
      toast.success("Suggestion removed from Finding library.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to remove suggestion.");
    }
  };
  
  const handleDuplicateRecommendation = (rec: any) => {
    setEditingId(null);
    setFormData({
      ...formData,
      recShort: rec.fldRecShort + ' (Copy)',
      recLong: rec.fldRecLong,
      unit: rec.fldUnit?.toString() || '0',
      uom: rec.fldUOM || 'EA'
    });
    setNewType('recommendation');
  };

  const openEdit = (type: 'category' | 'item' | 'finding' | 'recommendation') => {
    if (type === 'category' && selectedCat) {
      const c = categories.find((c: any) => (c.id || c.fldCategoryID) === selectedCat);
      if (c) {
        setFormData({ ...formData, catName: c.fldCategoryName, catOrder: c.fldOrder?.toString() || '' });
        setEditingId(selectedCat);
      }
    } else if (type === 'item' && selectedItem) {
      const i = items.find((i: any) => (i.id || i.fldItemID) === selectedItem);
      if (i) {
        setFormData({ ...formData, itemName: i.fldItemName, itemOrder: i.fldOrder?.toString() || '' });
        setEditingId(selectedItem);
      }
    } else if (type === 'finding' && selectedFind) {
      const f = findings.find((f: any) => (f.id || f.fldFindID) === selectedFind);
      if (f) {
        setFormData({ ...formData, findShort: f.fldFindShort, findLong: f.fldFindLong, findOrder: f.fldOrder?.toString() || '', fldUnitType: f.fldUnitType || '' });
        setEditingId(selectedFind);
      }
    } else if (type === 'recommendation' && selectedRec) {
      const r = masterRecsSource.find((r: any) => (r.id || r.fldRecID || "").toLowerCase() === (selectedRec || "").toLowerCase());
      if (r) {
        setFormData({ ...formData, recShort: r.fldRecShort, recLong: r.fldRecLong, recOrder: r.fldOrder?.toString() || '', unit: r.fldUnit?.toString() || '0', uom: r.fldUOM || 'EA' });
        setEditingId(selectedRec);
      }
    }
    setNewType(type);
  };

  const openNewWithTemplate = (type: 'category' | 'item' | 'finding' | 'recommendation') => {
    setEditingId(null);
    if (type === 'category' && selectedCat) {
      const c = categories.find((c: any) => (c.id || c.fldCategoryID) === selectedCat);
      if (c) setFormData({ ...formData, catName: c.fldCategoryName + ' (Copy)', catOrder: (c.fldOrder || 0).toString() });
    } else if (type === 'item' && selectedItem) {
      const i = items.find((i: any) => (i.id || i.fldItemID) === selectedItem);
      if (i) setFormData({ ...formData, itemName: i.fldItemName + ' (Copy)', itemOrder: (i.fldOrder || 0).toString() });
    } else if (type === 'finding' && selectedFind) {
      const f = findings.find((f: any) => (f.id || f.fldFindID) === selectedFind);
      if (f) setFormData({ ...formData, findShort: f.fldFindShort + ' (Copy)', findLong: f.fldFindLong, findOrder: (f.fldOrder || 0).toString(), fldUnitType: f.fldUnitType || '' });
    } else if (type === 'recommendation' && selectedRec) {
      const r = masterRecsSource.find((r: any) => (r.id || r.fldRecID || "").toLowerCase() === (selectedRec || "").toLowerCase());
      if (r) setFormData({ ...formData, recShort: r.fldRecShort + ' (Copy)', recLong: r.fldRecLong, recOrder: (r.fldOrder || 0).toString(), unit: r.fldUnit?.toString() || '0', uom: r.fldUOM || 'EA' });
    } else {
      setFormData({ 
        catName: '', catOrder: '', itemName: '', itemOrder: '', 
        findShort: '', findLong: '', findOrder: '', fldUnitType: '', 
        recShort: '', recLong: '', recOrder: '', 
        unit: '', uom: '',
        fldUnitCostOverride: '', fldUnitTypeOverride: '' 
      });
    }
    setNewType(type);
  };

  const handleAddNewGlossaryFlow = () => {
    const cat = categories?.find((c: any) => String(c.id || c.fldCategoryID || "").toLowerCase().trim() === String(selectedCat || "").toLowerCase().trim());
    const item = items?.find((i: any) => String(i.id || i.fldItemID || "").toLowerCase().trim() === String(selectedItem || "").toLowerCase().trim());
    const find = findings?.find((f: any) => String(f.id || f.fldFindID || "").toLowerCase().trim() === String(selectedFind || "").toLowerCase().trim());
    const rec = masterRecsSource?.find((r: any) => (r.id || r.fldRecID || "").toLowerCase() === (selectedRec || "").toLowerCase());
    
    setFormData({
      catName: cat?.fldCategoryName || '', 
      catOrder: (cat?.fldOrder ?? 999).toString(), 
      itemName: item?.fldItemName || '', 
      itemOrder: (item?.fldOrder ?? 999).toString(), 
      findShort: find?.fldFindShort || '', 
      findLong: find?.fldFindLong || '', 
      findOrder: (find?.fldOrder ?? 999).toString(),
      fldUnitType: find?.fldUnitType || '', 
      recShort: rec?.fldRecShort || '', 
      recLong: rec?.fldRecLong || '', 
      recOrder: (rec?.fldOrder ?? 999).toString(),
      unit: rec?.fldUnit?.toString() || '0', 
      uom: rec?.fldUOM || 'EA',
      fldUnitCostOverride: '',
      fldUnitTypeOverride: ''
    });
    setNewType('glossary_record');
  };

  const glossarySetKeyUi = useMemo(
    () => normalizeGlossaryRecordSetKey(selectedGlossarySetId),
    [selectedGlossarySetId]
  );

  const findingsForSelectedSet = useMemo(() => {
    if (!selectedItem) return [];
    const setKey = glossarySetKeyUi;
    const seen = new Set<string>();
    const acc: Finding[] = [];
    for (const f of findings || []) {
      if (
        String(f.fldItem || '').toLowerCase().trim() !== String(selectedItem || '').toLowerCase().trim()
      ) {
        continue;
      }
      const id = f.fldFindID;
      if (!id || seen.has(id)) continue;
      if (!masterMatchesSelectedGlossarySet(f, setKey)) continue;
      seen.add(id);
      acc.push(f);
    }
    return sortEntities(acc, 'fldFindShort');
  }, [findings, selectedItem, glossarySetKeyUi]);

  const findingsOptionsWithContext = useMemo(() => {
    const base = findingsForSelectedSet.map((f: any) => ({
      value: f.fldFindID,
      label: f.fldFindShort || f.fldFindID,
    }));
    if (!selectedFind) return base;
    const fid = String(selectedFind).toLowerCase().trim();
    if (base.some((o) => String(o.value).toLowerCase().trim() === fid)) return base;
    const current = (findings || []).find(
      (f: any) => String(f.id || f.fldFindID || '').toLowerCase().trim() === fid
    );
    if (!current?.fldFindID) return base;
    const suf = ' (outside selected set)';
    return [
      ...base,
      {
        value: current.fldFindID,
        label: `${String(current.fldFindShort || current.fldFindID).trim()}${suf}`,
      },
    ];
  }, [findingsForSelectedSet, findings, selectedFind]);

  const filteredMasterRecs = useMemo(() => {
    if (!masterRecsSource || masterRecsSource.length === 0) return [];
    const setKey = glossarySetKeyUi;
    const pool = masterRecsSource.filter((r) => masterMatchesSelectedGlossarySet(r, setKey));
    const term = (formData.recShort || '').toLowerCase();

    if (!term) return pool.slice(0, 50);

    return pool
      .filter(
        (r) =>
          (r.fldRecShort?.toLowerCase() || '').includes(term) ||
          (r.fldRecLong?.toLowerCase() || '').includes(term)
      )
      .slice(0, 50);
  }, [masterRecsSource, formData.recShort, glossarySetKeyUi]);

  const itemFilteredMasterRecs = useMemo(() => {
    if (!masterRecsSource || masterRecsSource.length === 0) return [];
    const setKey = glossarySetKeyUi;

    const relatedGlossaryRecords = (glossary || []).filter((g) => {
      if (!isActiveGlossaryRow(g)) return false;
      if (
        String(g.fldItem || '').toLowerCase().trim() !== String(selectedItem || '').toLowerCase().trim()
      ) {
        return false;
      }
      if (normalizeGlossaryRecordSetKey(g.fldGlossarySetId) !== setKey) return false;
      return true;
    });

    const recIds = new Set(
      relatedGlossaryRecords
        .map((g) => String(g.fldRec || g.fldRecID || '').toLowerCase().trim())
        .filter(Boolean)
    );

    return masterRecsSource.filter((r) => {
      const rid = String(r.id || r.fldRecID || '').toLowerCase().trim();
      if (!recIds.has(rid)) return false;
      return masterMatchesSelectedGlossarySet(r, setKey);
    });
  }, [masterRecsSource, glossary, selectedItem, glossarySetKeyUi]);

  /** Rec IDs (lowercased) that already have a glossary row for cat + item + find + current glossary set (5-tuple without rec dimension = all recs paired for this context). */
  const pairedRecIdsForCurrentSet = useMemo(() => {
    const out = new Set<string>();
    if (!selectedCat || !selectedItem || !selectedFind) return out;
    const setKey = normalizeGlossaryRecordSetKey(selectedGlossarySetId);
    for (const g of glossary || []) {
      if (!isActiveGlossaryRow(g)) continue;
      if (
        String(g.fldCat || '').toLowerCase().trim() !== String(selectedCat || '').toLowerCase().trim()
      ) {
        continue;
      }
      if (
        String(g.fldItem || '').toLowerCase().trim() !== String(selectedItem || '').toLowerCase().trim()
      ) {
        continue;
      }
      if (
        String(g.fldFind || '').toLowerCase().trim() !== String(selectedFind || '').toLowerCase().trim()
      ) {
        continue;
      }
      if (normalizeGlossaryRecordSetKey(g.fldGlossarySetId) !== setKey) continue;
      const rid = String(g.fldRec || g.fldRecID || '').toLowerCase().trim();
      if (rid) out.add(rid);
    }
    return out;
  }, [glossary, selectedCat, selectedItem, selectedFind, selectedGlossarySetId]);

  const pairedRecRowsForDropdown = useMemo(() => {
    const set = pairedRecIdsForCurrentSet;
    if (set.size === 0) {
      return { masters: [] as MasterRecommendation[], orphanLowerIds: [] as string[] };
    }
    const masters = masterRecsSource.filter((r) =>
      set.has(String(r.id || r.fldRecID || '').toLowerCase().trim())
    );
    const mastersSorted = sortEntities([...masters], 'fldRecShort');
    const seen = new Set(
      mastersSorted.map((r) => String(r.id || r.fldRecID || '').toLowerCase().trim())
    );
    const orphanLowerIds: string[] = [];
    set.forEach((low) => {
      if (!seen.has(low)) orphanLowerIds.push(low);
    });
    orphanLowerIds.sort();
    return { masters: mastersSorted, orphanLowerIds };
  }, [masterRecsSource, pairedRecIdsForCurrentSet]);

  const glossaryWorkflowStatus = useMemo(() => {
    if (!selectedCat || !selectedItem || !selectedFind || !selectedRec) {
      return { kind: 'incomplete' as const };
    }
    const selectedSetKeyUi = normalizeGlossaryRecordSetKey(selectedGlossarySetId);
    let keyForExactLookup = selectedSetKeyUi;
    if (keyForExactLookup === '') {
      const gid = String(selections.editingGlossaryId || '').trim();
      if (gid) {
        const rowById = (glossary || []).find(
          (g: any) => String(g.fldGlosId || g.id || '').trim() === gid
        );
        if (
          rowById &&
          glossarySameFourTuple(rowById, selectedCat, selectedItem, selectedFind, selectedRec)
        ) {
          keyForExactLookup = normalizeGlossaryRecordSetKey(rowById.fldGlossarySetId);
        }
      }
    }
    const exact = findExactGlossaryByFiveTuple(
      glossary || [],
      selectedCat,
      selectedItem,
      selectedFind,
      selectedRec,
      keyForExactLookup
    );
    const otherSetRows = filterGlossaryFourTupleOtherSets(
      glossary || [],
      selectedCat,
      selectedItem,
      selectedFind,
      selectedRec,
      selectedSetKeyUi
    );
    if (exact) {
      const id = String(exact.fldGlosId || exact.id || '').trim();
      return { kind: 'existing' as const, glosId: id };
    }
    if (otherSetRows.length > 0) {
      const src = otherSetRows[0];
      const sourceLabel =
        String(src.fldGlossarySetName || '').trim() ||
        glossarySetById(src.fldGlossarySetId)?.name ||
        normalizeGlossaryRecordSetKey(src.fldGlossarySetId) ||
        'Unassigned / Legacy';
      const targetLabel =
        glossarySetById(selectedGlossarySetId)?.name ||
        (selectedSetKeyUi ? String(selectedGlossarySetId).trim() : 'Unassigned / Legacy');
      return { kind: 'template' as const, sourceLabel, targetLabel };
    }
    return { kind: 'new' as const };
  }, [
    selectedCat,
    selectedItem,
    selectedFind,
    selectedRec,
    selectedGlossarySetId,
    glossary,
    selections.editingGlossaryId
  ]);

  const relatedRecordSourceContext = useMemo(() => {
    if (!selectedCat || !selectedItem || !selectedFind || !selectedRec) return null;
    const cat = categories?.find(
      (c: any) =>
        String(c.id || c.fldCategoryID || '').toLowerCase().trim() ===
        String(selectedCat || '').toLowerCase().trim()
    );
    const item = items?.find(
      (i: any) =>
        String(i.id || i.fldItemID || '').toLowerCase().trim() ===
        String(selectedItem || '').toLowerCase().trim()
    );
    const find = findings?.find(
      (f: any) =>
        String(f.id || f.fldFindID || '').toLowerCase().trim() ===
        String(selectedFind || '').toLowerCase().trim()
    );
    const rec = masterRecsSource?.find(
      (r: any) =>
        String(r.id || r.fldRecID || '').toLowerCase().trim() ===
        String(selectedRec || '').toLowerCase().trim()
    );
    const setDef = selectedGlossarySetId ? glossarySetById(selectedGlossarySetId) : null;
    const glossarySetLabel =
      setDef?.name ||
      (String(selectedGlossarySetId || '').trim() ? String(selectedGlossarySetId).trim() : 'Unassigned / Legacy');
    return {
      categoryName: cat?.fldCategoryName || selectedCat,
      itemName: item?.fldItemName || selectedItem,
      findShort: find?.fldFindShort || selectedFind,
      recShort: rec?.fldRecShort || selectedRec,
      glossarySetLabel,
    };
  }, [
    selectedCat,
    selectedItem,
    selectedFind,
    selectedRec,
    selectedGlossarySetId,
    categories,
    items,
    findings,
    masterRecsSource,
  ]);

  const openRelatedRecordModal = () => {
    setRelatedRecordScenario(null);
    relatedPrefillKeyRef.current = '';
    relatedFormTouchedRef.current = false;
    releaseInactiveTabPanelFocus('maintenance');
    setRelatedRecordModalOpen(true);
  };

  useEffect(() => {
    if (!relatedRecordModalOpen) return;
    releaseInactiveTabPanelFocus('maintenance');
    relatedRecordModalCloseRef.current?.focus();
  }, [relatedRecordModalOpen]);

  const closeRelatedRecordModal = () => {
    setRelatedRecordModalOpen(false);
    setRelatedRecordScenario(null);
    setRelatedNewRecShort('');
    setRelatedNewRecLong('');
    setRelatedNewRecUnit('0');
    setRelatedNewRecUom('EA');
    setRelatedNewFindShort('');
    setRelatedNewFindLong('');
    setRelatedRecordSaving(false);
    relatedPrefillKeyRef.current = '';
    relatedFormTouchedRef.current = false;
  };

  const markRelatedFormTouched = () => {
    relatedFormTouchedRef.current = true;
  };

  /** Include legacy masters with no fldItem when checking duplicate rec short titles in-context. */
  const masterRecOverlapsSelectedItemContext = (r: any, itemId: string) => {
    const ri = String(r?.fldItem || '').trim().toLowerCase();
    if (!ri) return true;
    return ri === String(itemId || '').trim().toLowerCase();
  };

  /** Phase 2B: same finding + new recommendation (+ new glossary row). */
  const applySameFindingNewRecommendation = async () => {
    const trimmedShort = relatedNewRecShort.trim();
    if (!trimmedShort) {
      toast.error('New recommendation title cannot be blank.');
      return;
    }

    if (!selectedCat || !selectedItem || !selectedFind || !selectedRec) {
      toast.error('Select Category, Item, Finding, and Recommendation first.');
      return;
    }

    const selectedSetKeyUi = normalizeGlossaryRecordSetKey(selectedGlossarySetId);

    const finding = findings.find(
      (f: any) =>
        String(f.id || f.fldFindID || '').toLowerCase().trim() ===
        String(selectedFind || '').toLowerCase().trim()
    );
    const sourceRec = masterRecsSource.find(
      (r: any) =>
        String(r.id || r.fldRecID || '').toLowerCase().trim() ===
        String(selectedRec || '').toLowerCase().trim()
    );

    if (!finding?.fldFindID || !sourceRec) {
      toast.error('Source finding or recommendation not found.');
      return;
    }

    const sourceShortNorm = normalizeForDeterministicMatch(sourceRec.fldRecShort);
    const candidateNorm = normalizeForDeterministicMatch(trimmedShort);
    if (candidateNorm === sourceShortNorm) {
      toast.error(
        'New recommendation short title must differ from the source recommendation (change the default copy suffix or edit the title).'
      );
      return;
    }

    const duplicateMaster = masterRecsSource.some((r: any) => {
      if (!masterMatchesSelectedGlossarySet(r, selectedSetKeyUi)) return false;
      if (!masterRecOverlapsSelectedItemContext(r, selectedItem)) return false;
      const rid = String(r.id || r.fldRecID || '').toLowerCase().trim();
      const srcId = String(sourceRec.id || sourceRec.fldRecID || '').toLowerCase().trim();
      if (rid === srcId) return false;
      return normalizeForDeterministicMatch(r.fldRecShort) === candidateNorm;
    });

    if (duplicateMaster) {
      toast.error(
        'A recommendation with this short title already exists for this glossary set and item context. Use a distinct title.'
      );
      return;
    }

    const newRecId = uuidv4();
    const glosId = uuidv4();
    const sourceRecId = String(selectedRec || '').trim();

    pendingRelatedActivationRef.current = {
      kind: 'same_find_new_rec',
      selectedCat,
      selectedItem,
      selectedFind,
      sourceRecId,
      newRecId,
      glosId,
      glossarySetKey: selectedSetKeyUi
    };

    const sourceGlossary = findExactGlossaryByFiveTuple(
      glossary || [],
      selectedCat,
      selectedItem,
      selectedFind,
      selectedRec,
      selectedSetKeyUi
    );
    const glosStds = normalizeStringArray(finding?.fldStandards);

    setRelatedRecordSaving(true);
    setIsSynced(false);
    try {
      const recPayload = sanitizeData({
        fldRecID: newRecId,
        fldRecShort: trimmedShort,
        fldRecLong: relatedNewRecLong.trim(),
        fldOrder: sourceRec.fldOrder ?? 999,
        fldUnit: Number(relatedNewRecUnit) || 0,
        fldUOM: relatedNewRecUom || 'EA',
        fldStandards: [],
      });

      await firestoreService.masterRecommendations.save(recPayload, newRecId);

      const rawSuggested = finding.fldSuggestedRecs;
      let currentSuggested: string[] = [];
      if (Array.isArray(rawSuggested)) currentSuggested = rawSuggested;
      else if (rawSuggested !== undefined && rawSuggested !== null && rawSuggested !== '')
        currentSuggested = [String(rawSuggested)];
      const lowered = new Set(currentSuggested.map((id) => String(id).toLowerCase().trim()));
      if (!lowered.has(newRecId.toLowerCase().trim())) {
        const suggested = [...currentSuggested, newRecId];
        await handleUpdateFinding(String(finding.fldFindID), { fldSuggestedRecs: suggested });
      }

      const glossaryPayload = sanitizeData({
        fldGlosId: glosId,
        ...glossarySetMetadataForId(selectedGlossarySetId),
        fldCat: selectedCat,
        fldItem: selectedItem,
        fldFind: selectedFind,
        fldRec: newRecId,
        fldImages: [],
        fldUnitCost:
          sourceGlossary &&
          sourceGlossary.fldUnitCost !== undefined &&
          sourceGlossary.fldUnitCost !== null
            ? sourceGlossary.fldUnitCost
            : null,
        fldUnitType:
          sourceGlossary &&
          sourceGlossary.fldUnitType !== undefined &&
          sourceGlossary.fldUnitType !== null &&
          String(sourceGlossary.fldUnitType).trim() !== ''
            ? sourceGlossary.fldUnitType
            : null,
        fldStandards: glosStds,
      });
      await firestoreService.glossary.save(glossaryPayload, glosId);

      const optimisticRec = { ...recPayload, id: newRecId };
      const optimisticGlos = { ...glossaryPayload, id: glosId };

      /** Same array source as dropdown (`masterRecommendations`); Explorer uses functional App activation instead of merging stale `selections` snapshots after await. */
      setRecommendations((prev: any[]) => {
        const exists = prev.some(
          (r) => String(r.fldRecID || r.id || '').toLowerCase().trim() === newRecId.toLowerCase().trim()
        );
        if (exists) return prev;
        return [...prev, optimisticRec];
      });
      setGlossary((prev: Glossary[]) => {
        const exists = prev.some(
          (g: any) => String(g.fldGlosId || g.id || '').toLowerCase().trim() === glosId.toLowerCase().trim()
        );
        if (exists) return prev;
        return [...prev, optimisticGlos as Glossary];
      });

      setSelectedGlossarySetId(
        normalizeGlossaryRecordSetKey(glossaryPayload?.fldGlossarySetId ?? null)
      );

      const activationItem = {
        fldCat: optimisticGlos.fldCat ?? selectedCat,
        fldItem: optimisticGlos.fldItem ?? selectedItem,
        fldFind: optimisticGlos.fldFind ?? selectedFind,
        fldRec: newRecId,
        fldGlosId: glosId,
        id: glosId,
        fldImages: Array.isArray(optimisticGlos.fldImages) ? optimisticGlos.fldImages : [],
        fldStandards: Array.isArray(optimisticGlos.fldStandards) ? optimisticGlos.fldStandards : glosStds
      };

      if (onActivateGlossaryBuilderRecord) {
        onActivateGlossaryBuilderRecord(activationItem);
      }

      toast.success('New recommendation and glossary record created.');
      closeRelatedRecordModal();
    } catch (error) {
      pendingRelatedActivationRef.current = null;
      handleFirestoreError(error, OperationType.CREATE, 'related-glossary-record');
    } finally {
      setRelatedRecordSaving(false);
    }
  };

  /** Phase 2C: new finding + same recommendation (+ new glossary row). */
  const applyNewFindingSameRecommendation = async () => {
    const trimmedShort = relatedNewFindShort.trim();
    if (!trimmedShort) {
      toast.error('New finding title cannot be blank.');
      return;
    }

    if (!selectedCat || !selectedItem || !selectedFind || !selectedRec) {
      toast.error('Select Category, Item, Finding, and Recommendation first.');
      return;
    }

    const selectedSetKeyUi = normalizeGlossaryRecordSetKey(selectedGlossarySetId);

    const sourceFinding = findings.find(
      (f: any) =>
        String(f.id || f.fldFindID || '').toLowerCase().trim() ===
        String(selectedFind || '').toLowerCase().trim()
    );
    const sourceRec = masterRecsSource.find(
      (r: any) =>
        String(r.id || r.fldRecID || '').toLowerCase().trim() ===
        String(selectedRec || '').toLowerCase().trim()
    );

    if (!sourceFinding?.fldFindID || !sourceRec) {
      toast.error('Source finding or recommendation not found.');
      return;
    }

    const sourceShortNorm = normalizeForDeterministicMatch(sourceFinding.fldFindShort);
    const candidateNorm = normalizeForDeterministicMatch(trimmedShort);
    if (candidateNorm === sourceShortNorm) {
      toast.error(
        'New finding short title must differ from the source finding (change the default copy suffix or edit the title).'
      );
      return;
    }

    const duplicateMaster = findings.some((f: any) => {
      if (!masterMatchesSelectedGlossarySet(f, selectedSetKeyUi)) return false;
      if (
        String(f.fldItem || '').toLowerCase().trim() !==
        String(selectedItem || '').toLowerCase().trim()
      ) {
        return false;
      }
      const fid = String(f.id || f.fldFindID || '').toLowerCase().trim();
      const srcId = String(sourceFinding.id || sourceFinding.fldFindID || '').toLowerCase().trim();
      if (fid === srcId) return false;
      return normalizeForDeterministicMatch(f.fldFindShort) === candidateNorm;
    });

    if (duplicateMaster) {
      toast.error(
        'A finding with this short title already exists for this glossary set and item context. Use a distinct title.'
      );
      return;
    }

    const newFindId = uuidv4();
    const glosId = uuidv4();
    const sourceFindId = String(selectedFind || '').trim();
    const sourceRecId = String(selectedRec || '').trim();

    pendingRelatedActivationRef.current = {
      kind: 'new_find_same_rec',
      selectedCat,
      selectedItem,
      sourceFindId,
      newFindId,
      selectedRecId: sourceRecId,
      glosId,
      glossarySetKey: selectedSetKeyUi
    };

    const sourceGlossary = findExactGlossaryByFiveTuple(
      glossary || [],
      selectedCat,
      selectedItem,
      selectedFind,
      selectedRec,
      selectedSetKeyUi
    );
    const glosStds = normalizeStringArray(sourceRec?.fldStandards);

    setRelatedRecordSaving(true);
    setIsSynced(false);
    try {
      const findPayload = sanitizeData({
        fldFindID: newFindId,
        fldItem: selectedItem,
        ...glossarySetMetadataForId(selectedGlossarySetId),
        fldFindShort: trimmedShort,
        fldFindLong: relatedNewFindLong.trim(),
        fldOrder: sourceFinding.fldOrder ?? 999,
        fldMeasurementType: sourceFinding.fldMeasurementType || '',
        fldUnitType: sourceFinding.fldUnitType || '',
        fldSuggestedRecs: [sourceRecId],
        fldStandards: [],
      });

      await firestoreService.save('findings', findPayload, newFindId);

      const glossaryPayload = sanitizeData({
        fldGlosId: glosId,
        ...glossarySetMetadataForId(selectedGlossarySetId),
        fldCat: selectedCat,
        fldItem: selectedItem,
        fldFind: newFindId,
        fldRec: sourceRecId,
        fldImages: [],
        fldUnitCost:
          sourceGlossary &&
          sourceGlossary.fldUnitCost !== undefined &&
          sourceGlossary.fldUnitCost !== null
            ? sourceGlossary.fldUnitCost
            : null,
        fldUnitType:
          sourceGlossary &&
          sourceGlossary.fldUnitType !== undefined &&
          sourceGlossary.fldUnitType !== null &&
          String(sourceGlossary.fldUnitType).trim() !== ''
            ? sourceGlossary.fldUnitType
            : null,
        fldStandards: glosStds,
      });
      await firestoreService.glossary.save(glossaryPayload, glosId);

      const optimisticFind = { ...findPayload, id: newFindId };
      const optimisticGlos = { ...glossaryPayload, id: glosId };

      setFindings((prev: Finding[]) => {
        const exists = prev.some(
          (f) =>
            String(f.fldFindID || f.id || '').toLowerCase().trim() === newFindId.toLowerCase().trim()
        );
        if (exists) return prev;
        return [...prev, optimisticFind as Finding];
      });
      setGlossary((prev: Glossary[]) => {
        const exists = prev.some(
          (g: any) => String(g.fldGlosId || g.id || '').toLowerCase().trim() === glosId.toLowerCase().trim()
        );
        if (exists) return prev;
        return [...prev, optimisticGlos as Glossary];
      });

      setSelectedGlossarySetId(
        normalizeGlossaryRecordSetKey(glossaryPayload?.fldGlossarySetId ?? null)
      );

      const activationItem = {
        fldCat: optimisticGlos.fldCat ?? selectedCat,
        fldItem: optimisticGlos.fldItem ?? selectedItem,
        fldFind: newFindId,
        fldRec: sourceRecId,
        fldGlosId: glosId,
        id: glosId,
        fldImages: Array.isArray(optimisticGlos.fldImages) ? optimisticGlos.fldImages : [],
        fldStandards: Array.isArray(optimisticGlos.fldStandards) ? optimisticGlos.fldStandards : glosStds
      };

      if (onActivateGlossaryBuilderRecord) {
        onActivateGlossaryBuilderRecord(activationItem);
      }

      toast.success('New finding and glossary record created.');
      closeRelatedRecordModal();
    } catch (error) {
      pendingRelatedActivationRef.current = null;
      handleFirestoreError(error, OperationType.CREATE, 'related-glossary-record');
    } finally {
      setRelatedRecordSaving(false);
    }
  };

  /** Phase 2D: new finding + new recommendation (+ new glossary row). */
  const applyNewFindingNewRecommendation = async () => {
    const trimmedFindShort = relatedNewFindShort.trim();
    const trimmedRecShort = relatedNewRecShort.trim();
    if (!trimmedFindShort) {
      toast.error('New finding title cannot be blank.');
      return;
    }
    if (!trimmedRecShort) {
      toast.error('New recommendation title cannot be blank.');
      return;
    }

    if (!selectedCat || !selectedItem || !selectedFind || !selectedRec) {
      toast.error('Select Category, Item, Finding, and Recommendation first.');
      return;
    }

    const selectedSetKeyUi = normalizeGlossaryRecordSetKey(selectedGlossarySetId);

    const sourceFinding = findings.find(
      (f: any) =>
        String(f.id || f.fldFindID || '').toLowerCase().trim() ===
        String(selectedFind || '').toLowerCase().trim()
    );
    const sourceRec = masterRecsSource.find(
      (r: any) =>
        String(r.id || r.fldRecID || '').toLowerCase().trim() ===
        String(selectedRec || '').toLowerCase().trim()
    );

    if (!sourceFinding?.fldFindID || !sourceRec) {
      toast.error('Source finding or recommendation not found.');
      return;
    }

    const sourceFindShortNorm = normalizeForDeterministicMatch(sourceFinding.fldFindShort);
    const candidateFindNorm = normalizeForDeterministicMatch(trimmedFindShort);
    if (candidateFindNorm === sourceFindShortNorm) {
      toast.error(
        'New finding short title must differ from the source finding (change the default copy suffix or edit the title).'
      );
      return;
    }

    const duplicateFinding = findings.some((f: any) => {
      if (!masterMatchesSelectedGlossarySet(f, selectedSetKeyUi)) return false;
      if (
        String(f.fldItem || '').toLowerCase().trim() !==
        String(selectedItem || '').toLowerCase().trim()
      ) {
        return false;
      }
      const fid = String(f.id || f.fldFindID || '').toLowerCase().trim();
      const srcId = String(sourceFinding.id || sourceFinding.fldFindID || '').toLowerCase().trim();
      if (fid === srcId) return false;
      return normalizeForDeterministicMatch(f.fldFindShort) === candidateFindNorm;
    });

    if (duplicateFinding) {
      toast.error(
        'A finding with this short title already exists for this glossary set and item context. Use a distinct title.'
      );
      return;
    }

    const sourceRecShortNorm = normalizeForDeterministicMatch(sourceRec.fldRecShort);
    const candidateRecNorm = normalizeForDeterministicMatch(trimmedRecShort);
    if (candidateRecNorm === sourceRecShortNorm) {
      toast.error(
        'New recommendation short title must differ from the source recommendation (change the default copy suffix or edit the title).'
      );
      return;
    }

    const duplicateRec = masterRecsSource.some((r: any) => {
      if (!masterMatchesSelectedGlossarySet(r, selectedSetKeyUi)) return false;
      if (!masterRecOverlapsSelectedItemContext(r, selectedItem)) return false;
      const rid = String(r.id || r.fldRecID || '').toLowerCase().trim();
      const srcId = String(sourceRec.id || sourceRec.fldRecID || '').toLowerCase().trim();
      if (rid === srcId) return false;
      return normalizeForDeterministicMatch(r.fldRecShort) === candidateRecNorm;
    });

    if (duplicateRec) {
      toast.error(
        'A recommendation with this short title already exists for this glossary set and item context. Use a distinct title.'
      );
      return;
    }

    const newFindId = uuidv4();
    const newRecId = uuidv4();
    const glosId = uuidv4();
    const sourceFindId = String(selectedFind || '').trim();
    const sourceRecId = String(selectedRec || '').trim();

    pendingRelatedActivationRef.current = {
      kind: 'new_find_new_rec',
      selectedCat,
      selectedItem,
      sourceFindId,
      sourceRecId,
      newFindId,
      newRecId,
      glosId,
      glossarySetKey: selectedSetKeyUi
    };

    const sourceGlossary = findExactGlossaryByFiveTuple(
      glossary || [],
      selectedCat,
      selectedItem,
      selectedFind,
      selectedRec,
      selectedSetKeyUi
    );

    setRelatedRecordSaving(true);
    setIsSynced(false);
    try {
      const recPayload = sanitizeData({
        fldRecID: newRecId,
        ...glossarySetMetadataForId(selectedGlossarySetId),
        fldRecShort: trimmedRecShort,
        fldRecLong: relatedNewRecLong.trim(),
        fldOrder: sourceRec.fldOrder ?? 999,
        fldUnit: Number(relatedNewRecUnit) || 0,
        fldUOM: relatedNewRecUom || 'EA',
        fldStandards: [],
      });

      await firestoreService.masterRecommendations.save(recPayload, newRecId);

      const findPayload = sanitizeData({
        fldFindID: newFindId,
        fldItem: selectedItem,
        ...glossarySetMetadataForId(selectedGlossarySetId),
        fldFindShort: trimmedFindShort,
        fldFindLong: relatedNewFindLong.trim(),
        fldOrder: sourceFinding.fldOrder ?? 999,
        fldMeasurementType: sourceFinding.fldMeasurementType || '',
        fldUnitType: sourceFinding.fldUnitType || '',
        fldSuggestedRecs: [newRecId],
        fldStandards: [],
      });

      await firestoreService.save('findings', findPayload, newFindId);

      const glossaryPayload = sanitizeData({
        fldGlosId: glosId,
        ...glossarySetMetadataForId(selectedGlossarySetId),
        fldCat: selectedCat,
        fldItem: selectedItem,
        fldFind: newFindId,
        fldRec: newRecId,
        fldImages: [],
        fldUnitCost:
          sourceGlossary &&
          sourceGlossary.fldUnitCost !== undefined &&
          sourceGlossary.fldUnitCost !== null
            ? sourceGlossary.fldUnitCost
            : null,
        fldUnitType:
          sourceGlossary &&
          sourceGlossary.fldUnitType !== undefined &&
          sourceGlossary.fldUnitType !== null &&
          String(sourceGlossary.fldUnitType).trim() !== ''
            ? sourceGlossary.fldUnitType
            : null,
        fldStandards: [],
      });
      await firestoreService.glossary.save(glossaryPayload, glosId);

      const optimisticRec = { ...recPayload, id: newRecId };
      const optimisticFind = { ...findPayload, id: newFindId };
      const optimisticGlos = { ...glossaryPayload, id: glosId };

      setRecommendations((prev: any[]) => {
        const exists = prev.some(
          (r) => String(r.fldRecID || r.id || '').toLowerCase().trim() === newRecId.toLowerCase().trim()
        );
        if (exists) return prev;
        return [...prev, optimisticRec];
      });
      setFindings((prev: Finding[]) => {
        const exists = prev.some(
          (f) =>
            String(f.fldFindID || f.id || '').toLowerCase().trim() === newFindId.toLowerCase().trim()
        );
        if (exists) return prev;
        return [...prev, optimisticFind as Finding];
      });
      setGlossary((prev: Glossary[]) => {
        const exists = prev.some(
          (g: any) => String(g.fldGlosId || g.id || '').toLowerCase().trim() === glosId.toLowerCase().trim()
        );
        if (exists) return prev;
        return [...prev, optimisticGlos as Glossary];
      });

      setSelectedGlossarySetId(
        normalizeGlossaryRecordSetKey(glossaryPayload?.fldGlossarySetId ?? null)
      );

      const activationItem = {
        fldCat: optimisticGlos.fldCat ?? selectedCat,
        fldItem: optimisticGlos.fldItem ?? selectedItem,
        fldFind: newFindId,
        fldRec: newRecId,
        fldGlosId: glosId,
        id: glosId,
        fldImages: [],
        fldStandards: [],
      };

      if (onActivateGlossaryBuilderRecord) {
        onActivateGlossaryBuilderRecord(activationItem);
      }

      toast.success('New finding, recommendation, and glossary record created.');
      closeRelatedRecordModal();
    } catch (error) {
      pendingRelatedActivationRef.current = null;
      handleFirestoreError(error, OperationType.CREATE, 'related-glossary-record');
    } finally {
      setRelatedRecordSaving(false);
    }
  };

  const handleRelatedRecordContinue = async () => {
    if (!relatedRecordScenario) {
      toast.error('Select a scenario first.');
      return;
    }
    if (relatedRecordScenario === 'cross_set_template') {
      toast.info(
        'Cross-set related records use the Glossary Set dropdown and Prepare Target Set Records below. Create Related Record save is not implemented yet (Phase 2D+).'
      );
      return;
    }
    if (relatedRecordScenario === 'same_find_new_rec') {
      await applySameFindingNewRecommendation();
      return;
    }
    if (relatedRecordScenario === 'new_find_same_rec') {
      await applyNewFindingSameRecommendation();
      return;
    }
    if (relatedRecordScenario === 'new_find_new_rec') {
      await applyNewFindingNewRecommendation();
      return;
    }
  };

  useEffect(() => {
    if (!relatedRecordModalOpen || relatedRecordScenario !== 'same_find_new_rec') return;
    if (relatedRecordSaving) return;
    if (relatedFormTouchedRef.current) return;

    const prefillKey = `same_find_new_rec|${String(selectedRec || '').trim()}`;
    if (relatedPrefillKeyRef.current === prefillKey) return;

    const rec = masterRecsSource.find(
      (r: any) =>
        String(r.id || r.fldRecID || '').toLowerCase().trim() ===
        String(selectedRec || '').toLowerCase().trim()
    );
    if (!rec) return;

    relatedPrefillKeyRef.current = prefillKey;
    const baseShort = String(rec.fldRecShort || '').trim();
    setRelatedNewRecShort(baseShort ? `${baseShort} (Copy)` : '(Copy)');
    setRelatedNewRecLong(String(rec.fldRecLong || ''));
    setRelatedNewRecUnit(String(rec.fldUnit ?? 0));
    setRelatedNewRecUom(String(rec.fldUOM || 'EA'));
  }, [relatedRecordModalOpen, relatedRecordScenario, selectedRec, relatedRecordSaving]);

  useEffect(() => {
    if (!relatedRecordModalOpen || relatedRecordScenario !== 'new_find_same_rec') return;
    if (relatedRecordSaving) return;
    if (relatedFormTouchedRef.current) return;

    const prefillKey = `new_find_same_rec|${String(selectedFind || '').trim()}`;
    if (relatedPrefillKeyRef.current === prefillKey) return;

    const find = findings?.find(
      (f: any) =>
        String(f.id || f.fldFindID || '').toLowerCase().trim() ===
        String(selectedFind || '').toLowerCase().trim()
    );
    if (!find) return;

    relatedPrefillKeyRef.current = prefillKey;
    const baseShort = String(find.fldFindShort || '').trim();
    setRelatedNewFindShort(baseShort ? `${baseShort} (Copy)` : '(Copy)');
    setRelatedNewFindLong(String(find.fldFindLong || ''));
  }, [relatedRecordModalOpen, relatedRecordScenario, selectedFind, relatedRecordSaving, findings]);

  useEffect(() => {
    if (!relatedRecordModalOpen || relatedRecordScenario !== 'new_find_new_rec') return;
    if (relatedRecordSaving) return;
    if (relatedFormTouchedRef.current) return;

    const prefillKey = `new_find_new_rec|${String(selectedFind || '').trim()}|${String(selectedRec || '').trim()}`;
    if (relatedPrefillKeyRef.current === prefillKey) return;

    const find = findings?.find(
      (f: any) =>
        String(f.id || f.fldFindID || '').toLowerCase().trim() ===
        String(selectedFind || '').toLowerCase().trim()
    );
    const rec = masterRecsSource.find(
      (r: any) =>
        String(r.id || r.fldRecID || '').toLowerCase().trim() ===
        String(selectedRec || '').toLowerCase().trim()
    );
    if (!find || !rec) return;

    relatedPrefillKeyRef.current = prefillKey;
    const findBaseShort = String(find.fldFindShort || '').trim();
    setRelatedNewFindShort(findBaseShort ? `${findBaseShort} (Copy)` : '(Copy)');
    setRelatedNewFindLong(String(find.fldFindLong || ''));
    const recBaseShort = String(rec.fldRecShort || '').trim();
    setRelatedNewRecShort(recBaseShort ? `${recBaseShort} (Copy)` : '(Copy)');
    setRelatedNewRecLong(String(rec.fldRecLong || ''));
    setRelatedNewRecUnit(String(rec.fldUnit ?? 0));
    setRelatedNewRecUom(String(rec.fldUOM || 'EA'));
  }, [
    relatedRecordModalOpen,
    relatedRecordScenario,
    selectedFind,
    selectedRec,
    relatedRecordSaving,
    findings,
    masterRecsSource,
  ]);

  const recommendationSelectOptions = useMemo(() => {
    if (!masterRecsSource || masterRecsSource.length === 0) {
      return [{ label: '⏳ Hydrating Library...', value: 'loading', disabled: true }];
    }
    const setKey = glossarySetKeyUi;
    const allOptions: { label: string; value: string; disabled?: boolean }[] = [];
    const addedIds = new Set<string>();

    const pushPairedLabel = (short: string, long: string) => {
      const tail = `${long.substring(0, 60)}${long.length > 60 ? '...' : ''}`;
      return `★ Existing | ${short} | ${tail}`;
    };

    const { masters: pairedMasters, orphanLowerIds: pairedOrphans } = pairedRecRowsForDropdown;
    if (pairedMasters.length > 0 || pairedOrphans.length > 0) {
      allOptions.push({
        label: '--- Already in glossary for this set ---',
        value: 'header-paired-set',
        disabled: true,
      });
      pairedMasters.forEach((r) => {
        const rid = String(r.id || r.fldRecID || '').toLowerCase().trim();
        if (!rid || addedIds.has(rid)) return;
        const short = r.fldRecShort || 'No Title';
        const long = r.fldRecLong || '';
        allOptions.push({
          value: String(r.id || r.fldRecID),
          label: pushPairedLabel(short, long),
        });
        addedIds.add(rid);
      });
      pairedOrphans.forEach((low) => {
        if (addedIds.has(low)) return;
        allOptions.push({
          value: low,
          label: `★ Existing | ⚠️ ORPHANED: ${low} (Not in Master)`,
        });
        addedIds.add(low);
      });
    }

    if (selectedFind) {
      const finding = findings?.find(
        (f) =>
          String(f.id || f.fldFindID || '').toLowerCase().trim() ===
          String(selectedFind || '').toLowerCase().trim()
      );
      const suggestedIds = (finding?.fldSuggestedRecs || []) as string[];

      if (suggestedIds.length > 0) {
        allOptions.push({ label: '--- Suggested ---', value: 'header-suggested', disabled: true });
        suggestedIds.forEach((recId) => {
          if (!recId) return;
          const cleanId = String(recId).toLowerCase().trim();
          if (addedIds.has(cleanId)) return;

          const r = masterRecsSource?.find(
            (mr) => String(mr.id || mr.fldRecID || '').toLowerCase().trim() === cleanId
          );
          if (r) {
            const inPaired = pairedRecIdsForCurrentSet.has(cleanId);
            if (!masterMatchesSelectedGlossarySet(r, setKey) && !inPaired) return;
            const short = r.fldRecShort || 'No Title';
            const long = r.fldRecLong || '';
            allOptions.push({
              value: String(r.id || r.fldRecID),
              label: `${short} | ${long.substring(0, 60)}${long.length > 60 ? '...' : ''}`,
            });
            addedIds.add(cleanId);
          } else if (!setKey) {
            allOptions.push({
              value: recId,
              label: `⚠️ ORPHANED: ${recId} (Not in Master)`,
            });
            addedIds.add(cleanId);
          }
        });
      }
    }

    const otherRecs = (itemFilteredMasterRecs || []).filter((r) => {
      const rid = String(r.id || r.fldRecID || '').toLowerCase().trim();
      return !addedIds.has(rid);
    });

    if (otherRecs.length > 0) {
      allOptions.push({ label: '--- Item Recommendations ---', value: 'header-all', disabled: true });
      sortEntities([...otherRecs], 'fldRecShort')
        .slice(0, 100)
        .forEach((r) => {
          const rid = String(r.id || r.fldRecID || '').toLowerCase().trim();
          if (addedIds.has(rid)) return;

          const short = r.fldRecShort || 'No Title';
          const long = r.fldRecLong || '';
          allOptions.push({
            value: String(r.id || r.fldRecID),
            label: `${short} | ${long.substring(0, 60)}${long.length > 60 ? '...' : ''}`,
          });
          addedIds.add(rid);
        });
    } else if (selectedItem && !selectedFind) {
      allOptions.push({ label: 'No previous links for this item', value: 'no-links', disabled: true });
    }

    const selLower = String(selectedRec || '').toLowerCase().trim();
    if (selLower && !addedIds.has(selLower)) {
      const cur = masterRecsSource.find(
        (r) => String(r.id || r.fldRecID || '').toLowerCase().trim() === selLower
      );
      if (cur) {
        const short = cur.fldRecShort || 'No Title';
        const long = cur.fldRecLong || '';
        allOptions.push({
          value: String(cur.id || cur.fldRecID),
          label: `${short} | ${long.substring(0, 60)}${long.length > 60 ? '...' : ''} (outside selected set)`,
        });
        addedIds.add(selLower);
      } else {
        allOptions.push({
          value: String(selectedRec),
          label: `⚠️ ${String(selectedRec)} (outside selected set / not in Master)`,
        });
        addedIds.add(selLower);
      }
    }

    return allOptions;
  }, [
    masterRecsSource,
    selectedFind,
    findings,
    selectedRec,
    selectedItem,
    pairedRecRowsForDropdown,
    pairedRecIdsForCurrentSet,
    itemFilteredMasterRecs,
    glossarySetKeyUi,
  ]);

  return (
    <div className="space-y-6">
      <div className="text-[10px] font-mono text-zinc-400 mb-2">v87.0 | DATA_ALIGNED</div>
      <Card className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-zinc-900">Selection Workflow</h2>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={handleClearAll} className="text-zinc-500 hover:text-zinc-900">
              <RotateCcw size={14} className="mr-1" /> CLEAR
            </Button>
            {selectedCat && selectedItem && selectedFind && selectedRec && (
              <Button size="sm" variant="ghost" onClick={() => {
                const sk = normalizeGlossaryRecordSetKey(selectedGlossarySetId);
                const existing = findExactGlossaryByFiveTuple(
                  glossary || [],
                  selectedCat,
                  selectedItem,
                  selectedFind,
                  selectedRec,
                  sk
                );
                if (existing) setConfirmDelete({ id: existing.fldGlosId, collection: 'glossary', label: 'this glossary record', type: 'delete' });
              }} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                <Trash2 size={14} className="mr-1" /> DELETE RECORD
              </Button>
            )}
              {selectedCat && selectedItem && selectedFind && selectedRec ? (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={openRelatedRecordModal}
                >
                  Create Related Record...
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleAddNewGlossaryFlow}
                  disabled={!selectedCat || !selectedItem}
                >
                  <Plus size={14} className="mr-1" /> ADD FINDING/REC
                </Button>
              )}
            <Button size="sm" onClick={handleAddNew} disabled={!selectedCat || !selectedItem || !selectedFind || !selectedRec} className={cn(!selectedCat || !selectedItem || !selectedFind || !selectedRec ? "bg-zinc-200" : "bg-indigo-600 hover:bg-indigo-700")}>
              <Save size={14} className="mr-1" /> SAVE RECORD
            </Button>
            {onDiscardChanges && (
              <Button size="sm" variant="ghost" onClick={onDiscardChanges} className="text-zinc-500 hover:text-zinc-900 border border-zinc-200">
                <RotateCw size={14} className="mr-1" /> DISCARD CITATION EDITS
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex gap-2 items-end">
            <Select
              className="flex-1"
              label="Glossary Set"
              value={selectedGlossarySetId}
              onChange={(e: any) => {
                const nextRaw = e.target.value || '';
                const currentSetKey = normalizeGlossaryRecordSetKey(selectedGlossarySetId);
                const nextSetKey = normalizeGlossaryRecordSetKey(nextRaw);
                if (
                  !templateSourceSnapshot &&
                  currentSetKey !== nextSetKey &&
                  selectedCat &&
                  selectedItem &&
                  selectedFind &&
                  selectedRec
                ) {
                  const exactCurrent = findExactGlossaryByFiveTuple(
                    glossary || [],
                    selectedCat,
                    selectedItem,
                    selectedFind,
                    selectedRec,
                    currentSetKey
                  );
                  if (exactCurrent) {
                    setTemplateSourceSnapshot({
                      sourceGlossarySetId: currentSetKey,
                      sourceEditingGlossaryId: String(exactCurrent.fldGlosId || exactCurrent.id || '').trim(),
                      sourceFindingStds: normalizeStringArray(stagedFindingStds),
                      sourceRecStds: normalizeStringArray(stagedRecStds),
                      sourceGlosStds: normalizeStringArray(stagedGlosStds),
                      sourceIdentityKey: glossaryIdentityKey(selectedCat, selectedItem, selectedFind, selectedRec),
                    });
                    onReplaceStagedStandards?.({ finding: [], rec: [], glossary: [] });
                  }
                }
                setSelectedGlossarySetId(nextRaw);
                setLibraryGlossaryContextMismatch(false);
              }}
              options={GLOSSARY_SET_DEFS.map((s) => ({
                value: s.id,
                label: `${s.name} (${s.standardType}${s.standardVersion ? ` ${s.standardVersion}` : ''})`,
              }))}
              placeholder="Legacy / Unassigned"
            />
            <div className="mb-1 px-3 py-1.5 rounded-lg border border-zinc-200 bg-zinc-50 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              {selectedGlossarySetId ? (glossarySetById(selectedGlossarySetId)?.name || selectedGlossarySetId) : 'Unassigned'}
            </div>
          </div>
          {libraryGlossaryContextMismatch && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] leading-snug text-amber-950">
              <span className="font-bold">Glossary Set mismatch:</span> the selected library finding and recommendation are tagged to different standard contexts. The default above follows the{' '}
              <span className="font-bold">finding&apos;s</span> Glossary Set (deterministic rule). Adjust the dropdown if the glossary record should use a different set.
            </div>
          )}

          {hasMinimumContext && glossaryWorkflowStatus.kind === 'existing' && (
            <div
              className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-[11px] leading-snug text-blue-900"
              title={glossaryWorkflowStatus.glosId}
            >
              <span className="font-bold">Existing Glossary Record</span>
              {' — '}
              <span className="font-mono text-[10px]">{glossaryWorkflowStatus.glosId}</span>
            </div>
          )}
          {hasMinimumContext && glossaryWorkflowStatus.kind === 'new' && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-snug text-amber-950">
              <span className="font-bold">New Glossary Record Pending</span>
              {' — '}
              Save will create a new glossary row for the selected Glossary Set (no exact match for Category + Item + Finding + Recommendation + Set).
            </div>
          )}
          {hasMinimumContext && glossaryWorkflowStatus.kind === 'template' && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-snug text-amber-950">
              <div className="flex items-start justify-between gap-3">
                <p>
                  <span className="font-bold">Template:</span> Using{' '}
                  <span className="font-bold">{glossaryWorkflowStatus.sourceLabel}</span> glossary as a reference for{' '}
                  <span className="font-bold">{glossaryWorkflowStatus.targetLabel}</span>. Save will create a new glossary record for the target set (the source row will not be moved).
                </p>
                {templateSourceSnapshot && (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="xs"
                      variant="secondary"
                      className="h-6 px-2 text-[10px] whitespace-nowrap"
                      onClick={handlePrepareTargetSetRecords}
                      disabled={
                        isPreparingTargetSetRecords ||
                        !selectedGlossarySetId ||
                        !selectedCat ||
                        !selectedItem ||
                        !selectedFind ||
                        !selectedRec
                      }
                    >
                      {isPreparingTargetSetRecords ? 'Preparing...' : 'Prepare Target Set Records'}
                    </Button>
                    <Button
                      type="button"
                      size="xs"
                      variant="secondary"
                      className="h-6 px-2 text-[10px] whitespace-nowrap"
                      onClick={handleRevertTemplateSource}
                      disabled={isPreparingTargetSetRecords}
                    >
                      Revert
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-2 items-end">
            <Select 
              className="flex-1" 
              label="Category" 
              value={selectedCat} 
              highlight={true} 
              onChange={(e: any) => setSelectedCat(e.target.value)} 
              options={categorySelectOptions}
            />
            <div className="flex gap-1 items-end">
              <Button variant="secondary" size="sm" className="mb-1" onClick={() => openNewWithTemplate('category')}><Plus size={14} /></Button>
              <Button variant="secondary" size="sm" className="mb-1" disabled={!selectedCat} onClick={() => openEdit('category')}><Edit2 size={14} /></Button>
            </div>
          </div>

          <div className="flex gap-2 items-end">
            <Select 
              className="flex-1" 
              label="Item" 
              disabled={!selectedCat} 
              value={selectedItem} 
              highlight={true} 
              onChange={(e: any) => setSelectedItem(e.target.value)} 
              options={itemSelectOptions}
            />
            <div className="flex gap-1 items-end">
              <Button variant="secondary" size="sm" className="mb-1" disabled={!selectedCat} onClick={() => openNewWithTemplate('item')}><Plus size={14} /></Button>
              <Button variant="secondary" size="sm" className="mb-1" disabled={!selectedItem} onClick={() => openEdit('item')}><Edit2 size={14} /></Button>
            </div>
          </div>

          <div className="flex gap-2 items-end">
            <Select 
              className="flex-1" 
              label="Finding" 
              disabled={!selectedItem} 
              value={selectedFind} 
              highlight={true} 
              onChange={(e: any) => setSelectedFind(e.target.value)} 
              options={findingsOptionsWithContext || []} 
            />
            <div className="flex gap-1 items-end">
              <Button variant="secondary" size="sm" className="mb-1" disabled={!selectedItem} onClick={() => openNewWithTemplate('finding')}><Plus size={14} /></Button>
              <Button variant="secondary" size="sm" className="mb-1" disabled={!selectedFind} onClick={() => openEdit('finding')}><Edit2 size={14} /></Button>
            </div>
          </div>

          <div className="flex gap-2 items-end">
            <div className="flex-1 flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Recommendation</label>
              <div className="flex gap-2">
                <Select 
                  className="flex-1" 
                  disabled={!selectedFind} 
                  value={selectedRec} 
                  highlight={true} 
                  onChange={(e: any) => setSelectedRec(e.target.value)} 
                  options={recommendationSelectOptions || []}
                />
                <Button variant="secondary" size="sm" onClick={() => setNewType('link_recommendation')} disabled={!selectedFind} title="Search Master Library">
                  <Search size={14} />
                </Button>
              </div>
            </div>
            <div className="flex gap-1 items-end">
              <Button variant="secondary" size="sm" className="mb-1" disabled={!selectedFind} onClick={() => openNewWithTemplate('recommendation')} title="Create New Master Recommendation"><Plus size={14} /></Button>
              <Button variant="secondary" size="sm" className="mb-1" disabled={!selectedRec} onClick={() => openEdit('recommendation')} title="Edit Master Recommendation"><Edit2 size={14} /></Button>
              <Button variant="secondary" size="sm" className="mb-1" disabled={!selectedRec} onClick={() => {
                const rec = masterRecommendations?.find(r => (r.id || r.fldRecID || "").toLowerCase().trim() === (selectedRec || "").toLowerCase().trim());
                if (rec) handleDuplicateRecommendation(rec);
              }} title="Duplicate as New"><Copy size={14} /></Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Selection Preview Card */}
      {selectedFind && (() => {
        const matchedRec = masterRecsSource?.find(r => (r.id || r.fldRecID || "").toLowerCase().trim() === (selectedRec || "").toLowerCase().trim());
        
        return (
          <Card className="p-6 bg-indigo-50/30 border-indigo-100">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-indigo-600">
                    <Search size={16} />
                    <h3 className="text-xs font-bold uppercase tracking-wider">Finding (Library)</h3>
                  </div>
                </div>
                
                <div className="space-y-3 bg-white p-4 rounded-xl border border-indigo-100 shadow-sm">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Short Finding</label>
                    <input 
                      className="w-full bg-zinc-50 border border-zinc-100 rounded-lg py-1.5 px-3 text-sm font-bold text-zinc-900 outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                      value={draftFindShort}
                      onChange={(e) => {
                        const findShort = e.target.value;
                        setDraftFindShort(findShort);
                        persistLibraryDraftCache({ findShort });
                        markLibraryDraftDirty();
                      }}
                      placeholder="Short finding title..."
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Long Finding</label>
                    <textarea 
                      className="w-full bg-zinc-50 border border-zinc-100 rounded-lg py-1.5 px-3 text-xs text-zinc-600 leading-relaxed outline-none focus:ring-1 focus:ring-indigo-500 transition-all min-h-[100px] resize-none"
                      value={draftFindLong}
                      onChange={(e) => {
                        const findLong = e.target.value;
                        setDraftFindLong(findLong);
                        persistLibraryDraftCache({ findLong });
                        markLibraryDraftDirty();
                      }}
                      placeholder="Detailed finding description..."
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-indigo-600">
                    <FileText size={16} />
                    <h3 className="text-xs font-bold uppercase tracking-wider">Recommendation (Library)</h3>
                  </div>
                  {selectedRec && (
                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 h-6 px-2" onClick={() => handleUnlinkSuggestion(selectedFind, selectedRec)}>
                      <X size={12} className="mr-1" /> UNLINK
                    </Button>
                  )}
                </div>

                {selectedRec ? (
                  <div className="space-y-3 bg-white p-4 rounded-xl border border-indigo-100 shadow-sm">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Short Recommendation</label>
                      <input 
                        className="w-full bg-zinc-50 border border-zinc-100 rounded-lg py-1.5 px-3 text-sm font-bold text-zinc-900 outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                        value={draftRecShort}
                        onChange={(e) => {
                          const recShort = e.target.value;
                          setDraftRecShort(recShort);
                          persistLibraryDraftCache({ recShort });
                          markLibraryDraftDirty();
                        }}
                        placeholder="Short recommendation title..."
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Long Recommendation</label>
                      <textarea 
                        className="w-full bg-zinc-50 border border-zinc-100 rounded-lg py-1.5 px-3 text-xs text-zinc-600 leading-relaxed outline-none focus:ring-1 focus:ring-indigo-500 transition-all min-h-[100px] resize-none"
                        value={draftRecLong}
                        onChange={(e) => {
                          const recLong = e.target.value;
                          setDraftRecLong(recLong);
                          persistLibraryDraftCache({ recLong });
                          markLibraryDraftDirty();
                        }}
                        placeholder="Detailed recommendation description..."
                      />
                    </div>

                    <div className="pt-3 mt-3 border-t border-zinc-100 space-y-3">
                      <div className="flex items-center justify-between">
                         <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Cost Configuration Override</span>
                         {(selections.fldUnitCost !== undefined || selections.fldUnitType !== undefined) && (
                           <button 
                             onClick={() => onSelectionChange({ ...selections, fldUnitCost: undefined, fldUnitType: undefined, isDirty: true })}
                             className="text-[9px] font-bold text-blue-600 hover:underline flex items-center gap-1"
                           >
                             <RotateCcw size={10} /> CLEAR OVERRIDE
                           </button>
                         )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                             <label className="text-[9px] font-bold text-zinc-500">UNIT COST ($)</label>
                             <span className={cn("text-[8px] font-black uppercase", selections.fldUnitCost !== undefined ? "text-indigo-600" : "text-zinc-300")}>
                               {selections.fldUnitCost !== undefined ? "Glossary Override" : "Inherited from Library"}
                             </span>
                          </div>
                          <input 
                            type="number"
                            placeholder={matchedRec?.fldUnit?.toString() || '0'}
                            value={selections.fldUnitCost ?? ''}
                            onChange={(e) => onSelectionChange({ ...selections, fldUnitCost: e.target.value === '' ? undefined : Number(e.target.value), isDirty: true })}
                            className={cn(
                              "w-full bg-zinc-50 border border-zinc-200 rounded-lg py-1.5 px-3 text-xs outline-none focus:ring-1 focus:ring-indigo-500 transition-all",
                              selections.fldUnitCost !== undefined ? "font-bold text-zinc-900 border-indigo-200 bg-white" : "text-zinc-400 font-normal"
                            )}
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                             <label className="text-[9px] font-bold text-zinc-500">COST UNIT TYPE</label>
                             <span className={cn("text-[8px] font-black uppercase", selections.fldUnitType !== undefined ? "text-indigo-600" : "text-zinc-300")}>
                               {selections.fldUnitType !== undefined ? "Glossary Override" : "Inherited from Library"}
                             </span>
                          </div>
                          <div className="flex gap-1">
                            <select
                              value={selections.fldUnitType ?? ''}
                              onChange={(e) => {
                                const val = e.target.value || undefined;
                                onSelectionChange({ ...selections, fldUnitType: val, isDirty: true });
                              }}
                              className={cn(
                                "w-full bg-zinc-50 border border-zinc-200 rounded-lg py-1.5 px-2 text-xs outline-none focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer",
                                selections.fldUnitType !== undefined ? "font-bold text-zinc-900 border-indigo-200 bg-white" : "text-zinc-400 font-normal"
                              )}
                            >
                               <option value="">{matchedRec?.fldUOM || '(Unit)'}</option>
                               <option value="EA">EA</option>
                               <option value="LF">LF</option>
                               <option value="SF">SF</option>
                               <option value="LS">LS</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white p-4 rounded-xl border border-dashed border-zinc-200 flex items-center justify-center min-h-[100px]">
                     <p className="text-zinc-400 italic">No recommendation linked. Select one above or search master.</p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        );
      })()}

      {/* Modals */}
      {newType && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-zinc-900 uppercase tracking-tight">
                {editingId ? 'Edit' : 'Add New'} {newType.replace('_', ' ')}
              </h2>
              <button onClick={() => { setNewType(null); setEditingId(null); }} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                <Plus size={20} className="rotate-45 text-zinc-400" />
              </button>
            </div>
            
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {newType === 'category' && (
                <div className="space-y-4">
                  <Input label="Category Name" value={formData.catName} onChange={(e) => setFormData({ ...formData, catName: e.target.value })} autoFocus />
                  <Input label="Sort Order" type="number" value={formData.catOrder} onChange={(e) => setFormData({ ...formData, catOrder: e.target.value })} />
                </div>
              )}
              {newType === 'item' && (
                <div className="space-y-4">
                  <Input label="Item Name" value={formData.itemName} onChange={(e) => setFormData({ ...formData, itemName: e.target.value })} autoFocus />
                  <Input label="Sort Order" type="number" value={formData.itemOrder} onChange={(e) => setFormData({ ...formData, itemOrder: e.target.value })} />
                </div>
              )}
              {newType === 'finding' && (
                <div className="space-y-4">
                  <Input label="Finding Short Title" value={formData.findShort} onChange={(e) => setFormData({ ...formData, findShort: e.target.value })} autoFocus />
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Long Description</label>
                    <textarea 
                      className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-black/5 outline-none min-h-[120px]"
                      value={formData.findLong}
                      onChange={(e) => setFormData({ ...formData, findLong: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Select label="Unit Type" value={formData.fldUnitType} onChange={(e: any) => setFormData({ ...formData, fldUnitType: e.target.value })} options={['IN', 'FT', 'LF', 'SF', '%', 'lbf', 'SEC'].map(u => ({ value: u, label: u }))} />
                    <Input label="Sort Order" type="number" value={formData.findOrder} onChange={(e) => setFormData({ ...formData, findOrder: e.target.value })} />
                  </div>
                </div>
              )}
              {newType === 'recommendation' && (
                <div className="space-y-4">
                  <Input label="Recommendation Short Title" value={formData.recShort} onChange={(e) => setFormData({ ...formData, recShort: e.target.value })} autoFocus />
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Long Description</label>
                    <textarea 
                      className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-black/5 outline-none min-h-[120px]"
                      value={formData.recLong}
                      onChange={(e) => setFormData({ ...formData, recLong: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <Input label="Unit Cost ($)" type="number" value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} />
                    <Select label="Cost Unit Type" value={formData.uom} onChange={(e: any) => setFormData({ ...formData, uom: e.target.value })} options={['EA', 'LF', 'SF', 'LS'].map(u => ({ value: u, label: u }))} />
                    <Input label="Sort Order" type="number" value={formData.recOrder} onChange={(e) => setFormData({ ...formData, recOrder: e.target.value })} />
                  </div>
                </div>
              )}
              {newType === 'glossary_record' && (
                <div className="space-y-6">
                  <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
                    <p className="text-xs text-indigo-700 font-medium">
                      This will create a new Finding and Recommendation entry and link them to the current Category/Item.
                    </p>
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Finding Details</h3>
                    <Input label="Finding Short Title" value={formData.findShort} onChange={(e) => setFormData({ ...formData, findShort: e.target.value })} />
                    <textarea 
                      className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-black/5 outline-none min-h-[80px]"
                      placeholder="Long Finding Description"
                      value={formData.findLong}
                      onChange={(e) => setFormData({ ...formData, findLong: e.target.value })}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <Select label="Unit Type" value={formData.fldUnitType} onChange={(e: any) => setFormData({ ...formData, fldUnitType: e.target.value })} options={['IN', 'FT', 'LF', 'SF', '%', 'lbf', 'SEC'].map(u => ({ value: u, label: u }))} />
                      <Input label="Finding Sort Order" type="number" value={formData.findOrder} onChange={(e) => setFormData({ ...formData, findOrder: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-4 pt-4 border-t border-zinc-100">
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Recommendation Details</h3>
                    <Input label="Recommendation Short Title" value={formData.recShort} onChange={(e) => setFormData({ ...formData, recShort: e.target.value })} />
                    <textarea 
                      className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-black/5 outline-none min-h-[80px]"
                      placeholder="Long Recommendation Description"
                      value={formData.recLong}
                      onChange={(e) => setFormData({ ...formData, recLong: e.target.value })}
                    />
                    <div className="grid grid-cols-3 gap-4">
                      <Input label="Unit Cost ($)" type="number" value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} />
                      <Select label="Cost Unit Type" value={formData.uom} onChange={(e: any) => setFormData({ ...formData, uom: e.target.value })} options={['EA', 'LF', 'SF', 'LS'].map(u => ({ value: u, label: u }))} />
                      <Input label="Rec Sort Order" type="number" value={formData.recOrder} onChange={(e) => setFormData({ ...formData, recOrder: e.target.value })} />
                    </div>
                  </div>
                </div>
              )}
              {newType === 'link_recommendation' && (
                <div className="space-y-4">
                  <Input 
                    label="Search Master Recommendations" 
                    placeholder="Type to filter..." 
                    value={formData.recShort} 
                    onChange={(e) => setFormData({ ...formData, recShort: e.target.value })}
                    autoFocus
                  />
                  <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto pr-2">
                    {filteredMasterRecs.length > 0 ? (
                      filteredMasterRecs.map(r => {
                        const recId = r.id || r.fldRecID;
                        return (
                          <button 
                            key={recId}
                            onClick={() => handleLinkRecommendation(recId)}
                            className="flex flex-col items-start p-3 text-left hover:bg-zinc-50 border border-zinc-100 rounded-xl transition-colors group"
                          >
                            <div className="flex items-center justify-between w-full">
                              <span className="text-sm font-bold text-zinc-900">{r.fldRecShort}</span>
                              <Plus size={14} className="text-zinc-400 group-hover:text-indigo-600" />
                            </div>
                            <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{r.fldRecLong}</p>
                          </button>
                        );
                      })
                    ) : (
                      <div className="p-8 text-center border border-dashed border-zinc-200 rounded-xl">
                        <p className="text-sm text-zinc-400">No matching recommendations found.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-zinc-100 bg-zinc-50/50 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => { setNewType(null); setEditingId(null); }}>Cancel</Button>
              {newType !== 'link_recommendation' && (
                <Button onClick={() => {
                  if (newType === 'category') saveNewCategory();
                  if (newType === 'item') saveNewItem();
                  if (newType === 'finding') saveNewFinding();
                  if (newType === 'recommendation') saveNewRecommendation();
                  if (newType === 'glossary_record') saveNewGlossaryRecord();
                }}>
                  {editingId ? 'Update' : 'Save'} {newType.replace('_', ' ')}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
      {relatedRecordModalOpen && relatedRecordSourceContext && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="related-record-modal-title"
            className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
              <h2
                id="related-record-modal-title"
                className="text-lg font-bold text-zinc-900 uppercase tracking-tight"
              >
                Create Related Glossary Record
              </h2>
              <button
                ref={relatedRecordModalCloseRef}
                type="button"
                onClick={closeRelatedRecordModal}
                className="p-2 hover:bg-zinc-100 rounded-full transition-colors"
                aria-label="Close"
              >
                <Plus size={20} className="rotate-45 text-zinc-400" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 space-y-2 text-sm">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Source context</p>
                <dl className="grid grid-cols-[minmax(7rem,auto)_1fr] gap-x-3 gap-y-1.5">
                  <dt className="text-zinc-500">Category</dt>
                  <dd className="font-medium text-zinc-900">{relatedRecordSourceContext.categoryName}</dd>
                  <dt className="text-zinc-500">Item</dt>
                  <dd className="font-medium text-zinc-900">{relatedRecordSourceContext.itemName}</dd>
                  <dt className="text-zinc-500">Finding</dt>
                  <dd className="font-medium text-zinc-900">{relatedRecordSourceContext.findShort}</dd>
                  <dt className="text-zinc-500">Recommendation</dt>
                  <dd className="font-medium text-zinc-900">{relatedRecordSourceContext.recShort}</dd>
                  <dt className="text-zinc-500">Glossary Set</dt>
                  <dd className="font-medium text-zinc-900">{relatedRecordSourceContext.glossarySetLabel}</dd>
                </dl>
              </div>

              <div className="rounded-xl border border-indigo-100 bg-indigo-50/80 p-3 text-xs text-indigo-900 leading-snug">
                A related row is a <span className="font-semibold">new glossary five-tuple</span> (category, item,
                finding, recommendation, glossary set). Choose a scenario below, edit the fields under your selection,
                then click <span className="font-semibold">Continue</span>. Cross-set related records use the Glossary
                Set dropdown and Prepare Target Set Records instead.
              </div>

              <fieldset className="space-y-2">
                <legend className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                  What do you want to create?
                </legend>
                {RELATED_RECORD_SCENARIO_OPTIONS.map((opt) => (
                  <div key={opt.id} className="space-y-2">
                    <label
                      className={cn(
                      'flex cursor-pointer gap-3 rounded-xl border p-3 transition-colors',
                      relatedRecordScenario === opt.id
                        ? 'border-indigo-400 bg-indigo-50/50 ring-1 ring-indigo-200'
                        : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50'
                    )}
                  >
                    <input
                      type="radio"
                      name="relatedRecordScenario"
                      className="mt-1 shrink-0"
                      checked={relatedRecordScenario === opt.id}
                      onChange={() => {
                        setRelatedRecordScenario(opt.id);
                        if (
                          opt.id === 'same_find_new_rec' ||
                          opt.id === 'new_find_same_rec' ||
                          opt.id === 'new_find_new_rec'
                        ) {
                          relatedPrefillKeyRef.current = '';
                          relatedFormTouchedRef.current = false;
                        }
                      }}
                    />
                    <span className="min-w-0 space-y-0.5">
                      <span className="block text-sm font-semibold text-zinc-900">{opt.title}</span>
                      <span className="block text-xs text-zinc-600">{opt.description}</span>
                      <span className="block text-[10px] font-medium text-indigo-700">{opt.futureMasters}</span>
                    </span>
                  </label>

                    {relatedRecordScenario === opt.id && opt.id === 'same_find_new_rec' && (
                      <div className="ml-2 space-y-4 rounded-xl border border-indigo-200 bg-white p-4 shadow-sm">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                    New master recommendation
                  </p>
                  <Input
                    label="Short title"
                    value={relatedNewRecShort}
                    onChange={(e) => {
                      markRelatedFormTouched();
                      setRelatedNewRecShort(e.target.value);
                    }}
                  />
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                      Long description
                    </label>
                    <textarea
                      className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-black/5 outline-none min-h-[100px]"
                      value={relatedNewRecLong}
                      onChange={(e) => {
                        markRelatedFormTouched();
                        setRelatedNewRecLong(e.target.value);
                      }}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <Input
                      label="Unit cost ($)"
                      type="number"
                      value={relatedNewRecUnit}
                      onChange={(e) => {
                        markRelatedFormTouched();
                        setRelatedNewRecUnit(e.target.value);
                      }}
                    />
                    <Select
                      label="Cost unit type"
                      value={relatedNewRecUom}
                      onChange={(e: any) => {
                        markRelatedFormTouched();
                        setRelatedNewRecUom(e.target.value);
                      }}
                      options={['EA', 'LF', 'SF', 'LS'].map((u) => ({ value: u, label: u }))}
                    />
                  </div>
                        <p className="text-[10px] text-zinc-500">
                          The finding is reused. Glossary citations hydrate from the reused finding master only
                          (not from the source glossary row or new recommendation); images are not copied. Duplicate
                          short titles are blocked.
                        </p>
                      </div>
                    )}

                    {relatedRecordScenario === opt.id && opt.id === 'new_find_same_rec' && (
                      <div className="ml-2 space-y-4 rounded-xl border border-indigo-200 bg-white p-4 shadow-sm">
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                          New master finding
                        </p>
                        <Input
                          label="Short title"
                          value={relatedNewFindShort}
                          onChange={(e) => {
                            markRelatedFormTouched();
                            setRelatedNewFindShort(e.target.value);
                          }}
                        />
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                            Long description
                          </label>
                          <textarea
                            className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-black/5 outline-none min-h-[100px]"
                            value={relatedNewFindLong}
                            onChange={(e) => {
                              markRelatedFormTouched();
                              setRelatedNewFindLong(e.target.value);
                            }}
                          />
                        </div>
                        <p className="text-[10px] text-zinc-500">
                          The recommendation is reused. Glossary citations hydrate from the reused recommendation master
                          only (not from the source glossary row or new finding); measurement fields copy from the source
                          finding; finding-level standards and images are not copied. Duplicate short titles are blocked.
                        </p>
                      </div>
                    )}

                    {relatedRecordScenario === opt.id && opt.id === 'new_find_new_rec' && (
                      <div className="ml-2 space-y-6 rounded-xl border border-indigo-200 bg-white p-4 shadow-sm">
                        <div className="space-y-4">
                          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                            New master finding
                          </p>
                          <Input
                            label="Short title"
                            value={relatedNewFindShort}
                            onChange={(e) => {
                              markRelatedFormTouched();
                              setRelatedNewFindShort(e.target.value);
                            }}
                          />
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                              Long description
                            </label>
                            <textarea
                              className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-black/5 outline-none min-h-[100px]"
                              value={relatedNewFindLong}
                              onChange={(e) => {
                                markRelatedFormTouched();
                                setRelatedNewFindLong(e.target.value);
                              }}
                            />
                          </div>
                        </div>
                        <div className="space-y-4 border-t border-zinc-100 pt-4">
                          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                            New master recommendation
                          </p>
                          <Input
                            label="Short title"
                            value={relatedNewRecShort}
                            onChange={(e) => {
                              markRelatedFormTouched();
                              setRelatedNewRecShort(e.target.value);
                            }}
                          />
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                              Long description
                            </label>
                            <textarea
                              className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-black/5 outline-none min-h-[100px]"
                              value={relatedNewRecLong}
                              onChange={(e) => {
                                markRelatedFormTouched();
                                setRelatedNewRecLong(e.target.value);
                              }}
                            />
                          </div>
                          <div className="grid grid-cols-3 gap-4">
                            <Input
                              label="Unit cost ($)"
                              type="number"
                              value={relatedNewRecUnit}
                              onChange={(e) => {
                                markRelatedFormTouched();
                                setRelatedNewRecUnit(e.target.value);
                              }}
                            />
                            <Select
                              label="Cost unit type"
                              value={relatedNewRecUom}
                              onChange={(e: any) => {
                                markRelatedFormTouched();
                                setRelatedNewRecUom(e.target.value);
                              }}
                              options={['EA', 'LF', 'SF', 'LS'].map((u) => ({ value: u, label: u }))}
                            />
                          </div>
                        </div>
                        <p className="text-[10px] text-zinc-500">
                          Both masters are new. Glossary row standards start empty (no hydration from source glossary
                          row); measurement fields copy from the source finding; images are not copied. Duplicate short
                          titles are blocked.
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </fieldset>
            </div>

            <div className="p-6 border-t border-zinc-100 bg-zinc-50/50 flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={closeRelatedRecordModal}>
                Cancel
              </Button>
              <Button
                type="button"
                disabled={!relatedRecordScenario || relatedRecordSaving}
                title={relatedRecordScenario ? undefined : 'Select a scenario first'}
                onClick={handleRelatedRecordContinue}
              >
                {relatedRecordSaving ? 'Saving...' : 'Continue'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Standards Section */}
      <div className="grid grid-cols-3 gap-6">
        <Card 
          className={cn(
            "p-6 transition-all duration-300 border-2 cursor-pointer",
            activeStandardTarget === 'finding' ? "bg-indigo-50/50 border-indigo-400 shadow-md ring-2 ring-indigo-200" : "bg-zinc-50/50 border-zinc-200 border-dashed opacity-80"
          )}
          onClick={() => setActiveStandardTarget?.('finding')}
          onDragOver={(e: React.DragEvent) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
          }}
          onDrop={(e: React.DragEvent) => handleDropStandard(e, 'finding')}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className={cn("p-1.5 rounded-lg", activeStandardTarget === 'finding' ? "bg-indigo-500 text-white" : "bg-zinc-200 text-zinc-500")}>
                <FileText size={14} />
              </div>
              <h3 className={cn("text-[10px] font-black uppercase tracking-widest", activeStandardTarget === 'finding' ? "text-indigo-900" : "text-zinc-500")}>Finding Standards</h3>
            </div>
            {activeStandardTarget === 'finding' && <div className="text-[9px] font-black text-indigo-500 animate-pulse uppercase">Active Target</div>}
            {activeStandardTarget !== 'finding' && <span className="text-[10px] font-bold text-zinc-400">Drag/Click to Target</span>}
          </div>
          <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
            {selectedFind ? (() => {
              if (!Array.isArray(stagedFindingStds) || stagedFindingStds.length === 0) return <p className="text-[10px] text-zinc-400 italic text-center py-2">No Finding Standards</p>;
              return sortStagedStandardIds(stagedFindingStds, standards).map((sid, idx) => {
                const s = standards?.find(st => (st.id || "").toLowerCase().trim() === (sid || "").toLowerCase().trim());
                const cite = formatStandardCitationLabel(s) ?? (String(sid || '').trim() || '—');
                const name = String(s?.citation_name ?? '').trim();
                const line = name ? `${cite} — ${name}` : cite;
                return (
                  <div key={`find-std-${sid}-${idx}`} className="flex items-center justify-between p-2 bg-white border border-zinc-200 rounded-lg group hover:border-indigo-300 transition-colors">
                    <span className="text-[10px] font-medium text-zinc-600 truncate" title={line}>{line}</span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); removeStandard('finding', sid); }} 
                      className="p-1 px-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                      title="Remove Finding citation"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                );
              });
            })() : (
              <p className="text-[10px] text-zinc-400 italic text-center py-4">Select finding to manage</p>
            )}
          </div>
        </Card>

        <Card 
          className={cn(
            "p-6 transition-all duration-300 border-2 cursor-pointer",
            activeStandardTarget === 'recommendation' ? "bg-indigo-50/50 border-indigo-400 shadow-md ring-2 ring-indigo-200" : "bg-zinc-50/50 border-zinc-200 border-dashed opacity-80"
          )}
          onClick={() => setActiveStandardTarget?.('recommendation')}
          onDragOver={(e: React.DragEvent) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
          }}
          onDrop={(e: React.DragEvent) => handleDropStandard(e, 'recommendation')}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className={cn("p-1.5 rounded-lg", activeStandardTarget === 'recommendation' ? "bg-indigo-500 text-white" : "bg-zinc-200 text-zinc-500")}>
                <ShieldCheck size={14} />
              </div>
              <h3 className={cn("text-[10px] font-black uppercase tracking-widest", activeStandardTarget === 'recommendation' ? "text-indigo-900" : "text-zinc-500")}>Rec Standards</h3>
            </div>
            {activeStandardTarget === 'recommendation' && <div className="text-[9px] font-black text-indigo-500 animate-pulse uppercase">Active Target</div>}
            {activeStandardTarget !== 'recommendation' && <span className="text-[10px] font-bold text-zinc-400">Drag/Click to Target</span>}
          </div>
          <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
            {selectedRec ? (() => {
              if (!Array.isArray(stagedRecStds) || stagedRecStds.length === 0) return <p className="text-[10px] text-zinc-400 italic text-center py-2">No Rec Standards</p>;
              return sortStagedStandardIds(stagedRecStds, standards).map((sid, idx) => {
                const s = standards?.find(st => (st.id || "").toLowerCase().trim() === (sid || "").toLowerCase().trim());
                const cite = formatStandardCitationLabel(s) ?? (String(sid || '').trim() || '—');
                const name = String(s?.citation_name ?? '').trim();
                const line = name ? `${cite} — ${name}` : cite;
                return (
                  <div key={`rec-std-${sid}-${idx}`} className="flex items-center justify-between p-2 bg-white border border-zinc-200 rounded-lg group hover:border-indigo-300 transition-colors">
                    <span className="text-[10px] font-medium text-zinc-600 truncate" title={line}>{line}</span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); removeStandard('recommendation', sid); }} 
                      className="p-1 px-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                      title="Remove Recommendation citation"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                );
              });
            })() : (
              <p className="text-[10px] text-zinc-400 italic text-center py-4">Select rec to manage</p>
            )}
          </div>
        </Card>

        <Card 
          className={cn(
            "p-6 transition-all duration-300 border-2",
            hasMinimumContext ? "cursor-pointer" : "cursor-not-allowed",
            activeStandardTarget === 'glossary' ? "bg-rose-50/50 border-rose-400 shadow-md ring-2 ring-rose-200" : "bg-rose-50/30 border-rose-100 opacity-80 border-dashed"
          )}
          onClick={() => {
            if (hasMinimumContext) {
              setActiveStandardTarget?.('glossary');
            } else {
              toast.info('Select Category, Item, Finding, and Recommendation before adding glossary citations.');
            }
          }}
          onDragOver={(e: React.DragEvent) => {
            if (!hasMinimumContext) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
          }}
          onDrop={(e: React.DragEvent) => {
            if (!hasMinimumContext) {
               toast.info('Select Category, Item, Finding, and Recommendation before adding glossary citations.');
               return;
            }
            handleDropStandard(e, 'glossary');
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className={cn("p-1.5 rounded-lg", activeStandardTarget === 'glossary' ? "bg-rose-500 text-white" : "bg-rose-200 text-rose-500")}>
                <Book size={14} />
              </div>
              <h3 className={cn("text-[10px] font-black uppercase tracking-widest", activeStandardTarget === 'glossary' ? "text-rose-900" : "text-rose-500")}>Glossary Record</h3>
            </div>
            {activeStandardTarget === 'glossary' && <div className="text-[9px] font-black text-rose-500 animate-pulse uppercase">Active Target</div>}
            {activeStandardTarget !== 'glossary' && <span className="text-[10px] font-bold text-rose-400 opacity-60">Snapshot Specific</span>}
          </div>
          <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
            {hasMinimumContext ? (() => {
              if (!Array.isArray(stagedGlosStds) || stagedGlosStds.length === 0) return <p className="text-[10px] text-rose-400 italic text-center py-2">No Glossary Overrides</p>;
              return sortStagedStandardIds(stagedGlosStds, standards).map((sid, idx) => {
                const s = standards?.find(st => (st.id || "").toLowerCase().trim() === (sid || "").toLowerCase().trim());
                const cite = formatStandardCitationLabel(s) ?? (String(sid || '').trim() || '—');
                const name = String(s?.citation_name ?? '').trim();
                const line = name ? `${cite} — ${name}` : cite;
                return (
                  <div key={`glos-std-${sid}-${idx}`} className="flex items-center justify-between p-2 bg-white border border-rose-100 rounded-lg group hover:border-rose-300 transition-colors">
                    <span className="text-[10px] font-medium text-zinc-600 truncate" title={line}>{line}</span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); removeStandard('glossary', sid); }} 
                      className="p-1 px-1.5 text-rose-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                      title="Remove Glossary specific citation"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                );
              });
            })() : (
              <p className="text-[10px] text-zinc-400 italic text-center py-4">Select context to manage</p>
            )}
          </div>
          <div className="mt-4 pt-2 border-t border-rose-100/50">
             <p className="text-[8px] text-rose-600 font-bold leading-tight">Note: Standard edits here apply only to the specific combination and DO NOT affect the Master Library Finding or Recommendation records.</p>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Camera size={16} className="text-zinc-400" />
            <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-widest">Glossary Photos</h3>
          </div>
          <div className="flex gap-2">
            <input type="file" multiple accept="image/*" className="hidden" id="master-image-upload" onChange={handleImageUpload} />
            <Button size="sm" variant="secondary" onClick={() => document.getElementById('master-image-upload')?.click()} disabled={!selectedCat || !selectedItem || !selectedFind || !selectedRec}>
              <Plus size={14} className="mr-1" /> Add Photos
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {images.map((url: string, idx: number) => (
            <div key={idx} className="relative aspect-square group">
              <img src={url} className="w-full h-full object-cover rounded-xl border border-zinc-200" referrerPolicy="no-referrer" />
              <button onClick={() => removeImage(idx)} className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                <X size={12} />
              </button>
            </div>
          ))}
          {images.length === 0 && (
            <div className="col-span-4 py-8 text-center border-2 border-dashed border-zinc-100 rounded-2xl">
              <p className="text-xs text-zinc-400 italic">No photos linked to this glossary record</p>
            </div>
          )}
        </div>
      </Card>

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <Modal 
          isOpen={!!confirmDelete} 
          onClose={() => setConfirmDelete(null)}
          title={confirmDelete.type === 'delete' ? 'Confirm Deletion' : 'Confirm Unassociation'}
        >
          <div className="space-y-4">
            <p className="text-sm text-zinc-600">
              Are you sure you want to {confirmDelete.type === 'delete' ? 'permanently delete' : 'unassociate'} <span className="font-bold text-zinc-900">{confirmDelete.label}</span>?
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setConfirmDelete(null)}>Cancel</Button>
              <Button variant="danger" onClick={handleDeleteAction}>
                {confirmDelete.type === 'delete' ? 'Delete Permanently' : 'Unassociate'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
