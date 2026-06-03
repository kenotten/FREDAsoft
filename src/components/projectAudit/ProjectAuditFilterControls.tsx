import React from 'react';
import { Search } from 'lucide-react';
import { Button, Select } from '../ui/core';
import { cn } from '../../lib/utils';
import type { AuditMode } from '../../lib/projectAuditReport';

export function ProjectAuditFilterControls({
  mode,
  onModeChange,
  facilityFilter,
  onFacilityFilterChange,
  facilityOptions,
  search,
  onSearchChange,
  contentIssuesOnly,
  onContentIssuesOnlyChange,
  onExpandAll,
  onCollapseAll,
}: {
  mode: AuditMode;
  onModeChange: (mode: AuditMode) => void;
  facilityFilter: string;
  onFacilityFilterChange: (value: string) => void;
  facilityOptions: { id: string; label: string }[];
  search: string;
  onSearchChange: (value: string) => void;
  contentIssuesOnly: boolean;
  onContentIssuesOnlyChange: (checked: boolean) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
}) {
  return (
    <>
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex rounded-lg border border-zinc-200 p-0.5">
          {(['finding', 'recommendation'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onModeChange(m)}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors',
                mode === m ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'
              )}
            >
              {m === 'finding' ? 'By Finding' : 'By Recommendation'}
            </button>
          ))}
        </div>
        <div className="min-w-[12rem] flex-1">
          <Select
            label="Facility"
            value={facilityFilter}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              onFacilityFilterChange(e.target.value)
            }
            options={facilityOptions.map((o) => ({ value: o.id, label: o.label }))}
          />
        </div>
        <div className="min-w-[14rem] flex-[2]">
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            Search
          </label>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Text, facility, IDs, citations…"
              className="w-full rounded-lg border border-zinc-200 py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
            />
          </div>
        </div>
        <label
          className="flex cursor-pointer items-center gap-2 rounded-lg border border-rose-200 bg-rose-50/80 px-3 py-2 text-xs text-rose-950"
          title="Shows records missing category, item, location, finding text, or recommendation text."
        >
          <input
            type="checkbox"
            checked={contentIssuesOnly}
            onChange={(e) => onContentIssuesOnlyChange(e.target.checked)}
            className="rounded border-rose-300 text-rose-700 focus:ring-rose-500"
          />
          <span className="font-semibold leading-snug">Report content issues only</span>
        </label>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={onExpandAll}>
            Expand all
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={onCollapseAll}>
            Collapse all
          </Button>
        </div>
      </div>
      {contentIssuesOnly ? (
        <p className="text-[11px] leading-snug text-rose-800">
          Showing groups with at least one record missing category, item, location, finding snapshot
          text, or recommendation snapshot text. Metadata-only warnings (IDs, glossary row, archived
          master, snapshot drift, costs, citations) are hidden until this filter is off.
        </p>
      ) : null}
    </>
  );
}
