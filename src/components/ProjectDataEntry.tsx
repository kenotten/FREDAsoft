// @ts-nocheck
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { 
  Save, 
  Trash2, 
  Camera, 
  X, 
  Plus,
  Hash,
  Loader2,
  Book,
  AlertCircle,
  Undo,
  DollarSign,
  Edit2,
  ChevronLeft,
  ChevronRight,
  Copy
} from 'lucide-react';
import { doc, writeBatch } from 'firebase/firestore';
import { db, storage } from '../firebase';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { firestoreService } from '../services/firestoreService';
import { buildProjectDataCloneSeed, type ProjectDataCloneSeed } from '../lib/cloneProjectData';
import type { MasterStandard } from '../types';
import { compareStandardCitations, formatStandardCitationLabel } from '../lib/standardCitationLabel';
import { ImagePreviewModal } from './ui/ImagePreviewModal';
import { StandardCitationPreviewModal } from './ui/StandardCitationPreviewModal';
import { Input } from './ui/input';
import { Select } from './ui/select';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { StandardsBrowser } from './StandardsBrowser';
import { cn, sortEntities, formatCurrency, COST_UNIT_TYPES, MEASUREMENT_UNITS, compareEntities } from '../lib/utils';
import { v4 as uuidv4 } from 'uuid';
import { resizeImage } from '../lib/imageUtils';
import { toFraction, fromFraction } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const safeArray = (value: any): string[] => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return Object.values(value).filter(Boolean).map(String);
  return [];
};

const DATA_ENTRY_DRAFT_VERSION = 2;

function Modal({ title, children, onClose }: any) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
          <h2 className="text-lg font-bold text-zinc-900">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-zinc-200 rounded-full transition-colors">
            <X size={18} className="text-zinc-500" />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </motion.div>
    </div>
  );
}

function normalizeId(value: any): string {
  return String(value || '').trim().toLowerCase();
}

function recommendationMatches(rec: any, targetId: string): boolean {
  const t = normalizeId(targetId);
  if (!t) return false;
  return normalizeId(rec?.fldRecID) === t || normalizeId(rec?.id) === t;
}

function glossaryRecommendationMatches(g: any, recId: string): boolean {
  const t = normalizeId(recId);
  if (!t) return false;
  return normalizeId(g?.fldRec) === t || normalizeId(g?.fldRecID) === t;
}

function recordCitationDisplayLabel(standard: any | undefined, idFallback: string): string {
  const formatted = formatStandardCitationLabel(standard);
  if (formatted !== undefined && formatted !== '') return formatted;
  const fb = String(idFallback ?? '').trim();
  if (fb !== '') return fb;
  return 'Citation';
}

/** Local nav helpers: mirrors DataExplorer structural sort (category → location name → item) without shared module. */
function getGlossaryContextForNav(d: any, glossaryList: any[]) {
  if (!d?.fldData) return null;
  const cleanKey = String(d.fldData).trim().toLowerCase();
  return (glossaryList || []).find((g: any) => {
    const byGlos = String(g.fldGlosId || '').trim().toLowerCase() === cleanKey;
    const byId = String(g.id || '').trim().toLowerCase() === cleanKey;
    return byGlos || byId;
  });
}

function getRecordContextForNav(d: any, glossaryList: any[]) {
  const glos = getGlossaryContextForNav(d, glossaryList);
  if (glos) {
    return {
      catId: glos?.fldCat || 'uncategorized',
      itemId: glos?.fldItem || 'unspecified-item',
      findId: glos?.fldFind || 'unspecified-finding'
    };
  }
  if (d?.fldRecordSource === 'custom') {
    return {
      catId: String(d.fldPDataCategoryID || '').trim() || 'uncategorized',
      itemId: String(d.fldPDataItemID || '').trim() || 'unspecified-item',
      findId: ''
    };
  }
  return {
    catId: 'uncategorized',
    itemId: 'unspecified-item',
    findId: ''
  };
}

/** editingRecordId alone is not recoverable — require substantive form or selection context. */
function isRecoverableDataEntryDraft(parsed: any): boolean {
  if (!parsed || typeof parsed !== 'object') return false;
  const textAny =
    String(parsed.fldFindShort || '').trim() ||
    String(parsed.fldFindLong || '').trim() ||
    String(parsed.fldRecShort || '').trim() ||
    String(parsed.fldRecLong || '').trim();
  const qty = parsed.fldQTY;
  const qtyMeaningful = qty !== '' && qty !== undefined && qty !== null && Number(qty) !== 0;
  const meas = parsed.fldMeasurement;
  const measMeaningful = meas !== undefined && meas !== null && meas !== '';
  const imgs = Array.isArray(parsed.fldImages) && parsed.fldImages.length > 0;
  const std = safeArray(parsed.fldStandards).length > 0;
  const uc = parsed.fldUnitCost;
  const ucMeaningful =
    uc !== undefined && uc !== null && uc !== '' && !Number.isNaN(Number(uc)) && Number(uc) !== 0;
  if (textAny || qtyMeaningful || measMeaningful || imgs || std || ucMeaningful) return true;
  return false;
}

/** True when draft payload includes workspace fields (v2+). Legacy drafts omit these and must not be recovered. */
function hasDraftContextMetadata(parsed: any): boolean {
  if (!parsed || typeof parsed !== 'object') return false;
  return (
    Object.prototype.hasOwnProperty.call(parsed, 'clientId') &&
    Object.prototype.hasOwnProperty.call(parsed, 'projectId') &&
    Object.prototype.hasOwnProperty.call(parsed, 'facilityId')
  );
}

function ctxNorm(v: any): string {
  return String(v ?? '').trim().toLowerCase();
}

/**
 * Draft must match current workspace and new-vs-existing record mode.
 * For existing-record drafts, the record must exist in projectData and match project/facility.
 * User-id scoping can be added later if uid is passed into ProjectDataEntry.
 */
function isDraftContextCompatible(draft: any, selections: any, projectData: any[]): boolean {
  if (!hasDraftContextMetadata(draft)) return false;
  if (ctxNorm(draft.clientId) !== ctxNorm(selections?.clientId)) return false;
  if (ctxNorm(draft.projectId) !== ctxNorm(selections?.projectId)) return false;
  if (ctxNorm(draft.facilityId) !== ctxNorm(selections?.facilityId)) return false;

  const draftRid = String(draft.editingRecordId ?? '').trim();
  const curRid = String(selections?.editingRecordId ?? '').trim();
  const draftIsNew = !draftRid;
  const curIsNew = !curRid;
  if (draftIsNew !== curIsNew) return false;
  if (!draftIsNew && ctxNorm(draftRid) !== ctxNorm(curRid)) return false;

  if (!draftIsNew) {
    const rec = (projectData || []).find((d: any) => String(d?.fldPDataID || '').trim() === draftRid);
    if (!rec) return false;
    if (ctxNorm(rec.fldPDataProject) !== ctxNorm(selections?.projectId)) return false;
    if (ctxNorm(rec.fldFacility) !== ctxNorm(selections?.facilityId)) return false;
  }

  return true;
}

/** Persist only when recoverable and fully scoped (project + facility required). */
function isDraftPayloadPersistable(payload: any): boolean {
  if (!isRecoverableDataEntryDraft(payload)) return false;
  if (!hasDraftContextMetadata(payload)) return false;
  if (!ctxNorm(payload.projectId) || !ctxNorm(payload.facilityId)) return false;
  return true;
}

/**
 * Glossary-mode drafts must carry linkage so resume cannot yield unlinked saves.
 * Custom drafts skip this (category/item/text rules differ).
 */
function isGlossaryDraftLinkageSafe(parsed: any): boolean {
  if (!parsed || typeof parsed !== 'object') return false;
  if (parsed.dataEntryMode === 'custom') return true;
  if (String(parsed.glosId ?? '').trim()) return true;
  const s = parsed.selections && typeof parsed.selections === 'object' ? parsed.selections : {};
  const cat = String(s.categoryId ?? '').trim();
  const item = String(s.itemId ?? '').trim();
  const find = String(s.findId ?? '').trim();
  const rec = String(s.recId ?? '').trim();
  return Boolean(cat && item && find && rec);
}

export default function ProjectDataEntry({ 
  project = {}, facility = {}, inspector = {}, glossary = [], standards = [], projectData = [],
  onSave, onReset, items = [], findings = [], recommendations = [], masterRecommendations = [],
  unitTypes = [], mergedCategories = [], locations = [], selections = {}, onSelectionChange, onDirtyChange,
  onDeleteRecord,
  pendingCloneSeed = null,
  onPendingCloneSeedConsumed
}: any) {
  // Localized state management for the active record
  const activeRecord = useMemo(() => {
    if (!selections.editingRecordId) return null;
    return (projectData || []).find((d: any) => d.fldPDataID === selections.editingRecordId) || null;
  }, [projectData, selections.editingRecordId]);

  const editingRecordId = selections.editingRecordId;

  /** Scope StandardsBrowser UI (search + tree + item expand) per Data Entry record; sessionStorage-backed. */
  const dataEntryStandardsUiKey = useMemo(
    () => (editingRecordId ? `pd:${String(editingRecordId)}` : 'pd:new'),
    [editingRecordId]
  );

  const initialSelectionRef = useRef({
    categoryId: '',
    itemId: '',
    findId: '',
    recId: '',
    glosId: ''
  });

  /** After resuming a localStorage draft, skip one activeRecord hydration so form fields are not reset to server state. */
  const skipHydrationAfterDraftRef = useRef(false);
  const isFormDirtyRef = useRef(false);
  const isSavingRef = useRef(false);
  const clonePersistRef = useRef<{
    provenance: Record<string, unknown>;
    saveContext: ProjectDataCloneSeed['saveContext'];
  } | null>(null);
  const pendingCloneConsumeRef = useRef<(() => void) | undefined>(undefined);
  pendingCloneConsumeRef.current = onPendingCloneSeedConsumed;
  const buildDraftPayloadRef = useRef<() => Record<string, unknown>>(() => ({}));
  /** Avoid re-opening the same draft recovery modal when projectData refreshes without context change. */
  const draftRecoveryOfferedSigRef = useRef('');
  /** Tracks client|project|facility to detect workspace switches for Data Entry cleanup. */
  const prevWorkspaceKeyRef = useRef<string | null>(null);
  const lastContextCleanupToastAtRef = useRef(0);

  /** Approved glossary rows only: not soft-deleted, full Cat/Item/Find + Rec FKs. */
  const activeGlossaryRows = useMemo(() => {
    return (glossary || []).filter((g: any) => {
      if (g?.fldDeleted || g?.fldIsDeleted) return false;
      const cat = normalizeId(g.fldCat);
      const item = normalizeId(g.fldItem);
      const find = normalizeId(g.fldFind);
      const recA = normalizeId(g.fldRec);
      const recB = normalizeId(g.fldRecID);
      if (!cat || !item || !find) return false;
      if (!recA && !recB) return false;
      return true;
    });
  }, [glossary]);

  const approvedCategoryIds = useMemo(() => {
    const s = new Set<string>();
    activeGlossaryRows.forEach((g: any) => {
      const id = normalizeId(g.fldCat);
      if (id) s.add(id);
    });
    return s;
  }, [activeGlossaryRows]);

  const navRecords = useMemo(() => {
    const list = projectData || [];
    const activeProjectId = String(selections.projectId || '').trim().toLowerCase();
    const activeFacilityId = String(selections.facilityId || '').trim().toLowerCase();
    if (!activeProjectId || !activeFacilityId) return [];

    const filtered = list.filter((d: any) => {
      if (!d?.fldPDataID) return false;
      const recordProjectId = String(d.fldPDataProject || '').trim().toLowerCase();
      const recordFacilityId = String(d.fldFacility || '').trim().toLowerCase();
      return recordProjectId === activeProjectId && recordFacilityId === activeFacilityId;
    });

    const categories = mergedCategories || [];
    const itemsList = items || [];
    const locList = locations || [];

    return [...filtered].sort((a: any, b: any) => {
      const ctxA = getRecordContextForNav(a, glossary);
      const ctxB = getRecordContextForNav(b, glossary);
      const catA = categories.find((c: any) => c.fldCategoryID === ctxA.catId);
      const catB = categories.find((c: any) => c.fldCategoryID === ctxB.catId);
      const resCat = compareEntities(catA, catB, 'fldCategoryName');
      if (resCat !== 0) return resCat;

      const locA = (locList.find((l: any) => l.fldLocID === a.fldLocation)?.fldLocName || '').toLowerCase();
      const locB = (locList.find((l: any) => l.fldLocID === b.fldLocation)?.fldLocName || '').toLowerCase();
      const orderLoc = locA.localeCompare(locB);
      if (orderLoc !== 0) return orderLoc;

      const itemA = itemsList.find((i: any) => i.fldItemID === ctxA.itemId);
      const itemB = itemsList.find((i: any) => i.fldItemID === ctxB.itemId);
      return compareEntities(itemA, itemB, 'fldItemID');
    });
  }, [projectData, selections.projectId, selections.facilityId, glossary, mergedCategories, items, locations]);

  const navIndex = useMemo(() => {
    if (!editingRecordId) return -1;
    return navRecords.findIndex((d: any) => d.fldPDataID === editingRecordId);
  }, [navRecords, editingRecordId]);

  const hasRequiredContext = Boolean(selections.projectId && inspector?.fldInspID);
  
  /** Single source of truth: parent `selections.dataEntryMode` (persists across ProjectDataEntry remounts). */
  const dataEntryMode: 'glossary' | 'custom' = selections.dataEntryMode === 'custom' ? 'custom' : 'glossary';
  const [customMasterRecId, setCustomMasterRecId] = useState<string>('');
  const [customMasterFindId, setCustomMasterFindId] = useState<string>('');

  const selectedCat = selections.categoryId;
  const setSelectedCat = (val: string) => {
    if (!hasRequiredContext && val !== '') {
      toast.error('Select a project and inspector before entering data.');
      return;
    }
    // Cascading Reset: Clear everything downstream
    setFldFindShort('');
    setFldFindLong('');
    setFldRecShort('');
    setFldRecLong('');
    setFldMeasurementType('');
    setFldStandards([]);
    onSelectionChange({ 
      ...selections, 
      categoryId: val, 
      itemId: '', 
      findId: '', 
      recId: '', 
      glosId: '',
      standards: [],
      isDirty: true 
    });
    setCustomMasterRecId('');
    setCustomMasterFindId('');
  };

  const selectedItem = selections.itemId || '';
  const setSelectedItem = (val: string) => {
    // Cascading Reset: Clear downstream local state
    setFldFindShort('');
    setFldFindLong('');
    setFldRecShort('');
    setFldRecLong('');
    setFldMeasurementType('');
    setFldStandards([]);
    onSelectionChange({ ...selections, itemId: val, findId: '', recId: '', glosId: '', standards: [], isDirty: true });
    setCustomMasterRecId('');
    setCustomMasterFindId('');
  };
  
  const [fldImages, setFldImages] = useState<string[]>([]);
  const [fldStandards, setFldStandards] = useState<string[]>([]);
  const [fldQTY, setFldQTY] = useState<number | ''>(0);
  const [fldMeasurement, setFldMeasurement] = useState<number | ''>('');
  const [fldMeasurementUnit, setFldMeasurementUnit] = useState('');
  /** Snapshot field: not directly editable; set from library finding / template or hydrated from saved record */
  const [fldMeasurementType, setFldMeasurementType] = useState('');
  const [fldUnitType, setFldUnitType] = useState('Decimal');
  const [fldUnitCost, setFldUnitCost] = useState<number | ''>(0);
  const [fldTotalCost, setFldTotalCost] = useState<number | ''>(0);
  const [fldFindShort, setFldFindShort] = useState('');
  const [fldFindLong, setFldFindLong] = useState('');
  const [fldRecShort, setFldRecShort] = useState('');
  const [fldRecLong, setFldRecLong] = useState('');
  const [fldLocation, setFldLocation] = useState(selections.locationId || '');
  const [isDirty, setIsDirty] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const isFormDirty = useMemo(() => {
    if (activeRecord) {
      const init = initialSelectionRef.current;
      const localMeas = fldMeasurement === '' ? null : Number(fldMeasurement);
      const rawStoredMeas = activeRecord.fldMeasurement;
      const storedMeas =
        rawStoredMeas === null || rawStoredMeas === undefined || rawStoredMeas === ''
          ? null
          : Number(rawStoredMeas);
      const measDirty = localMeas !== storedMeas;
      return (
        (selections.categoryId || '') !== (init.categoryId || '') ||
        (selections.itemId || '') !== (init.itemId || '') ||
        (selections.findId || '') !== (init.findId || '') ||
        (selections.recId || '') !== (init.recId || '') ||
        fldFindShort !== (activeRecord.fldFindShort || '') ||
        fldFindLong !== (activeRecord.fldFindLong || '') ||
        fldRecShort !== (activeRecord.fldRecShort || '') ||
        fldRecLong !== (activeRecord.fldRecLong || '') ||
        (fldQTY === '' ? 0 : Number(fldQTY)) !== (activeRecord.fldQTY || 0) ||
        measDirty ||
        (fldMeasurementType || '') !== (activeRecord.fldMeasurementType || '') ||
        fldMeasurementUnit !== (activeRecord.fldMeasurementUnit || '') ||
        fldUnitType !== (activeRecord.fldUnitType || 'Decimal') ||
        (fldUnitCost === '' ? 0 : Number(fldUnitCost)) !== (activeRecord.fldUnitCost || 0) ||
        // fldTotalCost is derived from fldUnitCost * fldQTY (see effect below). Comparing to
        // activeRecord.fldTotalCost caused false DIRTY when stored totals lagged or differed.
        fldLocation !== (activeRecord.fldLocation || '') ||
        JSON.stringify(fldImages) !== JSON.stringify(activeRecord.fldImages || []) ||
        JSON.stringify(safeArray(fldStandards)) !== JSON.stringify(safeArray(activeRecord.fldStandards))
      );
    } else {
      return (
        fldFindShort !== '' ||
        fldFindLong !== '' ||
        fldRecShort !== '' ||
        fldRecLong !== '' ||
        (fldQTY !== 0 && fldQTY !== '') ||
        fldMeasurement !== '' ||
        fldUnitType !== 'Decimal' ||
        fldImages.length > 0 ||
        safeArray(fldStandards).length > 0 ||
        (Number(fldUnitCost) || 0) !== 0
      );
    }
  }, [
    activeRecord, selections.categoryId, selections.itemId, selections.findId, selections.recId,
    fldFindShort, fldFindLong, fldRecShort, fldRecLong,
    fldQTY, fldMeasurement, fldMeasurementType, fldMeasurementUnit, fldUnitType, fldUnitCost, fldLocation, fldImages, fldStandards
  ]);

  useEffect(() => {
    if (typeof onDirtyChange === 'function') onDirtyChange(isFormDirty);
    return () => {
      if (typeof onDirtyChange === 'function') onDirtyChange(false);
    };
  }, [isFormDirty, onDirtyChange]);

  useEffect(() => {
    isFormDirtyRef.current = isFormDirty;
  }, [isFormDirty]);

  const buildDraftPayload = useCallback(() => {
    const rid = selections.editingRecordId ?? null;
    const ridStr = rid != null && String(rid).trim() !== '' ? String(rid).trim() : '';
    return {
      draftVersion: DATA_ENTRY_DRAFT_VERSION,
      timestamp: new Date().toISOString(),
      clientId: selections.clientId || '',
      projectId: selections.projectId || '',
      facilityId: selections.facilityId || '',
      /**
       * Per-user draft scoping: add `uid` when ProjectDataEntry receives auth user id from parent.
       * `recordKey` is `new` vs normalized id for debugging; compatibility uses `editingRecordId`.
       */
      recordKey: ridStr ? normalizeId(ridStr) : 'new',
      editingRecordId: selections.editingRecordId ?? null,
      glosId: String(selections.glosId ?? ''),
      dataEntryMode: selections.dataEntryMode === 'custom' ? 'custom' : 'glossary',
      customMasterRecId,
      customMasterFindId,
      selections: {
        categoryId: selections.categoryId,
        itemId: selections.itemId,
        findId: selections.findId,
        recId: selections.recId,
        locationId: selections.locationId
      },
      fldFindShort,
      fldFindLong,
      fldRecShort,
      fldRecLong,
      fldQTY,
      fldMeasurement,
      fldMeasurementType,
      fldMeasurementUnit,
      fldUnitType,
      fldLocation,
      fldImages,
      fldStandards,
      fldUnitCost,
      fldTotalCost
    };
  }, [
    selections,
    customMasterRecId,
    customMasterFindId,
    fldFindShort,
    fldFindLong,
    fldRecShort,
    fldRecLong,
    fldQTY,
    fldMeasurement,
    fldMeasurementType,
    fldMeasurementUnit,
    fldUnitType,
    fldLocation,
    fldImages,
    fldStandards,
    fldUnitCost,
    fldTotalCost
  ]);

  useEffect(() => {
    buildDraftPayloadRef.current = buildDraftPayload;
  }, [buildDraftPayload]);

  /** Flush dirty state on unmount (tab switch) so edits survive before interval/debounce fires. */
  useEffect(() => {
    return () => {
      if (!isFormDirtyRef.current) return;
      if (isSavingRef.current) return;
      try {
        const payload = buildDraftPayloadRef.current();
        if (!isDraftPayloadPersistable(payload)) return;
        localStorage.setItem('fredasoft_draft', JSON.stringify(payload));
      } catch {
        /* ignore quota errors */
      }
    };
  }, []);

  const focusClasses = "focus:border-amber-500 focus:bg-green-50 focus:ring-amber-500/10";

  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [editingLoc, setEditingLoc] = useState<any>(null);
  const [newLocName, setNewLocName] = useState('');
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [savedDraft, setSavedDraft] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [citationPreview, setCitationPreview] = useState<{
    id: string;
    standard: MasterStandard | null;
  } | null>(null);

  // Workspace / record guard: clear stale Data Entry when project/facility/client changes, record is ghosted,
  // or the loaded record does not belong to the current project/facility.
  useEffect(() => {
    const proj = String(selections?.projectId || '').trim();
    const fac = String(selections?.facilityId || '').trim();
    if (!proj || !fac) return;

    const workspaceKey = `${ctxNorm(selections?.clientId)}|${ctxNorm(proj)}|${ctxNorm(fac)}`;
    const rid = String(selections?.editingRecordId ?? '').trim();
    const ghost = Boolean(rid) && !activeRecord;
    const projMismatch =
      Boolean(activeRecord) &&
      Boolean(project?.fldProjID) &&
      ctxNorm(activeRecord.fldPDataProject) !== ctxNorm(project.fldProjID);
    const facMismatch =
      Boolean(activeRecord) &&
      Boolean(facility?.fldFacID) &&
      ctxNorm(activeRecord.fldFacility) !== ctxNorm(facility.fldFacID);

    const hadPrevWorkspace = prevWorkspaceKeyRef.current !== null;
    const workspaceChanged = hadPrevWorkspace && prevWorkspaceKeyRef.current !== workspaceKey;
    if (!hadPrevWorkspace) {
      prevWorkspaceKeyRef.current = workspaceKey;
    } else if (workspaceChanged) {
      prevWorkspaceKeyRef.current = workspaceKey;
    }

    const shouldCleanup = workspaceChanged || ghost || projMismatch || facMismatch;
    if (!shouldCleanup) return;

    const hadRecordOrDirty = Boolean(rid) || isFormDirtyRef.current;

    try {
      localStorage.removeItem('fredasoft_draft');
    } catch {
      /* ignore */
    }
    draftRecoveryOfferedSigRef.current = '';
    setShowRecoveryModal(false);
    setSavedDraft(null);
    clonePersistRef.current = null;
    isFormDirtyRef.current = false;
    setIsDirty(false);
    initialSelectionRef.current = {
      categoryId: '',
      itemId: '',
      findId: '',
      recId: '',
      glosId: ''
    };

    setFldFindShort('');
    setFldFindLong('');
    setFldRecShort('');
    setFldRecLong('');
    setFldQTY(0);
    setFldMeasurement('');
    setFldMeasurementType('');
    setFldMeasurementUnit('');
    setFldUnitType('Decimal');
    setFldUnitCost(0);
    setFldTotalCost(0);
    setFldLocation('');
    setFldImages([]);
    setFldStandards([]);
    setCustomMasterRecId('');
    setCustomMasterFindId('');

    onSelectionChange({
      ...selections,
      editingRecordId: null,
      itemId: '',
      findId: '',
      recId: '',
      glosId: '',
      images: [],
      standards: [],
      isDirty: false,
      locationId: '',
      locationName: ''
    });

    const shouldToast =
      ghost ||
      projMismatch ||
      facMismatch ||
      (workspaceChanged && hadRecordOrDirty);
    const now = Date.now();
    if (
      shouldToast &&
      now - lastContextCleanupToastAtRef.current > 2000
    ) {
      lastContextCleanupToastAtRef.current = now;
      toast.info('Project/facility changed; previous record was closed.');
    }
  }, [
    selections.clientId,
    selections.projectId,
    selections.facilityId,
    selections.editingRecordId,
    activeRecord,
    project?.fldProjID,
    facility?.fldFacID,
    onSelectionChange
  ]);

  // Switching to custom mode clears glossary-only selection state.
  // New custom record: drop glossary links and any citation snapshot inherited from a glossary row.
  // Existing records preserve projectData.fldStandards (handled in activeRecord hydration).
  useEffect(() => {
    if (selections.dataEntryMode !== 'custom') return;
    const hadGlossaryLinks = Boolean(
      (selections.findId || '').trim() ||
      (selections.recId || '').trim() ||
      (selections.glosId || '').trim()
    );
    if (activeRecord) {
      if (hadGlossaryLinks) {
        onSelectionChange({ ...selections, findId: '', recId: '', glosId: '', isDirty: true });
      }
      return;
    }
    if (hadGlossaryLinks) {
      setFldStandards([]);
      setFldMeasurementType('');
      setFldMeasurementUnit('');
      onSelectionChange({
        ...selections,
        findId: '',
        recId: '',
        glosId: '',
        standards: [],
        isDirty: true
      });
    }
  }, [
    selections.dataEntryMode,
    activeRecord?.fldPDataID,
    selections.findId,
    selections.recId,
    selections.glosId
  ]);

  /** Resolves glossary row from category → item → finding → recommendation path (raw FKs; rec matches fldRec or fldRecID). */
  const resolveGlossaryForSelection = (recIdOverride?: string) => {
    const cat = normalizeId(selections.categoryId);
    const item = normalizeId(selections.itemId);
    const find = normalizeId(selections.findId);
    const recRaw = recIdOverride !== undefined ? recIdOverride : selections.recId;
    const rec = normalizeId(recRaw);
    if (!cat || !item || !find || !rec) return undefined;
    return (activeGlossaryRows || []).find((g: any) =>
      normalizeId(g.fldCat) === cat &&
      normalizeId(g.fldItem) === item &&
      normalizeId(g.fldFind) === find &&
      glossaryRecommendationMatches(g, recRaw)
    );
  };

  /** Hydrate from a single approved glossary row (rec master + costs + selections.glosId). */
  const applyGlossaryRecommendationRow = (gRow: any, forceHydrateCosts = false) => {
    if (!gRow) return;
    const recIdRaw = gRow.fldRec || gRow.fldRecID;
    const rec = (masterRecommendations || []).find((r: any) => recommendationMatches(r, recIdRaw));
    if (!rec) return;

    setFldRecShort(rec.fldRecShort || '');
    setFldRecLong(rec.fldRecLong || '');
    if (dataEntryMode === 'glossary' && !activeRecord) {
      // New glossary record: inherit citation snapshot from glossary row
      setFldStandards(safeArray(gRow.fldStandards));
    }
    // Existing records preserve projectData.fldStandards — do not overwrite from glossary row here.

    const glos = gRow;
    const shouldHydrateCosts = forceHydrateCosts || !activeRecord;

    if (shouldHydrateCosts) {
      const unitCost = glos?.fldUnitCost ?? rec.fldUnit ?? 0;
      const unitType = glos?.fldUnitType ?? rec.fldUOM ?? 'EA';

      setFldUnitCost(unitCost);
      setFldUnitType(unitType);

      if (unitType === 'LS') {
        setFldQTY(1);
        setFldTotalCost(unitCost);
      } else {
        const currentQty = (fldQTY === 0 || fldQTY === '') ? 1 : Number(fldQTY);
        if (fldQTY === 0 || fldQTY === '') setFldQTY(1);
        setFldTotalCost(unitCost * currentQty);
      }
    }

    const masterRecId = rec.fldRecID || rec.id;
    onSelectionChange({
      ...selections,
      recId: masterRecId,
      glosId: glos?.fldGlosId || glos?.id || '',
      isDirty: true
    });

    setIsDirty(true);
  };

  /** Match hydration's server baseline for initialSelectionRef (dirty vs selection path) without resetting form fields. */
  const syncInitialSelectionRefFromRecord = useCallback((rec: any | null) => {
    if (!rec) {
      initialSelectionRef.current = {
        categoryId: '',
        itemId: '',
        findId: '',
        recId: '',
        glosId: ''
      };
      return;
    }
    const fldDataBlank = !(rec.fldData || '').trim();
    const hasPDataCatItem =
      !!(rec.fldPDataCategoryID || '').trim() && !!(rec.fldPDataItemID || '').trim();
    const isCustom =
      rec.fldRecordSource === 'custom' ||
      (fldDataBlank && hasPDataCatItem);
    let newSelections: any;
    if (isCustom) {
      newSelections = {
        categoryId: rec.fldPDataCategoryID || '',
        itemId: rec.fldPDataItemID || '',
        findId: '',
        recId: '',
        glosId: ''
      };
    } else {
      const targetId = (rec.fldData || '').trim().toLowerCase();
      const glos = (glossary || []).find(
        (g: any) => (g.id || g.fldGlosId || '').trim().toLowerCase() === targetId
      );
      newSelections = {
        categoryId: glos?.fldCat || '',
        itemId: glos?.fldItem || '',
        findId: glos?.fldFind || '',
        recId: glos?.fldRec || glos?.fldRecID || '',
        glosId: glos?.fldGlosId || glos?.id || ''
      };
    }
    initialSelectionRef.current = {
      categoryId: newSelections.categoryId || '',
      itemId: newSelections.itemId || '',
      findId: newSelections.findId || '',
      recId: newSelections.recId || '',
      glosId: newSelections.glosId || ''
    };
  }, [glossary]);

  /** Same selection keys as activeRecord hydration (Reset to Original / baseline). */
  const buildHydrationSelectionsFromRecord = useCallback(
    (rec: any, prev: any) => {
      if (!rec) return prev;
      const fldDataBlank = !(rec.fldData || '').trim();
      const hasPDataCatItem =
        !!(rec.fldPDataCategoryID || '').trim() && !!(rec.fldPDataItemID || '').trim();
      const isCustom =
        rec.fldRecordSource === 'custom' ||
        (fldDataBlank && hasPDataCatItem);
      if (isCustom) {
        return {
          ...prev,
          dataEntryMode: 'custom' as const,
          locationId: rec.fldLocation || prev.locationId,
          categoryId: rec.fldPDataCategoryID || prev.categoryId || '',
          itemId: rec.fldPDataItemID || prev.itemId || '',
          findId: '',
          recId: '',
          glosId: '',
          isDirty: false
        };
      }
      const targetId = (rec.fldData || '').trim().toLowerCase();
      const glos = (glossary || []).find(
        (g: any) => (g.id || g.fldGlosId || '').trim().toLowerCase() === targetId
      );
      return {
        ...prev,
        dataEntryMode: 'glossary' as const,
        locationId: rec.fldLocation || prev.locationId,
        categoryId: glos?.fldCat || prev.categoryId || '',
        itemId: glos?.fldItem || prev.itemId || '',
        findId: glos?.fldFind || prev.findId || '',
        recId: glos?.fldRec || glos?.fldRecID || prev.recId || '',
        glosId: glos?.fldGlosId || glos?.id || '',
        isDirty: false
      };
    },
    [glossary]
  );

  const applyCloneFromSeed = useCallback(
    (seed: ProjectDataCloneSeed) => {
      skipHydrationAfterDraftRef.current = true;
      try {
        localStorage.removeItem('fredasoft_draft');
      } catch {
        /* ignore */
      }
      draftRecoveryOfferedSigRef.current = '';
      setShowRecoveryModal(false);
      setSavedDraft(null);

      clonePersistRef.current = {
        provenance: { ...seed.provenance },
        saveContext: { ...seed.saveContext }
      };

      setCustomMasterFindId(seed.customMasterFindId);
      setCustomMasterRecId(seed.customMasterRecId);

      const mergedSel = {
        ...selections,
        ...seed.selections,
        editingRecordId: null,
        locationId: '',
        locationName: '',
        images: [],
        standards: [...seed.form.fldStandards],
        isDirty: true
      };
      onSelectionChange(mergedSel);

      initialSelectionRef.current = {
        categoryId: seed.selections.categoryId || '',
        itemId: seed.selections.itemId || '',
        findId: seed.selections.findId || '',
        recId: seed.selections.recId || '',
        glosId: seed.selections.glosId || ''
      };

      setFldFindShort(seed.form.fldFindShort);
      setFldFindLong(seed.form.fldFindLong);
      setFldRecShort(seed.form.fldRecShort);
      setFldRecLong(seed.form.fldRecLong);
      setFldQTY(0);
      setFldMeasurement('');
      setFldMeasurementType('');
      setFldMeasurementUnit('');
      setFldUnitType(seed.form.fldUnitType);
      setFldUnitCost(seed.form.fldUnitCost);
      setFldTotalCost(0);
      setFldLocation('');
      setFldImages([]);
      setFldStandards([...seed.form.fldStandards]);
      setIsDirty(true);
    },
    [onSelectionChange, selections]
  );

  useEffect(() => {
    if (!pendingCloneSeed) return;
    applyCloneFromSeed(pendingCloneSeed);
    pendingCloneConsumeRef.current?.();
  }, [pendingCloneSeed, applyCloneFromSeed]);

  // Recovery: when workspace is known, validate draft context before offering recovery.
  useEffect(() => {
    const proj = String(selections?.projectId || '').trim();
    const fac = String(selections?.facilityId || '').trim();
    if (!proj || !fac) return;
    if (isSavingRef.current) return;

    const draft = localStorage.getItem('fredasoft_draft');
    if (!draft) {
      draftRecoveryOfferedSigRef.current = '';
      return;
    }
    try {
      const parsed = JSON.parse(draft);
      if (!isRecoverableDataEntryDraft(parsed)) {
        localStorage.removeItem('fredasoft_draft');
        draftRecoveryOfferedSigRef.current = '';
        return;
      }
      const draftRidEarly = String(parsed.editingRecordId ?? '').trim();
      if (draftRidEarly && !(projectData || []).length) {
        return;
      }
      if (!isDraftContextCompatible(parsed, selections, projectData)) {
        localStorage.removeItem('fredasoft_draft');
        draftRecoveryOfferedSigRef.current = '';
        toast.info('Old draft discarded because it belonged to another context or is outdated.');
        return;
      }
      if (parsed.dataEntryMode !== 'custom' && !isGlossaryDraftLinkageSafe(parsed)) {
        localStorage.removeItem('fredasoft_draft');
        draftRecoveryOfferedSigRef.current = '';
        setShowRecoveryModal(false);
        setSavedDraft(null);
        toast.info('Incomplete draft was discarded.');
        return;
      }
      const ctxKey = `${ctxNorm(selections?.clientId)}|${ctxNorm(proj)}|${ctxNorm(fac)}|${ctxNorm(selections?.editingRecordId)}`;
      if (draftRecoveryOfferedSigRef.current === ctxKey) return;
      draftRecoveryOfferedSigRef.current = ctxKey;
      setSavedDraft(parsed);
      setShowRecoveryModal(true);
    } catch {
      localStorage.removeItem('fredasoft_draft');
      draftRecoveryOfferedSigRef.current = '';
    }
  }, [
    selections.projectId,
    selections.facilityId,
    selections.clientId,
    selections.editingRecordId,
    projectData
  ]);

  useEffect(() => {
    return () => {
      draftRecoveryOfferedSigRef.current = '';
    };
  }, []);

  // Debounced draft write when the form is dirty (do not wait for the 5s interval).
  useEffect(() => {
    if (!isFormDirty) return;
    const t = setTimeout(() => {
      try {
        if (!isFormDirtyRef.current) return;
        if (isSavingRef.current) return;
        const payload = buildDraftPayload();
        if (!isDraftPayloadPersistable(payload)) return;
        localStorage.setItem('fredasoft_draft', JSON.stringify(payload));
      } catch {
        /* quota */
      }
    }, 350);
    return () => clearTimeout(t);
  }, [isFormDirty, buildDraftPayload]);

  // Periodic backup while dirty (same payload as flush/debounce).
  useEffect(() => {
    if (!isFormDirty) return;
    const interval = setInterval(() => {
      try {
        if (!isFormDirtyRef.current) return;
        if (isSavingRef.current) return;
        const payload = buildDraftPayload();
        if (!isDraftPayloadPersistable(payload)) return;
        localStorage.setItem('fredasoft_draft', JSON.stringify(payload));
      } catch {
        /* quota */
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [isFormDirty, buildDraftPayload]);

  const handleResumeDraft = () => {
    if (!savedDraft) return;
    const d: any = savedDraft;
    if (!isRecoverableDataEntryDraft(d)) {
      localStorage.removeItem('fredasoft_draft');
      setShowRecoveryModal(false);
      setSavedDraft(null);
      draftRecoveryOfferedSigRef.current = '';
      toast.info('Draft was incomplete and was discarded.');
      return;
    }
    if (!isDraftContextCompatible(d, selections, projectData)) {
      localStorage.removeItem('fredasoft_draft');
      setShowRecoveryModal(false);
      setSavedDraft(null);
      draftRecoveryOfferedSigRef.current = '';
      toast.info('Draft no longer matches this workspace and was discarded.');
      return;
    }
    if (d.dataEntryMode !== 'custom' && !isGlossaryDraftLinkageSafe(d)) {
      localStorage.removeItem('fredasoft_draft');
      setShowRecoveryModal(false);
      setSavedDraft(null);
      draftRecoveryOfferedSigRef.current = '';
      toast.info('Incomplete draft was discarded.');
      return;
    }

    skipHydrationAfterDraftRef.current = true;

    const mergedSel: any = {
      ...selections,
      ...(d.selections || {}),
      editingRecordId:
        d.editingRecordId !== undefined && d.editingRecordId !== null && d.editingRecordId !== ''
          ? d.editingRecordId
          : selections.editingRecordId,
      glosId: d.glosId !== undefined ? d.glosId : selections.glosId || '',
      dataEntryMode:
        d.dataEntryMode === 'custom'
          ? 'custom'
          : d.dataEntryMode === 'glossary'
            ? 'glossary'
            : selections.dataEntryMode === 'custom'
              ? 'custom'
              : 'glossary',
      isDirty: false
    };

    onSelectionChange(mergedSel);

    setFldFindShort(d.fldFindShort || '');
    setFldFindLong(d.fldFindLong || '');
    setFldRecShort(d.fldRecShort || '');
    setFldRecLong(d.fldRecLong || '');
    setFldQTY(d.fldQTY ?? 0);
    setFldMeasurement(d.fldMeasurement ?? '');
    setFldMeasurementType(d.fldMeasurementType || '');
    setFldMeasurementUnit(d.fldMeasurementUnit || '');
    setFldUnitType(d.fldUnitType || 'Decimal');
    setFldUnitCost(d.fldUnitCost ?? 0);
    setFldTotalCost(d.fldTotalCost ?? 0);
    setFldLocation(d.fldLocation || '');
    setFldImages(Array.isArray(d.fldImages) ? d.fldImages : []);
    setFldStandards(safeArray(d.fldStandards));
    setCustomMasterRecId(d.customMasterRecId || '');
    setCustomMasterFindId(d.customMasterFindId || '');

    const rid = mergedSel.editingRecordId;
    const rec =
      rid && String(rid).trim()
        ? (projectData || []).find((x: any) => x.fldPDataID === rid)
        : null;
    syncInitialSelectionRefFromRecord(rec);

    localStorage.removeItem('fredasoft_draft');
    setShowRecoveryModal(false);
    setSavedDraft(null);
    setIsDirty(true);
    toast.success('Draft recovered');
  };

  const handleDiscardDraft = () => {
    localStorage.removeItem('fredasoft_draft');
    draftRecoveryOfferedSigRef.current = '';
    setShowRecoveryModal(false);
    setSavedDraft(null);
    toast.info('Draft discarded');
  };

  useEffect(() => {
    if (skipHydrationAfterDraftRef.current) {
      skipHydrationAfterDraftRef.current = false;
      return;
    }
    if (activeRecord) {
      console.log("Hydrating Form with:", activeRecord);
      const fldDataBlank = !(activeRecord.fldData || '').trim();
      const hasPDataCatItem =
        !!(activeRecord.fldPDataCategoryID || '').trim() && !!(activeRecord.fldPDataItemID || '').trim();
      const isCustom =
        activeRecord.fldRecordSource === 'custom' ||
        (fldDataBlank && hasPDataCatItem);
      let newSelections: any = { ...selections };
      if (isCustom) {
        newSelections = {
          ...selections,
          dataEntryMode: 'custom',
          locationId: activeRecord.fldLocation || selections.locationId,
          categoryId: activeRecord.fldPDataCategoryID || selections.categoryId || '',
          itemId: activeRecord.fldPDataItemID || selections.itemId || '',
          findId: '',
          recId: '',
          glosId: ''
        };
        setCustomMasterRecId(activeRecord.fldPDataMasterRecID || '');
        setCustomMasterFindId(activeRecord.fldPDataMasterFindID || '');
      } else {
        // BLUEPRINT-ACCURATE POPULATION (Glossary)
        const targetId = (activeRecord.fldData || "").trim().toLowerCase();
        const glos = (glossary || []).find((g: any) => (g.id || g.fldGlosId || "").trim().toLowerCase() === targetId);
        newSelections = {
          ...selections,
          dataEntryMode: 'glossary',
          locationId: activeRecord.fldLocation || selections.locationId,
          categoryId: glos?.fldCat || selections.categoryId || '',
          itemId: glos?.fldItem || selections.itemId || '',
          findId: glos?.fldFind || selections.findId || '',
          recId: glos?.fldRec || glos?.fldRecID || selections.recId || '',
          glosId: glos?.fldGlosId || glos?.id || ''
        };
        setCustomMasterRecId('');
        setCustomMasterFindId('');
      }

      initialSelectionRef.current = {
        categoryId: newSelections.categoryId || '',
        itemId: newSelections.itemId || '',
        findId: newSelections.findId || '',
        recId: newSelections.recId || '',
        glosId: newSelections.glosId || ''
      };

      onSelectionChange(newSelections);
      console.log("Selections set to:", newSelections);

      setFldFindShort(activeRecord.fldFindShort || '');
      setFldFindLong(activeRecord.fldFindLong || '');
      setFldRecShort(activeRecord.fldRecShort || '');
      setFldRecLong(activeRecord.fldRecLong || '');
      setFldQTY(activeRecord.fldQTY || 0);
      setFldMeasurement(activeRecord.fldMeasurement ?? '');
      setFldMeasurementType(activeRecord.fldMeasurementType || '');
      setFldMeasurementUnit(activeRecord.fldMeasurementUnit || '');
      setFldUnitType(activeRecord.fldUnitType || 'Decimal');
      setFldUnitCost(activeRecord.fldUnitCost || 0);
      setFldTotalCost(activeRecord.fldTotalCost || 0);
      setFldLocation(activeRecord.fldLocation || '');
      setFldImages(Array.isArray(activeRecord.fldImages) ? activeRecord.fldImages : []);
      // Existing records preserve projectData.fldStandards
      setFldStandards(safeArray(activeRecord.fldStandards));
      setIsDirty(false);
    } else {
      initialSelectionRef.current = {
        categoryId: '',
        itemId: '',
        findId: '',
        recId: '',
        glosId: ''
      };
      // Inheritance Lock: Initialize from selections if new record
      if (selections.locationId) setFldLocation(selections.locationId);
    }
  }, [
    activeRecord?.fldPDataID,
    activeRecord?.fldRecordSource,
    activeRecord?.fldData,
    activeRecord?.fldPDataCategoryID,
    activeRecord?.fldPDataItemID,
    activeRecord?.fldPDataMasterRecID,
    activeRecord?.fldPDataMasterFindID,
    activeRecord?.fldMeasurementType,
    glossary
  ]);

  // Live calculation logic
  useEffect(() => {
    const cost = Number(fldUnitCost) || 0;
    const qty = Number(fldQTY) || 0;
    setFldTotalCost(cost * qty);
  }, [fldUnitCost, fldQTY]);

  const handleSave = async () => {
    if (!hasRequiredContext) {
      toast.error('Select a project and inspector before saving.');
      return;
    }
    if (!fldLocation) { toast.error('Location is required'); return; }
    if (!inspector?.fldInspID) { toast.error('Inspector context is missing. Please select an inspector in Setup.'); return; }
    
    // Ensure we have a valid ID before saving
    const finalizedId = editingRecordId || uuidv4();
    const wasExisting = Boolean(editingRecordId && String(editingRecordId).trim());

    const isCustomMode = selections.dataEntryMode === 'custom';

    if (isCustomMode) {
      const hasCat = Boolean((selections.categoryId || '').trim());
      const hasItem = Boolean((selections.itemId || '').trim());
      const hasFindingText = Boolean((fldFindShort || '').trim() || (fldFindLong || '').trim());
      const hasRecText = Boolean((fldRecShort || '').trim() || (fldRecLong || '').trim());

      if (!hasCat) { toast.error('Category is required for a custom record.'); return; }
      if (!hasItem) { toast.error('Item is required for a custom record.'); return; }
      if (!hasFindingText) { toast.error('Finding Summary or Finding Detailed Description is required.'); return; }
      if (!hasRecText) { toast.error('Recommendation Summary or Recommendation Detailed Description is required.'); return; }
    }

    const resolvedGlossary = isCustomMode ? undefined : resolveGlossaryForSelection();
    const hasFullPath = !!(
      (selections.categoryId || '').trim() &&
      (selections.itemId || '').trim() &&
      (selections.findId || '').trim() &&
      (selections.recId || '').trim()
    );
    if (!isCustomMode && hasFullPath && !resolvedGlossary) {
      toast.error('Unable to save: selected finding/recommendation is not linked to a glossary record.');
      return;
    }

    const fldDataResolved = isCustomMode
      ? ''
      : (
          resolvedGlossary?.fldGlosId ||
          resolvedGlossary?.id ||
          selections.glosId ||
          activeRecord?.fldData ||
          ''
        );
    
    isSavingRef.current = true;
    try {
      const basePayload: any = {
        fldPDataID: finalizedId,
        fldPDataProject: selections.projectId,
        fldFacility: facility?.fldFacID || activeRecord?.fldFacility,
        fldData: fldDataResolved,
        fldRecordSource: isCustomMode ? 'custom' : 'glossary',
        ...(isCustomMode ? {
          fldPDataCategoryID: selections.categoryId || '',
          fldPDataItemID: selections.itemId || '',
          ...(customMasterFindId ? { fldPDataMasterFindID: customMasterFindId } : {}),
          ...(customMasterRecId ? { fldPDataMasterRecID: customMasterRecId } : {})
        } : {}),
        fldLocation,
        fldFindShort,
        fldFindLong,
        fldRecShort,
        fldRecLong,
        fldQTY: Number(fldQTY) || 0,
        fldMeasurement: fldMeasurement === '' ? null : Number(fldMeasurement),
        fldMeasurementType: fldMeasurementType || '',
        fldMeasurementUnit,
        fldUnitCost: Number(fldUnitCost) || 0,
        fldUnitType,
        fldTotalCost: Number(fldTotalCost) || 0,
        fldImages,
        fldStandards: safeArray(fldStandards),
        fldInspID: inspector.fldInspID,
        fldTimestamp: new Date().toISOString()
      };

      const cp = clonePersistRef.current;
      if (!wasExisting && cp?.saveContext) {
        const facFromCtx = facility?.fldFacID || cp.saveContext.fldFacility;
        if (facFromCtx) {
          basePayload.fldFacility = facFromCtx;
        }
        if (!isCustomMode && !String(basePayload.fldData || '').trim() && cp.saveContext.fldData) {
          basePayload.fldData = cp.saveContext.fldData;
        }
      }
      if (!wasExisting && cp?.provenance && Object.keys(cp.provenance).length > 0) {
        Object.assign(basePayload, cp.provenance);
      }

      await onSave(basePayload);
      clonePersistRef.current = null;
    } catch {
      isSavingRef.current = false;
      return;
    }

    try {
      try {
        localStorage.removeItem('fredasoft_draft');
      } catch {
        /* ignore */
      }
      setShowRecoveryModal(false);
      setSavedDraft(null);
      isFormDirtyRef.current = false;
      const projSave = String(selections?.projectId || '').trim();
      const facSave = String(selections?.facilityId || '').trim();
      if (projSave && facSave) {
        draftRecoveryOfferedSigRef.current = `${ctxNorm(selections?.clientId)}|${ctxNorm(projSave)}|${ctxNorm(facSave)}|${ctxNorm(selections?.editingRecordId)}`;
      } else {
        draftRecoveryOfferedSigRef.current = '';
      }

      if (wasExisting) {
        setIsDirty(false);
        initialSelectionRef.current = {
          categoryId: selections.categoryId || '',
          itemId: selections.itemId || '',
          findId: selections.findId || '',
          recId: selections.recId || '',
          glosId: selections.glosId || ''
        };
        onSelectionChange({
          ...selections,
          locationId: fldLocation,
          editingRecordId: finalizedId,
          isDirty: false
        });
        return;
      }

      setFldFindShort('');
      setFldFindLong('');
      setFldRecShort('');
      setFldRecLong('');
      setFldQTY(0);
      setFldMeasurement('');
      setFldMeasurementType('');
      setFldMeasurementUnit('');
      setFldUnitType('Decimal');
      setFldUnitCost(0);
      setFldTotalCost(0);
      setFldImages([]);
      setFldStandards([]);

      setIsDirty(false);
      onSelectionChange({
        ...selections,
        categoryId: selections.categoryId,
        locationId: fldLocation,
        itemId: '',
        findId: '',
        recId: '',
        glosId: '',
        standards: [],
        images: [],
        editingRecordId: null,
        isDirty: false
      });
      setCustomMasterRecId('');
      setCustomMasterFindId('');
    } finally {
      isSavingRef.current = false;
    }
  };

  const confirmAction = (title: string, message: string, action: () => void) => {
    if (isFormDirty) {
      setConfirmModal({
        isOpen: true,
        title,
        message,
        onConfirm: () => {
          action();
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      });
    } else {
      action();
    }
  };

  const navigateToRecord = (targetId: string) => {
    confirmAction(
      'Switch record',
      'You have unsaved changes. Switching records will discard unsaved edits unless you save first. Continue?',
      () =>
        onSelectionChange({
          ...selections,
          editingRecordId: targetId,
          isDirty: false
        })
    );
  };

  const handleNavPrev = () => {
    if (navIndex <= 0) return;
    const prev = navRecords[navIndex - 1];
    if (!prev?.fldPDataID) return;
    navigateToRecord(prev.fldPDataID);
  };

  const handleNavNext = () => {
    if (navIndex < 0 || navIndex >= navRecords.length - 1) return;
    const next = navRecords[navIndex + 1];
    if (!next?.fldPDataID) return;
    navigateToRecord(next.fldPDataID);
  };

  const handleClearForm = () => {
    confirmAction(
      "Clear Form",
      "You have unsaved changes. Are you sure you want to discard them and clear the form?",
      () => {
        // 1. Wipe all record-specific local state
        setFldFindShort('');
        setFldFindLong('');
        setFldRecShort('');
        setFldRecLong('');
        setFldQTY(0);
        setFldMeasurement('');
        setFldMeasurementType('');
        setFldMeasurementUnit('');
        setFldUnitType('Decimal');
        setFldUnitCost(0);
        setFldTotalCost(0);
        setFldImages([]);
        setFldStandards([]);
        
        // 2. Reset baseline for unsaved changes baseline
        isFormDirtyRef.current = false;
        setIsDirty(false);
        localStorage.removeItem('fredasoft_draft');
        setShowRecoveryModal(false);
        setSavedDraft(null);
        draftRecoveryOfferedSigRef.current = '';
        clonePersistRef.current = null;

        // 3. Update global selections to drop identity and downstream links
        // Retain: projectId, facilityId, categoryId, locationId, inspectorId
        onSelectionChange({
          ...selections,
          editingRecordId: '', // Drops the link to the existing record
          itemId: '', 
          findId: '', 
          recId: '',
          standards: [],
          images: [],
          isDirty: false
        });
        
        toast.info('Form reset to brand-new record state');
      }
    );
  };

  const handleResetToOriginal = () => {
    if (!activeRecord) return;
    confirmAction(
      "Reset to Original",
      "You have unsaved changes. Are you sure you want to revert to the original record state?",
      () => {
        isFormDirtyRef.current = false;

        const fldDataBlank = !(activeRecord.fldData || '').trim();
        const hasPDataCatItem =
          !!(activeRecord.fldPDataCategoryID || '').trim() &&
          !!(activeRecord.fldPDataItemID || '').trim();
        const isCustom =
          activeRecord.fldRecordSource === 'custom' ||
          (fldDataBlank && hasPDataCatItem);
        if (isCustom) {
          setCustomMasterRecId(activeRecord.fldPDataMasterRecID || '');
          setCustomMasterFindId(activeRecord.fldPDataMasterFindID || '');
        } else {
          setCustomMasterRecId('');
          setCustomMasterFindId('');
        }

        const newSel = buildHydrationSelectionsFromRecord(activeRecord, selections);
        syncInitialSelectionRefFromRecord(activeRecord);
        onSelectionChange(newSel);

        setFldFindShort(activeRecord.fldFindShort || '');
        setFldFindLong(activeRecord.fldFindLong || '');
        setFldRecShort(activeRecord.fldRecShort || '');
        setFldRecLong(activeRecord.fldRecLong || '');
        setFldQTY(activeRecord.fldQTY || 0);
        setFldMeasurement(activeRecord.fldMeasurement ?? '');
        setFldMeasurementType(activeRecord.fldMeasurementType || '');
        setFldMeasurementUnit(activeRecord.fldMeasurementUnit || '');
        setFldUnitType(activeRecord.fldUnitType || 'Decimal');
        setFldUnitCost(activeRecord.fldUnitCost || 0);
        setFldTotalCost(activeRecord.fldTotalCost || 0);
        setFldLocation(activeRecord.fldLocation || '');
        setFldImages(Array.isArray(activeRecord.fldImages) ? activeRecord.fldImages : []);
        setFldStandards(safeArray(activeRecord.fldStandards));
        localStorage.removeItem('fredasoft_draft');
        setShowRecoveryModal(false);
        setSavedDraft(null);
        draftRecoveryOfferedSigRef.current = '';
        setIsDirty(false);
        toast.info('Restored to original');
      }
    );
  };

  const handleCancelEdit = () => {
    confirmAction(
      "Cancel Edit",
      "You have unsaved changes. Are you sure you want to cancel editing and switch to a new record?",
      () => {
        isFormDirtyRef.current = false;
        onReset(); // This should set editingRecordId to null in parent
        setFldFindShort('');
        setFldFindLong('');
        setFldRecShort('');
        setFldRecLong('');
        setFldQTY(0);
        setFldMeasurement('');
        setFldMeasurementType('');
        setFldMeasurementUnit('');
        setFldUnitType('Decimal');
        setFldUnitCost(0);
        setFldTotalCost(0);
        setFldImages([]);
        setFldStandards([]);
        setIsDirty(false);
        localStorage.removeItem('fredasoft_draft');
        setShowRecoveryModal(false);
        setSavedDraft(null);
        draftRecoveryOfferedSigRef.current = '';
        toast.info('Edit cancelled');
      }
    );
  };

  /** After a successful Firestore delete: same local wipe as cancel + parent new-record selections (onReset keeps sticky category/location). */
  const resetDataEntryAfterRecordDeleted = () => {
    isFormDirtyRef.current = false;
    setFldFindShort('');
    setFldFindLong('');
    setFldRecShort('');
    setFldRecLong('');
    setFldQTY(0);
    setFldMeasurement('');
    setFldMeasurementType('');
    setFldMeasurementUnit('');
    setFldUnitType('Decimal');
    setFldUnitCost(0);
    setFldTotalCost(0);
    setFldImages([]);
    setFldStandards([]);
    setCustomMasterRecId('');
    setCustomMasterFindId('');
    setIsDirty(false);
    try {
      localStorage.removeItem('fredasoft_draft');
    } catch {
      /* ignore */
    }
    setShowRecoveryModal(false);
    setSavedDraft(null);
    draftRecoveryOfferedSigRef.current = '';
    onReset();
    onSelectionChange((prev: any) => ({ ...prev, standards: [] }));
  };

  const handleCloneActiveRecord = () => {
    if (!activeRecord) return;
    const seed = buildProjectDataCloneSeed(activeRecord, glossary);
    confirmAction(
      'Clone record',
      'Start a new unsaved record as a copy of this one? Unsaved edits to the current form will be discarded.',
      () => {
        applyCloneFromSeed(seed);
      }
    );
  };

  const handleRequestDeleteRecord = () => {
    if (!activeRecord || !onDeleteRecord) return;
    const rid = String(editingRecordId || '').trim();
    if (!rid) return;
    const id = String(activeRecord.fldPDataID || '').trim();
    if (!id || id !== rid) return;
    onDeleteRecord(id, {
      title: 'Delete project data record',
      message:
        'This inspection record will be moved to deleted records and hidden from Data Entry and Data Explorer. Its data stays in the project until you restore it from the dashboard Trash Bin (admin) or it is removed by maintenance cleanup.',
      afterDelete: resetDataEntryAfterRecordDeleted
    });
  };

  const handleAddLocation = async (name: string) => {
    if (!name || !selections.projectId) {
      toast.error('Project context is required to add locations.');
      return;
    }
    try {
      const newLoc = {
        fldLocID: uuidv4(),
        fldLocName: name,
        fldFacID: selections.facilityId || '',
        fldProjectID: selections.projectId
      };
      
      console.log(`[Location Tool] Attempting to add: "${name}" to Project: ${selections.projectId}`);
      
      // VITAL: Ensure the write is awaited before proceeding
      await firestoreService.save('locations', newLoc, newLoc.fldLocID);
      
      // Dropdown Sync: Update local state and app-level selections
      setFldLocation(newLoc.fldLocID);
      onSelectionChange({ ...selections, locationId: newLoc.fldLocID });
      
      toast.success(`Location [${name}] successfully added.`);
      console.log(`[Location Tool] Success: ${name} (ID: ${newLoc.fldLocID})`);
    } catch (error) {
      console.error('[Location Tool] Error:', error);
      toast.error('Failed to add location. Check console for details.');
    }
  };

  const handleUpdateLocation = async (locId: string, newName: string) => {
    try {
      const batch = writeBatch(db);
      batch.update(doc(db, 'locations', locId), { fldLocName: newName });
      
      // Cascade update to projectData records for this project
      projectData.forEach(d => {
        if (d.fldLocation === locId) {
          batch.update(doc(db, 'projectData', d.fldPDataID), { 
            fldLocation: locId,
            fldLocationName: newName // Ensure denormalized name is updated for exports
          });
        }
      });
      
      await batch.commit();
      toast.success('Location updated');
    } catch (error) {
      toast.error('Failed to update location');
    }
  };

  const handleDeleteLocation = async (locId: string) => {
    try {
      await firestoreService.softDelete('locations', locId);
      if (fldLocation === locId) setFldLocation('');
      toast.success('Location removed');
    } catch (error) {
      toast.error('Failed to remove location');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (!selections.projectId) {
      toast.error('Project context is required to upload images.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setIsUploading(true);
    let uploaded = 0;
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;
        const dataUrl = await resizeImage(file);
        const path = `project-data/${selections.projectId}/${uuidv4()}.jpg`;
        const storageRef = ref(storage, path);
        await uploadString(storageRef, dataUrl, 'data_url');
        const url = await getDownloadURL(storageRef);
        setFldImages((prev) => [...prev, url]);
        uploaded++;
      }
      if (uploaded > 0) {
        setIsDirty(true);
        toast.success(uploaded === 1 ? 'Image uploaded' : `${uploaded} images uploaded`);
      } else {
        toast.error('No valid image files selected');
      }
    } catch (error) {
      console.error('[ProjectDataEntry] Image upload:', error);
      toast.error('Image upload failed');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
      setIsUploading(false);
    }
  };

  const handleRemoveImage = (url: string) => {
    setFldImages((prev) => prev.filter((u) => u !== url));
    setIsDirty(true);
  };

  const facilityLocations = (Array.isArray(locations) ? locations : [])
    .filter(l => (l.fldProjectID === selections.projectId || (l.fldFacID && l.fldFacID === selections.facilityId)) && !l.fldIsDeleted)
    .sort((a, b) => a.fldLocName.localeCompare(b.fldLocName));

  const displayFldStandards = useMemo(() => {
    const ids = safeArray(fldStandards);
    const withIndex = ids.map((id, index) => {
      const standard = (standards || []).find(
        (st: any) => normalizeId(st.id) === normalizeId(id)
      );
      return { id, index, standard };
    });

    return withIndex
      .sort((a, b) => {
        const c = compareStandardCitations(a.standard, b.standard);
        if (c !== 0) return c;
        return a.index - b.index;
      })
      .map((entry) => entry.id);
  }, [fldStandards, standards]);

  const addRecordCitation = (standardId: string) => {
    const canonical = (standards || []).find(
      (st: any) => normalizeId(st.id) === normalizeId(standardId)
    );
    const idToStore = canonical?.id ?? standardId;
    if (!idToStore) return;
    setFldStandards((prev) => {
      const arr = safeArray(prev);
      if (arr.some((id) => normalizeId(id) === normalizeId(idToStore))) return arr;
      return [...arr, idToStore];
    });
    setIsDirty(true);
  };

  const removeRecordCitation = (standardId: string) => {
    setFldStandards((prev) =>
      safeArray(prev).filter((id) => normalizeId(id) !== normalizeId(standardId))
    );
    setIsDirty(true);
  };

  const handleRecordCitationsDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleRecordCitationsDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const standardId = e.dataTransfer.getData('standardId');
    if (!standardId) return;
    addRecordCitation(standardId);
  };

  const handleAddRecordCitation = (standard: any) => {
    if (!standard?.id) return;
    addRecordCitation(standard.id);
  };

  /** Glossary rows matching current Cat + Item + Finding (approved set only). */
  const rowsForPath = useMemo(() => {
    if (!selections.findId || !selections.itemId || !selections.categoryId) return [];
    return activeGlossaryRows.filter(
      (g: any) =>
        normalizeId(g.fldCat) === normalizeId(selections.categoryId) &&
        normalizeId(g.fldItem) === normalizeId(selections.itemId) &&
        normalizeId(g.fldFind) === normalizeId(selections.findId)
    );
  }, [activeGlossaryRows, selections.findId, selections.itemId, selections.categoryId]);

  /** One option per glossary row; value = fldGlosId || doc id for stable selection + fldData. */
  const recommendationOptions = useMemo(() => {
    const out: { value: string; label: string; key: string }[] = [];
    const seenGlos = new Set<string>();
    for (const g of rowsForPath) {
      const glosKey = normalizeId(g.fldGlosId || g.id);
      if (!glosKey || seenGlos.has(glosKey)) continue;
      const recRaw = g.fldRec || g.fldRecID;
      const rec = (masterRecommendations || []).find((r: any) => recommendationMatches(r, recRaw));
      if (!rec) continue;
      seenGlos.add(glosKey);
      out.push({
        value: g.fldGlosId || g.id,
        label: rec.fldRecShort || 'Recommendation',
        key: `rec-gl-${glosKey}`
      });
    }
    return out.sort((a, b) => a.label.localeCompare(b.label));
  }, [rowsForPath, masterRecommendations]);

  const recommendationSelectValue = useMemo(() => {
    const opts = recommendationOptions;
    if (!opts.length) return '';
    if (selections.glosId && opts.some((o) => normalizeId(o.value) === normalizeId(selections.glosId))) {
      return selections.glosId;
    }
    if (selections.recId && rowsForPath.length) {
      const row = rowsForPath.find((g: any) => glossaryRecommendationMatches(g, selections.recId));
      return row ? row.fldGlosId || row.id : '';
    }
    return '';
  }, [selections.glosId, selections.recId, recommendationOptions, rowsForPath]);

  // Handle auto-selection of recommendation when exactly one glossary-backed option exists
  useEffect(() => {
    if (!selections.findId || selections.recId || recommendationOptions.length !== 1) return;
    const only = recommendationOptions[0];
    const gRow = rowsForPath.find(
      (g: any) => normalizeId(g.fldGlosId || g.id) === normalizeId(only.value)
    );
    if (gRow) applyGlossaryRecommendationRow(gRow, false);
  }, [selections.findId, selections.recId, recommendationOptions, rowsForPath]);

  const sortedCategories = useMemo(
    () =>
      sortEntities(
        (Array.isArray(mergedCategories) ? mergedCategories : []).filter((c: any) =>
          approvedCategoryIds.has(normalizeId(c.fldCategoryID || c.fldCatID))
        ),
        'fldCategoryName'
      ),
    [mergedCategories, approvedCategoryIds]
  );

  const sortedItems = useMemo(() => {
    if (!selectedCat) return [];
    const approvedItemIds = new Set(
      activeGlossaryRows
        .filter((g: any) => normalizeId(g.fldCat) === normalizeId(selectedCat))
        .map((g: any) => normalizeId(g.fldItem))
        .filter(Boolean)
    );
    return sortEntities(
      (Array.isArray(items) ? items : []).filter(
        (i: any) => i && approvedItemIds.has(normalizeId(i.fldItemID || i.id))
      ),
      'fldItemName'
    );
  }, [items, selectedCat, activeGlossaryRows]);

  const sortedFindings = useMemo(() => {
    if (!selectedItem || !selectedCat) return [];
    const approvedFindIds = new Set(
      activeGlossaryRows
        .filter(
          (g: any) =>
            normalizeId(g.fldCat) === normalizeId(selectedCat) &&
            normalizeId(g.fldItem) === normalizeId(selectedItem)
        )
        .map((g: any) => normalizeId(g.fldFind))
        .filter(Boolean)
    );
    return sortEntities(
      (Array.isArray(findings) ? findings : []).filter((f: any) => {
        if (!f) return false;
        const fid = normalizeId(f.fldFindID || f.id);
        return fid && approvedFindIds.has(fid);
      }),
      'fldFindShort'
    );
  }, [findings, selectedItem, selectedCat, activeGlossaryRows]);

  const selectedFinding = useMemo(() => {
    const id = (selections.findId || '').toLowerCase().trim();
    if (!id) return undefined;
    return (findings || []).find(
      (f) => (f.fldFindID || f.id || '').toLowerCase().trim() === id
    );
  }, [findings, selections.findId]);

  const selectedFindingMeasurementType = selectedFinding?.fldMeasurementType || '';

  /** New glossary records: keep measurement snapshot fields aligned with selected finding (findings may load after selections). */
  useEffect(() => {
    if (activeRecord) return;
    if (dataEntryMode !== 'glossary') return;
    const id = normalizeId(selections.findId);
    if (!id) {
      setFldMeasurementType('');
      setFldMeasurementUnit('');
      return;
    }
    const find = (findings || []).find(
      (f: any) => normalizeId(f.fldFindID || f.id) === id
    );
    if (!find) return;
    setFldMeasurementType(find.fldMeasurementType || '');
    setFldMeasurementUnit(find.fldUnitType || '');
  }, [activeRecord, dataEntryMode, selections.findId, findings]);

  const activeFindingsList = useMemo(
    () => (findings || []).filter((f: any) => !f?.fldDeleted && !f?.fldIsDeleted),
    [findings]
  );

  const customTemplateFinding = useMemo(() => {
    const id = normalizeId(customMasterFindId);
    if (!id) return undefined;
    return activeFindingsList.find(
      (x: any) => normalizeId(x.fldFindID || x.id) === id
    );
  }, [customMasterFindId, activeFindingsList]);

  /** Library Finding used to backfill fldMeasurementType / fldMeasurementUnit (not glossary cost fldUnitType). */
  const libraryFindingForMeasurementSync = useMemo(() => {
    if (!activeRecord) return undefined;
    const findingsList = Array.isArray(findings) ? findings : [];

    const fldDataBlank = !String(activeRecord.fldData || '').trim();
    const hasPDataCatItem =
      !!String(activeRecord.fldPDataCategoryID || '').trim() &&
      !!String(activeRecord.fldPDataItemID || '').trim();
    const isCustomRecord =
      activeRecord.fldRecordSource === 'custom' || (fldDataBlank && hasPDataCatItem);

    if (isCustomRecord) {
      const mid =
        normalizeId(activeRecord.fldPDataMasterFindID) || normalizeId(customMasterFindId);
      if (!mid) return undefined;
      return findingsList.find((f: any) => normalizeId(f?.fldFindID || f?.id) === mid);
    }

    const dataKey = normalizeId(activeRecord.fldData);
    if (!dataKey) return undefined;
    const gRow = (glossary || []).find((g: any) => {
      const gid = normalizeId(g?.fldGlosId || g?.id);
      return gid === dataKey;
    });
    if (!gRow) return undefined;
    const findFk = normalizeId(gRow.fldFind);
    if (!findFk) return undefined;
    return findingsList.find((f: any) => normalizeId(f?.fldFindID || f?.id) === findFk);
  }, [activeRecord, glossary, findings, customMasterFindId]);

  const showSyncMeasurementFromLibrary = useMemo(() => {
    if (!activeRecord) return false;
    const typeBlank = !String(fldMeasurementType || '').trim();
    const unitBlank = !String(fldMeasurementUnit || '').trim();
    if (!typeBlank && !unitBlank) return false;
    const src = libraryFindingForMeasurementSync;
    if (!src) return false;
    const canType = typeBlank && !!String(src.fldMeasurementType || '').trim();
    const canUnit = unitBlank && !!String(src.fldUnitType || '').trim();
    return canType || canUnit;
  }, [
    activeRecord,
    fldMeasurementType,
    fldMeasurementUnit,
    libraryFindingForMeasurementSync
  ]);

  const handleSyncMeasurementFromLibrary = () => {
    const src = libraryFindingForMeasurementSync;
    if (!src || !activeRecord) {
      toast.info('No library finding available to sync measurement metadata.');
      return;
    }
    let did = false;
    if (!String(fldMeasurementType || '').trim() && String(src.fldMeasurementType || '').trim()) {
      setFldMeasurementType(String(src.fldMeasurementType).trim());
      did = true;
    }
    if (!String(fldMeasurementUnit || '').trim() && String(src.fldUnitType || '').trim()) {
      setFldMeasurementUnit(String(src.fldUnitType).trim());
      did = true;
    }
    if (!did) {
      toast.info('No measurement metadata available from the library finding.');
      return;
    }
    setIsDirty(true);
    toast.success('Measurement fields updated from library finding. Save to persist.');
  };

  const displayMeasurementTypeReadonly = useMemo(() => {
    const trimmed = (fldMeasurementType || '').trim();
    if (trimmed) return trimmed;
    if (!activeRecord && dataEntryMode === 'glossary') {
      return (selectedFindingMeasurementType || '').trim() || '(Not set)';
    }
    if (!activeRecord && dataEntryMode === 'custom') {
      return (customTemplateFinding?.fldMeasurementType || '').trim() || '(Not set)';
    }
    return '(Not set)';
  }, [
    fldMeasurementType,
    activeRecord,
    dataEntryMode,
    selectedFindingMeasurementType,
    customTemplateFinding
  ]);

  const usableGlossaryTemplateRows = useMemo(
    () => (glossary || []).filter((g: any) => !g?.fldDeleted && !g?.fldIsDeleted),
    [glossary]
  );

  const masterRecsActive = useMemo(
    () => (masterRecommendations || []).filter((r: any) => !r?.fldDeleted && !r?.fldIsDeleted),
    [masterRecommendations]
  );

  const sortFindingsForTemplate = (arr: any[]) =>
    [...arr].sort((a: any, b: any) => {
      const oa = a.fldOrder ?? 999;
      const ob = b.fldOrder ?? 999;
      if (oa !== ob) return oa - ob;
      return (a.fldFindShort || '').localeCompare(b.fldFindShort || '', undefined, { sensitivity: 'base' });
    });

  const sortRecsForTemplate = (arr: any[]) =>
    [...arr].sort((a: any, b: any) => {
      const oa = a.fldOrder ?? 999;
      const ob = b.fldOrder ?? 999;
      if (oa !== ob) return oa - ob;
      return (a.fldRecShort || '').localeCompare(b.fldRecShort || '', undefined, { sensitivity: 'base' });
    });

  const categoryLabelById = useMemo(() => {
    const m = new Map<string, string>();
    (mergedCategories || []).forEach((c: any) => {
      const id = normalizeId(c?.fldCategoryID || c?.fldCatID);
      if (!id) return;
      m.set(id, String(c?.fldCategoryName || c?.fldCatName || 'Uncategorized'));
    });
    return m;
  }, [mergedCategories]);

  const customFindingGroups = useMemo(() => {
    const catId = normalizeId(selections.categoryId);
    const itemId = normalizeId(selections.itemId);
    const all = activeFindingsList;
    const byCategoryBuckets = (rows: any[]) => {
      const grouped = new Map<string, { label: string; rows: any[] }>();
      rows.forEach((f: any) => {
        const item = (items || []).find((i: any) => normalizeId(i.fldItemID) === normalizeId(f.fldItem));
        const cid = normalizeId(item?.fldCatID);
        const label = cid ? (categoryLabelById.get(cid) || 'Uncategorized') : 'Uncategorized';
        const key = cid || 'uncategorized';
        if (!grouped.has(key)) grouped.set(key, { label, rows: [] });
        grouped.get(key)!.rows.push(f);
      });
      return Array.from(grouped.values())
        .map((g) => ({ label: g.label, rows: sortFindingsForTemplate(g.rows) }))
        .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
    };
    if (!catId || !itemId) {
      return { g1: [] as any[], g2: [] as any[], g3ByCategory: byCategoryBuckets(all) };
    }
    const g1 = all.filter((f: any) => normalizeId(f.fldItem) === itemId);
    const g1Keys = new Set(g1.map((f: any) => normalizeId(f.fldFindID || f.id)));
    const g2 = all.filter((f: any) => {
      if (normalizeId(f.fldItem) === itemId) return false;
      const item = (items || []).find((i: any) => normalizeId(i.fldItemID) === normalizeId(f.fldItem));
      return !!(item && normalizeId(item.fldCatID) === catId);
    });
    const g2Keys = new Set(g2.map((f: any) => normalizeId(f.fldFindID || f.id)));
    const inG12 = (f: any) =>
      g1Keys.has(normalizeId(f.fldFindID || f.id)) || g2Keys.has(normalizeId(f.fldFindID || f.id));
    const g3 = all.filter((f: any) => !inG12(f));
    return {
      g1: sortFindingsForTemplate(g1),
      g2: sortFindingsForTemplate(g2),
      g3ByCategory: byCategoryBuckets(g3)
    };
  }, [activeFindingsList, items, selections.categoryId, selections.itemId, categoryLabelById]);

  const customRecGroups = useMemo(() => {
    const catId = normalizeId(selections.categoryId);
    const itemId = normalizeId(selections.itemId);
    const addRaw = (set: Set<string>, v: any) => {
      const s = String(v || '').trim();
      if (s) set.add(s);
    };
    const itemRecRaw = new Set<string>();
    const categoryRecRaw = new Set<string>();

    if (catId && itemId) {
      for (const f of activeFindingsList) {
        if (normalizeId(f.fldItem) === itemId) {
          for (const id of safeArray(f.fldSuggestedRecs)) addRaw(itemRecRaw, id);
        }
      }
      for (const g of usableGlossaryTemplateRows) {
        if (normalizeId(g.fldItem) === itemId) {
          addRaw(itemRecRaw, g.fldRec);
          addRaw(itemRecRaw, g.fldRecID);
        }
      }
      for (const f of activeFindingsList) {
        if (normalizeId(f.fldItem) === itemId) continue;
        const item = (items || []).find((i: any) => normalizeId(i.fldItemID) === normalizeId(f.fldItem));
        if (!item || normalizeId(item.fldCatID) !== catId) continue;
        for (const id of safeArray(f.fldSuggestedRecs)) addRaw(categoryRecRaw, id);
      }
      for (const g of usableGlossaryTemplateRows) {
        if (normalizeId(g.fldCat) !== catId) continue;
        if (normalizeId(g.fldItem) === itemId) continue;
        addRaw(categoryRecRaw, g.fldRec);
        addRaw(categoryRecRaw, g.fldRecID);
      }
    }

    const itemKeys = new Set([...itemRecRaw].map(normalizeId).filter(Boolean));
    const catKeys = new Set(
      [...categoryRecRaw].map(normalizeId).filter(Boolean).filter((k) => !itemKeys.has(k))
    );
    const recKey = (r: any) => normalizeId(r.fldRecID || r.id);
    const inItem = (r: any) => itemKeys.has(recKey(r));
    const inCatOnly = (r: any) => !inItem(r) && catKeys.has(recKey(r));

    const g1 = sortRecsForTemplate(masterRecsActive.filter(inItem));
    const g2 = sortRecsForTemplate(masterRecsActive.filter(inCatOnly));
    const g3 = masterRecsActive.filter((r: any) => !inItem(r) && !inCatOnly(r));
    const g3ByCategoryMap = new Map<string, { label: string; rows: any[] }>();
    const resolveRecCategoryKey = (rec: any) => {
      const possible = new Set<string>();
      const rk = recKey(rec);
      activeFindingsList.forEach((f: any) => {
        const suggested = new Set(safeArray(f.fldSuggestedRecs).map(normalizeId));
        if (!suggested.has(rk)) return;
        const item = (items || []).find((i: any) => normalizeId(i.fldItemID) === normalizeId(f.fldItem));
        const cid = normalizeId(item?.fldCatID);
        if (cid) possible.add(cid);
      });
      usableGlossaryTemplateRows.forEach((g: any) => {
        if (normalizeId(g.fldRec) === rk || normalizeId(g.fldRecID) === rk) {
          const cid = normalizeId(g.fldCat);
          if (cid) possible.add(cid);
        }
      });
      const recItem = (items || []).find((i: any) => normalizeId(i.fldItemID) === normalizeId(rec?.fldItem));
      const recItemCat = normalizeId(recItem?.fldCatID);
      if (recItemCat) possible.add(recItemCat);

      if (!possible.size) return { key: 'uncategorized', label: 'Uncategorized' };
      const sortedCats = [...possible].sort((a, b) => {
        const la = categoryLabelById.get(a) || 'Uncategorized';
        const lb = categoryLabelById.get(b) || 'Uncategorized';
        return la.localeCompare(lb, undefined, { sensitivity: 'base' });
      });
      const chosen = sortedCats[0];
      return { key: chosen, label: categoryLabelById.get(chosen) || 'Uncategorized' };
    };

    g3.forEach((rec: any) => {
      const grp = resolveRecCategoryKey(rec);
      if (!g3ByCategoryMap.has(grp.key)) g3ByCategoryMap.set(grp.key, { label: grp.label, rows: [] });
      g3ByCategoryMap.get(grp.key)!.rows.push(rec);
    });

    const g3ByCategory = Array.from(g3ByCategoryMap.values())
      .map((g) => ({ label: g.label, rows: sortRecsForTemplate(g.rows) }))
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
    return { g1, g2, g3ByCategory };
  }, [
    activeFindingsList,
    usableGlossaryTemplateRows,
    items,
    masterRecsActive,
    selections.categoryId,
    selections.itemId,
    categoryLabelById
  ]);

  const hasNavContext = Boolean(
    String(selections.projectId || '').trim() && String(selections.facilityId || '').trim()
  );
  const navCount = navRecords.length;
  const navLabel = !hasNavContext
    ? ''
    : editingRecordId
      ? navIndex >= 0
        ? `Record ${navIndex + 1} of ${navCount}`
        : `Record not in list — ${navCount} in facility`
      : `New Record — ${navCount} existing records`;
  const canNavStep =
    Boolean(editingRecordId && String(editingRecordId).trim()) && navIndex >= 0 && navCount > 0;
  const prevNavDisabled = !canNavStep || navIndex <= 0;
  const nextNavDisabled = !canNavStep || navIndex < 0 || navIndex >= navCount - 1;

  const draftRecoveryFindingPreview = useMemo(() => {
    const d = savedDraft;
    if (!d) return '';
    const t = String(d.fldFindShort || '').trim();
    if (t) return t;
    const fid = String(d.selections?.findId || '').trim();
    if (fid) {
      const f = (findings || []).find(
        (x: any) => normalizeId(x.fldFindID || x.id) === normalizeId(fid)
      );
      const fs = String(f?.fldFindShort || '').trim();
      if (fs) return fs;
      return 'Draft for selected finding';
    }
    if (d.editingRecordId) return 'Existing record draft';
    return 'Draft';
  }, [savedDraft, findings]);

  return (
    <div className="flex flex-col h-full bg-transparent overflow-hidden">
      <div className="flex-1 overflow-y-auto w-full bg-transparent">
        {/* LAYER 1: STICKY HEADER - Opaque background to mask scrolling content */}
        <div className="sticky top-0 z-30 bg-zinc-50 border-b border-zinc-200 shadow-sm">
          <div className="max-w-6xl mx-auto px-6 pt-2 pb-2 space-y-2">
            {/* Header: title | record nav | mode + inspector */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 bg-white py-2 px-3 rounded-xl border border-zinc-200 shadow-sm">
              <div className="flex items-center gap-2 shrink-0">
                <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center text-white shadow-md shadow-amber-200">
                  <Book size={18} />
                </div>
                <h2 className="text-base font-bold text-zinc-900 leading-tight">Data Entry</h2>
              </div>

              {hasNavContext ? (
                <div className="flex flex-1 min-w-0 items-center justify-center gap-2 px-1">
                  <span
                    className={cn(
                      'shrink-0 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded select-none',
                      isFormDirty ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'
                    )}
                    aria-live="polite"
                  >
                    {isFormDirty ? 'DIRTY' : 'CLEAN'}
                  </span>
                  <span className="text-xs font-medium text-zinc-600 truncate text-center min-w-0 max-w-full">
                    {navLabel}
                  </span>
                </div>
              ) : (
                <div className="flex-1 min-w-0" aria-hidden />
              )}

              <div className="flex flex-wrap items-center justify-end gap-2 shrink-0 ml-auto">
                <div className="flex items-center gap-1.5">
                  <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Mode</label>
                  <div className="flex items-center bg-zinc-100 rounded-lg p-0.5 border border-zinc-200">
                    <button
                      type="button"
                      disabled={!hasRequiredContext}
                      onClick={() => {
                        setCustomMasterRecId('');
                        setCustomMasterFindId('');
                        onSelectionChange({ ...selections, dataEntryMode: 'glossary' });
                      }}
                      className={cn(
                        "px-2 py-1 text-[9px] font-bold uppercase tracking-widest rounded-md transition-all",
                        dataEntryMode === 'glossary' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
                      )}
                      title="Use approved glossary record combinations"
                    >
                      Use Glossary Record
                    </button>
                    <button
                      type="button"
                      disabled={!hasRequiredContext}
                      onClick={() => onSelectionChange({ ...selections, dataEntryMode: 'custom' })}
                      className={cn(
                        "px-2 py-1 text-[9px] font-bold uppercase tracking-widest rounded-md transition-all",
                        dataEntryMode === 'custom' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
                      )}
                      title="Create a project-only custom record"
                    >
                      Create Custom Record
                    </button>
                  </div>
                </div>

                {inspector && (
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 border border-amber-200 rounded-lg shadow-sm">
                    <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse shadow-[0_0_6px_rgba(245,158,11,0.5)]" />
                    <div className="flex flex-col min-w-0">
                      <span className="text-[9px] font-bold text-amber-600 uppercase tracking-wider leading-none">Active Inspector</span>
                      <span className="text-[11px] font-bold text-zinc-900 tracking-tight truncate max-w-[10rem]">
                        {inspector.fldInspName || inspector.fldInspID}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {hasNavContext ? (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="h-9 w-9 shrink-0 p-0 min-w-0"
                  disabled={prevNavDisabled}
                  onClick={handleNavPrev}
                  aria-label="Previous record"
                >
                  <ChevronLeft size={18} />
                </Button>
                <Card className="flex-1 min-w-0 border-zinc-200 shadow-sm !bg-blue-100 p-3 py-2">
                  <div className="flex flex-wrap gap-3">
                    <div className="flex-1 min-w-[180px] relative group">
                      <Select
                        label="Category"
                        value={selectedCat}
                        onChange={(e: any) => setSelectedCat(e.target.value)}
                        disabled={!hasRequiredContext}
                        selectClassName={cn(focusClasses, '!py-1.5')}
                        options={(dataEntryMode === 'custom'
                          ? sortEntities(mergedCategories || [], 'fldCategoryName')
                          : sortedCategories
                        ).map((c: any, index: number) => ({
                          value: c.fldCategoryID || c.fldCatID || `missing-${index}`,
                          label: c.fldCategoryName || c.fldCatName || 'Select Category',
                          key: `cat-${c.fldCategoryID || c.fldCatID || index}-${index}`
                        }))}
                      />
                      {selectedCat && (
                        <button
                          type="button"
                          onClick={() => setSelectedCat('')}
                          className="absolute right-9 top-7 p-1 text-zinc-400 hover:text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Clear Category"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                    <div className="flex-1 min-w-[180px]">
                      <Select
                        label="Item"
                        value={selectedItem}
                        onChange={(e: any) => setSelectedItem(e.target.value)}
                        selectClassName={cn(focusClasses, '!py-1.5')}
                        options={(dataEntryMode === 'custom'
                          ? sortEntities(
                              (items || []).filter((i: any) => !selectedCat || i.fldCatID === selectedCat),
                              'fldItemName'
                            )
                          : sortedItems
                        ).map((i: any, index: number) => ({
                          value: i.fldItemID || `missing-item-${index}`,
                          label: i.fldItemName || 'Select Item',
                          key: `item-${i.fldItemID || index}-${index}`
                        }))}
                      />
                    </div>
                    <div className="flex min-w-[180px] flex-1 items-end gap-2">
                      <div className="relative min-w-0 flex-1 group">
                        <Select
                          label="Location / Area"
                          value={fldLocation}
                          onChange={(e: any) => {
                            setFldLocation(e.target.value);
                            onSelectionChange({ ...selections, locationId: e.target.value });
                            setIsDirty(true);
                          }}
                          selectClassName={cn(focusClasses, '!py-1.5')}
                          options={facilityLocations.map((l) => ({
                            value: l.fldLocID,
                            label: l.fldLocName,
                            key: l.fldLocID
                          }))}
                        />
                        {fldLocation && (
                          <button
                            type="button"
                            onClick={() => {
                              setFldLocation('');
                              onSelectionChange({ ...selections, locationId: '' });
                            }}
                            className="absolute right-9 top-7 p-1 text-zinc-400 hover:text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Clear Location"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                      <Button
                        variant="secondary"
                        size="icon"
                        type="button"
                        className="h-9 w-9 shrink-0 p-0"
                        onClick={() => setIsLocationModalOpen(true)}
                        title="Manage Locations"
                      >
                        <Edit2 size={16} />
                      </Button>
                    </div>
                  </div>
                </Card>
                <Button
                  type="button"
                  variant="secondary"
                  className="h-9 w-9 shrink-0 p-0 min-w-0"
                  disabled={nextNavDisabled}
                  onClick={handleNavNext}
                  aria-label="Next record"
                >
                  <ChevronRight size={18} />
                </Button>
              </div>
            ) : (
              <Card className="border-zinc-200 shadow-sm !bg-blue-100 p-3 py-2">
                <div className="flex flex-wrap gap-3">
                  <div className="flex-1 min-w-[180px] relative group">
                    <Select
                      label="Category"
                      value={selectedCat}
                      onChange={(e: any) => setSelectedCat(e.target.value)}
                      disabled={!hasRequiredContext}
                      selectClassName={cn(focusClasses, '!py-1.5')}
                      options={(dataEntryMode === 'custom'
                        ? sortEntities(mergedCategories || [], 'fldCategoryName')
                        : sortedCategories
                      ).map((c: any, index: number) => ({
                        value: c.fldCategoryID || c.fldCatID || `missing-${index}`,
                        label: c.fldCategoryName || c.fldCatName || 'Select Category',
                        key: `cat-${c.fldCategoryID || c.fldCatID || index}-${index}`
                      }))}
                    />
                    {selectedCat && (
                      <button
                        type="button"
                        onClick={() => setSelectedCat('')}
                        className="absolute right-9 top-7 p-1 text-zinc-400 hover:text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Clear Category"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  <div className="flex-1 min-w-[180px]">
                    <Select
                      label="Item"
                      value={selectedItem}
                      onChange={(e: any) => setSelectedItem(e.target.value)}
                      selectClassName={cn(focusClasses, '!py-1.5')}
                      options={(dataEntryMode === 'custom'
                        ? sortEntities(
                            (items || []).filter((i: any) => !selectedCat || i.fldCatID === selectedCat),
                            'fldItemName'
                          )
                        : sortedItems
                      ).map((i: any, index: number) => ({
                        value: i.fldItemID || `missing-item-${index}`,
                        label: i.fldItemName || 'Select Item',
                        key: `item-${i.fldItemID || index}-${index}`
                      }))}
                    />
                  </div>
                  <div className="flex min-w-[180px] flex-1 items-end gap-2">
                    <div className="relative min-w-0 flex-1 group">
                      <Select
                        label="Location / Area"
                        value={fldLocation}
                        onChange={(e: any) => {
                          setFldLocation(e.target.value);
                          onSelectionChange({ ...selections, locationId: e.target.value });
                          setIsDirty(true);
                        }}
                        selectClassName={cn(focusClasses, '!py-1.5')}
                        options={facilityLocations.map((l) => ({
                          value: l.fldLocID,
                          label: l.fldLocName,
                          key: l.fldLocID
                        }))}
                      />
                      {fldLocation && (
                        <button
                          type="button"
                          onClick={() => {
                            setFldLocation('');
                            onSelectionChange({ ...selections, locationId: '' });
                          }}
                          className="absolute right-9 top-7 p-1 text-zinc-400 hover:text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Clear Location"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                    <Button
                      variant="secondary"
                      size="icon"
                      type="button"
                      className="h-9 w-9 shrink-0 p-0"
                      onClick={() => setIsLocationModalOpen(true)}
                      title="Manage Locations"
                    >
                      <Edit2 size={16} />
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {!hasRequiredContext && (
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/90 p-3 text-zinc-700 shadow-sm">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Workspace incomplete</p>
                <p className="mt-1 text-sm leading-snug text-zinc-600">
                  Select a client, facility, project, and inspector to enable data entry.
                </p>
              </div>
            )}

            {dataEntryMode === 'glossary' && hasRequiredContext && activeGlossaryRows.length === 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-3 text-amber-900 shadow-sm">
                <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">No glossary records</p>
                <p className="mt-1 text-sm leading-snug text-amber-900/90">
                  No glossary records are available. Create glossary records in Glossary Builder first.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* LAYER 2: SCROLLABLE CONTENT */}
        <div className="max-w-6xl mx-auto px-6 py-6 space-y-8">
          {/* FINDING CARD */}
          <Card className="p-6 space-y-6 border-zinc-200 shadow-sm !bg-blue-50">
            {dataEntryMode === 'glossary' && (
              <Select 
                label="Finding"
                labelClassName="text-base font-bold text-zinc-900 leading-tight normal-case tracking-normal"
                value={selections.findId || ''}
                onChange={(e: any) => {
                   const find = (findings || []).find(f => (f.id || f.fldFindID || "").toLowerCase() === (e.target.value || "").toLowerCase());
                   if (find) {
                     setFldFindShort(find.fldFindShort);
                     setFldFindLong(find.fldFindLong);
                     if (!activeRecord) {
                       setFldMeasurementType(find.fldMeasurementType || '');
                     }
                     setFldMeasurementUnit(find.fldUnitType || '');
                   }
                   setFldStandards([]); // Clear standards on finding change
                   onSelectionChange({...selections, findId: e.target.value, recId: '', glosId: '', isDirty: true});
                }}
                selectClassName={cn('!bg-yellow-50', focusClasses)}
                options={sortedFindings.map((f, index) => ({ 
                  value: f.fldFindID || `missing-find-${index}`, 
                  label: f.fldFindShort || 'Select Finding', 
                  key: `find-${f.fldFindID || index}-${index}` 
                }))}
              />
            )}
            {dataEntryMode === 'custom' && (
              <Select
                label="Optional: Copy finding template from library"
                value={customMasterFindId}
                onChange={(e: any) => {
                  const id = e.target.value || '';
                  setCustomMasterFindId(id);
                  if (!id) {
                    setFldMeasurementType('');
                    setIsDirty(true);
                    return;
                  }
                  const f = activeFindingsList.find(
                    (x: any) => normalizeId(x.fldFindID || x.id) === normalizeId(id)
                  );
                  if (f) {
                    setFldFindShort(f.fldFindShort || '');
                    setFldFindLong(f.fldFindLong || '');
                    setFldMeasurementType(f.fldMeasurementType || '');
                    if (f.fldUnitType) setFldMeasurementUnit(String(f.fldUnitType));
                    setIsDirty(true);
                  }
                }}
                options={[]}
                placeholder="None — type your own"
                selectClassName={cn('!bg-yellow-50', focusClasses)}
              >
                {customFindingGroups.g1.length > 0 && (
                  <optgroup label="Selected item">
                    {customFindingGroups.g1.map((f: any, idx: number) => (
                      <option key={`cf-g1-${f.fldFindID || f.id}-${idx}`} value={f.fldFindID || f.id || ''}>
                        {f.fldFindShort || f.fldFindLong || 'Finding'}
                      </option>
                    ))}
                  </optgroup>
                )}
                {customFindingGroups.g2.length > 0 && (
                  <optgroup label="Other items in category">
                    {customFindingGroups.g2.map((f: any, idx: number) => (
                      <option key={`cf-g2-${f.fldFindID || f.id}-${idx}`} value={f.fldFindID || f.id || ''}>
                        {f.fldFindShort || f.fldFindLong || 'Finding'}
                      </option>
                    ))}
                  </optgroup>
                )}
                {customFindingGroups.g3ByCategory.map((group: any, gIdx: number) => (
                  <optgroup key={`cf-g3-cat-${gIdx}-${group.label}`} label={group.label}>
                    {group.rows.map((f: any, idx: number) => (
                      <option key={`cf-g3-${f.fldFindID || f.id}-${idx}`} value={f.fldFindID || f.id || ''}>
                        {f.fldFindShort || f.fldFindLong || 'Finding'}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </Select>
            )}
            <div className="space-y-4">
              <Input 
                label="Finding Summary"
                value={fldFindShort} 
                onChange={(e: any) => { setFldFindShort(e.target.value); setIsDirty(true); }} 
                placeholder="Brief finding description" 
                className={focusClasses}
              />
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Finding Detailed Description</label>
                <textarea 
                  className={cn(
                    "w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm min-h-[120px] transition-all duration-200",
                    "placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black",
                    focusClasses
                  )}
                  value={fldFindLong} 
                  onChange={(e: any) => { setFldFindLong(e.target.value); setIsDirty(true); }} 
                  placeholder="Detailed finding description..."
                />
              </div>
              
              {/* Finding Footer Row: Measurement, snapshot Measurement Type (read-only), Measurement Unit */}
              <div className={cn("grid grid-cols-1 gap-4 pt-2 border-t border-zinc-100", "md:grid-cols-3")}>
                <Input 
                  label="Measurement"
                  value={fldMeasurement}
                  onChange={(e: any) => { setFldMeasurement(e.target.value); setIsDirty(true); }}
                  className={focusClasses}
                  placeholder="Actual recorded value"
                />
                <div className="grid grid-cols-1 gap-4 md:col-span-2 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Measurement Type</label>
                    <div className="h-10 px-3 flex items-center bg-zinc-100 border border-zinc-200 rounded-lg text-sm font-medium text-zinc-900 italic">
                      {displayMeasurementTypeReadonly}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Measurement Unit</label>
                    <div className="h-10 px-3 flex items-center bg-zinc-100 border border-zinc-200 rounded-lg text-sm font-medium text-zinc-900 italic">
                      {/* ENFORCE CONTROLLED VOCABULARY */}
                      {MEASUREMENT_UNITS.includes(fldMeasurementUnit) ? fldMeasurementUnit : (fldMeasurementUnit || 'None')}
                    </div>
                  </div>
                  {showSyncMeasurementFromLibrary ? (
                    <div className="pt-1 md:col-span-2">
                      <button
                        type="button"
                        onClick={handleSyncMeasurementFromLibrary}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        Sync from library finding
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6 space-y-6 border-zinc-200 shadow-sm !bg-blue-50">
             <label className="text-base font-bold text-zinc-900 leading-tight block mb-2">Recommendation</label>
             {dataEntryMode === 'glossary' && (
               <Select 
                value={recommendationSelectValue || ''}
                onChange={(e: any) => {
                  const gid = e.target.value;
                  const gRow = rowsForPath.find(
                    (g: any) => normalizeId(g.fldGlosId || g.id) === normalizeId(gid)
                  );
                  applyGlossaryRecommendationRow(gRow, true);
                }}
                selectClassName={cn('!bg-yellow-50', focusClasses)}
                options={recommendationOptions}
              />
             )}
             {dataEntryMode === 'custom' && (
               <Select
                 label="Optional: Copy recommendation template from library"
                 value={customMasterRecId || ''}
                 onChange={(e: any) => {
                   const id = e.target.value || '';
                   setCustomMasterRecId(id);
                   if (!id) {
                     setIsDirty(true);
                     return;
                   }
                   const rec = masterRecsActive.find(
                     (r: any) =>
                       normalizeId(r?.fldRecID) === normalizeId(id) || normalizeId(r?.id) === normalizeId(id)
                   );
                   if (rec) {
                     setFldRecShort(rec.fldRecShort || '');
                     setFldRecLong(rec.fldRecLong || '');
                     const uom = rec.fldUOM || 'Decimal';
                     setFldUnitType(uom);
                     setFldUnitCost(rec.fldUnit ?? 0);
                     if (uom === 'LS') setFldQTY(1);
                     setIsDirty(true);
                   }
                 }}
                 options={[]}
                 placeholder="None — type your own"
                 selectClassName={cn('!bg-yellow-50', focusClasses)}
               >
                 {customRecGroups.g1.length > 0 && (
                   <optgroup label="Selected item">
                     {customRecGroups.g1.map((r: any, idx: number) => (
                       <option key={`cr-g1-${r.fldRecID || r.id}-${idx}`} value={r.fldRecID || r.id || ''}>
                         {r.fldRecShort || r.fldRecLong || 'Recommendation'}
                       </option>
                     ))}
                   </optgroup>
                 )}
                 {customRecGroups.g2.length > 0 && (
                   <optgroup label="Other items in category">
                     {customRecGroups.g2.map((r: any, idx: number) => (
                       <option key={`cr-g2-${r.fldRecID || r.id}-${idx}`} value={r.fldRecID || r.id || ''}>
                         {r.fldRecShort || r.fldRecLong || 'Recommendation'}
                       </option>
                     ))}
                   </optgroup>
                 )}
                 {customRecGroups.g3ByCategory.map((group: any, gIdx: number) => (
                   <optgroup key={`cr-g3-cat-${gIdx}-${group.label}`} label={group.label}>
                     {group.rows.map((r: any, idx: number) => (
                       <option key={`cr-g3-${r.fldRecID || r.id}-${idx}`} value={r.fldRecID || r.id || ''}>
                         {r.fldRecShort || r.fldRecLong || 'Recommendation'}
                       </option>
                     ))}
                   </optgroup>
                 ))}
               </Select>
             )}
            <div className="space-y-4">
              <Input 
                label="Recommendation Summary"
                value={fldRecShort} 
                onChange={(e: any) => { setFldRecShort(e.target.value); setIsDirty(true); }} 
                placeholder="Brief recommendation" 
                className={focusClasses}
              />
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Recommendation Detailed Description</label>
                <textarea 
                  className={cn(
                    "w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm min-h-[120px] transition-all duration-200",
                    "placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black",
                    focusClasses
                  )}
                  value={fldRecLong} 
                  onChange={(e: any) => { setFldRecLong(e.target.value); setIsDirty(true); }} 
                  placeholder="Detailed recommendation description..."
                />
              </div>

                 <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-zinc-100">
                  <div className="space-y-1">
                    <Input 
                      label="Quantity"
                      type="number"
                      value={fldQTY}
                      onChange={(e: any) => { setFldQTY(e.target.value); setIsDirty(true); }}
                      disabled={fldUnitType === 'LS'}
                      className={cn(focusClasses, fldUnitType === 'LS' && "bg-zinc-100 text-zinc-500 italic")}
                    />
                    {fldUnitType === 'LS' && (
                      <p className="text-[10px] text-zinc-400 mt-0.5 ml-1 italic">Lump Sum: quantity treated as 1</p>
                    )}
                  </div>
                <Input 
                  label="Unit Cost ($)"
                  type="number"
                  value={fldUnitCost}
                  onChange={(e: any) => { setFldUnitCost(e.target.value); setIsDirty(true); }}
                  className={focusClasses}
                />
                <div className="space-y-1.5 flex-1">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Cost Unit Type</label>
                  <Select 
                    value={fldUnitType}
                    onChange={(e: any) => { 
                      const val = e.target.value;
                      setFldUnitType(val); 
                      // LUMP SUM BEHAVIOR: Set QTY to 1 on manual selection
                      if (val === 'LS') setFldQTY(1);
                      setIsDirty(true); 
                    }}
                    selectClassName={focusClasses}
                    options={COST_UNIT_TYPES.map(unit => ({ value: unit, label: unit }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Total Cost</label>
                  <div className="h-10 px-3 flex items-center bg-zinc-100 border border-zinc-200 rounded-lg text-sm font-bold text-zinc-900">
                    {formatCurrency(Number(fldTotalCost))}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Record-level citations (projectData.fldStandards) */}
          <Card className="p-6 space-y-6 border-zinc-200 shadow-sm !bg-blue-50">
            <div className="flex flex-col gap-1 border-b border-zinc-100 pb-2">
              <div>
                <h3 className="text-base font-bold text-zinc-900 leading-tight">Record Citations</h3>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Stored on this project data record as <span className="font-mono text-zinc-600">fldStandards</span>.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
              <div className="xl:col-span-5 space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  Selected citations
                </p>
                <div
                  className={cn(
                    'rounded-xl border-2 border-dashed border-zinc-200 bg-zinc-50/40 min-h-[22rem] p-3 transition-colors',
                    'hover:border-zinc-300'
                  )}
                  onDragOver={handleRecordCitationsDragOver}
                  onDrop={handleRecordCitationsDrop}
                >
                  {safeArray(fldStandards).length === 0 ? (
                    <p className="text-xs text-zinc-400 italic py-4 text-center">
                      Drop a citation here or add one with + in the Standards Library.
                    </p>
                  ) : (
                    <ul className="space-y-2 max-h-[20rem] overflow-y-auto pr-1">
                      {displayFldStandards.map((id) => {
                        const s = standards.find(
                          (st: any) => normalizeId(st.id) === normalizeId(id)
                        );
                        const label = recordCitationDisplayLabel(s, id);
                        return (
                          <li
                            key={id}
                            className="flex items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs"
                          >
                            <button
                              type="button"
                              className="min-w-0 flex-1 truncate text-left font-medium text-zinc-800 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 rounded px-0.5 -mx-0.5"
                              title={label}
                              onClick={() =>
                                setCitationPreview({
                                  id,
                                  standard: s ?? null
                                })
                              }
                            >
                              {label}
                            </button>
                            <button
                              type="button"
                              className="shrink-0 p-1 rounded-md text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Remove citation"
                              onClick={() => removeRecordCitation(id)}
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

              <div className="xl:col-span-7 space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  Standards Library
                </p>
                <StandardsBrowser
                  standards={standards}
                  onSelect={handleAddRecordCitation}
                  className="h-[32rem]"
                  showSearchClear
                  showBulkExpandControls={false}
                  treeExpansionMode="accordion"
                  enableAutoExpand502={false}
                  uiResetKey={dataEntryStandardsUiKey}
                  persistUiStateKey={dataEntryStandardsUiKey}
                  standardSelectionPersistKey="project-data-entry-standards"
                />
              </div>
            </div>
          </Card>

          <Card className="p-6 space-y-6 border-zinc-200 shadow-sm !bg-blue-50">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
              <h3 className="text-sm font-bold text-zinc-900">Images</h3>
              <Button
                type="button"
                variant="secondary"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
                className="h-9 px-4"
              >
                {isUploading ? (
                  <Loader2 size={16} className="mr-2 animate-spin" />
                ) : (
                  <Camera size={16} className="mr-2" />
                )}
                Add Image
              </Button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImageUpload}
            />
            {fldImages.length === 0 ? (
              <p className="text-sm text-zinc-400 italic text-center py-6">No images attached.</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {fldImages.map((url) => (
                  <div
                    key={url}
                    className="relative w-24 h-24 rounded-xl border border-zinc-200 overflow-hidden bg-zinc-50 shrink-0 group"
                  >
                    <button
                      type="button"
                      onClick={() => setImagePreviewUrl(url)}
                      className="block h-full w-full cursor-pointer rounded-xl text-left ring-offset-2 transition-shadow hover:ring-2 hover:ring-blue-400/60 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      aria-label="View image larger"
                    >
                      <img src={url} alt="" className="h-full w-full object-cover pointer-events-none" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveImage(url);
                      }}
                      className="absolute top-1 right-1 z-10 p-1 rounded-full bg-black/50 text-white hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                      aria-label="Remove image"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <div
            className={cn(
              'flex flex-wrap gap-3 p-4 w-full',
              activeRecord && String(editingRecordId || '').trim() ? 'justify-between' : 'justify-end'
            )}
          >
            {activeRecord && String(editingRecordId || '').trim() ? (
              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleCloneActiveRecord}
                  className="px-6 h-11 min-w-[140px]"
                >
                  <Copy size={16} className="mr-2 inline-block" />
                  Clone
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  onClick={handleRequestDeleteRecord}
                  className="px-6 h-11 min-w-[140px]"
                >
                  Delete Record
                </Button>
              </div>
            ) : null}
            <div className="flex flex-wrap justify-end gap-3">
             {editingRecordId ? (
               <>
                 <Button 
                   variant="secondary" 
                   onClick={handleResetToOriginal} 
                   className="px-6 h-11 min-w-[140px]"
                 >
                   Reset to Original
                 </Button>
                 <Button 
                   variant="secondary" 
                   onClick={handleCancelEdit} 
                   className="px-6 h-11 min-w-[140px] text-red-600 hover:text-red-700 hover:bg-red-50"
                 >
                   Cancel Edit
                 </Button>
               </>
             ) : (
               <Button 
                 variant="secondary" 
                 onClick={handleClearForm} 
                 className="px-8 h-11 min-w-[140px]"
               >
                 Clear Form
               </Button>
             )}
             <Button 
               onClick={handleSave} 
               disabled={!isFormDirty} 
               className="px-12 h-11 min-w-[160px] bg-zinc-900 hover:bg-black text-white shadow-lg shadow-zinc-200"
             >
               {activeRecord ? 'Update Record' : 'Save Record'}
             </Button>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showRecoveryModal && savedDraft && (
          <Modal title="Draft Recovery" onClose={handleDiscardDraft}>
            <div className="space-y-6">
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                  <Undo className="text-blue-600" size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-blue-900">Unsaved Draft Found</h3>
                  <p className="text-xs text-blue-700 mt-1">
                    Saved on {new Date(savedDraft.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="space-y-3 p-4 bg-zinc-50 rounded-xl border border-zinc-200">
                <div className="flex justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                  <span>Preview</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase">Location</label>
                    <p className="text-sm font-medium truncate">
                      {(facilityLocations || []).find(l => (l.id || l.fldLocID || "").toLowerCase() === (savedDraft.fldLocation || "").toLowerCase())?.fldLocName || 'Unknown'}
                    </p>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase">Finding</label>
                    <p className="text-sm font-medium truncate">{draftRecoveryFindingPreview}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="secondary" className="flex-1" onClick={handleDiscardDraft}>Discard Draft</Button>
                <Button className="flex-1" onClick={handleResumeDraft}>Resume Draft</Button>
              </div>
            </div>
          </Modal>
        )}

        {confirmModal.isOpen && (
          <Modal 
            title={confirmModal.title} 
            onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
          >
            <div className="space-y-6">
              <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex gap-4">
                <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
                  <AlertCircle className="text-amber-600" size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-amber-900">Unsaved Changes</h3>
                  <p className="text-sm text-amber-700 mt-1">
                    {confirmModal.message}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button 
                  variant="secondary" 
                  className="flex-1 h-11" 
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                >
                  Keep Editing
                </Button>
                <Button 
                  className="flex-1 h-11 bg-amber-600 hover:bg-amber-700 text-white" 
                  onClick={confirmModal.onConfirm}
                >
                  Discard Changes
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {isLocationModalOpen && (
          <Modal title="Manage Locations" onClose={() => setIsLocationModalOpen(false)}>
            <div className="space-y-6">
              <div className="flex gap-2">
                <Input 
                  placeholder="New location name..." 
                  className="flex-1"
                  value={newLocName}
                  onChange={(e: any) => setNewLocName(e.target.value)}
                  onKeyDown={(e: any) => {
                    if (e.key === 'Enter') {
                      handleAddLocation(newLocName);
                      setNewLocName('');
                    }
                  }}
                />
                <Button onClick={() => {
                  handleAddLocation(newLocName);
                  setNewLocName('');
                }}>
                  <Plus size={16} className="mr-2" /> Add
                </Button>
              </div>

              <div className="max-h-64 overflow-y-auto border border-zinc-200 rounded-xl divide-y divide-zinc-100">
                {facilityLocations.length === 0 ? (
                  <div className="p-8 text-center text-zinc-400 italic text-sm">No locations defined for this facility.</div>
                ) : (
                  facilityLocations.map(loc => (
                    <div key={loc.fldLocID} className="p-3 flex items-center justify-between hover:bg-zinc-50 transition-colors group">
                      {editingLoc?.fldLocID === loc.fldLocID ? (
                        <div className="flex-1 flex gap-2">
                          <Input 
                            autoFocus
                            defaultValue={loc.fldLocName}
                            className="h-8 text-sm"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleUpdateLocation(loc.fldLocID, e.currentTarget.value);
                                setEditingLoc(null);
                              }
                            }}
                          />
                          <Button size="sm" onClick={(e) => {
                            const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                            handleUpdateLocation(loc.fldLocID, input.value);
                            setEditingLoc(null);
                          }}>Save</Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingLoc(null)}>Cancel</Button>
                        </div>
                      ) : (
                        <>
                          <span className="text-sm font-medium text-zinc-700">{loc.fldLocName}</span>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => setEditingLoc(loc)}
                              className="p-1.5 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button 
                              onClick={() => handleDeleteLocation(loc.fldLocID)}
                              className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
              
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex gap-3">
                <AlertCircle className="text-blue-600 shrink-0" size={18} />
                <p className="text-xs text-blue-700 leading-relaxed">
                  Renaming a location will automatically update the display name across all associated records.
                </p>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      <ImagePreviewModal
        src={imagePreviewUrl}
        alt="Project data image"
        title="Image preview"
        onClose={() => setImagePreviewUrl(null)}
      />

      {citationPreview ? (
        <StandardCitationPreviewModal
          standard={citationPreview.standard}
          storedId={citationPreview.id}
          onClose={() => setCitationPreview(null)}
        />
      ) : null}
    </div>
  );
}