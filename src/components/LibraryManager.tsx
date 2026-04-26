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
  MoreVertical
} from 'lucide-react';
import { Button, Card, Select } from './ui/core';
import { cn, sortEntities } from '../lib/utils';
import { doc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { toast } from 'sonner';
import { Category, Item, Finding, MasterRecommendation } from '../types';
import { UnsavedChangesModal } from './modals/UnsavedChangesModal';

export interface LibraryManagerHandle {
  save: () => Promise<boolean>;
  discard: () => void;
}

interface LibraryManagerProps {
  categories: Category[];
  items: Item[];
  findings: Finding[];
  recommendations: MasterRecommendation[];
  onDirtyChange?: (isDirty: boolean) => void;
  onNavigateAway?: (nextTab: string) => void;
}

type LibraryTab = 'categories' | 'items' | 'findings' | 'recommendations';

export const LibraryManager = forwardRef<LibraryManagerHandle, LibraryManagerProps>(({ 
  categories, 
  items, 
  findings, 
  recommendations,
  onDirtyChange,
  onNavigateAway
}, ref) => {
  const [activeTab, setActiveTab] = useState<LibraryTab>('categories');
  const [selectedCatId, setSelectedCatId] = useState<string>('');
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [expandedCatId, setExpandedCatId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Local working state for edits
  // Map of id -> partial document update
  const [edits, setEdits] = useState<Record<string, any>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);

  // Intercept navigation
  const [pendingAction, setPendingAction] = useState<{ type: 'tab' | 'cat' | 'item' | 'away', value: string } | null>(null);

  useImperativeHandle(ref, () => ({
    save: handleSave,
    discard: () => {
      setEdits({});
      setIsDirty(false);
    }
  }));

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
      case 'item': setSelectedItemId(value); break;
      case 'away': onNavigateAway?.(value); break;
    }
    setPendingAction(null);
  };

  const handleDiscardAndLeave = () => {
    setEdits({});
    setIsDirty(false);
    if (pendingAction) {
      executeNavigation(pendingAction.type, pendingAction.value);
    }
  };

  const handleSaveAndLeave = async () => {
    const success = await handleSave();
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

  // Helper to get current value (from edits or original)
  const getValue = (entity: any, field: string) => {
    const id = entity.fldCategoryID || entity.fldItemID || entity.fldFindID || entity.fldRecID || entity.id;
    if (edits[id] && edits[id][field] !== undefined) {
      return edits[id][field];
    }
    return entity[field];
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
      // PROGRESSIVE FILTERING: Must select at least a category
      if (!selectedCatId) return [];

      let itemIds: string[] = [];
      if (selectedItemId) {
        itemIds = [selectedItemId];
      } else {
        // Narrow to all items in selected category
        itemIds = items
          .filter(i => i.fldCatID === selectedCatId)
          .map(i => i.fldItemID || i.id || '');
      }

      base = findings
        .filter(f => itemIds.includes(f.fldItem || ''))
        .map(f => ({
          ...f,
          id: f.fldFindID || f.id,
          displayName: getValue(f, 'fldFindShort'),
          order: getValue(f, 'fldOrder') ?? 999,
          parentId: f.fldItem
        }));
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

    // Sort by order then name
    return base.sort((a, b) => a.order - b.order || (a.displayName || '').localeCompare(b.displayName || ''));
  }, [activeTab, categories, items, findings, recommendations, selectedCatId, selectedItemId, edits, searchTerm]);

  // Derived navigation lists that respect local edits
  const navigationCategories = useMemo(() => {
    return categories.map(c => {
      const id = c.fldCategoryID || (c as any).id;
      const updatedFields = edits[id] || {};
      return { ...c, ...updatedFields };
    });
  }, [categories, edits]);

  const navigationItems = useMemo(() => {
    return items.map(i => {
      const id = i.fldItemID || (i as any).id;
      const updatedFields = edits[id] || {};
      return { ...i, ...updatedFields };
    });
  }, [items, edits]);

  // Derived Breadcrumbs
  const breadcrumbs = useMemo(() => {
    const parts = [];
    const cat = navigationCategories.find(c => (c.fldCategoryID || (c as any).id) === selectedCatId);
    if (cat) parts.push(cat.fldCategoryName);
    
    const item = navigationItems.find(i => (i.fldItemID || (i as any).id) === selectedItemId);
    if (item) parts.push(item.fldItemName);
    
    return parts;
  }, [selectedCatId, selectedItemId, navigationCategories, navigationItems]);

  const isGroupedMode = activeTab === 'findings' && !!selectedCatId && !selectedItemId;

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

    return (
      <div key={record.id} className="flex flex-col gap-1.5 p-3 hover:bg-zinc-50 transition-all group border-b border-zinc-100 last:border-0">
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
          <div className="w-20 flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
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
          <div className="ml-16 mr-20 space-y-2">
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
            {isOverLimit && (
              <div className="mt-0.5 text-[9px] font-bold text-red-500 uppercase tracking-widest flex items-center">
                <AlertCircle size={10} className="mr-1" /> Limit Exceeded
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const handleSave = async (): Promise<boolean> => {
    if (Object.keys(edits).length === 0) return true;

    // Validation: Check for 120 char limit on short fields
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

      Object.entries(edits).forEach(([id, fields]) => {
        let collectionName = '';
        if (categories.some(c => (c.fldCategoryID || c.id) === id)) collectionName = 'categories';
        else if (items.some(i => (i.fldItemID || i.id) === id)) collectionName = 'items';
        else if (findings.some(f => (f.fldFindID || f.id) === id)) collectionName = 'findings';
        else if (recommendations.some(r => (r.fldRecID || r.id) === id)) collectionName = 'recommendations';

        if (collectionName) {
          const docRef = doc(db, collectionName, id);
          batch.update(docRef, fields);
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

  const handleCancel = () => {
    setEdits({});
    setIsDirty(false);
    toast.info('Changes discarded.');
  };

  const getEmptyStateMessage = () => {
    if (activeTab === 'items' && !selectedCatId) return "Select a Category to view Items.";
    if (activeTab === 'findings' && !selectedCatId) return "Select a Category to view Findings.";
    return "No records found for the current search or selection.";
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
          <Button size="sm" onClick={handleSave} disabled={!isDirty || isSaving} className={cn("h-8 px-4 text-[10px] font-black uppercase tracking-widest", isDirty ? "bg-black text-white hover:bg-zinc-800" : "bg-zinc-100 text-zinc-400")}>
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
        <div className="flex-1 flex flex-col min-w-0">
          <Card className="flex-1 overflow-hidden flex flex-col border-zinc-200 rounded-none border-x-0 border-t-0 shadow-none bg-white">
            <div className="flex items-center gap-3 px-4 py-2 bg-zinc-900 text-white text-[9px] font-black uppercase tracking-widest shrink-0">
              <div className="w-14 text-center">Order</div>
              <div className="flex-1">Display Name / Short Text</div>
              <div className="w-40">ID (ReadOnly)</div>
              <div className="w-20 text-right pr-2">Reorder</div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-zinc-100">
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
