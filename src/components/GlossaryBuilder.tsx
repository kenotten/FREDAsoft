/**
 * !!! VERSION 87.0 - THE OPENING FORCE FIX !!!
 */
import React, { useState, useEffect, useMemo } from 'react';
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
import { Button, Select, Card, Input, Modal } from './ui/core';
import { toast } from 'sonner';
import { firestoreService, OperationType, handleFirestoreError } from '../services/firestoreService';
import { 
  Category, 
  Item, 
  Finding, 
  MasterRecommendation, 
  Glossary, 
  UnitType, 
  MasterStandard 
} from '../types';

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
  onSelectionChange: (selections: any) => void;
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
  stagedGlosStds = []
}: GlossaryBuilderProps) {
  // Base UI should always render to prevent layout shifts.
  const { selectedCat, selectedItem, selectedFind, selectedRec } = selections;
  const hasMinimumContext = !!(selectedCat && selectedItem && selectedFind && selectedRec);

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
    const newS = { 
      ...selections, 
      selectedRec: val,
      stagedRecShort: matchedRec?.fldRecShort || "",
      stagedRecLong: matchedRec?.fldRecLong || "",
      isDirty: false // Reset dirty when intentionally switching recommendation
    };
    onSelectionChange(newS);
    updatePreferences({ glossaryBuilderSelections: newS });
    setTimeout(() => { isUpdatingRef.current = false; }, 500);
  };

  // Sync glossary overrides to selections when combination changes
  useEffect(() => {
    if (selectedCat && selectedItem && selectedFind && selectedRec && !isDirty) {
      const existing = glossary.find((g: any) => 
        String(g.fldCat || "").toLowerCase().trim() === String(selectedCat || "").toLowerCase().trim() && 
        String(g.fldItem || "").toLowerCase().trim() === String(selectedItem || "").toLowerCase().trim() && 
        String(g.fldFind || "").toLowerCase().trim() === String(selectedFind || "").toLowerCase().trim() && 
        (g.fldRec || g.fldRecID || "").toLowerCase().trim() === (selectedRec || "").toLowerCase().trim()
      );
      
      if (existing) {
        const matchedFinding = findings?.find(f => String(f.id || f.fldFindID || "").toLowerCase().trim() === String(selectedFind || "").toLowerCase().trim());
        const matchedRec = masterRecsSource?.find(r => (r.id || r.fldRecID || "").toLowerCase().trim() === (selectedRec || "").toLowerCase().trim());

        onSelectionChange({
          ...selections,
          fldUnitCost: existing.fldUnitCost ?? undefined,
          fldUnitType: existing.fldUnitType ?? undefined,
          stagedFindShort: matchedFinding?.fldFindShort || "",
          stagedFindLong: matchedFinding?.fldFindLong || "",
          stagedRecShort: matchedRec?.fldRecShort || "",
          stagedRecLong: matchedRec?.fldRecLong || "",
          editingGlossaryId: existing.fldGlosId || existing.id || '',
          images: existing.fldImages || [],
          isDirty: false
        });
      } else {
        const matchedFinding = findings?.find(f => String(f.id || f.fldFindID || "").toLowerCase().trim() === String(selectedFind || "").toLowerCase().trim());
        const matchedRec = masterRecsSource?.find(r => (r.id || r.fldRecID || "").toLowerCase().trim() === (selectedRec || "").toLowerCase().trim());

        onSelectionChange({
          ...selections,
          fldUnitCost: undefined,
          fldUnitType: undefined,
          stagedFindShort: matchedFinding?.fldFindShort || "",
          stagedFindLong: matchedFinding?.fldFindLong || "",
          stagedRecShort: matchedRec?.fldRecShort || "",
          stagedRecLong: matchedRec?.fldRecLong || "",
          editingGlossaryId: '',
          images: [],
          isDirty: false
        });
      }
    }
  }, [selectedCat, selectedItem, selectedFind, selectedRec, glossary, findings, masterRecommendations]);

  const [newType, setNewType] = useState<'category' | 'item' | 'finding' | 'recommendation' | 'glossary_record' | 'link_recommendation' | null>(null);
  const masterRecsSource = Array.isArray(masterRecommendations) ? masterRecommendations : [];

  const [formData, setFormData] = useState({
    catName: '', catOrder: '', itemName: '', itemOrder: '', findShort: '', findLong: '', findOrder: '', fldUnitType: '', recShort: '', recLong: '', recOrder: '', unit: '', uom: '',
    fldUnitCostOverride: '', fldUnitTypeOverride: ''
  });
  const [editingId, setEditingId] = useState<string | null>(null);
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

  const handleAddNew = async () => {
    if (!selectedCat || !selectedItem || !selectedFind || !selectedRec) {
      toast.error('Please select Category, Item, Finding, and Recommendation');
      return;
    }

    // If we have an explicit editing ID, use it.
    // Otherwise, try to find an existing record with the same link to avoid duplicates.
    let targetGlosId = selections.editingGlossaryId;
    let isUpdate = !!targetGlosId;

    if (!targetGlosId) {
      const existing = glossary.find((g: any) => 
        String(g.fldCat || "").toLowerCase().trim() === String(selectedCat || "").toLowerCase().trim() && 
        String(g.fldItem || "").toLowerCase().trim() === String(selectedItem || "").toLowerCase().trim() && 
        String(g.fldFind || "").toLowerCase().trim() === String(selectedFind || "").toLowerCase().trim() && 
        (g.fldRec || g.fldRecID || "").toLowerCase().trim() === (selectedRec || "").toLowerCase().trim()
      );
      if (existing) {
        targetGlosId = existing.fldGlosId || existing.id;
        isUpdate = true;
      }
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
            fldFindShort: selections.stagedFindShort,
            fldFindLong: selections.stagedFindLong
          });
          await firestoreService.save('findings', findingPayload, finding.fldFindID);
        }
      }

      if (selectedRec) {
        const recommendation = masterRecsSource.find(r => (r.id || r.fldRecID) === selectedRec);
        if (recommendation) {
          const recPayload = sanitizeData({ 
            fldStandards: normalizeStringArray(stagedRecStds),
            fldRecShort: selections.stagedRecShort,
            fldRecLong: selections.stagedRecLong
          });
          await firestoreService.masterRecommendations.save(recPayload, recommendation.fldRecID);
        }
      }

      const payload: any = { 
        fldCat: selectedCat,
        fldItem: selectedItem,
        fldFind: selectedFind,
        fldRec: selectedRec,
        fldImages: images,
        fldUnitCost: selections.fldUnitCost !== undefined ? selections.fldUnitCost : null,
        fldUnitType: selections.fldUnitType !== undefined ? selections.fldUnitType : null,
        fldStandards: normalizeStringArray(stagedGlosStds)
      };

      if (isUpdate && targetGlosId) {
        await firestoreService.glossary.save(sanitizeData(payload), targetGlosId);
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
      handleFirestoreError(error, isUpdate ? OperationType.UPDATE : OperationType.CREATE, 'glossary');
    }
  };

  const handleClearAll = () => {
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
    try {
      let findId = selectedFind;
      if (!selectedFind || (selectedCat && selectedItem && selectedFind && selectedRec)) {
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

  const filteredMasterRecs = useMemo(() => {
    if (!masterRecsSource || masterRecsSource.length === 0) return [];
    const term = (formData.recShort || '').toLowerCase();
    
    if (!term) return masterRecsSource.slice(0, 50);

    return masterRecsSource
      .filter(r => 
        (r.fldRecShort?.toLowerCase() || '').includes(term) || 
        (r.fldRecLong?.toLowerCase() || '').includes(term)
      )
      .slice(0, 50);
  }, [masterRecsSource, formData.recShort]);

  const itemFilteredMasterRecs = useMemo(() => {
    if (!masterRecsSource || masterRecsSource.length === 0) return [];
    
    // 1. Find all glossary records for the selected item
    const relatedGlossaryRecords = glossary.filter(g => String(g.fldItem || "").toLowerCase().trim() === String(selectedItem || "").toLowerCase().trim());
    
    // 2. Extract unique recommendation IDs
    const recIds = new Set(relatedGlossaryRecords.map(g => String(g.fldRec || "").toLowerCase().trim()));
    
    // 3. Filter master recommendations
    const filtered = masterRecsSource.filter(r => recIds.has(String(r.id || r.fldRecID || "").toLowerCase().trim()));
    
    return filtered;
  }, [masterRecsSource, glossary, selectedItem]);

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
                const existing = glossary?.find((g: any) => 
                  String(g.fldCat || "").toLowerCase().trim() === String(selectedCat || "").toLowerCase().trim() && 
                  String(g.fldItem || "").toLowerCase().trim() === String(selectedItem || "").toLowerCase().trim() && 
                  String(g.fldFind || "").toLowerCase().trim() === String(selectedFind || "").toLowerCase().trim() && 
                  (g.fldRec || g.fldRecID) === selectedRec
                );
                if (existing) setConfirmDelete({ id: existing.fldGlosId, collection: 'glossary', label: 'this glossary record', type: 'delete' });
              }} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                <Trash2 size={14} className="mr-1" /> DELETE RECORD
              </Button>
            )}
              <Button size="sm" variant="secondary" onClick={handleAddNewGlossaryFlow} disabled={!selectedCat || !selectedItem}>
                <Plus size={14} className="mr-1" /> {selectedCat && selectedItem && selectedFind && selectedRec ? "COPY & EDIT" : "ADD FINDING/REC"}
              </Button>
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
              label="Category" 
              value={selectedCat} 
              highlight={true} 
              onChange={(e: any) => setSelectedCat(e.target.value)} 
              options={(() => {
                const seen = new Set();
                const filtered = (Array.isArray(categories) ? [...categories] : [])
                  .filter(c => {
                    const id = c.fldCategoryID;
                    if (!id || seen.has(id)) return false;
                    seen.add(id);
                    return true;
                  });
                return sortEntities(filtered, 'fldCategoryName')
                  .map((c: any) => ({ value: c.fldCategoryID, label: c.fldCategoryName }));
              })() || []} 
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
              options={(() => {
                const seen = new Set();
                const filtered = (Array.isArray(filteredItems) ? [...filteredItems] : [])
                  .filter(i => {
                    const id = i.fldItemID;
                    if (!id || seen.has(id)) return false;
                    seen.add(id);
                    return true;
                  });
                return sortEntities(filtered, 'fldItemName')
                  .map((i: any) => ({ value: i.fldItemID, label: i.fldItemName }));
              })() || []} 
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
              options={(() => {
                const seen = new Set();
                const filtered = (Array.isArray(findings) ? findings : [])
                  .filter((f: any) => f.fldItem === selectedItem)
                  .filter(f => {
                    const id = f.fldFindID;
                    if (!id || seen.has(id)) return false;
                    seen.add(id);
                    return true;
                  });
                return sortEntities(filtered, 'fldFindShort')
                  .map((f: any) => ({ value: f.fldFindID, label: f.fldFindShort }));
              })() || []} 
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
                  options={(() => {
                    if (!masterRecsSource || masterRecsSource.length === 0) {
                      return [{ label: "⏳ Hydrating Library...", value: "loading", disabled: true }];
                    }
                    const allOptions: any[] = [];
                    const addedIds = new Set();

                    // 1. Suggested Section
                    if (selectedFind) {
                      const finding = findings?.find(f => 
                        String(f.id || f.fldFindID || "").toLowerCase().trim() === String(selectedFind || "").toLowerCase().trim()
                      );
                      const suggestedIds = (finding?.fldSuggestedRecs || []) as string[];
                      
                      if (suggestedIds.length > 0) {
                        allOptions.push({ label: '--- Suggested ---', value: 'header-suggested', disabled: true });
                        suggestedIds.forEach(recId => {
                          if (!recId) return;
                          const cleanId = String(recId).toLowerCase().trim();
                          if (addedIds.has(cleanId)) return;
                          
                          const r = masterRecsSource?.find(mr => String(mr.id || mr.fldRecID || "").toLowerCase().trim() === cleanId);
                          if (r) {
                            const short = r.fldRecShort || "No Title";
                            const long = r.fldRecLong || "";
                            allOptions.push({ 
                              value: r.id || r.fldRecID, 
                              label: `${short} | ${long.substring(0, 60)}${long.length > 60 ? '...' : ''}` 
                            });
                            addedIds.add(cleanId);
                          } else {
                            allOptions.push({
                              value: recId,
                              label: `⚠️ ORPHANED: ${recId} (Not in Master)`
                            });
                            addedIds.add(cleanId);
                          }
                        });
                      }
                    }

                    // 2. Item Recommendations Section (TRUNCATED TO 100 FOR PERFORMANCE)
                    const otherRecs = (itemFilteredMasterRecs || []).filter(r => {
                      const rid = String(r.id || r.fldRecID || "").toLowerCase().trim();
                      return !addedIds.has(rid);
                    });

                    if (otherRecs.length > 0) {
                      allOptions.push({ label: '--- Item Recommendations ---', value: 'header-all', disabled: true });
                      sortEntities([...otherRecs], 'fldRecShort')
                        .slice(0, 100) 
                        .forEach(r => {
                          const rid = String(r.id || r.fldRecID || "").toLowerCase().trim();
                          if (addedIds.has(rid)) return;
                          
                          const short = r.fldRecShort || "No Title";
                          const long = r.fldRecLong || "";
                          allOptions.push({ 
                            value: r.id || r.fldRecID, 
                            label: `${short} | ${long.substring(0, 60)}${long.length > 60 ? '...' : ''}` 
                          });
                          addedIds.add(rid);
                        });
                    } else if (selectedItem && !selectedFind) {
                      allOptions.push({ label: 'No previous links for this item', value: 'no-links', disabled: true });
                    }

                    return allOptions;
                  })() || []}
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
                      value={selections.stagedFindShort ?? ""}
                      onChange={(e) => onSelectionChange({ ...selections, stagedFindShort: e.target.value, isDirty: true })}
                      placeholder="Short finding title..."
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Long Finding</label>
                    <textarea 
                      className="w-full bg-zinc-50 border border-zinc-100 rounded-lg py-1.5 px-3 text-xs text-zinc-600 leading-relaxed outline-none focus:ring-1 focus:ring-indigo-500 transition-all min-h-[100px] resize-none"
                      value={selections.stagedFindLong ?? ""}
                      onChange={(e) => onSelectionChange({ ...selections, stagedFindLong: e.target.value, isDirty: true })}
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
                        value={selections.stagedRecShort ?? ""}
                        onChange={(e) => onSelectionChange({ ...selections, stagedRecShort: e.target.value, isDirty: true })}
                        placeholder="Short recommendation title..."
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Long Recommendation</label>
                      <textarea 
                        className="w-full bg-zinc-50 border border-zinc-100 rounded-lg py-1.5 px-3 text-xs text-zinc-600 leading-relaxed outline-none focus:ring-1 focus:ring-indigo-500 transition-all min-h-[100px] resize-none"
                        value={selections.stagedRecLong ?? ""}
                        onChange={(e) => onSelectionChange({ ...selections, stagedRecLong: e.target.value, isDirty: true })}
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
              return stagedFindingStds.map((sid, idx) => {
                const s = standards?.find(st => (st.id || "").toLowerCase().trim() === (sid || "").toLowerCase().trim());
                return (
                  <div key={`find-std-${sid}-${idx}`} className="flex items-center justify-between p-2 bg-white border border-zinc-200 rounded-lg group hover:border-indigo-300 transition-colors">
                    <span className="text-[10px] font-medium text-zinc-600 truncate">{s?.citation_num} - {s?.citation_name}</span>
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
              return stagedRecStds.map((sid, idx) => {
                const s = standards?.find(st => (st.id || "").toLowerCase().trim() === (sid || "").toLowerCase().trim());
                return (
                  <div key={`rec-std-${sid}-${idx}`} className="flex items-center justify-between p-2 bg-white border border-zinc-200 rounded-lg group hover:border-indigo-300 transition-colors">
                    <span className="text-[10px] font-medium text-zinc-600 truncate">{s?.citation_num} - {s?.citation_name}</span>
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
              return stagedGlosStds.map((sid, idx) => {
                const s = standards?.find(st => (st.id || "").toLowerCase().trim() === (sid || "").toLowerCase().trim());
                return (
                  <div key={`glos-std-${sid}-${idx}`} className="flex items-center justify-between p-2 bg-white border border-rose-100 rounded-lg group hover:border-rose-300 transition-colors">
                    <span className="text-[10px] font-medium text-zinc-600 truncate">{s?.citation_num} - {s?.citation_name}</span>
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
