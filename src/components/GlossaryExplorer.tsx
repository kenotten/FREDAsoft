/**
 * !!! VERSION 68.0 - UI STABILITY + HEARTBEAT !!!
 */
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  Trash2, 
  Edit2, 
  Plus, 
  ChevronRight, 
  ChevronDown,
  Database,
  ShieldAlert,
  Loader2,
  Copy,
  Pencil,
  X,
  FlaskConical
} from 'lucide-react';
import { Button, Input, Select, Card } from './ui/core';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { firestoreService } from '../services/firestoreService';
import { db } from '../firebase';
import { writeBatch, doc, setDoc, serverTimestamp, collection, getDocs } from 'firebase/firestore';

import { stabilizationService } from '../services/stabilizationService';
import { migrationService, MigrationResults } from '../services/migrationService';

export default function GlossaryExplorer({
  categories = [], 
  items = [], 
  findings = [], 
  recommendations = [], 
  masterRecommendations = [],
  glossary = [], 
  unitTypes = [],
  importMasterGlossary,
  isDeduplicating,
  csvData,
  onEditGlossaryItem,
  setRawMasterRecommendations,
  setGlossary
}: any) {
  const [localMasterRecs, setLocalMasterRecs] = useState<any[]>([]);
  const [stabilizationReport, setStabilizationReport] = useState<any>(null);
  const [isStabilizing, setIsStabilizing] = useState(false);
  const [migrationResults, setMigrationResults] = useState<MigrationResults | null>(null);
  const [isMigrating, setIsMigrating] = useState(false);
  
  useEffect(() => {
    const fetchMasterRecs = async () => {
      console.log("FETCH STATUS: Received", masterRecommendations.length, "recommendations and", glossary.length, "glossary items.");
      console.log('[GLOSSARY EXPLORER] GABRIEL DIRECTIVE: Forcing local fetch from Firestore...');
      
      // Force reload if data is missing after 5 seconds
      const reloadTimer = setTimeout(() => {
        if (masterRecommendations.length === 0 && glossary.length === 0) {
          console.error("[GLOSSARY EXPLORER] Data missing after 5s. Reloading...");
          window.location.reload();
        }
      }, 5000);

      try {
        const querySnapshot = await getDocs(collection(db, 'recommendations'));
        const recs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log(`[GLOSSARY EXPLORER] Local fetch complete. Found ${recs.length} records.`);
        setLocalMasterRecs(recs);
        clearTimeout(reloadTimer);
      } catch (error: any) {
        console.error('[GLOSSARY EXPLORER] Local fetch FAILED. Error Code:', error.code, 'Message:', error.message);
        toast.error(`Failed to fetch data: ${error.message}`);
        clearTimeout(reloadTimer);
      }
    };
    fetchMasterRecs();
  }, []);

  console.log('AUDIT - Master Rec Shape:', localMasterRecs[0]);
  const [sortMode, setSortMode] = useState<'order' | 'alpha'>('order');
  const [showMissingOnly, setShowMissingOnly] = useState(false);
  const [columnFilters, setColumnFilters] = useState({
    finding: '',
    recommendation: ''
  });
  const [showColumnSearch, setShowColumnSearch] = useState({
    finding: false,
    recommendation: false
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [editingField, setEditingField] = useState<{ id: string, field: string, value: any } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string, name: string } | null>(null);
  const [healthAudit, setHealthAudit] = useState<{
    orphanedFindings: number;
    orphanedRecommendations: number;
    infertilFindings: number;
    brokenLinks: number;
    totalFindings: number;
    totalRecs: number;
    totalGlossary: number;
  } | null>(null);

  const runHealthAudit = () => {
    console.log("HEALTH AUDIT: Starting tally...");
    
    // 1. Orphaned Findings (No Item parent)
    const orphanedFindings = findings.filter((f: any) => !f.fldItem).length;
    
    // 2. Orphaned Recommendations (Not linked to any Finding)
    const linkedRecIds = new Set();
    glossary.forEach((g: any) => { if (g.fldRec) linkedRecIds.add(g.fldRec); });
    findings.forEach((f: any) => { 
      if (f.fldSuggestedRecs) {
        f.fldSuggestedRecs.forEach((id: string) => linkedRecIds.add(id));
      }
    });
    
    const orphanedRecommendations = localMasterRecs.filter((r: any) => {
      const id = r.id || r.fldRecID;
      return !linkedRecIds.has(id);
    }).length;

    // 3. Infertil Findings (No recommendations)
    const infertilFindings = findings.filter((f: any) => {
      const hasSuggested = f.fldSuggestedRecs && f.fldSuggestedRecs.length > 0;
      const hasGlossaryLink = glossary.some((g: any) => g.fldFind === (f.id || f.fldFindID));
      return !hasSuggested && !hasGlossaryLink;
    }).length;

    // 4. Broken Glossary Links (Glossary records with dead Rec IDs)
    const masterRecIds = new Set(localMasterRecs.map(r => (r.id || r.fldRecID || "").toLowerCase().trim()));
    const brokenLinks = glossary.filter((g: any) => {
      if (!g.fldRec) return false;
      return !masterRecIds.has(String(g.fldRec).toLowerCase().trim());
    }).length;

    setHealthAudit({
      orphanedFindings,
      orphanedRecommendations,
      infertilFindings,
      brokenLinks,
      totalFindings: findings.length,
      totalRecs: localMasterRecs.length,
      totalGlossary: glossary.length
    });
    
    toast.success("Health Audit Complete!");
  };

  const runDataIntegritySurgery = async () => {
    setIsSaving(true);
    let fixedCount = 0;
    try {
      console.log("SURGERY: Starting Findings Data Integrity Surgery...");
      const findingsSnap = await getDocs(collection(db, 'findings'));
      const batch = writeBatch(db);
      let batchCount = 0;

      for (const docSnap of findingsSnap.docs) {
        const data = docSnap.data();
        const value = data.fldSuggestedRecs;
        
        // Audit only findings with improper data types
        if (!Array.isArray(value)) {
          console.log(`LEAK FOUND: Finding [${docSnap.id}] has invalid fldSuggestedRecs:`, value);
          
          let repairedValue: string[] = [];
          if (typeof value === 'string' && value.trim() !== '') {
            repairedValue = [value];
          } else if (value === null || typeof value === 'boolean' || value === undefined || value === '') {
            repairedValue = [];
          } else {
            // Default fallback for any other unexpected data corruption
            repairedValue = [];
          }

          batch.update(doc(db, 'findings', docSnap.id), { fldSuggestedRecs: repairedValue });
          batchCount++;
          fixedCount++;
          
          // Firestore atomic batch limit is 500 operations
          if (batchCount >= 450) {
             await batch.commit();
             console.log("SURGERY: Partial batch committed (450 records).");
             batchCount = 0;
          }
        }
      }

      if (batchCount > 0) {
        await batch.commit();
      }

      console.log(`SURGERY SUCCESS: Repaired ${fixedCount} records.`);
      toast.success(`Surgery Complete! Repaired ${fixedCount} finding records.`);
    } catch (error: any) {
      console.error("SURGERY FAILED:", error);
      toast.error(`Surgery failed: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Filter items based on selected category
  const filteredItems = useMemo(() => {
    if (!selectedCategoryId) return items;
    return items.filter((i: any) => i.fldCatID === selectedCategoryId);
  }, [items, selectedCategoryId]);

  const toggleRow = (id: string) => {
    const next = new Set(expandedRows);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedRows(next);
  };

  const handleSaveEdit = async () => {
    if (!editingField) return;
    setIsSaving(true);
    try {
      const { id, field, value } = editingField;
      let collection = '';
      
      if (field === 'fldFindLong' || field === 'fldFindShort' || field === 'fldOrder') {
        collection = 'findings';
      } else if (field === 'fldRecLong' || field === 'fldUOM' || field === 'fldUnit' || field === 'fldRecShort' || field === 'fldOrder') {
        collection = 'recommendations';
      }

      if (collection) {
        // Ensure numeric values are numbers
        const finalValue = (field === 'fldOrder') ? (value === '' ? 999 : Number(value)) : (field === 'fldUnit' ? Number(value) : value);
        await firestoreService.save(collection, { [field]: finalValue }, id, false);
        toast.success('Updated successfully');
      }
      setEditingField(null);
    } catch (error) {
      console.error('Update error:', error);
      toast.error('Failed to update');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRetireGlossary = async (id: string) => {
    setIsSaving(true);
    try {
      await firestoreService.softDelete('glossary', id);
      toast.success('Record retired');
    } catch (error) {
      toast.error('Failed to retire');
    } finally {
      setIsSaving(false);
    }
  };

  const runStabilization = async () => {
    setIsStabilizing(true);
    try {
      toast.info("Starting Phase 2: Data Hygiene...");
      const hygieneResults = await stabilizationService.runDataHygiene();
      
      toast.info("Starting Phase 3: Glossary Repair...");
      await stabilizationService.runGlossaryRepair();
      
      toast.info("Starting Phase 3.5: Gap Analysis...");
      const gapReport = await stabilizationService.generateGapReport();
      
      setStabilizationReport({
        hygiene: hygieneResults,
        gap: gapReport
      });

      toast.success("Stabilization Sequence Complete!");
    } catch (error: any) {
      toast.error("Stabilization Failed: " + error.message);
    } finally {
      setIsStabilizing(false);
    }
  };

  const runFallbackAnchors = async () => {
    if (!stabilizationReport?.gap?.missingItems || stabilizationReport.gap.missingItems.length === 0) {
      toast.info("No missing anchors identified.");
      return;
    }
    setIsStabilizing(true);
    try {
      await stabilizationService.createFallbackAnchors(stabilizationReport.gap.missingItems);
      // Refresh report
      const gapReport = await stabilizationService.generateGapReport();
      setStabilizationReport((prev: any) => ({ ...prev, gap: gapReport }));
    } catch (error: any) {
      toast.error("Fallback creation failed.");
    } finally {
      setIsStabilizing(false);
    }
  };

  const runMigrationDryRun = async () => {
    setIsMigrating(true);
    try {
      const results = await migrationService.runDryRun();
      setMigrationResults(results);
      toast.success("Migration Dry Run Complete!");
    } catch (error: any) {
      toast.error("Migration Dry Run Failed: " + error.message);
    } finally {
      setIsMigrating(false);
    }
  };

  const masterRecsRef = React.useRef(masterRecommendations);
  React.useEffect(() => {
    masterRecsRef.current = masterRecommendations;
  }, [masterRecommendations]);

  const handleRecoverToMaster = async (row: any) => {
    setIsSaving(true);
    try {
      const payload = { 
        fldRecID: row.fldRec, 
        fldRecShort: row.recommendationShort, 
        fldRecLong: row.recommendationLong, 
        fldOrder: 999 
      };
      await firestoreService.save('recommendations', payload, row.fldRec);
      toast.success('Recommendation recovered to Master library');
    } catch (error) {
      console.error('Recovery error:', error);
      toast.error('Failed to recover recommendation');
    } finally {
      setIsSaving(false);
    }
  };

  const resolvedGlossary = useMemo(() => {
    if (!glossary) return [];
    return glossary.map((g: any) => {
      const gRecId = g.fldRec || g.fldRecID;
      const gFindId = String(g.fldFind || "").toLowerCase().trim();
      const gItemId = String(g.fldItem || "").toLowerCase().trim();
      const gCatId = String(g.fldCat || "").toLowerCase().trim();

      // Robust lookup with trimming
      let finding = findings?.find((f: any) => 
        String(f.id || "").toLowerCase().trim() === gFindId || 
        String(f.fldFindID || "").toLowerCase().trim() === gFindId
      );
      
      // Exact lookup in Master (Gabriel Directive: Hard-Wired to Local Source)
      const effectiveMasterRecs = (localMasterRecs && localMasterRecs.length > 0) ? localMasterRecs : (masterRecommendations || []);
      let matchedRec = effectiveMasterRecs.find((r: any) => 
        (r.id || r.fldRecID || "").toLowerCase().trim() === (gRecId || "").toLowerCase().trim()
      );
      
      let suggestedHealRec = null;
      if (!matchedRec && gRecId) {
        suggestedHealRec = effectiveMasterRecs.find((r: any) => 
          String(r.fldRecShort || "").toLowerCase().trim() === String(g.recommendationShort || "").toLowerCase().trim()
        );
      }

      if (!matchedRec && gRecId && (g.recommendationShort || g.recommendationLong)) {
        console.error('CRITICAL: Glossary ID not found in Master:', gRecId);
        console.log('Glossary Record Context:', g);
      }
      
      // Fallback to legacy recommendations if missing from master
      let legacyRec = null;
      if (!matchedRec) {
        legacyRec = recommendations?.find((r: any) => 
          (r.id || r.fldRecID || "").toLowerCase().trim() === (gRecId || "").toLowerCase().trim()
        );
      }

      let item = items?.find((i: any) => 
        String(i.id || "").toLowerCase().trim() === gItemId ||
        String(i.fldItemID || "").toLowerCase().trim() === gItemId
      );
      
      if (!item && finding) {
        const findItemId = String(finding.fldItem || "").toLowerCase().trim();
        item = items?.find((i: any) => 
          String(i.id || "").toLowerCase().trim() === findItemId ||
          String(i.fldItemID || "").toLowerCase().trim() === findItemId
        );
      }
      
      let category = categories?.find((c: any) => 
        String(c.id || "").toLowerCase().trim() === gCatId ||
        String(c.fldCategoryID || "").toLowerCase().trim() === gCatId
      );

      if (!category && item) {
        const itemCatId = String(item.fldCatID || "").toLowerCase().trim();
        category = categories?.find((c: any) => 
          String(c.id || "").toLowerCase().trim() === itemCatId ||
          String(c.fldCategoryID || "").toLowerCase().trim() === itemCatId
        );
      }

      const finalRec = matchedRec || legacyRec;

      return {
        ...g,
        fldCat: g.fldCat || category?.fldCategoryID || category?.id,
        fldItem: g.fldItem || item?.fldItemID || item?.id,
        fldFind: g.fldFind || finding?.fldFindID || finding?.id,
        fldRec: g.fldRec || finalRec?.fldRecID || finalRec?.id,
        
        categoryName: category?.fldCategoryName || 'Unknown',
        itemName: item?.fldItemName || 'Unknown',
        catOrder: category?.fldOrder ?? Infinity,
        itemOrder: item?.fldOrder ?? Infinity,
        findOrder: finding?.fldOrder ?? Infinity,
        recOrder: finalRec?.fldOrder ?? Infinity,
        findingShort: finding?.fldFindShort || 'Unknown',
        findingLong: finding?.fldFindLong || '',
        recommendationShort: finalRec?.fldRecShort || g.recommendationShort || 'Recommendation Not Found',
        recommendationLong: finalRec?.fldRecLong || g.recommendationLong || '',
        fldRecShort: finalRec?.fldRecShort || g.fldRecShort || g.recommendationShort || 'Recommendation Not Found',
        fldRecLong: finalRec?.fldRecLong || g.fldRecLong || g.recommendationLong || '',
        fldOrder: finalRec?.fldOrder || g.fldOrder || 0,
        uom: finalRec?.fldUOM || 'EA',
        unitCost: finalRec?.fldUnit || 0,
        findingId: finding?.fldFindID || finding?.id,
        recommendationId: finalRec?.fldRecID || finalRec?.id,
        isOrphaned: !matchedRec && !!gRecId,
        canRecover: !matchedRec && !!gRecId,
        suggestedHealRec,
        canHeal: !!suggestedHealRec && !matchedRec,
        isMissing: !matchedRec && !legacyRec,
        matchedRec // For "Missing Master Links" filter
      };
    });
  }, [glossary, categories, items, findings, recommendations, masterRecommendations, localMasterRecs]);

  const handleRepairLink = async (glossaryId: string, newRecId: string) => {
    setIsSaving(true);
    try {
      await firestoreService.save('glossary', { fldRec: newRecId }, glossaryId);
      toast.success('Link repaired successfully');
    } catch (error) {
      console.error('Repair error:', error);
      toast.error('Failed to repair link');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredData = useMemo(() => {
    let base = resolvedGlossary;

    // 1. Status Filter: Missing Master Links
    if (showMissingOnly) {
      base = base.filter((d: any) => (!d.matchedRec || d.recommendationShort === 'Recommendation Not Found') && d.fldRec);
    }

    // 2. Category/Item Filters
    if (selectedCategoryId) {
      base = base.filter((d: any) => d.fldCat === selectedCategoryId);
    }
    if (selectedItemId) {
      base = base.filter((d: any) => d.fldItem === selectedItemId);
    }

    // 3. Column Filters
    if (columnFilters.finding) {
      const q = columnFilters.finding.toLowerCase();
      base = base.filter((d: any) => 
        d.findingShort?.toLowerCase().includes(q) || 
        d.findingLong?.toLowerCase().includes(q)
      );
    }
    if (columnFilters.recommendation) {
      const q = columnFilters.recommendation.toLowerCase();
      base = base.filter((d: any) => 
        d.recommendationShort?.toLowerCase().includes(q) || 
        d.recommendationLong?.toLowerCase().includes(q)
      );
    }

    // 4. Global Search
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      base = base.filter((d: any) => 
        (d.categoryName?.toLowerCase().includes(q)) ||
        (d.itemName?.toLowerCase().includes(q)) ||
        (d.findingShort?.toLowerCase().includes(q)) ||
        (d.findingLong?.toLowerCase().includes(q)) ||
        (d.recommendationShort?.toLowerCase().includes(q)) ||
        (d.recommendationLong?.toLowerCase().includes(q)) ||
        (d.fldGlosId?.toLowerCase().includes(q))
      );
    }

    // 5. Sorting Logic
    const sortFn = (a: any, b: any, field: string, orderField: string) => {
      if (sortMode === 'order') {
        const valA = a[orderField] ?? Infinity;
        const valB = b[orderField] ?? Infinity;
        if (valA !== valB) return valA - valB;
      }
      return (a[field] || '').localeCompare(b[field] || '');
    };

    return [...base].sort((a: any, b: any) => {
      // Category
      const catSort = sortFn(a, b, 'categoryName', 'catOrder');
      if (catSort !== 0) return catSort;

      // Item
      const itemSort = sortFn(a, b, 'itemName', 'itemOrder');
      if (itemSort !== 0) return itemSort;

      // Finding (Always by order then alpha per stability requirement)
      const findSort = (a.findOrder ?? Infinity) - (b.findOrder ?? Infinity) || (a.findingShort || '').localeCompare(b.findingShort || '');
      if (findSort !== 0) return findSort;

      // Recommendation (Always by order then alpha per stability requirement)
      return (a.recOrder ?? Infinity) - (b.recOrder ?? Infinity) || (a.recommendationShort || '').localeCompare(b.recommendationShort || '');
    });
  }, [resolvedGlossary, searchTerm, selectedCategoryId, selectedItemId, sortMode, showMissingOnly, columnFilters]);

  const EditableField = ({ id, field, value, type = 'text', label, inline = false }: any) => {
    const isEditing = editingField?.id === id && editingField?.field === field;
    
    if (isEditing) {
      return (
        <div className={cn("flex flex-col gap-2 w-full", inline ? "p-1" : "")} onClick={(e) => e.stopPropagation()}>
          {!inline && <label className="text-[10px] font-bold text-zinc-400 uppercase">{label}</label>}
          {type === 'textarea' ? (
            <textarea 
              className="w-full p-2 text-sm border border-zinc-200 rounded-lg focus:ring-2 focus:ring-black/5 outline-none min-h-[100px]"
              value={editingField.value}
              onChange={(e) => setEditingField({ ...editingField, value: e.target.value })}
              autoFocus
            />
          ) : (
            <input 
              className="w-full p-2 text-sm border border-zinc-200 rounded-lg focus:ring-2 focus:ring-black/5 outline-none"
              value={editingField.value}
              onChange={(e) => setEditingField({ ...editingField, value: e.target.value })}
              autoFocus
            />
          )}
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSaveEdit} disabled={isSaving}>Save</Button>
            <Button size="sm" variant="ghost" onClick={() => setEditingField(null)}>Cancel</Button>
          </div>
        </div>
      );
    }

    return (
      <div className={cn("group relative flex flex-col", inline ? "" : "gap-1")}>
        {!inline && <label className="text-[10px] font-bold text-zinc-400 uppercase">{label}</label>}
        <div className="flex items-start justify-between gap-2">
          <p className={cn("text-sm text-zinc-700", inline ? "truncate" : "whitespace-pre-wrap")}>
            {value || <span className="text-zinc-300 italic">Empty</span>}
          </p>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setEditingField({ id, field, value });
            }}
            className="p-1 text-zinc-400 hover:text-zinc-900 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Edit2 size={12} />
          </button>
        </div>
      </div>
    );
  };

  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => {
      if (sortMode === 'order') {
        const valA = a.fldOrder ?? Infinity;
        const valB = b.fldOrder ?? Infinity;
        if (valA !== valB) return valA - valB;
      }
      return (a.fldCategoryName || '').localeCompare(b.fldCategoryName || '');
    });
  }, [categories, sortMode]);

  const sortedItems = useMemo(() => {
    const base = selectedCategoryId ? items.filter((i: any) => i.fldCatID === selectedCategoryId) : items;
    return [...base].sort((a, b) => {
      if (sortMode === 'order') {
        const valA = a.fldOrder ?? Infinity;
        const valB = b.fldOrder ?? Infinity;
        if (valA !== valB) return valA - valB;
      }
      return (a.fldItemName || '').localeCompare(b.fldItemName || '');
    });
  }, [items, selectedCategoryId, sortMode]);

  return (
    <div className="flex flex-col flex-1 min-h-0 space-y-6 overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Glossary Explorer</h1>
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest mt-1">v75.0 | COCKPIT_CLEANED</span>
          </div>
          <p className="text-sm text-zinc-500">Production-ready data management dashboard</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={runStabilization}
            disabled={isStabilizing}
            variant="outline"
            size="sm"
            className="text-[10px] font-bold uppercase tracking-widest"
          >
            {isStabilizing ? <Loader2 size={12} className="animate-spin mr-2" /> : <RefreshCw size={12} className="mr-2" />}
            Stabilize & Audit
          </Button>
          <Button 
            onClick={runFallbackAnchors}
            disabled={isStabilizing || !stabilizationReport}
            variant="secondary"
            size="sm"
            className="text-[10px] font-bold uppercase tracking-widest"
          >
            Create Anchors ({stabilizationReport?.gap?.missingItemsCount || 0})
          </Button>
          <Button 
            onClick={runMigrationDryRun}
            disabled={isMigrating}
            variant="primary"
            size="sm"
            className="text-[10px] font-bold uppercase tracking-widest bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isMigrating ? <Loader2 size={12} className="animate-spin mr-2" /> : <FlaskConical size={12} className="mr-2" />}
            Migration Dry Run
          </Button>
        </div>
      </div>

      {migrationResults && (
        <Card className="p-6 bg-zinc-900 text-white border-none shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <FlaskConical className="text-amber-500" />
              <div>
                <h3 className="font-bold">Harris Center Backfill: Dry Run Report</h3>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Stage 1 - Preview Mode</p>
              </div>
            </div>
            <button onClick={() => setMigrationResults(null)} className="text-zinc-500 hover:text-white">
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-6 gap-6">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Analyzed</p>
              <div className="text-xl font-bold">{migrationResults.totalAnalyzed}</div>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Clean (Short)</p>
              <div className="text-xl font-bold text-green-500">{migrationResults.cleanMatchesShort}</div>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Clean (Long)</p>
              <div className="text-xl font-bold text-blue-500">{migrationResults.cleanMatchesLong}</div>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Ambiguous</p>
              <div className="text-xl font-bold text-amber-500">{migrationResults.ambiguous}</div>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Unmatched</p>
              <div className="text-xl font-bold text-red-500">{migrationResults.unmatched}</div>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Resolvable</p>
              <div className="text-2xl font-black text-blue-400">{migrationResults.resolvable}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Top Resolvable Samples</p>
              <div className="space-y-2">
                {migrationResults.samples.matched.map((s, i) => (
                  <div key={i} className="p-2 bg-white/5 rounded border border-white/5 flex flex-col gap-1">
                    <div className="text-[10px] font-bold text-blue-400 truncate">{s.originalText}</div>
                    <div className="text-[9px] text-zinc-500">→ GLOS: {s.proposedGlosId}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Ambiguity Conflict Samples</p>
              <div className="space-y-2">
                {migrationResults.samples.ambiguous.map((s, i) => (
                  <div key={i} className="p-2 bg-white/5 rounded border border-white/5 flex flex-col gap-1 text-amber-500">
                    <div className="text-[10px] font-bold truncate">{s.text}</div>
                    <div className="text-[9px] text-zinc-500 italic">Found {s.matches.length} library matches</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Unmatched Samples</p>
              <div className="space-y-2">
                {migrationResults.samples.unmatched.map((s, i) => (
                  <div key={i} className="p-2 bg-white/5 rounded border border-white/5 text-red-400 text-[10px]">
                    {s.text}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center gap-3">
            <AlertCircle size={16} className="text-blue-400" />
            <p className="text-xs text-blue-200">
              This report is a simulation. No writes have been performed. Approval required for Stage 2.
            </p>
          </div>
        </Card>
      )}

      {stabilizationReport && (
        <Card className="p-6 bg-zinc-900 text-white border-none shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <ShieldAlert className="text-blue-500" />
              <div>
                <h3 className="font-bold">Stabilization Command Console</h3>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Phase 2 - 3.5 Results</p>
              </div>
            </div>
            <button onClick={() => setStabilizationReport(null)} className="text-zinc-500 hover:text-white">
              <X size={16} />
            </button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Hygiene (Mod/Skip)</p>
              <div className="text-xl font-bold">{stabilizationReport.hygiene.modified} / {stabilizationReport.hygiene.skipped}</div>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">PData Linkage (Clean)</p>
              <div className="text-xl font-bold text-green-500">{stabilizationReport.gap.clean}</div>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Unmatchable</p>
              <div className="text-xl font-bold text-red-500">{stabilizationReport.gap.unmatchable}</div>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Missing Anchors</p>
              <div className="text-xl font-bold text-amber-500">{stabilizationReport.gap.missingItemsCount}</div>
            </div>
          </div>

          {stabilizationReport.gap.missingItemsCount > 0 && (
            <div className="p-4 bg-white/5 rounded-xl border border-white/5">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Isolated Coverage Gaps:</p>
              <div className="flex flex-wrap gap-2">
                {stabilizationReport.gap.missingItems.map((item: string, i: number) => (
                  <span key={i} className="px-2 py-1 bg-white/10 rounded text-[10px] transition-colors hover:bg-white/20">{item}</span>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      <div className="flex flex-col gap-4">
        {healthAudit && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
            <Card className="p-4 bg-amber-50 border-amber-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-amber-800 uppercase tracking-widest">Orphaned Findings</p>
                  <p className="text-2xl font-bold text-amber-900">{healthAudit.orphanedFindings}</p>
                  <p className="text-[10px] text-amber-600 mt-1">No Item parent ({healthAudit.totalFindings} total)</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 bg-purple-50 border-purple-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                  <Database size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-purple-800 uppercase tracking-widest">Orphaned Recs</p>
                  <p className="text-2xl font-bold text-purple-900">{healthAudit.orphanedRecommendations}</p>
                  <p className="text-[10px] text-purple-600 mt-1">Unlinked to Findings ({healthAudit.totalRecs} total)</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 bg-red-50 border-red-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg text-red-600">
                  <AlertCircle size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-red-800 uppercase tracking-widest">Infertil Findings</p>
                  <p className="text-2xl font-bold text-red-900">{healthAudit.infertilFindings}</p>
                  <p className="text-[10px] text-red-600 mt-1">Findings with zero recs</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 bg-blue-50 border-blue-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                  <RefreshCw size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-blue-800 uppercase tracking-widest">Broken Links</p>
                  <p className="text-2xl font-bold text-blue-900">{healthAudit.brokenLinks}</p>
                  <p className="text-[10px] text-blue-600 mt-1">Glossary links to dead Recs</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" />
            <input 
              className="w-full pl-10 pr-4 py-2 text-sm border border-zinc-200 rounded-lg bg-white focus:ring-2 focus:ring-black/5 outline-none transition-all"
              placeholder="Global Search (titles, descriptions, IDs)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <Select 
              value={selectedCategoryId} 
              onChange={(e: any) => {
                setSelectedCategoryId(e.target.value);
                setSelectedItemId('');
              }}
              className="w-48"
              options={sortedCategories.map((c: any) => ({ value: c.fldCategoryID, label: c.fldCategoryName })) || []}
              placeholder="All Categories"
            />

            <Select 
              value={selectedItemId} 
              onChange={(e: any) => setSelectedItemId(e.target.value)}
              className="w-48"
              options={sortedItems.map((i: any) => ({ value: i.fldItemID, label: i.fldItemName })) || []}
              placeholder="All Items"
            />
          </div>
        </div>

        <div className="flex items-center gap-6 px-1">
          <label className="flex items-center gap-2 cursor-pointer group">
            <div className={cn(
              "w-4 h-4 rounded border flex items-center justify-center transition-all",
              showMissingOnly ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-zinc-300 group-hover:border-zinc-400"
            )}>
              {showMissingOnly && <CheckCircle size={10} />}
            </div>
            <input 
              type="checkbox" 
              className="hidden" 
              checked={showMissingOnly} 
              onChange={(e) => setShowMissingOnly(e.target.checked)} 
            />
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Show Missing Master Links Only</span>
          </label>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col bg-white border border-zinc-200 rounded-xl shadow-sm">
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-left border-collapse table-fixed">
            <thead className="sticky top-0 z-10 bg-zinc-50 border-b border-zinc-200">
              <tr>
                <th className="w-10 px-4 py-3"></th>
                <th className="w-32 px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Category</th>
                <th className="w-32 px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Item</th>
                <th className="px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Finding Short</span>
                    <button 
                      onClick={() => setShowColumnSearch(prev => ({ ...prev, finding: !prev.finding }))}
                      className={cn("p-1 rounded hover:bg-zinc-200 transition-colors", showColumnSearch.finding && "text-blue-600 bg-blue-50")}
                    >
                      <Search size={12} />
                    </button>
                  </div>
                  {showColumnSearch.finding && (
                    <div className="mt-2">
                      <input 
                        className="w-full px-2 py-1 text-[10px] border border-zinc-200 rounded bg-white outline-none focus:ring-2 focus:ring-blue-500/10"
                        placeholder="Filter findings..."
                        value={columnFilters.finding}
                        onChange={(e) => setColumnFilters(prev => ({ ...prev, finding: e.target.value }))}
                        autoFocus
                      />
                    </div>
                  )}
                </th>
                <th className="px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Recommendation Short</span>
                    <button 
                      onClick={() => setShowColumnSearch(prev => ({ ...prev, recommendation: !prev.recommendation }))}
                      className={cn("p-1 rounded hover:bg-zinc-200 transition-colors", showColumnSearch.recommendation && "text-blue-600 bg-blue-50")}
                    >
                      <Search size={12} />
                    </button>
                  </div>
                  {showColumnSearch.recommendation && (
                    <div className="mt-2">
                      <input 
                        className="w-full px-2 py-1 text-[10px] border border-zinc-200 rounded bg-white outline-none focus:ring-2 focus:ring-blue-500/10"
                        placeholder="Filter recommendations..."
                        value={columnFilters.recommendation}
                        onChange={(e) => setColumnFilters(prev => ({ ...prev, recommendation: e.target.value }))}
                        autoFocus
                      />
                    </div>
                  )}
                </th>
                <th className="w-20 px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">UOM</th>
                <th className="w-24 px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Cost</th>
                <th className="w-16 px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredData.map((row: any) => (
                <React.Fragment key={row.id}>
                  <tr 
                    className={cn(
                      "hover:bg-zinc-50 transition-colors cursor-pointer group",
                      expandedRows.has(row.id) && "bg-zinc-50"
                    )}
                    onClick={() => toggleRow(row.id)}
                  >
                    <td className="px-4 py-3">
                      {expandedRows.has(row.id) ? <ChevronDown size={14} className="text-zinc-400" /> : <ChevronRight size={14} className="text-zinc-400" />}
                    </td>
                    <td className="px-4 py-3 text-xs font-medium text-zinc-600 truncate">{row.categoryName}</td>
                    <td className="px-4 py-3 text-xs font-medium text-zinc-900 truncate">{row.itemName}</td>
                    <td className="px-4 py-3">
                      <EditableField id={row.findingId} field="fldFindShort" value={row.findingShort} inline />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <EditableField id={row.recommendationId} field="fldRecShort" value={row.recommendationShort} inline />
                        {row.isOrphaned && (
                          <div className="flex items-center gap-1.5">
                            <span title="Orphaned: Not in Master">
                              <ShieldAlert size={12} className="text-amber-500 shrink-0" />
                            </span>
                            {row.canHeal && (
                              <Button 
                                size="xs" 
                                variant="secondary" 
                                className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200 text-[9px] h-5 px-1.5 font-bold"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRepairLink(row.fldGlosId, row.suggestedHealRec.fldRecID || row.suggestedHealRec.id);
                                }}
                              >
                                REPAIR LINK
                              </Button>
                            )}
                            {row.canRecover && (
                              <Button 
                                size="xs" 
                                variant="secondary" 
                                className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200 text-[9px] h-5 px-1.5 font-bold"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRecoverToMaster(row);
                                }}
                              >
                                RECOVER TO MASTER
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <EditableField id={row.recommendationId} field="fldUOM" value={row.uom} inline />
                    </td>
                    <td className="px-4 py-3">
                      <EditableField id={row.recommendationId} field="fldUnit" value={row.unitCost} inline />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditGlossaryItem(row);
                          }}
                          className="p-2 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Edit in Builder"
                        >
                          <Pencil size={14} />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirm({ id: row.id, name: row.findingShort });
                          }}
                          className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Retire Item"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedRows.has(row.id) && (
                    <tr className="bg-zinc-50/50">
                      <td colSpan={3}></td>
                      <td className="px-4 py-4 border-b border-zinc-100 align-top">
                        <div className="space-y-4">
                          <EditableField 
                            id={row.findingId} 
                            field="fldFindLong" 
                            value={row.findingLong} 
                            type="textarea" 
                            label="Long Finding"
                          />
                          <EditableField 
                            id={row.findingId} 
                            field="fldOrder" 
                            value={row.fldOrder} 
                            type="number" 
                            label="Finding Sort Order"
                          />
                        </div>
                      </td>
                      <td colSpan={3} className="px-4 py-4 border-b border-zinc-100 align-top">
                        <div className="space-y-4">
                          <EditableField 
                            id={row.recommendationId} 
                            field="fldRecLong" 
                            value={row.recommendationLong} 
                            type="textarea" 
                            label="Long Recommendation"
                          />
                          <EditableField 
                            id={row.recommendationId} 
                            field="fldOrder" 
                            value={row.fldOrder} 
                            type="number" 
                            label="Rec Sort Order"
                          />
                        </div>

                        {(() => {
                          const recId = row.fldRec;
                          
                          if (recId === "5071ed43-a137-46a1-8843-4121f4cf6fb3") {
                            console.log('TARGET FOUND IN STATE:', !!localMasterRecs.find(r => (r.id || r.fldRecID) === recId));
                          }
                          const isActuallyInMaster = localMasterRecs.some(mr => {
                            const match = (mr.id || mr.fldRecID || "").toLowerCase().trim() === (recId || "").toLowerCase().trim();
                            if (expandedRows.has(row.id)) {
                              console.log('Comparing:', recId, 'to:', (mr.id || mr.fldRecID), 'Match:', match);
                            }
                            return match;
                          });
                          
                          if (isActuallyInMaster || !recId) return null;

                          return (
                            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
                              <div className="flex items-center gap-2 text-amber-700">
                                <ShieldAlert size={16} />
                                <span className="text-xs font-bold uppercase">Orphaned Recommendation</span>
                              </div>
                              <Button size="sm" onClick={() => handleRecoverToMaster(row)} disabled={isSaving}>
                                <Database size={14} className="mr-2" />
                                Recover to Master
                              </Button>
                            </div>
                          );
                        })()}
                        
                        {/* Metadata Footer */}
                        <div className="mt-8 pt-4 border-t border-zinc-200 flex items-center justify-between">
                          <div className="flex gap-4 text-[9px] font-mono text-zinc-400 uppercase tracking-tight">
                            <span>GLOS: {row.fldGlosId}</span>
                            <span>CAT: {row.fldCat}</span>
                            <span>ITEM: {row.fldItem}</span>
                            <span>FIND: {row.fldFind}</span>
                            <span>REC: {row.fldRec}</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-zinc-400 italic text-sm">
                    No records found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {deleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-zinc-100 bg-red-50/50">
              <div className="flex items-center gap-3 text-red-600">
                <ShieldAlert size={24} />
                <h2 className="text-lg font-bold">Retire Glossary Item</h2>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-zinc-600 leading-relaxed">
                Are you sure you want to retire <span className="font-bold text-zinc-900">"{deleteConfirm.name}"</span>?
              </p>
              <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex gap-3">
                <AlertCircle className="text-amber-600 shrink-0" size={18} />
                <p className="text-xs text-amber-700 leading-relaxed">
                  It will no longer appear in the Data Entry options, but will remain in the database for historical integrity in old reports.
                </p>
              </div>
            </div>
            <div className="p-6 border-t border-zinc-100 bg-zinc-50/50 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
              <Button 
                className="bg-red-600 hover:bg-red-700 text-white" 
                onClick={() => handleRetireGlossary(deleteConfirm.id)}
                disabled={isSaving}
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 size={16} className="mr-2" />}
                Retire Item
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
