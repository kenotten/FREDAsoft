import React from 'react';
import { Button } from '../ui/core';
import { cn } from '../../lib/utils';
import type {
  WebReportFilterOption,
  WebReportFilterOptions,
  WebReportRecordInclusion
} from '../../lib/webReportFilters';
import type { WebReportSectionInclusion } from '../../lib/webReportSessionState';

export function formatInspectionDate(dateStr: string | undefined): string {
  if (!dateStr) return 'TBD';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export function WebReportInfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 text-sm">
      <span className="w-32 shrink-0 font-semibold text-zinc-600">{label}:</span>
      <span className="min-w-0 text-zinc-900">{value}</span>
    </div>
  );
}

function WebReportFilterColumn({
  title,
  options,
  selectedIds,
  onToggle,
  onSelectAll,
  onClearAll,
  disabled
}: {
  title: string;
  options: WebReportFilterOption[];
  selectedIds: Set<string>;
  onToggle: (id: string, checked: boolean) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col rounded-lg border border-zinc-200 bg-white p-2">
      <div className="flex items-center justify-between gap-2 border-b border-zinc-100 pb-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
          {title} ({options.length})
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            disabled={disabled || options.length === 0}
            onClick={onSelectAll}
            className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Select all
          </button>
          <button
            type="button"
            disabled={disabled || options.length === 0}
            onClick={onClearAll}
            className="text-[10px] font-semibold text-zinc-500 hover:text-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Clear all
          </button>
        </div>
      </div>
      <ul className="mt-2 max-h-36 space-y-1 overflow-y-auto pr-1">
        {options.length === 0 ? (
          <li className="px-1 py-2 text-xs italic text-zinc-400">No options</li>
        ) : (
          options.map((opt) => (
            <li key={opt.id}>
              <label className="flex cursor-pointer items-start gap-2 rounded px-1 py-0.5 text-xs text-zinc-800 hover:bg-zinc-50">
                <input
                  type="checkbox"
                  checked={selectedIds.has(opt.id)}
                  disabled={disabled}
                  onChange={(e) => onToggle(opt.id, e.target.checked)}
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-zinc-300 text-indigo-600"
                />
                <span className="min-w-0 leading-snug">{opt.label}</span>
              </label>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

export function WebReportContentFilters({
  filterOptions,
  inclusion,
  filtersRestricted,
  filteredCount,
  fullCount,
  disabled,
  onToggleCategory,
  onToggleLocation,
  onToggleItem,
  onSelectAllCategories,
  onClearAllCategories,
  onSelectAllLocations,
  onClearAllLocations,
  onSelectAllItems,
  onClearAllItems,
  onResetFilters
}: {
  filterOptions: WebReportFilterOptions;
  inclusion: WebReportRecordInclusion;
  filtersRestricted: boolean;
  filteredCount: number;
  fullCount: number;
  disabled?: boolean;
  onToggleCategory: (id: string, checked: boolean) => void;
  onToggleLocation: (id: string, checked: boolean) => void;
  onToggleItem: (id: string, checked: boolean) => void;
  onSelectAllCategories: () => void;
  onClearAllCategories: () => void;
  onSelectAllLocations: () => void;
  onClearAllLocations: () => void;
  onSelectAllItems: () => void;
  onClearAllItems: () => void;
  onResetFilters: () => void;
}) {
  const countLabel =
    fullCount === 0
      ? 'No records in this facility report'
      : filtersRestricted
        ? `Showing ${filteredCount} of ${fullCount} records`
        : `Showing all ${fullCount} records`;

  return (
    <div className="border-t border-zinc-200 pt-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
            Report content filters
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Included documentation records (future print/export). Accordion collapse is display-only.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={disabled || fullCount === 0}
          onClick={onResetFilters}
          className="shrink-0 text-xs"
        >
          Reset filters
        </Button>
      </div>
      <p className="mt-2 text-xs font-medium text-zinc-600">{countLabel}</p>
      <div className="mt-3 flex flex-col gap-3 lg:flex-row">
        <WebReportFilterColumn
          title="Categories"
          options={filterOptions.categories}
          selectedIds={inclusion.categoryIds}
          onToggle={onToggleCategory}
          onSelectAll={onSelectAllCategories}
          onClearAll={onClearAllCategories}
          disabled={disabled}
        />
        <WebReportFilterColumn
          title="Locations"
          options={filterOptions.locations}
          selectedIds={inclusion.locationIds}
          onToggle={onToggleLocation}
          onSelectAll={onSelectAllLocations}
          onClearAll={onClearAllLocations}
          disabled={disabled}
        />
        <WebReportFilterColumn
          title="Items"
          options={filterOptions.items}
          selectedIds={inclusion.itemIds}
          onToggle={onToggleItem}
          onSelectAll={onSelectAllItems}
          onClearAll={onClearAllItems}
          disabled={disabled}
        />
      </div>
    </div>
  );
}

export function WebReportSectionInclusionControls({
  sectionInclusion,
  onSectionInclusionChange,
  hasReferencedStandards,
  hasPhotoAddendumPhotos
}: {
  sectionInclusion: WebReportSectionInclusion;
  onSectionInclusionChange: (patch: Partial<WebReportSectionInclusion>) => void;
  hasReferencedStandards: boolean;
  hasPhotoAddendumPhotos: boolean;
}) {
  return (
    <div className="border-t border-zinc-200 pt-4">
      <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Included sections</p>
      <p className="mt-1 text-xs text-zinc-500">
        Toggles control on-screen content and future print/export. Accordion collapse below is display-only.
      </p>
      <ul className="mt-3 space-y-2">
        <li className="flex items-center gap-2 text-sm text-zinc-600">
          <input type="checkbox" checked disabled className="h-4 w-4 rounded border-zinc-300" />
          <span className="font-medium text-zinc-800">Heading</span>
          <span className="text-xs text-zinc-400">(always included)</span>
        </li>
        <li className="flex items-center gap-2">
          <input
            id="wr-narrative"
            type="checkbox"
            checked={sectionInclusion.narrative}
            onChange={(e) => onSectionInclusionChange({ narrative: e.target.checked })}
            className="h-4 w-4 rounded border-zinc-300 text-indigo-600"
          />
          <label htmlFor="wr-narrative" className="text-sm font-medium text-zinc-800">
            Narrative
          </label>
        </li>
        <li className="flex items-center gap-2">
          <input
            id="wr-financial"
            type="checkbox"
            checked={sectionInclusion.financial}
            onChange={(e) => onSectionInclusionChange({ financial: e.target.checked })}
            className="h-4 w-4 rounded border-zinc-300 text-indigo-600"
          />
          <label htmlFor="wr-financial" className="text-sm font-medium text-zinc-800">
            Financial
          </label>
        </li>
        <li className="flex items-center gap-2">
          <input
            id="wr-documentation"
            type="checkbox"
            checked={sectionInclusion.documentation}
            onChange={(e) => onSectionInclusionChange({ documentation: e.target.checked })}
            className="h-4 w-4 rounded border-zinc-300 text-indigo-600"
          />
          <label htmlFor="wr-documentation" className="text-sm font-medium text-zinc-800">
            Documentation
          </label>
        </li>
        <li className="flex flex-wrap items-center gap-2">
          <input
            id="wr-standards"
            type="checkbox"
            checked={sectionInclusion.standards}
            disabled={!hasReferencedStandards}
            onChange={(e) => onSectionInclusionChange({ standards: e.target.checked })}
            className="h-4 w-4 rounded border-zinc-300 text-indigo-600 disabled:opacity-40"
          />
          <label
            htmlFor="wr-standards"
            className={cn(
              'text-sm font-medium text-zinc-800',
              !hasReferencedStandards && 'text-zinc-500'
            )}
          >
            Referenced Standards
          </label>
          {!hasReferencedStandards ? (
            <span className="text-xs text-zinc-400">(none in included records)</span>
          ) : null}
        </li>
        <li className="flex flex-wrap items-center gap-2">
          <input
            id="wr-photo-addendum"
            type="checkbox"
            checked={sectionInclusion.photoAddendum}
            disabled={!hasPhotoAddendumPhotos}
            onChange={(e) => onSectionInclusionChange({ photoAddendum: e.target.checked })}
            className="h-4 w-4 rounded border-zinc-300 text-indigo-600 disabled:opacity-40"
          />
          <label
            htmlFor="wr-photo-addendum"
            className={cn(
              'text-sm font-medium text-zinc-800',
              !hasPhotoAddendumPhotos && 'text-zinc-500'
            )}
          >
            Photo Addendum
          </label>
          {!hasPhotoAddendumPhotos ? (
            <span className="text-xs text-zinc-400">(none in included records)</span>
          ) : null}
        </li>
      </ul>
    </div>
  );
}
