import React, { useMemo, useState } from 'react';
import { AlertCircle, Wrench, ClipboardList } from 'lucide-react';
import { Card } from './ui/core';
import { cn } from '../lib/utils';

function normId(v: any): string {
  return String(v || '').trim().toLowerCase();
}

function strEmpty(v: any): boolean {
  return v === null || v === undefined || (typeof v === 'string' && v.trim() === '');
}

function measurementPresent(v: any): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === 'string') return v.trim() !== '';
  return true; // number 0 is present
}

type SourceFilter = 'all' | 'glossary' | 'custom' | 'unknown';

export interface MeasurementMetadataAuditPanelProps {
  projectData: any[];
  glossary: any[];
  findings: any[];
  items: any[];
  categories: any[];
  locations: any[];
  projects: any[];
  facilities: any[];
}

type AuditRow = {
  id: string;
  source: 'glossary' | 'custom' | 'unknown';
  projectLabel: string;
  facilityLabel: string;
  locationLabel: string;
  categoryLabel: string;
  itemLabel: string;
  findingLabel: string;
  measurementValue: any;
  currentType: string;
  currentUnit: string;
  suggestedType: string;
  suggestedUnit: string;
  suggestionNote: string;
  missingType: boolean;
  missingUnit: boolean;
  hasMeasurement: boolean;
  hasSuggestion: boolean;
  isFlaggedDefault: boolean;
};

export function MeasurementMetadataAuditPanel({
  projectData,
  glossary,
  findings,
  items,
  categories,
  locations,
  projects,
  facilities,
}: MeasurementMetadataAuditPanelProps) {
  const [filterMissingType, setFilterMissingType] = useState(true);
  const [filterMissingUnit, setFilterMissingUnit] = useState(true);
  const [filterHasMeasurement, setFilterHasMeasurement] = useState(true);
  const [filterHasSuggestion, setFilterHasSuggestion] = useState(false);
  const [filterNoSuggestion, setFilterNoSuggestion] = useState(false);
  const [filterIncludeComplete, setFilterIncludeComplete] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');

  const rows = useMemo((): AuditRow[] => {
    const glosById = new Map<string, any>();
    (glossary || []).forEach((g: any) => {
      const k1 = normId(g?.fldGlosId);
      const k2 = normId(g?.id);
      if (k1) glosById.set(k1, g);
      if (k2) glosById.set(k2, g);
    });

    const findingById = new Map<string, any>();
    (findings || []).forEach((f: any) => {
      const k1 = normId(f?.fldFindID);
      const k2 = normId(f?.id);
      if (k1) findingById.set(k1, f);
      if (k2) findingById.set(k2, f);
    });

    const itemById = new Map<string, any>();
    (items || []).forEach((i: any) => {
      const k1 = normId(i?.fldItemID);
      const k2 = normId(i?.id);
      if (k1) itemById.set(k1, i);
      if (k2) itemById.set(k2, i);
    });

    const categoryById = new Map<string, any>();
    (categories || []).forEach((c: any) => {
      const k1 = normId(c?.fldCategoryID);
      const k2 = normId(c?.id);
      if (k1) categoryById.set(k1, c);
      if (k2) categoryById.set(k2, c);
    });

    const projectById = new Map<string, any>();
    (projects || []).forEach((p: any) => {
      const k = normId(p?.fldProjID);
      if (k) projectById.set(k, p);
    });

    const facilityById = new Map<string, any>();
    (facilities || []).forEach((f: any) => {
      const k = normId(f?.fldFacID);
      if (k) facilityById.set(k, f);
    });

    const locationById = new Map<string, any>();
    (locations || []).forEach((l: any) => {
      const k = normId(l?.fldLocID);
      if (k) locationById.set(k, l);
    });

    return (projectData || []).map((d: any): AuditRow => {
      const id = String(d?.fldPDataID || '').trim();
      const recordSourceRaw = String(d?.fldRecordSource || '').trim().toLowerCase();
      const hasFldData = !strEmpty(d?.fldData);

      const source: 'glossary' | 'custom' | 'unknown' =
        recordSourceRaw === 'custom'
          ? 'custom'
          : hasFldData
            ? 'glossary'
            : 'unknown';

      const currentType = d?.fldMeasurementType != null ? String(d.fldMeasurementType) : '';
      const currentUnit = d?.fldMeasurementUnit != null ? String(d.fldMeasurementUnit) : '';
      const missingType = strEmpty(currentType);
      const missingUnit = strEmpty(currentUnit);
      const hasMeasurement = measurementPresent(d?.fldMeasurement);

      let suggestedType = '';
      let suggestedUnit = '';
      let suggestionNote = '';

      // Suggestion resolution (explicit relationships only)
      if (source === 'glossary') {
        const glosKey = normId(d?.fldData);
        const g = glosKey ? glosById.get(glosKey) : undefined;
        const findKey = normId(g?.fldFind);
        const f = findKey ? findingById.get(findKey) : undefined;
        if (f) {
          suggestedType = f?.fldMeasurementType != null ? String(f.fldMeasurementType) : '';
          suggestedUnit = f?.fldUnitType != null ? String(f.fldUnitType) : '';
        } else {
          suggestionNote = 'Glossary/finding link missing; cannot suggest safely.';
        }
      } else if (source === 'custom') {
        const key = normId(d?.fldPDataMasterFindID);
        if (!key) {
          suggestionNote = 'No linked finding/template; cannot suggest safely.';
        } else {
          const f = findingById.get(key);
          if (f) {
            suggestedType = f?.fldMeasurementType != null ? String(f.fldMeasurementType) : '';
            suggestedUnit = f?.fldUnitType != null ? String(f.fldUnitType) : '';
          } else {
            suggestionNote = 'Linked template finding not found; cannot suggest safely.';
          }
        }
      } else {
        suggestionNote = 'No linked glossary or template; cannot suggest safely.';
      }

      const hasSuggestion = !strEmpty(suggestedType) || !strEmpty(suggestedUnit);
      const isFlaggedDefault = hasMeasurement && (missingType || missingUnit);

      // Labels
      const proj = projectById.get(normId(d?.fldPDataProject));
      const fac = facilityById.get(normId(d?.fldFacility)) || facilityById.get(normId(proj?.fldFacID));
      const loc = locationById.get(normId(d?.fldLocation));

      let catLabel = '—';
      let itemLabel = '—';
      let findingLabel = String(d?.fldFindShort || '').trim() || '—';

      if (source === 'glossary') {
        const g = glosById.get(normId(d?.fldData));
        const item = itemById.get(normId(g?.fldItem));
        const cat = categoryById.get(normId(g?.fldCat));
        if (cat) catLabel = String(cat?.fldCategoryName || cat?.fldCatName || '—');
        if (item) itemLabel = String(item?.fldItemName || '—');
        const f = findingById.get(normId(g?.fldFind));
        if (f) findingLabel = String(f?.fldFindShort || findingLabel || '—');
      } else if (source === 'custom') {
        const item = itemById.get(normId(d?.fldPDataItemID));
        const cat = categoryById.get(normId(d?.fldPDataCategoryID));
        if (cat) catLabel = String(cat?.fldCategoryName || cat?.fldCatName || '—');
        if (item) itemLabel = String(item?.fldItemName || '—');
        const f = findingById.get(normId(d?.fldPDataMasterFindID));
        if (f) findingLabel = String(f?.fldFindShort || findingLabel || '—');
      }

      return {
        id: id || '(missing id)',
        source,
        projectLabel: String(proj?.fldProjName || proj?.fldProjID || '—'),
        facilityLabel: String(fac?.fldFacName || fac?.fldFacID || '—'),
        locationLabel: String(loc?.fldLocName || d?.fldLocation || '—'),
        categoryLabel: catLabel,
        itemLabel,
        findingLabel,
        measurementValue: d?.fldMeasurement,
        currentType,
        currentUnit,
        suggestedType,
        suggestedUnit,
        suggestionNote,
        missingType,
        missingUnit,
        hasMeasurement,
        hasSuggestion,
        isFlaggedDefault,
      };
    });
  }, [projectData, glossary, findings, items, categories, locations, projects, facilities]);

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (!filterIncludeComplete && !r.isFlaggedDefault) return false;
      if (filterHasMeasurement && !r.hasMeasurement) return false;

      const missingTypeOk = filterMissingType ? r.missingType : true;
      const missingUnitOk = filterMissingUnit ? r.missingUnit : true;
      if (filterMissingType || filterMissingUnit) {
        if (!(missingTypeOk || missingUnitOk)) return false;
      }

      if (filterHasSuggestion && !r.hasSuggestion) return false;
      if (filterNoSuggestion && r.hasSuggestion) return false;

      if (sourceFilter !== 'all' && r.source !== sourceFilter) return false;
      return true;
    });
  }, [
    rows,
    filterIncludeComplete,
    filterHasMeasurement,
    filterMissingType,
    filterMissingUnit,
    filterHasSuggestion,
    filterNoSuggestion,
    sourceFilter,
  ]);

  const summary = useMemo(() => {
    const flagged = rows.filter((r) => r.isFlaggedDefault);
    const repairAvailable = flagged.filter((r) => r.hasSuggestion);
    const noSuggestion = flagged.filter((r) => !r.hasSuggestion);
    return {
      flagged: flagged.length,
      repairAvailable: repairAvailable.length,
      noSuggestion: noSuggestion.length,
    };
  }, [rows]);

  return (
    <Card className="p-4 border-zinc-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <ClipboardList size={16} className="text-blue-600 shrink-0" />
              <h2 className="text-sm font-black text-zinc-900 uppercase tracking-widest">
                Measurement Metadata Audit
              </h2>
            </div>
            <div className="mt-1 text-[11px] text-zinc-600 leading-snug">
              Read-only audit for project records missing measurement snapshot metadata. Suggestions are derived only from explicit glossary/template links.
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            <span className="px-2 py-1 rounded-lg bg-zinc-100 text-[10px] font-black uppercase tracking-widest text-zinc-700">
              Flagged records: {summary.flagged}
            </span>
            <span className="px-2 py-1 rounded-lg bg-emerald-50 text-[10px] font-black uppercase tracking-widest text-emerald-700 border border-emerald-200">
              Repair available: {summary.repairAvailable}
            </span>
            <span className="px-2 py-1 rounded-lg bg-amber-50 text-[10px] font-black uppercase tracking-widest text-amber-800 border border-amber-200">
              No suggestion: {summary.noSuggestion}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-600">
              <input
                type="checkbox"
                checked={filterMissingType}
                onChange={(e) => setFilterMissingType(e.target.checked)}
              />
              Missing type
            </label>
            <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-600">
              <input
                type="checkbox"
                checked={filterMissingUnit}
                onChange={(e) => setFilterMissingUnit(e.target.checked)}
              />
              Missing unit
            </label>
            <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-600">
              <input
                type="checkbox"
                checked={filterHasMeasurement}
                onChange={(e) => setFilterHasMeasurement(e.target.checked)}
              />
              Has measurement value
            </label>
            <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-600">
              <input
                type="checkbox"
                checked={filterHasSuggestion}
                onChange={(e) => setFilterHasSuggestion(e.target.checked)}
              />
              Has suggestion
            </label>
            <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-600">
              <input
                type="checkbox"
                checked={filterNoSuggestion}
                onChange={(e) => setFilterNoSuggestion(e.target.checked)}
              />
              No suggestion
            </label>
            <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-600">
              <input
                type="checkbox"
                checked={filterIncludeComplete}
                onChange={(e) => setFilterIncludeComplete(e.target.checked)}
              />
              Include complete
            </label>
          </div>

          <div className="flex items-center gap-2 justify-start lg:justify-end">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600">
              Source
            </label>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value as SourceFilter)}
              className="bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-black/5"
            >
              <option value="all">All</option>
              <option value="glossary">Glossary</option>
              <option value="custom">Custom</option>
              <option value="unknown">Unknown</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-zinc-200">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                <th className="px-3 py-2 w-24">Source</th>
                <th className="px-3 py-2 min-w-[260px]">Project / Facility / Location</th>
                <th className="px-3 py-2 min-w-[200px]">Category / Item</th>
                <th className="px-3 py-2 min-w-[220px]">Finding</th>
                <th className="px-3 py-2 w-28">Measurement</th>
                <th className="px-3 py-2 w-36">Current Type</th>
                <th className="px-3 py-2 w-28">Current Unit</th>
                <th className="px-3 py-2 w-36">Suggested Type</th>
                <th className="px-3 py-2 w-28">Suggested Unit</th>
                <th className="px-3 py-2 w-40">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 bg-white">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-3 py-4 text-sm text-zinc-500 italic">
                    No records match the current filters.
                  </td>
                </tr>
              ) : (
                filteredRows.map((r) => {
                  const status =
                    r.isFlaggedDefault && r.hasSuggestion
                      ? { label: 'Repair available', tone: 'good', icon: <Wrench size={12} /> }
                      : r.isFlaggedDefault && !r.hasSuggestion
                        ? { label: 'No suggestion', tone: 'warn', icon: <AlertCircle size={12} /> }
                        : { label: 'Complete', tone: 'neutral', icon: null };

                  return (
                    <tr key={r.id} className="align-top">
                      <td className="px-3 py-2">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-black uppercase tracking-widest',
                            r.source === 'glossary' && 'bg-blue-50 text-blue-700 border-blue-200',
                            r.source === 'custom' && 'bg-indigo-50 text-indigo-700 border-indigo-200',
                            r.source === 'unknown' && 'bg-zinc-50 text-zinc-700 border-zinc-200'
                          )}
                        >
                          {r.source}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="text-[11px] font-bold text-zinc-900 truncate">
                          {r.projectLabel}
                        </div>
                        <div className="text-[10px] text-zinc-500 truncate">
                          {r.facilityLabel} / {r.locationLabel}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="text-[11px] font-bold text-zinc-900 truncate">
                          {r.categoryLabel}
                        </div>
                        <div className="text-[10px] text-zinc-500 truncate">{r.itemLabel}</div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="text-[11px] font-bold text-zinc-900 line-clamp-2">
                          {r.findingLabel}
                        </div>
                        <div className="text-[10px] text-zinc-400 mt-0.5">{r.id}</div>
                      </td>
                      <td className="px-3 py-2 text-[11px] font-bold text-zinc-900">
                        {r.hasMeasurement ? String(r.measurementValue) : '—'}
                      </td>
                      <td className="px-3 py-2 text-[11px] text-zinc-700">
                        {strEmpty(r.currentType) ? <span className="text-zinc-400 italic">—</span> : r.currentType}
                      </td>
                      <td className="px-3 py-2 text-[11px] text-zinc-700">
                        {strEmpty(r.currentUnit) ? <span className="text-zinc-400 italic">—</span> : r.currentUnit}
                      </td>
                      <td className="px-3 py-2 text-[11px] text-zinc-700">
                        {strEmpty(r.suggestedType) ? <span className="text-zinc-400 italic">—</span> : r.suggestedType}
                      </td>
                      <td className="px-3 py-2 text-[11px] text-zinc-700">
                        {strEmpty(r.suggestedUnit) ? <span className="text-zinc-400 italic">—</span> : r.suggestedUnit}
                      </td>
                      <td className="px-3 py-2">
                        <div
                          className={cn(
                            'inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-black uppercase tracking-widest',
                            status.tone === 'good' && 'bg-emerald-50 text-emerald-700 border-emerald-200',
                            status.tone === 'warn' && 'bg-amber-50 text-amber-800 border-amber-200',
                            status.tone === 'neutral' && 'bg-zinc-50 text-zinc-700 border-zinc-200'
                          )}
                        >
                          {status.icon}
                          {status.label}
                        </div>
                        {status.label !== 'Complete' && r.suggestionNote ? (
                          <div className="text-[10px] text-zinc-500 mt-1 leading-snug">
                            {r.suggestionNote}
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
}

