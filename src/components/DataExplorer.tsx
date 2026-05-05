import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  RotateCcw, 
  ChevronRight, 
  ChevronDown, 
  Image as ImageIcon,
  FileText,
  Building2,
  Briefcase,
  Users,
  Layout,
  Table,
  Check,
  Copy,
  Link,
  X as CloseIcon,
  Loader2
} from 'lucide-react';
import { Button, Input, Select, Card } from './ui/core';
import { cn, sortEntities, compareEntities } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { doc, writeBatch, serverTimestamp, collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';

export function DataExplorer({ 
  projectData, 
  projects, 
  facilities, 
  clients, 
  categories, 
  items, 
  findings, 
  recommendations,
  masterRecommendations,
  locations,
  glossary = [],
  selections,
  onEditRecord,
  onDeleteRecord
}: any) {
  const [localMasterRecs, setLocalMasterRecs] = useState<any[]>([]);
  
  useEffect(() => {
    const fetchMasterRecs = async () => {
      console.log('[EXPLORER] GABRIEL DIRECTIVE: Forcing local fetch from Firestore...');
      try {
        const querySnapshot = await getDocs(collection(db, 'recommendations'));
        const recs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log(`[EXPLORER] Local fetch complete. Found ${recs.length} records.`);
        setLocalMasterRecs(recs);
      } catch (error) {
        console.error('[EXPLORER] Local fetch FAILED:', error);
      }
    };
    fetchMasterRecs();
  }, []); // Run once on mount to establish local source

  const [searchTerm, setSearchTerm] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [filterFacility, setFilterFacility] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterItem, setFilterItem] = useState('');
  const [filterFinding, setFilterFinding] = useState('');
  const [sortMode, setSortMode] = useState<'structural' | 'standardized'>('structural');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isCloneModalOpen, setIsCloneModalOpen] = useState(false);
  const [cloneLocationId, setCloneLocationId] = useState('');
  const [isCloning, setIsCloning] = useState(false);
  const { user } = useAuth();
  const preSearchExpandedRef = React.useRef<Record<string, boolean>>({});
  const isSearchingRef = React.useRef(false);

  // 🧩 BLUEPRINT-ACCURATE LOOKUP
  const getGlossaryContext = useCallback((d: any) => {
    if (!d.fldData) return null;
    const cleanKey = d.fldData.trim().toLowerCase();
    return glossary.find((g: any) => {
      const byGlos = (g.fldGlosId || '').trim().toLowerCase() === cleanKey;
      const byId = (g.id || '').trim().toLowerCase() === cleanKey;
      return byGlos || byId;
    });
  }, [glossary]);

  const getRecordContext = useCallback((d: any) => {
    const glos = getGlossaryContext(d);
    if (glos) {
      return {
        source: 'glossary',
        glos,
        catId: glos?.fldCat || 'uncategorized',
        itemId: glos?.fldItem || 'unspecified-item',
        findId: glos?.fldFind || 'unspecified-finding'
      };
    }
    if (d?.fldRecordSource === 'custom') {
      const catId = (d.fldPDataCategoryID || '').trim() || 'uncategorized';
      const itemId = (d.fldPDataItemID || '').trim() || 'unspecified-item';
      return {
        source: 'custom',
        glos: null,
        catId,
        itemId,
        findId: ''
      };
    }
    return {
      source: 'unknown',
      glos: null,
      catId: 'uncategorized',
      itemId: 'unspecified-item',
      findId: ''
    };
  }, [getGlossaryContext]);

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBatchClone = async () => {
    if (!cloneLocationId) {
      toast.error('Please select a destination location');
      return;
    }

    setIsCloning(true);
    try {
      const batch = writeBatch(db);
      const selectedRecords = projectData.filter((d: any) => selectedIds.has(d.fldPDataID));
      const clonedRecords: any[] = [];
      const currentUserId = user?.uid || selections.inspectorId;

      if (!currentUserId) {
        throw new Error("User session not found. Please re-login.");
      }
      
      selectedRecords.forEach((original: any) => {
        const newId = uuidv4();
        
        const targetProjectId = selections.projectId || original.fldPDataProject;
        if (!targetProjectId) {
          throw new Error("Project ID missing for record: " + original.fldPDataID);
        }

        // Clean Slate Logic: Copy only static data matching BLUEPRINT
        const originalIsCustom = original?.fldRecordSource === 'custom';
        const clonedRecord = {
          fldPDataID: newId,
          fldPDataProject: targetProjectId,
          fldFacility: original.fldFacility || "",
          fldData: originalIsCustom ? "" : (original.fldData || ""),
          fldRecordSource: originalIsCustom ? "custom" : (original.fldRecordSource || "glossary"),
          fldPDataCategoryID: original.fldPDataCategoryID || "",
          fldPDataItemID: original.fldPDataItemID || "",
          fldPDataMasterFindID: original.fldPDataMasterFindID || "",
          fldPDataMasterRecID: original.fldPDataMasterRecID || "",
          fldLocation: cloneLocationId || "",
          fldFindShort: original.fldFindShort || "",
          fldFindLong: original.fldFindLong || "",
          fldRecShort: original.fldRecShort || "",
          fldRecLong: original.fldRecLong || "",
          fldQTY: 0,
          fldMeasurement: null,
          fldUnitType: original.fldUnitType || "Decimal",
          fldImages: [],
          fldInspID: currentUserId,
          fldTimestamp: new Date().toISOString()
        };

        const docRef = doc(db, 'projectData', newId);
        batch.set(docRef, clonedRecord);
        clonedRecords.push(clonedRecord);
      });

      // Action 1: The Console "Autopsy"
      if (clonedRecords.length > 0) {
        console.log("Cloning Object Sample:", clonedRecords[0]);
      }

      await batch.commit();
      toast.success(`Successfully cloned ${selectedRecords.length} records`);
      setIsCloneModalOpen(false);
      setSelectedIds(new Set());
      setCloneLocationId('');
    } catch (error: any) {
      console.error('Batch clone error:', error);
      // Action 2: Error Object Detail
      toast.error("Clone Failed: " + error.message);
    } finally {
      setIsCloning(false);
    }
  };

  const sortedData = useMemo(() => {
    // 🛡️ CRASH GUARD: If arrays are missing, stop immediately
    if (!projectData || !projects || !facilities || !clients || !categories || !items || !findings || !recommendations) {
      return [];
    }
    const activeProjectId = String(selections.projectId || '').trim().toLowerCase();
    const activeFacilityId = String(selections.facilityId || '').trim().toLowerCase();
    if (!activeProjectId || !activeFacilityId) return [];

    const filtered = projectData.filter((d: any) => {
      // 🛡️ DATA GUARD: Ensure 'd' and IDs exist before searching
      if (!d || !d.fldPDataID) return false;
      const recordProjectId = String(d.fldPDataProject || '').trim().toLowerCase();
      const recordFacilityId = String(d.fldFacility || '').trim().toLowerCase();
      const inActiveScope = recordProjectId === activeProjectId && recordFacilityId === activeFacilityId;
      if (!inActiveScope) return false;

      const project = projects.find((p: any) => p.fldProjID === d.fldPDataProject);
      const ctx = getRecordContext(d);
      const catId = ctx.catId;
      const itemId = ctx.itemId;
      const findId = ctx.findId;
      const finding = (findings || []).find((f: any) => f.fldFindID === findId);

      const matchesSearch = 
        (d.fldFindShort || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (d.fldFindLong || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (d.fldRecShort || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (d.fldRecLong || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesClient = !filterClient || project?.fldClient === filterClient;
      const matchesFacility = !filterFacility || d.fldFacility === filterFacility;
      const matchesProject = !filterProject || d.fldPDataProject === filterProject;
      const matchesCategory = !filterCategory || catId === filterCategory;
      const matchesItem = !filterItem || itemId === filterItem;
      const matchesFinding = !filterFinding || findId === filterFinding;

      return matchesSearch && matchesClient && matchesFacility && matchesProject && matchesCategory && matchesItem && matchesFinding;
    });

    return [...filtered].sort((a: any, b: any) => {
      const ctxA = getRecordContext(a);
      const ctxB = getRecordContext(b);
      const glosA = ctxA.glos;
      const glosB = ctxB.glos;
      
      const catA = categories.find(c => c.fldCategoryID === ctxA.catId);
      const catB = categories.find(c => c.fldCategoryID === ctxB.catId);
      const resCat = compareEntities(catA, catB, 'fldCategoryName');
      if (resCat !== 0) return resCat;

      if (sortMode === 'structural') {
        const locA = (locations.find(l => l.fldLocID === a.fldLocation)?.fldLocName || '').toLowerCase();
        const locB = (locations.find(l => l.fldLocID === b.fldLocation)?.fldLocName || '').toLowerCase();
        const orderLoc = locA.localeCompare(locB);
        if (orderLoc !== 0) return orderLoc;

        const itemA = items.find(i => i.fldItemID === ctxA.itemId);
        const itemB = items.find(i => i.fldItemID === ctxB.itemId);
        return compareEntities(itemA, itemB, 'fldItemID');
      } else {
        const itemA = items.find(i => i.fldItemID === ctxA.itemId);
        const itemB = items.find(i => i.fldItemID === ctxB.itemId);
        const orderItem = compareEntities(itemA, itemB, 'fldItemID');
        if (orderItem !== 0) return orderItem;

        const locA = (locations.find(l => l.fldLocID === a.fldLocation)?.fldLocName || '').toLowerCase();
        const locB = (locations.find(l => l.fldLocID === b.fldLocation)?.fldLocName || '').toLowerCase();
        return locA.localeCompare(locB);
      }
    });
  }, [projectData, searchTerm, filterClient, filterFacility, filterProject, filterCategory, filterItem, filterFinding, sortMode, projects, facilities, clients, categories, items, findings, locations, glossary, selections.projectId, selections.facilityId, getRecordContext]);

  const groupedData = useMemo(() => {
    const groups: any = {};
    sortedData.forEach(d => {
      const ctx = getRecordContext(d);
      const catId = ctx.catId || 'uncategorized';
      const locId = d.fldLocation || 'unlocated';
      
      if (catId === 'uncategorized') {
        console.log('DIAGNOSTIC - Uncategorized Record:', {
          id: d.fldPDataID,
          fldCategory: d.fldCategory,
          fldPDataCategory: d.fldPDataCategory,
          catID: d.catID,
          fldCatID: d.fldCatID,
          fldData: d.fldData,
          fldItem: d.fldItem,
          raw: d
        });
      }
      
      if (!groups[catId]) groups[catId] = { locations: {}, count: 0 };
      if (!groups[catId].locations[locId]) groups[catId].locations[locId] = { records: [], count: 0 };
      
      groups[catId].locations[locId].records.push(d);
      groups[catId].locations[locId].count++;
      groups[catId].count++;
    });
    return groups;
  }, [sortedData, glossary, items, getRecordContext]);

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const expandAll = () => {
    const newExpanded: any = {};
    Object.keys(groupedData).forEach(catId => {
      newExpanded[catId] = true;
      Object.keys(groupedData[catId].locations).forEach(locId => {
        newExpanded[`${catId}-${locId}`] = true;
      });
    });
    setExpandedSections(newExpanded);
  };

  const collapseAll = () => {
    setExpandedSections({});
  };

  React.useEffect(() => {
    if (searchTerm.trim() !== '' && !isSearchingRef.current) {
      preSearchExpandedRef.current = expandedSections;
      isSearchingRef.current = true;
      expandAll();
    } else if (searchTerm.trim() === '' && isSearchingRef.current) {
      setExpandedSections(preSearchExpandedRef.current);
      isSearchingRef.current = false;
    }
  }, [searchTerm]);

  const exportToCSV = () => {
    const headers = ['Client', 'Facility', 'Project', 'Location', 'Category', 'Item', 'Finding', 'Recommendation', 'Quantity', 'Unit', 'Total Cost'];
    const rows = sortedData.map((d: any) => {
      const ctx = getRecordContext(d);
      const project = projects.find((p: any) => p.fldProjID === d.fldPDataProject);
      const facility = facilities.find((f: any) => f.fldFacID === d.fldFacility) || 
                       facilities.find((f: any) => f.fldFacID === project?.fldFacID);
      const client = clients.find((c: any) => c.fldClientID === project?.fldClient)?.fldClientName || '';
      
      const facilityName = facility?.fldFacName || '';
      const projectName = project?.fldProjName || '';
      const category = categories.find((c: any) => c.fldCategoryID === ctx.catId)?.fldCategoryName || '';
      const item = items.find((i: any) => i.fldItemID === ctx.itemId)?.fldItemName || '';
      const finding = d.fldFindShort || '';
      const recommendation = d.fldRecShort || '';
      const locationName = (locations.find(l => l.fldLocID === d.fldLocation))?.fldLocName || '';
      
      return [
        client,
        facilityName,
        projectName,
        locationName,
        category,
        item,
        finding,
        recommendation,
        d.fldQTY,
        '', // Unit
        0   // Total Cost
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Project_Data_Export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 space-y-6 overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Data Explorer</h1>
          <p className="text-sm text-zinc-500">Search and filter across your entire inspection portfolio</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 mr-2">
            <Button variant="ghost" size="sm" onClick={expandAll} className="text-[10px] font-bold uppercase tracking-widest text-blue-600 hover:bg-blue-50">
              Expand All
            </Button>
            <Button variant="ghost" size="sm" onClick={collapseAll} className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:bg-zinc-50">
              Collapse All
            </Button>
          </div>
          <div className="flex items-center bg-zinc-100 p-1 rounded-lg">
            <button 
              onClick={() => setSortMode('structural')}
              className={cn(
                "px-3 py-1.5 text-xs font-bold uppercase tracking-widest rounded-md transition-all",
                sortMode === 'structural' ? "bg-white text-black shadow-sm" : "text-zinc-500 hover:text-zinc-700"
              )}
            >
              Structural
            </button>
            <button 
              onClick={() => setSortMode('standardized')}
              className={cn(
                "px-3 py-1.5 text-xs font-bold uppercase tracking-widest rounded-md transition-all",
                sortMode === 'standardized' ? "bg-white text-black shadow-sm" : "text-zinc-500 hover:text-zinc-700"
              )}
            >
              Standardized
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => {
              setSearchTerm('');
              setFilterClient('');
              setFilterFacility('');
              setFilterProject('');
              setFilterCategory('');
              setFilterItem('');
              setFilterFinding('');
              setSortMode('structural');
            }}>
              <RotateCcw size={14} className="mr-2" /> Reset
            </Button>
            <Button size="sm" onClick={exportToCSV}>
              <Download size={14} className="mr-2" /> Export
            </Button>
          </div>
        </div>
      </div>

      <Card className="p-4 bg-zinc-50/50 border-dashed">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
            <input 
              type="text"
              placeholder="Search findings..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select 
            className="bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
            value={filterClient}
            onChange={(e) => setFilterClient(e.target.value)}
          >
            <option value="">All Clients</option>
            {(clients || []).filter((c: any) => c.fldClientID).map((c: any) => <option key={c.fldClientID} value={c.fldClientID}>{c.fldClientName}</option>)}
          </select>
          <select 
            className="bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
            value={filterFacility}
            onChange={(e) => setFilterFacility(e.target.value)}
          >
            <option value="">All Facilities</option>
            {(facilities || []).filter((f: any) => f.fldFacID && (!filterClient || f.fldClient === filterClient)).map((f: any, idx: number) => (
              <option key={`${f.fldFacID}-${idx}`} value={f.fldFacID}>{f.fldFacName}</option>
            ))}
          </select>
          <select 
            className="bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
          >
            <option value="">All Projects</option>
            {(projects || []).filter((p: any) => p.fldProjID && (!filterClient || p.fldClient === filterClient)).map((p: any, idx: number) => (
              <option key={`${p.fldProjID}-${idx}`} value={p.fldProjID}>{p.fldProjName}</option>
            ))}
          </select>
          <select 
            className="bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
            value={filterCategory}
            onChange={(e) => {
              setFilterCategory(e.target.value);
              setFilterItem('');
              setFilterFinding('');
            }}
          >
            <option value="">All Categories</option>
            {sortEntities(categories || [], 'fldCategoryName').filter((c: any) => c.fldCategoryID).map((c: any, idx: number) => <option key={`${c.fldCategoryID}-${idx}`} value={c.fldCategoryID}>{c.fldCategoryName}</option>)}
          </select>
          <select 
            className="bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
            value={filterItem}
            onChange={(e) => {
              setFilterItem(e.target.value);
              setFilterFinding('');
            }}
          >
            <option value="">All Items</option>
            {sortEntities(items.filter((i: any) => !filterCategory || i.fldCatID === filterCategory), 'fldItemName').map((i: any, idx: number) => (
              <option key={`${i.fldItemID}-${idx}`} value={i.fldItemID}>{i.fldItemName}</option>
            ))}
          </select>
          <select 
            className="bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
            value={filterFinding}
            onChange={(e) => setFilterFinding(e.target.value)}
          >
            <option value="">All Findings</option>
            {sortEntities(findings.filter((f: any) => !filterItem || f.fldItem === filterItem), 'fldFindShort').map((f: any, idx: number) => (
              <option key={`${f.fldFindID}-${idx}`} value={f.fldFindID}>{f.fldFindShort}</option>
            ))}
          </select>
        </div>
      </Card>

      <div className="flex-1 overflow-y-auto min-h-0 pr-2 space-y-4">
        {Object.keys(groupedData).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-400 italic">
            <Search size={48} className="mb-4 opacity-20" />
            <p>No records match your filters.</p>
          </div>
        ) : (
          Object.keys(groupedData).sort((a, b) => {
            const catA = categories.find(c => c.fldCategoryID === a);
            const catB = categories.find(c => c.fldCategoryID === b);
            return compareEntities(catA, catB, 'fldCategoryName');
          }).map(catId => {
            const cat = categories.find(c => c.fldCategoryID === catId);
            const catName = cat?.fldCategoryName || 'Uncategorized';
            const isCatExpanded = expandedSections[catId];
            const catGroup = groupedData[catId];

            return (
              <div key={catId} className="space-y-2">
                <button 
                  onClick={() => toggleSection(catId)}
                  className="w-full flex items-center justify-between p-3 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-lg bg-zinc-200 flex items-center justify-center text-zinc-500 group-hover:bg-zinc-300 transition-colors">
                      {isCatExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </div>
                    <span className="text-sm font-bold text-zinc-900 uppercase tracking-widest">{catName}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-zinc-200 text-zinc-500 rounded-full">{catGroup.count}</span>
                  </div>
                </button>

                {isCatExpanded && (
                  <div className="pl-4 space-y-2 border-l-2 border-zinc-100 ml-3">
                    {Object.keys(catGroup.locations).sort((a, b) => {
                      const locA = (locations.find(l => l.fldLocID === a)?.fldLocName || a).toLowerCase();
                      const locB = (locations.find(l => l.fldLocID === b)?.fldLocName || b).toLowerCase();
                      return locA.localeCompare(locB);
                    }).map(locId => {
                      const loc = locations.find(l => l.fldLocID === locId);
                      const locName = loc?.fldLocName || locId;
                      const sectionKey = `${catId}-${locId}`;
                      const isLocExpanded = expandedSections[sectionKey];
                      const locGroup = catGroup.locations[locId];

                      return (
                        <div key={locId} className="space-y-2">
                          <button 
                            onClick={() => toggleSection(sectionKey)}
                            className="w-full flex items-center justify-between p-2 hover:bg-zinc-50 rounded-lg transition-colors group/loc"
                          >
                            <div className="flex items-center gap-2">
                              <div className="text-zinc-400 group-hover/loc:text-zinc-600">
                                {isLocExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                              </div>
                              <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">{locName}</span>
                              <span className="text-[10px] font-bold text-zinc-400">[{locGroup.count}]</span>
                            </div>
                          </button>

                          {isLocExpanded && (
                            <div className="grid grid-cols-1 gap-3 pl-4">
                              {locGroup.records.map((d: any) => {
                                const isExpanded = expandedId === d.fldPDataID;
                                const ctx = getRecordContext(d);
                                const glos = ctx.glos;
                                const findId = ctx.findId || 'unspecified-finding';
                                const itemId = ctx.itemId || 'unspecified-item';
                                
                                const project = projects.find((p: any) => p.fldProjID === d.fldPDataProject);
                                const facility = facilities.find((f: any) => f.fldFacID === d.fldFacility) || 
                                                 facilities.find((f: any) => f.fldFacID === project?.fldFacID);
                                const client = clients.find((c: any) => c.fldClientID === project?.fldClient) ||
                                               clients.find((c: any) => c.fldClientID === facility?.fldClient);
                                const location = locations.find((l: any) => l.fldLocID === d.fldLocation);
                                
                                const finding = (findings || []).find((f: any) => f.fldFindID === findId);
                                const cardTitle = d.fldFindShort || finding?.fldFindShort || 'Untitled Finding';
                                const locationName = location?.fldLocName || 'No Location';
                                const clientName = client?.fldClientName || 'Unknown Client';
                                const facilityName = facility?.fldFacName || 'Unknown Facility';
                                const projectName = project?.fldProjName || 'Unknown Project';

                                const item = (items || []).find((i: any) => i.fldItemID === itemId);
                                const recommendation = (localMasterRecs || []).find((r: any) => {
                                  const target = ctx.source === 'custom' ? (d.fldPDataMasterRecID || '') : (glos?.fldRec || '');
                                  const match = (r.id || r.fldRecID || "").toLowerCase().trim() === (target || "").toLowerCase().trim();
                                  if (isExpanded) {
                                    console.log('Comparing:', target, 'to:', (r.id || r.fldRecID), 'Match:', match);
                                  }
                                  return match;
                                });

                                return (
                                  <Card key={d.fldPDataID} className={cn(
                                    "overflow-hidden group transition-all",
                                    selectedIds.has(d.fldPDataID) ? "ring-2 ring-blue-500 bg-blue-50/30" : ""
                                  )}>
                                    <div 
                                      className="p-4 flex items-center justify-between cursor-pointer hover:bg-zinc-50 transition-colors"
                                      onClick={() => setExpandedId(isExpanded ? null : d.fldPDataID)}
                                    >
                                      <div className="flex items-center gap-4 flex-1 min-w-0">
                                        <div 
                                          className="p-1 -ml-1 hover:bg-zinc-200 rounded transition-colors"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            toggleSelection(d.fldPDataID);
                                          }}
                                        >
                                          <div className={cn(
                                            "w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
                                            selectedIds.has(d.fldPDataID) 
                                              ? "bg-blue-600 border-blue-600 text-white" 
                                              : "border-zinc-300 bg-white"
                                          )}>
                                            {selectedIds.has(d.fldPDataID) && <Check size={12} strokeWidth={3} />}
                                          </div>
                                        </div>
                                        <div className={cn(
                                          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                                          isExpanded ? "bg-black text-white" : "bg-zinc-100 text-zinc-500 group-hover:bg-zinc-200"
                                        )}>
                                          {d.fldImages?.[0] ? (
                                            <img src={d.fldImages[0]} className="w-full h-full object-cover rounded-xl" referrerPolicy="no-referrer" />
                                          ) : (
                                            <ImageIcon size={20} />
                                          )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-zinc-900 truncate">{cardTitle}</h3>
                                            <span className="text-[10px] font-bold px-2 py-0.5 bg-zinc-100 text-zinc-500 rounded-full uppercase tracking-widest shrink-0">
                                              {item?.fldItemName || 'General'}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-3 mt-1 overflow-hidden">
                                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest truncate">
                                              {clientName} / {facilityName} / {projectName}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-4 ml-4">
                                        <div className="text-right hidden sm:block">
                                          <div className="text-sm font-bold text-zinc-900">
                                            QTY: {d.fldQTY}
                                          </div>
                                        </div>
                                        {isExpanded ? <ChevronDown size={20} className="text-zinc-400" /> : <ChevronRight size={20} className="text-zinc-400" />}
                                      </div>
                                    </div>

                                    {isExpanded && (
                                      <div className="p-6 bg-zinc-50 border-t border-zinc-100 space-y-6 animate-in slide-in-from-top-2 duration-200">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                          <div className="space-y-4">
                                            <div>
                                              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Finding Details</label>
                                              <p className="text-sm text-zinc-700 leading-relaxed">{d.fldFindLong}</p>
                                            </div>
                                            <div>
                                              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Recommendation</label>
                                              <p className="text-sm font-medium text-zinc-900">{d.fldRecShort}</p>
                                              <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{d.fldRecLong}</p>
                                            </div>
                                          </div>
                                          <div className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                              <div className="p-3 bg-white rounded-xl border border-zinc-200">
                                                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Quantity</label>
                                                <div className="text-lg font-bold">{d.fldQTY}</div>
                                              </div>
                                            </div>
                                            {d.fldImages && d.fldImages.length > 0 && (
                                              <div>
                                                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-2">Photos ({d.fldImages.length})</label>
                                                <div className="flex gap-2 overflow-x-auto pb-2">
                                                  {d.fldImages.map((img: string, idx: number) => (
                                                    <img key={idx} src={img} className="w-24 h-24 object-cover rounded-lg border border-zinc-200 shrink-0" referrerPolicy="no-referrer" />
                                                  ))}
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                        <div className="flex justify-end gap-2 pt-4 border-t border-zinc-200">
                                          <Button variant="secondary" size="sm" onClick={() => onEditRecord(d)}>
                                            Edit Record
                                          </Button>
                                          <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50" onClick={() => onDeleteRecord(d.fldPDataID)}>
                                            Delete
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                  </Card>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Floating Bulk Actions Bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-4"
          >
            <div className="bg-zinc-900 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between gap-4 border border-white/10 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-sm">
                  {selectedIds.size}
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest text-zinc-400">Records Selected</div>
                  <div className="text-[10px] text-zinc-500">Ready for batch actions</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSelectedIds(new Set())}
                  className="text-zinc-400 hover:text-white hover:bg-white/10"
                >
                  Clear
                </Button>
                <Button 
                  size="sm" 
                  onClick={() => setIsCloneModalOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white border-none"
                >
                  <Copy size={14} className="mr-2" />
                  Clone to New Location
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Batch Clone Overlay */}
      <AnimatePresence>
        {isCloneModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-white flex flex-col"
          >
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white">
                  <Copy size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-zinc-900">Batch Clone Power Tool</h2>
                  <p className="text-xs text-zinc-500">Replicating patterns across locations</p>
                </div>
              </div>
              <button 
                onClick={() => setIsCloneModalOpen(false)}
                className="p-2 hover:bg-zinc-200 rounded-full transition-colors"
              >
                <CloseIcon size={20} className="text-zinc-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              <div className="max-w-2xl mx-auto space-y-6">
                <div className="space-y-4">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest block">1. Select Destination Location</label>
                  <div className="relative group">
                    <select 
                      className="w-full bg-zinc-100 border-2 border-transparent focus:border-blue-600 rounded-2xl px-6 py-4 text-lg font-bold appearance-none focus:outline-none transition-all"
                      value={cloneLocationId}
                      onChange={(e) => setCloneLocationId(e.target.value)}
                    >
                      <option value="">Choose Destination...</option>
                      {locations.filter((l: any) => !l.fldIsDeleted).map((l: any) => (
                        <option key={l.fldLocID} value={l.fldLocID}>{l.fldLocName}</option>
                      ))}
                    </select>
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
                      <ChevronDown size={24} />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest block">2. Findings to Replicate</label>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-zinc-100 text-zinc-500 rounded-full">
                      {selectedIds.size} Items
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    {projectData.filter((d: any) => selectedIds.has(d.fldPDataID)).map((d: any) => {
                      const glos = getGlossaryContext(d);
                      const finding = findings.find((f: any) => f.fldFindID === glos?.fldFind);
                      const title = d.fldFindShort || finding?.fldFindShort || 'Untitled Finding';
                      
                      return (
                        <div key={d.fldPDataID} className="flex items-center gap-4 p-4 bg-white border border-zinc-200 rounded-2xl group">
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                            cloneLocationId ? "bg-blue-50 text-blue-600" : "bg-zinc-100 text-zinc-400"
                          )}>
                            {cloneLocationId ? <Link size={16} /> : <div className="w-1.5 h-1.5 rounded-full bg-zinc-300" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold text-zinc-900 truncate">{title}</div>
                            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">
                              Clean Slate: Measurements & Photos Cleared
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="p-6 bg-amber-50 border border-amber-100 rounded-2xl flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                    <Table size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-amber-900">Pattern Replication Logic</h4>
                    <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                      This tool clones the core finding and recommendation logic. All quantities, measurements, and photos are reset to ensure fresh data collection at the new location.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-zinc-100 bg-zinc-50/50">
              <div className="max-w-2xl mx-auto flex gap-4">
                <Button 
                  variant="secondary" 
                  className="flex-1 h-14 rounded-2xl text-base font-bold"
                  onClick={() => setIsCloneModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  className="flex-1 h-14 rounded-2xl text-base font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200"
                  disabled={!cloneLocationId || isCloning}
                  onClick={handleBatchClone}
                >
                  {isCloning ? (
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  ) : (
                    <Copy size={20} className="mr-2" />
                  )}
                  Create {selectedIds.size} New Records
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
