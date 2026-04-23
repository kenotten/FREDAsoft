// @ts-nocheck
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { toast } from 'sonner';
import { 
  Save, 
  Trash2, 
  Camera, 
  X, 
  Search,
  Plus,
  CheckCircle,
  Hash,
  Loader2,
  Book,
  AlertCircle,
  Undo,
  DollarSign,
  Edit2
} from 'lucide-react';
import { doc, writeBatch } from 'firebase/firestore';
import { db, storage } from '../firebase';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { firestoreService } from '../services/firestoreService';
import { Input } from './ui/input';
import { Select } from './ui/select';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { cn } from '../lib/utils';
import { v4 as uuidv4 } from 'uuid';
import { resizeImage } from '../lib/imageUtils';
import { toFraction, fromFraction } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

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

export default function ProjectDataEntry({ 
  project = {}, facility = {}, inspector = {}, glossary = [], standards = [], projectData = [],
  onSave, onReset, items = [], findings = [], recommendations = [], masterRecommendations = [],
  unitTypes = [], mergedCategories = [], locations = [], selections = {}, onSelectionChange
}: any) {
  const [isSearchingAll, setIsSearchingAll] = useState(false);
  
  // Localized state management for the active record
  const activeRecord = useMemo(() => 
    (projectData || []).find((d: any) => d.fldPDataID === selections.editingRecordId) || null, 
    [projectData, selections.editingRecordId]
  );

  const editingRecordId = selections.editingRecordId;
  
  const selectedCat = selections.categoryId;
  const setSelectedCat = (val: string) => {
    // Cascading Reset: Clear everything downstream
    setFldFindShort('');
    setFldFindLong('');
    setFldRecShort('');
    setFldRecLong('');
    setFldStandards([]);
    onSelectionChange({ 
      ...selections, 
      categoryId: val, 
      itemId: '', 
      findId: '', 
      recId: '', 
      standards: [],
      isDirty: true 
    });
  };

  const selectedItem = selections.itemId || '';
  const setSelectedItem = (val: string) => {
    // Cascading Reset: Clear downstream local state
    setFldFindShort('');
    setFldFindLong('');
    setFldRecShort('');
    setFldRecLong('');
    setFldStandards([]);
    onSelectionChange({ ...selections, itemId: val, findId: '', recId: '', standards: [], isDirty: true });
  };
  
  const [fldImages, setFldImages] = useState<string[]>([]);
  const [fldStandards, setFldStandards] = useState<string[]>([]);
  const [fldQTY, setFldQTY] = useState<number | ''>(0);
  const [fldMeasurement, setFldMeasurement] = useState<number | ''>('');
  const [fldUnitType, setFldUnitType] = useState('Decimal');
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
      return (
        fldFindShort !== (activeRecord.fldFindShort || '') ||
        fldFindLong !== (activeRecord.fldFindLong || '') ||
        fldRecShort !== (activeRecord.fldRecShort || '') ||
        fldRecLong !== (activeRecord.fldRecLong || '') ||
        (fldQTY === '' ? 0 : Number(fldQTY)) !== (activeRecord.fldQTY || 0) ||
        (fldMeasurement === '' ? null : Number(fldMeasurement)) !== (activeRecord.fldMeasurement ?? null) ||
        fldUnitType !== (activeRecord.fldUnitType || 'Decimal') ||
        fldLocation !== (activeRecord.fldLocation || '') ||
        JSON.stringify(fldImages) !== JSON.stringify(activeRecord.fldImages || []) ||
        JSON.stringify(fldStandards) !== JSON.stringify(activeRecord.fldStandards || [])
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
        fldStandards.length > 0
      );
    }
  }, [
    activeRecord, fldFindShort, fldFindLong, fldRecShort, fldRecLong,
    fldQTY, fldMeasurement, fldUnitType, fldLocation, fldImages, fldStandards
  ]);

  const focusClasses = "focus:border-amber-500 focus:bg-yellow-50 focus:ring-amber-500/10";

  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [editingLoc, setEditingLoc] = useState<any>(null);
  const [newLocName, setNewLocName] = useState('');
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [savedDraft, setSavedDraft] = useState<any>(null);
  const [standardSearch, setStandardSearch] = useState('');

  // Project Safety: Reset form state when switching projects to prevent data contamination
  useEffect(() => {
    if (project?.fldProjID && activeRecord && activeRecord.fldPDataProject !== project.fldProjID) {
      console.log("[ProjectDataEntry] Project misalignment detected. Clearing active record.");
      onReset();
    }
  }, [project?.fldProjID, activeRecord, onReset]);

  // Recovery Protocol: Check for draft on mount
  useEffect(() => {
    const draft = localStorage.getItem('fredasoft_draft');
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        setSavedDraft(parsed);
        setShowRecoveryModal(true);
      } catch (e) {
        localStorage.removeItem('fredasoft_draft');
      }
    }
  }, []);

  // Auto-Save Logic: Every 5 seconds if dirty
  useEffect(() => {
    if (!isDirty) return;
    const interval = setInterval(() => {
      const draftData = {
        timestamp: new Date().toISOString(),
        fldFindShort, fldFindLong, fldRecShort, fldRecLong,
        fldQTY, fldMeasurement, fldUnitType,
        fldLocation,
        fldImages, fldStandards,
        selections: {
          categoryId: selections.categoryId,
          itemId: selections.itemId,
          findId: selections.findId,
          recId: selections.recId,
          locationId: selections.locationId
        }
      };
      localStorage.setItem('fredasoft_draft', JSON.stringify(draftData));
    }, 5000);
    return () => clearInterval(interval);
  }, [
    isDirty, fldFindShort, fldFindLong, fldRecShort, fldRecLong,
    fldQTY, fldMeasurement, fldUnitType,
    fldLocation,
    fldImages, fldStandards, selections
  ]);

  const handleResumeDraft = () => {
    if (!savedDraft) return;
    setFldFindShort(savedDraft.fldFindShort || '');
    setFldFindLong(savedDraft.fldFindLong || '');
    setFldRecShort(savedDraft.fldRecShort || '');
    setFldRecLong(savedDraft.fldRecLong || '');
    setFldQTY(savedDraft.fldQTY || 0);
    setFldMeasurement(savedDraft.fldMeasurement || '');
    setFldUnitType(savedDraft.fldUnitType || 'Decimal');
    setFldLocation(savedDraft.fldLocation || '');
    setFldImages(savedDraft.fldImages || []);
    setFldStandards(savedDraft.fldStandards || []);
    
    if (savedDraft.selections) {
      onSelectionChange({
        ...selections,
        ...savedDraft.selections
      });
    }
    
    localStorage.removeItem('fredasoft_draft');
    setShowRecoveryModal(false);
    setIsDirty(true);
    toast.success('Draft recovered');
  };

  const handleDiscardDraft = () => {
    localStorage.removeItem('fredasoft_draft');
    setShowRecoveryModal(false);
    setSavedDraft(null);
    toast.info('Draft discarded');
  };

  useEffect(() => {
    if (activeRecord) {
      console.log("Hydrating Form with:", activeRecord);
      // BLUEPRINT-ACCURATE POPULATION
      const targetId = (activeRecord.fldData || "").trim().toLowerCase();
      const glos = (glossary || []).find((g: any) => (g.id || g.fldGlosId || "").trim().toLowerCase() === targetId);
      
      const newSelections = {
        ...selections,
        locationId: activeRecord.fldLocation || selections.locationId,
        categoryId: glos?.fldCat || selections.categoryId || '',
        itemId: glos?.fldItem || selections.itemId || '',
        findId: glos?.fldFind || selections.findId || '',
        recId: glos?.fldRec || selections.recId || ''
      };

      onSelectionChange(newSelections);
      console.log("Selections set to:", newSelections);

      setFldFindShort(activeRecord.fldFindShort || '');
      setFldFindLong(activeRecord.fldFindLong || '');
      setFldRecShort(activeRecord.fldRecShort || '');
      setFldRecLong(activeRecord.fldRecLong || '');
      setFldQTY(activeRecord.fldQTY || 0);
      setFldMeasurement(activeRecord.fldMeasurement || '');
      setFldUnitType(activeRecord.fldUnitType || 'Decimal');
      setFldLocation(activeRecord.fldLocation || '');
      setFldImages(Array.isArray(activeRecord.fldImages) ? activeRecord.fldImages : []);
      setFldStandards(Array.isArray(activeRecord.fldStandards) ? activeRecord.fldStandards : []);
      setIsDirty(false);
    } else {
      // Inheritance Lock: Initialize from selections if new record
      if (selections.locationId) setFldLocation(selections.locationId);
    }
  }, [activeRecord?.fldPDataID, glossary]);

  useEffect(() => {
    if (selections.recId && !isDirty && !activeRecord) {
      const rec = (masterRecommendations || []).find(r => (r.id || r.fldRecID || "").toLowerCase().trim() === (selections.recId || "").toLowerCase().trim());
      if (rec) {
        setFldRecShort(rec.fldRecShort || '');
        setFldRecLong(rec.fldRecLong || '');
        setFldStandards(rec.fldStandards || []);
      }
    }
  }, [selections.recId, masterRecommendations, isDirty, activeRecord]);

  const handleSave = () => {
    if (!fldLocation) { toast.error('Location is required'); return; }
    if (!inspector?.fldInspID) { toast.error('Inspector context is missing. Please select an inspector in Setup.'); return; }
    
    // Ensure we have a valid ID before saving
    const finalizedId = editingRecordId || uuidv4();
    
    onSave({
      fldPDataID: finalizedId,
      fldPDataProject: selections.projectId,
      fldFacility: facility?.fldFacID || activeRecord?.fldFacility,
      fldData: activeRecord?.fldData || selections.glosId || "",
      fldLocation,
      fldFindShort,
      fldFindLong,
      fldRecShort,
      fldRecLong,
      fldQTY: Number(fldQTY) || 0,
      fldMeasurement: fldMeasurement === '' ? null : Number(fldMeasurement),
      fldUnitType,
      fldImages,
      fldStandards: fldStandards,
      fldInspID: inspector.fldInspID,
      fldTimestamp: new Date().toISOString()
    });
    // Update selections for sticky behavior
    onSelectionChange({ ...selections, locationId: fldLocation, editingRecordId: finalizedId, isDirty: false });
    localStorage.removeItem('fredasoft_draft');
    setIsDirty(false);
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

  const handleClearForm = () => {
    confirmAction(
      "Clear Form",
      "You have unsaved changes. Are you sure you want to discard them and clear the form?",
      () => {
        setFldFindShort('');
        setFldFindLong('');
        setFldRecShort('');
        setFldRecLong('');
        setFldQTY(0);
        setFldMeasurement('');
        setFldUnitType('Decimal');
        setFldImages([]);
        setFldStandards([]);
        setIsDirty(false);
        localStorage.removeItem('fredasoft_draft');
        
        // Reset the Cascade: Clear downstream selections
        onSelectionChange({
          ...selections,
          itemId: '',
          findId: '',
          recId: '',
          standards: [],
          isDirty: false
        });
        
        toast.info('Form cleared');
      }
    );
  };

  const handleResetToOriginal = () => {
    if (!activeRecord) return;
    confirmAction(
      "Reset to Original",
      "You have unsaved changes. Are you sure you want to revert to the original record state?",
      () => {
        setFldFindShort(activeRecord.fldFindShort || '');
        setFldFindLong(activeRecord.fldFindLong || '');
        setFldRecShort(activeRecord.fldRecShort || '');
        setFldRecLong(activeRecord.fldRecLong || '');
        setFldQTY(activeRecord.fldQTY || 0);
        setFldMeasurement(activeRecord.fldMeasurement || '');
        setFldUnitType(activeRecord.fldUnitType || 'Decimal');
        setFldLocation(activeRecord.fldLocation || '');
        setFldImages(Array.isArray(activeRecord.fldImages) ? activeRecord.fldImages : []);
        setFldStandards(Array.isArray(activeRecord.fldStandards) ? activeRecord.fldStandards : []);
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
        onReset(); // This should set editingRecordId to null in parent
        setFldFindShort('');
        setFldFindLong('');
        setFldRecShort('');
        setFldRecLong('');
        setFldQTY(0);
        setFldMeasurement('');
        setFldImages([]);
        setFldStandards([]);
        setIsDirty(false);
        localStorage.removeItem('fredasoft_draft');
        toast.info('Edit cancelled');
      }
    );
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

  const facilityLocations = (Array.isArray(locations) ? locations : [])
    .filter(l => (l.fldProjectID === selections.projectId || (l.fldFacID && l.fldFacID === selections.facilityId)) && !l.fldIsDeleted)
    .sort((a, b) => a.fldLocName.localeCompare(b.fldLocName));

  const activeGlossaryEntry = useMemo(() => {
    if (!selections.categoryId || !selections.itemId || !selections.findId || !selections.recId) return null;
    const targetGlosId = (activeRecord?.fldData || "").trim().toLowerCase();
    return (glossary || []).find(g => 
      (g.id || g.fldGlosId || "").trim().toLowerCase() === targetGlosId || 
      (String(g.fldCat || "").trim().toLowerCase() === String(selections.categoryId || "").trim().toLowerCase() && 
       String(g.fldItem || "").trim().toLowerCase() === String(selections.itemId || "").trim().toLowerCase() && 
       String(g.fldFind || "").trim().toLowerCase() === String(selections.findId || "").trim().toLowerCase() && 
       (g.fldRec || g.fldRecID || "").trim().toLowerCase() === (selections.recId || "").trim().toLowerCase())
    );
  }, [glossary, selections, activeRecord?.fldData]);

  const filteredStandards = useMemo(() => {
    if (!activeGlossaryEntry || !activeGlossaryEntry.fldStandards) return [];
    const allowedIds = activeGlossaryEntry.fldStandards;
    return (standards || []).filter(s => allowedIds.includes(s.id));
  }, [standards, activeGlossaryEntry]);

  // TIERED RECOMMENDATION LOGIC
  const recommendationOptions = useMemo(() => {
    if (isSearchingAll) {
      return (masterRecommendations || [])
        .sort((a: any, b: any) => (a.fldRecShort || '').localeCompare(b.fldRecShort || ''))
        .map((r: any) => ({ value: r.fldRecID || r.id, label: r.fldRecShort, key: `rec-${r.fldRecID || r.id}` }));
    }

    const currentFindId = (selections.findId || '').toLowerCase().trim();
    const currentItemId = (selections.itemId || '').toLowerCase().trim();
    const currentCatId = (selections.categoryId || '').toLowerCase().trim();

    if (!currentFindId) return [];

    // TIER 1: Glossary Precision (Exact path match)
    const glossaryMatches = (glossary || []).filter(g => 
      (g.fldFind || '').toLowerCase().trim() === currentFindId &&
      (g.fldItem || '').toLowerCase().trim() === currentItemId &&
      (g.fldCat || '').toLowerCase().trim() === currentCatId
    ).map(g => (g.fldRec || g.fldRecID || '').toLowerCase().trim());

    // TIER 2: Finding Library Suggestions
    const finding = (findings || []).find(f => (f.fldFindID || f.id || '').toLowerCase().trim() === currentFindId);
    const suggestedRecs = (finding?.fldSuggestedRecs || []).map((id: string) => id.toLowerCase().trim());

    // TIER 3: Item Context (Broad Glossary) - Any rec used for this item
    const itemRecs = glossaryMatches.length === 0 ? (glossary || [])
      .filter(g => (g.fldItem || '').toLowerCase().trim() === currentItemId)
      .map(g => (g.fldRec || g.fldRecID || '').toLowerCase().trim()) : [];

    const combinedRecIds = new Set([...glossaryMatches, ...suggestedRecs, ...itemRecs]);
    
    const results = (masterRecommendations || [])
      .filter(r => combinedRecIds.has((r.fldRecID || r.id || '').toLowerCase().trim()))
      .sort((a: any, b: any) => (a.fldRecShort || '').localeCompare(b.fldRecShort || ''));

    if (results.length > 0) return results.map(r => ({ value: r.fldRecID || r.id, label: r.fldRecShort, key: `rec-${r.fldRecID || r.id}` }));

    return [];
  }, [isSearchingAll, masterRecommendations, selections.findId, selections.itemId, selections.categoryId, glossary, findings]);

  // Handle auto-selection of recommendation
  useEffect(() => {
    if (!selections.findId || selections.recId || isSearchingAll || recommendationOptions.length === 0) return;
    
    // If only one recommendation is suggested, auto-select it
    if (recommendationOptions.length === 1) {
      const recId = recommendationOptions[0].value;
      const rec = (masterRecommendations || []).find(r => (r.id || r.fldRecID || "").toLowerCase() === (recId || "").toLowerCase());
      if (rec) {
        setFldRecShort(rec.fldRecShort);
        setFldRecLong(rec.fldRecLong);
        setFldStandards(rec.fldStandards || []);
        
        // Find Glossary Link
        const glos = (glossary || []).find(g => 
          (g.fldFind || '').toLowerCase().trim() === (selections.findId || '').toLowerCase().trim() &&
          (g.fldRec || '').toLowerCase().trim() === (recId || '').toLowerCase().trim() &&
          (g.fldItem || '').toLowerCase().trim() === (selections.itemId || '').toLowerCase().trim()
        );

        onSelectionChange({
          ...selections,
          recId: recId,
          glosId: glos?.fldGlosId || glos?.id || selections.glosId || '',
          isDirty: true
        });
      }
    }
  }, [selections.findId, recommendationOptions, masterRecommendations, isSearchingAll]);

  return (
    <div className="flex flex-col h-full bg-transparent overflow-hidden">
      <div className="flex-1 overflow-y-auto w-full bg-transparent">
        {/* LAYER 1: STICKY HEADER - Opaque background to mask scrolling content */}
        <div className="sticky top-0 z-30 bg-zinc-50 border-b border-zinc-200 shadow-sm">
          <div className="max-w-6xl mx-auto px-8 py-6 space-y-6">
            {/* Header Title & Inspector Badge - Wrapped in a card-like container for floating effect */}
            <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-amber-200">
                  <Book size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-zinc-900 leading-tight">Data Entry</h2>
                  <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">Recording Inspection Findings</p>
                </div>
              </div>
              
              {inspector && (
                <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl shadow-sm">
                  <div className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider leading-none">Active Inspector</span>
                    <span className="text-xs font-bold text-zinc-900 tracking-tight">
                      {inspector.fldInspName || inspector.fldInspID}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* TOP CONTEXT CARD - Now part of sticky header */}
            <Card className="p-6 border-zinc-200 shadow-sm bg-white">
              <div className="flex flex-wrap gap-6">
                {/* CATEGORY SELECT */}
                <div className="flex-1 min-w-[240px] relative group">
                  <Select 
                    label="Category"
                    value={selectedCat}
                    onChange={(e: any) => setSelectedCat(e.target.value)}
                    selectClassName={focusClasses}
                    options={(Array.isArray(mergedCategories) ? mergedCategories : [])
                      .map((c, index) => ({ 
                        value: c.fldCategoryID || c.fldCatID || `missing-${index}`, 
                        label: c.fldCategoryName || c.fldCatName || 'Select Category',
                        key: `cat-${c.fldCategoryID || c.fldCatID || index}` 
                      }))}
                  />
                  {selectedCat && (
                    <button 
                      onClick={() => setSelectedCat('')}
                      className="absolute right-10 top-8 p-1 text-zinc-400 hover:text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Clear Category"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                {/* ITEM SELECT */}
                <div className="flex-1 min-w-[240px]">
                  <Select 
                    label="Item"
                    value={selectedItem}
                    onChange={(e: any) => setSelectedItem(e.target.value)}
                    selectClassName={focusClasses}
                    options={(Array.isArray(items) ? items : [])
                      .filter(i => i && i.fldCatID === selectedCat)
                      .map((i, index) => ({ 
                        value: i.fldItemID || `missing-item-${index}`, 
                        label: i.fldItemName || 'Select Item',
                        key: `item-${i.fldItemID || index}` 
                      }))}
                  />
                </div>
                <div className="flex-1 min-w-[240px] flex items-end gap-2">
                  <div className="flex-1 relative group">
                    <Select 
                      label="Location / Area"
                      value={fldLocation}
                      onChange={(e: any) => { 
                        setFldLocation(e.target.value); 
                        onSelectionChange({ ...selections, locationId: e.target.value });
                        setIsDirty(true); 
                      }}
                      selectClassName={focusClasses}
                      options={facilityLocations.map(l => ({ value: l.fldLocID, label: l.fldLocName, key: l.fldLocID }))}
                    />
                    {fldLocation && (
                      <button 
                        onClick={() => {
                          setFldLocation('');
                          onSelectionChange({ ...selections, locationId: '' });
                        }}
                        className="absolute right-10 top-8 p-1 text-zinc-400 hover:text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Clear Location"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  <Button 
                    variant="secondary" 
                    size="icon" 
                    className="mb-1"
                    onClick={() => setIsLocationModalOpen(true)}
                    title="Manage Locations"
                  >
                    <Edit2 size={16} />
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* LAYER 2: SCROLLABLE CONTENT */}
        <div className="max-w-6xl mx-auto px-8 py-8 space-y-8">
          {/* FINDING CARD */}
          <Card className="p-6 space-y-6 border-zinc-200 shadow-sm">
            <Select 
              label="Finding"
              value={selections.findId || ''}
              onChange={(e: any) => {
                 const find = (findings || []).find(f => (f.id || f.fldFindID || "").toLowerCase() === (e.target.value || "").toLowerCase());
                 if(find) { setFldFindShort(find.fldFindShort); setFldFindLong(find.fldFindLong); }
                 setFldStandards([]); // Clear standards on finding change
                 onSelectionChange({...selections, findId: e.target.value, isDirty: true});
              }}
              selectClassName={focusClasses}
              options={(Array.isArray(findings) ? findings : [])
                .filter(f => f && f.fldFindID && f.fldItem === selectedItem)
                .map(f => ({ value: f.fldFindID, label: f.fldFindShort, key: `find-${f.fldFindID}` }))}
            />
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
                  className={cn("w-full p-3 border border-zinc-200 rounded-lg text-sm min-h-[120px] transition-all outline-none", focusClasses)} 
                  value={fldFindLong} 
                  onChange={(e: any) => { setFldFindLong(e.target.value); setIsDirty(true); }} 
                  placeholder="Detailed finding description..."
                />
              </div>
            </div>
          </Card>

          <Card className="p-6 space-y-6 border-zinc-200 shadow-sm">
             <div className="flex items-center justify-between">
               <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Recommendation</label>
               <Button 
                 variant="ghost" 
                 size="sm" 
                 onClick={() => setIsSearchingAll(!isSearchingAll)}
                 className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700"
               >
                 {isSearchingAll ? "SHOW SUGGESTED" : "SEARCH ALL MASTER"}
               </Button>
             </div>
             <Select 
              value={selections.recId || ''}
              onChange={(e: any) => {
                 const recId = e.target.value;
                 const rec = (masterRecommendations || []).find(r => (r.id || r.fldRecID || "").toLowerCase() === (recId || "").toLowerCase());
                 
                 if(rec) { 
                   setFldRecShort(rec.fldRecShort); 
                   setFldRecLong(rec.fldRecLong); 
                   setFldStandards(rec.fldStandards || []);
                 }

                 // Find or derive Glossary Link
                 const glos = (glossary || []).find(g => 
                   (g.fldFind || '').toLowerCase().trim() === (selections.findId || '').toLowerCase().trim() &&
                   (g.fldRec || '').toLowerCase().trim() === (recId || '').toLowerCase().trim() &&
                   (g.fldItem || '').toLowerCase().trim() === (selections.itemId || '').toLowerCase().trim()
                 );

                 onSelectionChange({
                   ...selections, 
                   recId: recId, 
                   glosId: glos?.fldGlosId || glos?.id || selections.glosId || '',
                   isDirty: true
                 });
              }}
              selectClassName={focusClasses}
              options={recommendationOptions}
            />
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
                  className={cn("w-full p-3 border border-zinc-200 rounded-lg text-sm min-h-[120px] transition-all outline-none", focusClasses)} 
                  value={fldRecLong} 
                  onChange={(e: any) => { setFldRecLong(e.target.value); setIsDirty(true); }} 
                  placeholder="Detailed recommendation description..."
                />
              </div>
            </div>
          </Card>

          {/* MEASUREMENTS & QUANTITY */}
          <Card className="p-6 space-y-6 border-zinc-200 shadow-sm">
            <h3 className="text-sm font-bold text-zinc-900 border-b border-zinc-100 pb-2">Measurements & Quantity</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Input 
                label="Quantity (fldQTY)"
                type="number"
                value={fldQTY}
                onChange={(e: any) => { setFldQTY(e.target.value); setIsDirty(true); }}
                className={focusClasses}
              />
              <Select 
                label="Unit Type (fldUnitType)"
                value={fldUnitType}
                onChange={(e: any) => { setFldUnitType(e.target.value); setIsDirty(true); }}
                selectClassName={focusClasses}
                options={[
                  { value: 'Decimal', label: 'Decimal' },
                  { value: 'Fraction', label: 'Fraction' },
                  { value: 'Seconds', label: 'Seconds' },
                  { value: 'Percentage', label: 'Percentage' }
                ]}
              />
              <Input 
                label="Measurement (fldMeasurement)"
                value={fldMeasurement}
                onChange={(e: any) => { setFldMeasurement(e.target.value); setIsDirty(true); }}
                className={focusClasses}
                placeholder="Actual recorded value"
              />
            </div>
          </Card>

          {/* STANDARDS SELECTION */}
          <Card className="p-6 space-y-6 border-zinc-200 shadow-sm">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
              <h3 className="text-sm font-bold text-zinc-900">Applicable Standards (fldStandards)</h3>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
                <input 
                  type="text"
                  placeholder="Search standards..."
                  className={cn("w-full pl-9 pr-3 py-1.5 text-xs border border-zinc-200 rounded-full outline-none transition-all", focusClasses)}
                  value={standardSearch}
                  onChange={(e) => setStandardSearch(e.target.value)}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto p-1">
              {filteredStandards.length === 0 ? (
                <div className="col-span-full py-8 text-center text-zinc-400 italic text-sm">
                  {!selections.findId ? "Select a Finding to see Standards" : "No standards associated with this finding."}
                </div>
              ) : (
                filteredStandards
                  .filter(s => 
                    !standardSearch || 
                    s.citation_num.toLowerCase().includes(standardSearch.toLowerCase()) ||
                    s.citation_name.toLowerCase().includes(standardSearch.toLowerCase())
                  )
                  .map(s => {
                    const isSelected = fldStandards.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        onClick={() => {
                          setFldStandards(prev => 
                            isSelected ? prev.filter(id => id !== s.id) : [...prev, s.id]
                          );
                          setIsDirty(true);
                        }}
                        className={cn(
                          "flex items-start gap-3 p-3 rounded-xl border text-left transition-all group",
                          isSelected 
                            ? "bg-amber-50 border-amber-200 ring-1 ring-amber-200" 
                            : "bg-white border-zinc-200 hover:border-zinc-300"
                        )}
                      >
                        <div className={cn(
                          "w-5 h-5 rounded flex items-center justify-center shrink-0 border transition-colors",
                          isSelected ? "bg-amber-500 border-amber-500 text-white" : "bg-zinc-50 border-zinc-200 group-hover:border-zinc-300"
                        )}>
                          {isSelected && <CheckCircle size={12} />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-zinc-900 truncate">{s.citation_num}</p>
                          <p className="text-[10px] text-zinc-500 line-clamp-2 leading-tight">{s.citation_name}</p>
                        </div>
                      </button>
                    );
                  })
              )}
            </div>
            {fldStandards.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {fldStandards.map(id => {
                  const s = standards.find(st => (st.id || "").toLowerCase() === (id || "").toLowerCase());
                  if (!s) return null;
                  return (
                    <span key={id} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-zinc-100 text-zinc-700 rounded-full text-[10px] font-medium border border-zinc-200">
                      {s.citation_num}
                      <button onClick={() => { setFldStandards(prev => prev.filter(i => i !== id)); setIsDirty(true); }}>
                        <X size={10} className="hover:text-red-500" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
          </Card>

          <div className="flex flex-wrap justify-end gap-3 p-4">
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
                    <p className="text-sm font-medium truncate">{savedDraft.fldFindShort || 'Untitled'}</p>
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
    </div>
  );
}