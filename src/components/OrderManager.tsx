import React, { useState, useMemo, useEffect } from 'react';
import {
  ArrowUp,
  ArrowDown,
  Save,
  RotateCcw,
  Hash,
  List,
  Search,
  AlertCircle,
  LayoutGrid,
  Layers,
} from 'lucide-react';
import { Button, Select } from './ui/core';
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

const SEQUENCE_HELPER_BY_TAB: Record<TabType, string> = {
  categories: 'Category order is global and affects all selection views.',
  items: 'Select a category to reorder items within that scope. Changes apply on Save Changes.',
  findings:
    'Select a category and item to reorder findings within that scope. Changes apply on Save Changes.',
};

export function OrderManager({ categories, items, findings }: OrderManagerProps) {
  const [activeTab, setActiveTab] = useState<TabType>('categories');
  const [selectedCatId, setSelectedCatId] = useState<string>('');
  const [selectedItemId, setSelectedItemId] = useState<string>('');

  const [localOrders, setLocalOrders] = useState<Record<string, number>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  /** In-progress order text; does not affect sort until blur/Enter commit. */
  const [activeOrderEdit, setActiveOrderEdit] = useState<{ id: string; value: string } | null>(
    null
  );

  useEffect(() => {
    setActiveOrderEdit(null);
  }, [activeTab, selectedCatId, selectedItemId]);

  useEffect(() => {
    setLocalOrders((prev) => {
      const next = { ...prev };

      categories.forEach((c) => {
        const id = c.fldCategoryID || c.id || '';
        if (next[id] === undefined || !isDirty) {
          next[id] = c.fldOrder ?? 999;
        }
      });

      items.forEach((i) => {
        const id = i.fldItemID || i.id || '';
        if (next[id] === undefined || !isDirty) {
          next[id] = i.fldOrder ?? 999;
        }
      });

      findings.forEach((f) => {
        const id = f.fldFindID || f.id || '';
        if (next[id] === undefined || !isDirty) {
          next[id] = f.fldOrder ?? 999;
        }
      });

      return next;
    });

    if (!isSaving) setIsDirty(false);
  }, [categories, items, findings]);

  const visibleData = useMemo(() => {
    if (activeTab === 'categories') {
      return [...categories]
        .map((c) => ({
          ...c,
          id: c.fldCategoryID || c.id,
          name: c.fldCategoryName,
          order: localOrders[c.fldCategoryID || c.id || ''] ?? 999,
        }))
        .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
    }

    if (activeTab === 'items') {
      if (!selectedCatId) return [];
      return [...items]
        .filter((i) => i.fldCatID === selectedCatId)
        .map((i) => ({
          ...i,
          id: i.fldItemID || i.id,
          name: i.fldItemName,
          order: localOrders[i.fldItemID || i.id || ''] ?? 999,
        }))
        .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
    }

    if (activeTab === 'findings') {
      if (!selectedItemId) return [];
      return [...findings]
        .filter((f) => f.fldItem === selectedItemId)
        .map((f) => ({
          ...f,
          id: f.fldFindID || f.id,
          name: f.fldFindShort,
          order: localOrders[f.fldFindID || f.id || ''] ?? 999,
        }))
        .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
    }

    return [];
  }, [activeTab, categories, items, findings, selectedCatId, selectedItemId, localOrders]);

  const reorderAndNormalize = (id: string, newPosition: number) => {
    const currentList = [...visibleData];
    const currentIndex = currentList.findIndex((item) => item.id === id);
    if (currentIndex === -1) return;

    const [itemToMove] = currentList.splice(currentIndex, 1);
    const targetIndex = Math.max(0, Math.min(newPosition - 1, currentList.length));
    currentList.splice(targetIndex, 0, itemToMove);

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

  const cancelActiveOrderEdit = () => setActiveOrderEdit(null);

  const commitActiveOrderEdit = (id: string, raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) {
      cancelActiveOrderEdit();
      return;
    }
    const parsed = parseInt(trimmed, 10);
    if (Number.isNaN(parsed) || parsed < 1) {
      cancelActiveOrderEdit();
      return;
    }
    handleOrderChange(id, parsed);
    cancelActiveOrderEdit();
  };

  const handleNormalize = () => {
    cancelActiveOrderEdit();
    const updated = { ...localOrders };
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
      const collectionName = activeTab;

      const targetIds = new Set(visibleData.map((v) => v.id));

      let updateCount = 0;
      Object.entries(localOrders).forEach(([id, order]) => {
        if (!targetIds.has(id)) return;

        const originalDoc = (
          activeTab === 'categories' ? categories : activeTab === 'items' ? items : findings
        ).find((x: Category | Item | Finding) => {
          const row = x as Category & Item & Finding;
          return (row.fldCategoryID || row.fldItemID || row.fldFindID || row.id) === id;
        });

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
    const orders: Record<string, number> = {};
    if (activeTab === 'categories') {
      categories.forEach((c) => {
        orders[c.fldCategoryID || c.id || ''] = c.fldOrder ?? 999;
      });
    } else if (activeTab === 'items') {
      items.forEach((i) => {
        orders[i.fldItemID || i.id || ''] = i.fldOrder ?? 999;
      });
    } else if (activeTab === 'findings') {
      findings.forEach((f) => {
        orders[f.fldFindID || f.id || ''] = f.fldOrder ?? 999;
      });
    }
    setLocalOrders(orders);
    setIsDirty(false);
    cancelActiveOrderEdit();
    toast.info('Changes discarded');
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === visibleData.length - 1) return;

    const targetPosition = direction === 'up' ? index : index + 2;
    const currentItem = visibleData[index];

    reorderAndNormalize(currentItem.id || '', targetPosition);
  };

  const scopeRequired = activeTab === 'items' || activeTab === 'findings';

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-zinc-50">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-zinc-200 bg-white px-4 py-1.5 shadow-sm">
        <div className="flex shrink-0 items-center gap-2">
          <Hash className="text-violet-600" size={18} />
          <h1 className="text-sm font-black uppercase tracking-tight text-zinc-900">
            Sequence Manager
          </h1>
        </div>

        <div className="flex gap-0.5 rounded-lg bg-zinc-100 p-0.5">
          <TabButton
            active={activeTab === 'categories'}
            onClick={() => setActiveTab('categories')}
            icon={<LayoutGrid size={14} />}
            label="Categories"
          />
          <TabButton
            active={activeTab === 'items'}
            onClick={() => setActiveTab('items')}
            icon={<Layers size={14} />}
            label="Items"
          />
          <TabButton
            active={activeTab === 'findings'}
            onClick={() => setActiveTab('findings')}
            icon={<Search size={14} />}
            label="Findings"
          />
        </div>

        <div className="min-w-[1rem] flex-1" />

        {isDirty ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
            <AlertCircle size={12} />
            Unsaved changes
          </span>
        ) : null}

        <Button
          variant="secondary"
          onClick={handleNormalize}
          disabled={visibleData.length === 0}
          className="h-8 shrink-0 bg-zinc-100 px-2.5 text-[10px] font-black uppercase tracking-widest text-zinc-900"
        >
          <Hash size={14} className="mr-1.5" />
          Normalize Current List
        </Button>
        <Button
          variant="ghost"
          onClick={handleCancel}
          disabled={!isDirty || isSaving}
          className="h-8 shrink-0 px-2.5 text-[10px] font-black uppercase tracking-widest"
        >
          <RotateCcw size={14} className="mr-1.5" />
          Discard
        </Button>
        <Button
          onClick={handleSave}
          disabled={!isDirty || isSaving}
          className="h-8 shrink-0 bg-black px-2.5 text-[10px] font-black uppercase tracking-widest text-white hover:bg-zinc-800"
        >
          <Save size={14} className="mr-1.5" />
          {isSaving ? 'Saving…' : 'Save Changes'}
        </Button>
      </div>

      {scopeRequired ? (
        <div className="flex shrink-0 flex-wrap items-end gap-3 border-b border-zinc-100 bg-white/80 px-4 py-1.5">
          <div className="min-w-[10rem] flex-1 space-y-0.5">
            <label className="pl-0.5 text-[9px] font-bold uppercase tracking-widest text-zinc-400">
              Category scope
            </label>
            <Select
              value={selectedCatId}
              onChange={(e) => {
                setSelectedCatId(e.target.value);
                setSelectedItemId('');
              }}
              options={sortEntities(categories, 'fldCategoryName').map((c) => ({
                value: c.fldCategoryID || c.id || '',
                label: c.fldCategoryName,
              }))}
            />
          </div>
          {activeTab === 'findings' ? (
            <div className="min-w-[10rem] flex-1 space-y-0.5">
              <label className="pl-0.5 text-[9px] font-bold uppercase tracking-widest text-zinc-400">
                Item scope
              </label>
              <Select
                disabled={!selectedCatId}
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
                options={sortEntities(
                  items.filter((i) => i.fldCatID === selectedCatId),
                  'fldItemName'
                ).map((i) => ({
                  value: i.fldItemID || i.id || '',
                  label: i.fldItemName,
                }))}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      <p className="shrink-0 px-4 py-1 text-[10px] leading-snug text-zinc-500">
        {SEQUENCE_HELPER_BY_TAB[activeTab]}
      </p>

      <div className="flex min-h-0 flex-1 flex-col px-4 pb-2 pt-1">
        <div className="sticky top-0 z-10 flex shrink-0 items-center gap-4 rounded-t-lg bg-zinc-900 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white">
          <div className="w-16 text-center">Order</div>
          <div className="flex-1">Display Name</div>
          <div className="w-24 pr-4 text-right">Actions</div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto rounded-b-lg border border-t-0 border-zinc-200 bg-white">
          {visibleData.length > 0 ? (
            <div className="divide-y divide-zinc-100">
              {visibleData.map((item, index) => {
                const rowId = item.id || '';
                const isEditingOrder = activeOrderEdit?.id === rowId;
                return (
                <div
                  key={rowId}
                  className="group flex items-center gap-4 border-zinc-100 px-3 py-2 transition-all hover:bg-zinc-50/80"
                >
                  <div className="w-16">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={isEditingOrder ? activeOrderEdit.value : String(item.order)}
                      onFocus={() =>
                        setActiveOrderEdit({ id: rowId, value: String(item.order) })
                      }
                      onChange={(e) => {
                        const next = e.target.value;
                        if (/^\d*$/.test(next)) {
                          setActiveOrderEdit({ id: rowId, value: next });
                        }
                      }}
                      onBlur={() => {
                        if (isEditingOrder) {
                          commitActiveOrderEdit(rowId, activeOrderEdit.value);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          commitActiveOrderEdit(
                            rowId,
                            isEditingOrder ? activeOrderEdit.value : String(item.order)
                          );
                        } else if (e.key === 'Escape') {
                          e.preventDefault();
                          cancelActiveOrderEdit();
                          (e.target as HTMLInputElement).blur();
                        }
                      }}
                      className="w-full rounded-md border border-zinc-100 bg-zinc-50 py-1 px-2 text-center font-mono text-sm outline-none focus:bg-white focus:ring-2 focus:ring-black/5"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-bold text-zinc-900">{item.name}</div>
                    <div className="truncate font-mono text-[10px] text-zinc-400">{item.id}</div>
                  </div>
                  <div className="flex w-24 items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => moveItem(index, 'up')}
                      disabled={index === 0}
                      className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-black disabled:opacity-30"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveItem(index, 'down')}
                      disabled={index === visibleData.length - 1}
                      className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-black disabled:opacity-30"
                    >
                      <ArrowDown size={14} />
                    </button>
                  </div>
                </div>
              );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center text-zinc-400">
              <List size={40} className="mb-3 opacity-20" />
              <p className="text-sm font-medium text-zinc-600">No records found for the current selection.</p>
              <p className="mt-1 text-[10px] text-zinc-500">
                {scopeRequired
                  ? 'Select the scope above to view and edit order values.'
                  : 'No categories available.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[10px] font-black uppercase tracking-tight transition-all',
        active ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
      )}
    >
      {icon} {label}
    </button>
  );
}
