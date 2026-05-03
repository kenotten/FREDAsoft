import React, { useMemo, useState, useCallback } from 'react';
import { AlertCircle, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';
import { Category, Item, Finding, MasterRecommendation } from '../types';
import { firestoreService } from '../services/firestoreService';
import { MEASUREMENT_UNITS, COST_UNIT_TYPES } from '../lib/utils';
import { Button } from './ui/core';

function strEmpty(v: unknown): boolean {
  return v === null || v === undefined || (typeof v === 'string' && v.trim() === '');
}

function isFindingIncomplete(f: Finding): boolean {
  return strEmpty(f.fldMeasurementType) || strEmpty(f.fldUnitType);
}

function isRecommendationIncomplete(r: MasterRecommendation): boolean {
  const u = r.fldUnit;
  const missingCost = u === null || u === undefined;
  return missingCost || strEmpty(r.fldUOM);
}

function findingDocId(f: Finding): string {
  return String(f.id || f.fldFindID || '').trim();
}

function recommendationDocId(r: MasterRecommendation): string {
  return String(r.id || r.fldRecID || '').trim();
}

function resolveCategoryLabel(
  f: Finding,
  items: Item[],
  categories: Category[]
): string {
  const itemId = String(f.fldItem || '').toLowerCase().trim();
  const item = items.find(
    (i) =>
      String(i.fldItemID || (i as Item & { id?: string }).id || '')
        .toLowerCase()
        .trim() === itemId
  );
  if (!item) return '—';
  const catId = String(item.fldCatID || '').toLowerCase().trim();
  const cat = categories.find(
    (c) =>
      String(c.fldCategoryID || (c as Category & { id?: string }).id || '')
        .toLowerCase()
        .trim() === catId
  );
  const catName = cat?.fldCategoryName || '—';
  return `${catName} / ${item.fldItemName || '—'}`;
}

export interface LibraryCompletenessPanelProps {
  categories: Category[];
  items: Item[];
  findings: Finding[];
  recommendations: MasterRecommendation[];
}

export function LibraryCompletenessPanel({
  categories,
  items,
  findings,
  recommendations,
}: LibraryCompletenessPanelProps) {
  const [findingDrafts, setFindingDrafts] = useState<
    Record<string, { fldMeasurementType: string; fldUnitType: string }>
  >({});
  const [recDrafts, setRecDrafts] = useState<
    Record<string, { fldUnit: string; fldUOM: string }>
  >({});
  const [savingFindingId, setSavingFindingId] = useState<string | null>(null);
  const [savingRecId, setSavingRecId] = useState<string | null>(null);

  const incompleteFindings = useMemo(
    () => (findings || []).filter((f) => f && isFindingIncomplete(f)),
    [findings]
  );

  const incompleteRecommendations = useMemo(
    () => (recommendations || []).filter((r) => r && isRecommendationIncomplete(r)),
    [recommendations]
  );

  const getFindingDraft = useCallback(
    (f: Finding) => {
      const id = findingDocId(f);
      const d = findingDrafts[id];
      return {
        fldMeasurementType:
          d?.fldMeasurementType ?? (f.fldMeasurementType != null ? String(f.fldMeasurementType) : ''),
        fldUnitType: d?.fldUnitType ?? (f.fldUnitType != null ? String(f.fldUnitType) : ''),
      };
    },
    [findingDrafts]
  );

  const getRecDraft = useCallback(
    (r: MasterRecommendation) => {
      const id = recommendationDocId(r);
      const d = recDrafts[id];
      return {
        fldUnit: d?.fldUnit ?? (r.fldUnit != null && r.fldUnit !== undefined ? String(r.fldUnit) : ''),
        fldUOM: d?.fldUOM ?? (r.fldUOM != null ? String(r.fldUOM) : ''),
      };
    },
    [recDrafts]
  );

  const saveFinding = async (f: Finding) => {
    const id = findingDocId(f);
    if (!id) {
      toast.error('Missing finding document id');
      return;
    }
    const { fldMeasurementType, fldUnitType } = getFindingDraft(f);
    const mt = fldMeasurementType.trim();
    const ut = fldUnitType.trim();
    if (!mt) {
      toast.error('Measurement type is required');
      return;
    }
    if (!ut) {
      toast.error('Measurement unit is required');
      return;
    }
    setSavingFindingId(id);
    try {
      await firestoreService.save(
        'findings',
        { fldMeasurementType: mt, fldUnitType: ut },
        id,
        false
      );
      toast.success('Finding updated');
      setFindingDrafts((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch (e) {
      console.error(e);
      toast.error('Failed to save finding');
    } finally {
      setSavingFindingId(null);
    }
  };

  const saveRecommendation = async (r: MasterRecommendation) => {
    const id = recommendationDocId(r);
    if (!id) {
      toast.error('Missing recommendation document id');
      return;
    }
    const { fldUnit, fldUOM } = getRecDraft(r);
    const uom = fldUOM.trim();
    if (fldUnit === '' || Number.isNaN(Number(fldUnit))) {
      toast.error('Unit cost is required (number)');
      return;
    }
    if (!uom) {
      toast.error('Cost unit (UOM) is required');
      return;
    }
    setSavingRecId(id);
    try {
      await firestoreService.save(
        'recommendations',
        { fldUnit: Number(fldUnit), fldUOM: uom },
        id,
        false
      );
      toast.success('Recommendation updated');
      setRecDrafts((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch (e) {
      console.error(e);
      toast.error('Failed to save recommendation');
    } finally {
      setSavingRecId(null);
    }
  };

  return (
    <div className="flex flex-1 flex-col min-h-0 overflow-hidden bg-zinc-50/80">
      <div className="shrink-0 border-b border-amber-200 bg-amber-50 px-4 py-2 flex items-start gap-2">
        <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={16} />
        <p className="text-[11px] text-amber-900 leading-snug">
          <span className="font-bold uppercase tracking-wide">Library completeness</span>
          {' — '}
          Temporary admin cleanup. Only incomplete rows are listed. Save writes the edited fields to Firestore (merge).
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-8">
        <section className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-zinc-700">
            <ClipboardList size={14} />
            Findings ({incompleteFindings.length})
          </div>
          {incompleteFindings.length === 0 ? (
            <p className="text-sm text-zinc-500 italic">No findings missing measurement type or unit.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    <th className="px-3 py-2 min-w-[140px]">Category / Item</th>
                    <th className="px-3 py-2 min-w-[160px]">Finding short</th>
                    <th className="px-3 py-2 min-w-[140px]">Measurement type</th>
                    <th className="px-3 py-2 w-28">Unit</th>
                    <th className="px-3 py-2 w-24 text-right">Save</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {incompleteFindings.map((f) => {
                    const id = findingDocId(f);
                    const draft = getFindingDraft(f);
                    const baseMt = f.fldMeasurementType != null ? String(f.fldMeasurementType) : '';
                    const baseUt = f.fldUnitType != null ? String(f.fldUnitType) : '';
                    return (
                      <tr key={id} className="align-top">
                        <td className="px-3 py-2 text-xs text-zinc-700">
                          {resolveCategoryLabel(f, items, categories)}
                        </td>
                        <td className="px-3 py-2 text-xs font-medium text-zinc-900">{f.fldFindShort || '—'}</td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            className="w-full min-w-[120px] rounded-lg border border-zinc-200 px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-black/10"
                            value={draft.fldMeasurementType}
                            onChange={(e) =>
                              setFindingDrafts((prev) => {
                                const cur = prev[id] ?? { fldMeasurementType: baseMt, fldUnitType: baseUt };
                                return { ...prev, [id]: { ...cur, fldMeasurementType: e.target.value } };
                              })
                            }
                            placeholder="e.g. Slope, Width"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <select
                            className="w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-black/10"
                            value={draft.fldUnitType}
                            onChange={(e) =>
                              setFindingDrafts((prev) => {
                                const cur = prev[id] ?? { fldMeasurementType: baseMt, fldUnitType: baseUt };
                                return { ...prev, [id]: { ...cur, fldUnitType: e.target.value } };
                              })
                            }
                          >
                            <option value="">Select…</option>
                            {MEASUREMENT_UNITS.map((u) => (
                              <option key={u} value={u}>
                                {u}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Button
                            size="sm"
                            className="text-[10px] font-bold uppercase"
                            disabled={savingFindingId === id}
                            onClick={() => saveFinding(f)}
                          >
                            {savingFindingId === id ? '…' : 'Save'}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-zinc-700">
            <ClipboardList size={14} />
            Recommendations ({incompleteRecommendations.length})
          </div>
          {incompleteRecommendations.length === 0 ? (
            <p className="text-sm text-zinc-500 italic">No recommendations missing unit cost or UOM.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    <th className="px-3 py-2 min-w-[200px]">Recommendation short</th>
                    <th className="px-3 py-2 w-32">Unit cost ($)</th>
                    <th className="px-3 py-2 w-28">UOM</th>
                    <th className="px-3 py-2 w-24 text-right">Save</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {incompleteRecommendations.map((r) => {
                    const id = recommendationDocId(r);
                    const draft = getRecDraft(r);
                    const baseUnit = r.fldUnit != null && r.fldUnit !== undefined ? String(r.fldUnit) : '';
                    const baseUom = r.fldUOM != null ? String(r.fldUOM) : '';
                    return (
                      <tr key={id} className="align-top">
                        <td className="px-3 py-2 text-xs font-medium text-zinc-900">{r.fldRecShort || '—'}</td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            step="any"
                            className="w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-black/10"
                            value={draft.fldUnit}
                            onChange={(e) =>
                              setRecDrafts((prev) => {
                                const cur = prev[id] ?? { fldUnit: baseUnit, fldUOM: baseUom };
                                return { ...prev, [id]: { ...cur, fldUnit: e.target.value } };
                              })
                            }
                          />
                        </td>
                        <td className="px-3 py-2">
                          <select
                            className="w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-black/10"
                            value={draft.fldUOM}
                            onChange={(e) =>
                              setRecDrafts((prev) => {
                                const cur = prev[id] ?? { fldUnit: baseUnit, fldUOM: baseUom };
                                return { ...prev, [id]: { ...cur, fldUOM: e.target.value } };
                              })
                            }
                          >
                            <option value="">Select…</option>
                            {COST_UNIT_TYPES.map((u) => (
                              <option key={u} value={u}>
                                {u}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Button
                            size="sm"
                            className="text-[10px] font-bold uppercase"
                            disabled={savingRecId === id}
                            onClick={() => saveRecommendation(r)}
                          >
                            {savingRecId === id ? '…' : 'Save'}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
