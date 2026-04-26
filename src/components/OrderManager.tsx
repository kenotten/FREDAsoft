import React, { useState, useMemo, useEffect } from 'react';
import { 
  ArrowUp, 
  ArrowDown, 
  Save, 
  RotateCcw, 
  Hash, 
  List, 
  Tag, 
  Search,
  AlertCircle,
  LayoutGrid,
  Layers,
  FileText,
  ChevronRight
} from 'lucide-react';
import { Button, Card, Select } from './ui/core';
import { cn, sortEntities } from '../lib/utils';
import { doc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { toast } from 'sonner';
import { Category, Item, Finding } from '../types';

interface OrderManagerProps {
  categories: Category[];
  items: Item[];
  findings: Finding[];
}

type TabType = 'categories' | 'items' | 'findings';

export function OrderManager({ categories, items, findings }: OrderManagerProps) {
  const [activeTab, setActiveTab] = useState<TabType>('categories');
  const [selectedCatId, setSelectedCatId] = useState<string>('');
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  
  // Local working state for order values
  // Mapping: id -> fldOrder
  const [localOrders, setLocalOrders] = useState<Record<string, number>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize local order state from props
  useEffect(() => {
    setLocalOrders(prev => {
      const next = { ...prev };
      
      // Merge in categories
      categories.forEach(c => {
        const id = c.fldCategoryID || c.id || '';
        if (next[id] === undefined || !isDirty) {
          next[id] = c.fldOrder ?? 999;
        }
      });
      
      // Merge in items
      items.forEach(i => {
        const id = i.fldItemID || i.id || '';
        if (next[id] === undefined || !isDirty) {
          next[id] = i.fldOrder ?? 999;
        }
      });
      
      // Merge in findings
      findings.forEach(f => {
        const id = f.fldFindID || f.id || '';
        if (next[id] === undefined || !isDirty) {
          next[id] = f.fldOrder ?? 999;
        }
      });
      
      return next;
    });
    
    // reset dirty if this is a fresh load (props change after save)
    if (!isSaving) setIsDirty(false);
  }, [categories, items, findings]);

  // Data subsets based on selection
  const visibleData = useMemo(() => {
    if (activeTab === 'categories') {
      return [...categories].map(c => ({
        ...c,
        id: c.fldCategoryID || c.id,
        name: c.fldCategoryName,
        order: localOrders[c.fldCategoryID || c.id || ''] ?? 999
      })).sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
    }
    
    if (activeTab === 'items') {
      if (!selectedCatId) return [];
      return [...items]
        .filter(i => i.fldCatID === selectedCatId)
        .map(i => ({
          ...i,
          id: i.fldItemID || i.id,
          name: i.fldItemName,
          order: localOrders[i.fldItemID || i.id || ''] ?? 999
        })).sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
    }
    
    if (activeTab === 'findings') {
      if (!selectedItemId) return [];
      return [...findings]
        .filter(f => f.fldItem === selectedItemId)
        .map(f => ({
          ...f,
          id: f.fldFindID || f.id,
          name: f.fldFindShort,
          order: localOrders[f.fldFindID || f.id || ''] ?? 999
        })).sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
    }
    
    return [];
  }, [activeTab, categories, items, findings, selectedCatId, selectedItemId, localOrders]);

  // Move item to a new position and renormalize the entire scope
  const reorderAndNormalize = (id: string, newPosition: number) => {
    // 1. Get current sorted list for this scope
    const currentList = [...visibleData];
    const currentIndex = currentList.findIndex(item => item.id === id);
    if (currentIndex === -1) return;

    // 2. Remove the item
    const [itemToMove] = currentList.splice(currentIndex, 1);

    // 3. Insert at target position (clamped)
    // newPosition is 1-based, index is 0-based
    const targetIndex = Math.max(0, Math.min(newPosition - 1, currentList.length));
    currentList.splice(targetIndex, 0, itemToMove);

    // 4. Renormalize ALL items in this scope
    const nextOrders = { ...localOrders };
    currentList.forEach((item, idx) => {
      nextOrders[item.id || ''] = idx + 1;
    });

    setLocalOrders(nextOrders);
    setIsDirty(true);
  };

  const handleOrderChange = (id: string, newOrder: number) => {
    reorderAndNormalize(id, newOrder);
  };

  const handleNormalize = () => {
    const updated = { ...localOrders };
    // Just re-apply 1..N to current visible row order
    visibleData.forEach((item, index) => {
      updated[item.id || ''] = index + 1;
    });
    
    setLocalOrders(updated);
    setIsDirty(true);
    toast.info('Sequence normalized to 1, 2, 3...');
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const batch = writeBatch(db);
      const collectionName = activeTab; // categories, items, findings
      
      // Get IDs of items in the current visible list to update only those
      const targetIds = new Set(visibleData.map(v => v.id));
      
      let updateCount = 0;
      Object.entries(localOrders).forEach(([id, order]) => {
        if (!targetIds.has(id)) return;
        
        // Find if order actually changed compared to props
        const originalDoc = (activeTab === 'categories' ? categories : 
                           activeTab === 'items' ? items : findings)
                           .find((x: any) => (x.fldCategoryID || x.fldItemID || x.fldFindID || x.id) === id);
        
        if (originalDoc && originalDoc.fldOrder !== order) {
          const docRef = doc(db, collectionName, id);
          batch.update(docRef, { fldOrder: order });
          updateCount++;
        }
      });
      
      if (updateCount > 0) {
        await batch.commit();
        toast.success(`Updated ${updateCount} records' ordering`);
      } else {
        toast.info('No changes to save');
      }
      
      setIsDirty(false);
    } catch (error) {
      console.error('Error saving order changes:', error);
      toast.error('Failed to save order changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset local state from props
    const orders: Record<string, number> = {};
    if (activeTab === 'categories') {
      categories.forEach(c => { orders[c.fldCategoryID || c.id || ''] = c.fldOrder ?? 999; });
    } else if (activeTab === 'items') {
      items.forEach(i => { orders[i.fldItemID || i.id || ''] = i.fldOrder ?? 999; });
    } else if (activeTab === 'findings') {
      findings.forEach(f => { orders[f.fldFindID || f.id || ''] = f.fldOrder ?? 999; });
    }
    setLocalOrders(orders);
    setIsDirty(false);
    toast.info('Changes discarded');
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === visibleData.length - 1) return;
    
    const targetPosition = direction === 'up' ? index : index + 2;
    const currentItem = visibleData[index];
    
    reorderAndNormalize(currentItem.id || '', targetPosition);
  };

  return (
    <div className="flex flex-col h-full bg-zinc-50">
      {/* Header */}
      <div className="bg-white border-b border-zinc-200 px-8 py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-black text-zinc-900 tracking-tight">Sequence Manager</h1>
            <p className="text-zinc-500 text-sm mt-1">Manage display ordering (fldOrder) for master data entities.</p>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="ghost" 
              onClick={handleCancel}
              disabled={!isDirty || isSaving}
            >
              <RotateCcw size={16} className="mr-2" /> Discard
            </Button>
            <Button 
              onClick={handleSave}
              disabled={!isDirty || isSaving}
              className="bg-black text-white hover:bg-zinc-800"
            >
              <Save size={16} className="mr-2" /> {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>

        <div className="flex gap-1 bg-zinc-100 p-1 rounded-xl w-fit">
          <TabButton active={activeTab === 'categories'} onClick={() => setActiveTab('categories')} icon={<LayoutGrid size={16} />} label="Categories" />
          <TabButton active={activeTab === 'items'} onClick={() => setActiveTab('items')} icon={<Layers size={16} />} label="Items" />
          <TabButton active={activeTab === 'findings'} onClick={() => setActiveTab('findings')} icon={<Search size={16} />} label="Findings" />
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex-1 p-8 overflow-hidden flex flex-col gap-6">
        
        {/* Filters/Context */}
        {(activeTab === 'items' || activeTab === 'findings') && (
          <Card className="p-4 border-dashed bg-white/50">
            <div className="flex flex-wrap gap-6 items-end">
              <div className="flex-1 min-w-[200px] space-y-2">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-1">Category Scope</label>
                <Select 
                  value={selectedCatId} 
                  onChange={(e) => {
                    setSelectedCatId(e.target.value);
                    setSelectedItemId('');
                  }}
                  options={sortEntities(categories, 'fldCategoryName').map(c => ({ value: c.fldCategoryID || c.id || '', label: c.fldCategoryName }))}
                />
              </div>

              {activeTab === 'findings' && (
                <div className="flex-1 min-w-[200px] space-y-2">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-1">Item Scope</label>
                  <Select 
                    disabled={!selectedCatId}
                    value={selectedItemId} 
                    onChange={(e) => setSelectedItemId(e.target.value)}
                    options={sortEntities(items.filter(i => i.fldCatID === selectedCatId), 'fldItemName').map(i => ({ value: i.fldItemID || i.id || '', label: i.fldItemName }))}
                  />
                </div>
              )}

              <Button 
                variant="secondary"
                onClick={handleNormalize}
                disabled={visibleData.length === 0}
                className="bg-zinc-100 text-zinc-900 border-zinc-200"
              >
                <Hash size={16} className="mr-2" /> Normalize Current List
              </Button>
            </div>
          </Card>
        )}

        {activeTab === 'categories' && (
           <Card className="p-4 border-dashed bg-white/50 h-fit">
             <div className="flex justify-between items-center">
               <div className="flex items-center gap-2 text-zinc-400 text-sm">
                 <AlertCircle size={14} />
                 <span>Category order is global and affects all selection views.</span>
               </div>
               <Button 
                  variant="secondary"
                  onClick={handleNormalize}
                  className="bg-zinc-100 text-zinc-900 border-zinc-200"
                >
                  <Hash size={16} className="mr-2" /> Normalize Current List
                </Button>
             </div>
           </Card>
        )}

        {/* List Header */}
        <div className="flex items-center gap-4 px-6 py-3 bg-zinc-900 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest">
            <div className="w-16 text-center">Order</div>
            <div className="flex-1">Display Name</div>
            <div className="w-24 text-right pr-4">Actions</div>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto space-y-1">
          {visibleData.length > 0 ? (
            visibleData.map((item, index) => (
              <div 
                key={`${item.id}-${index}`} 
                className="flex items-center gap-4 bg-white p-3 rounded-xl border border-zinc-200 hover:border-zinc-300 transition-all group"
              >
                <div className="w-16">
                  <input 
                    type="number"
                    value={item.order}
                    onChange={(e) => {
                      const val = e.target.value === '' ? 999 : parseInt(e.target.value);
                      handleOrderChange(item.id || '', isNaN(val) ? 999 : val);
                    }}
                    className="w-full bg-zinc-50 border border-zinc-100 rounded-lg py-1 px-2 text-center font-mono text-sm focus:bg-white focus:ring-2 focus:ring-black/5 outline-none"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-zinc-900 truncate">{item.name}</div>
                  <div className="text-[10px] font-mono text-zinc-400 truncate">{item.id}</div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button 
                     onClick={() => moveItem(index, 'up')}
                     disabled={index === 0}
                     className="p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-black disabled:opacity-30"
                   >
                     <ArrowUp size={14} />
                   </button>
                   <button 
                     onClick={() => moveItem(index, 'down')}
                     disabled={index === visibleData.length - 1}
                     className="p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-black disabled:opacity-30"
                   >
                     <ArrowDown size={14} />
                   </button>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center p-20 text-zinc-400 bg-white/50 rounded-3xl border-2 border-dashed border-zinc-200">
               <List size={48} className="mb-4 opacity-20" />
               <p className="font-medium">No records found for the current selection.</p>
               <p className="text-xs">Please select a parent context above to view children.</p>
            </div>
          )}
        </div>

        {isDirty && (
          <div className="flex items-center justify-center gap-2 p-3 bg-amber-50 text-amber-700 rounded-xl border border-amber-100 text-xs font-bold animate-pulse">
            <AlertCircle size={14} /> Unsaved changes in sequence.
          </div>
        )}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all",
        active ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
      )}
    >
      {icon} {label}
    </button>
  );
}
