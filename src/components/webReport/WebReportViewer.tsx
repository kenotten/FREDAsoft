import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, FileText, Layers } from 'lucide-react';
import type {
  Client,
  Facility,
  Inspector,
  Project,
  ProjectData,
  Glossary,
  Category,
  Item,
  Location,
  Finding,
  MasterStandard
} from '../../types';
import { Button, Card, Select } from '../ui/core';
import { cn, formatCurrency, formatMeasurement } from '../../lib/utils';
import { resolveFacilityReportNarrative, type ReportRecordSortOrder } from '../../lib/reportPreviewShared';
import {
  applyWebReportRecordInclusion,
  cloneWebReportRecordInclusion,
  createDefaultWebReportRecordInclusion,
  deriveWebReportFilterOptions,
  isWebReportRecordInclusionAllSelected,
  pruneWebReportRecordInclusion,
  type WebReportFilterOption,
  type WebReportFilterOptions,
  type WebReportRecordInclusion
} from '../../lib/webReportFilters';
import {
  buildCanonicalReportNumberMap,
  buildWebReportDocumentationTreeFromRecords,
  facilitiesForWebReport,
  facilityIdsEqual,
  facilityMatchesWebReportClientContext,
  getCanonicalReportNumber,
  getWebReportFacilityRecords,
  mergeWebReportFacilityOptions,
  type WebReportItemGroup,
  type WebReportMidGroup,
  type WebReportRecordView,
  type WebReportTopGroup
} from '../../lib/webReportTree';
import {
  applyWebReportAccordionCollapseAll,
  applyWebReportAccordionCollapseLevel,
  applyWebReportAccordionExpandAll,
  applyWebReportAccordionExpandLevel,
  collectWebReportAccordionNodeIds,
  reconcileWebReportCollapsedKeys,
  webReportAccordionLevelIds,
  webReportHierarchyLevelLabels
} from '../../lib/webReportAccordion';
import {
  areCollapsedKeySetsEqual,
  createDefaultWebReportSessionState,
  DEFAULT_WEB_REPORT_DOCUMENTATION_EXPANDED,
  DEFAULT_WEB_REPORT_FINANCIAL_EXPANDED,
  DEFAULT_WEB_REPORT_NARRATIVE_EXPANDED,
  DEFAULT_WEB_REPORT_STANDARDS_EXPANDED,
  DEFAULT_WEB_REPORT_PHOTO_ADDENDUM_EXPANDED,
  loadWebReportSessionState,
  readWebReportSessionForScope,
  recordInclusionOverrideFromSession,
  saveWebReportSessionControls,
  saveWebReportSessionState,
  webReportSessionMatchesScope,
  type WebReportSectionInclusion
} from '../../lib/webReportSessionState';
import {
  buildWebReportFinancialSummary,
  collectWebReportFinancialParentKeys,
  reconcileWebReportFinancialCollapsedKeys,
  type WebReportFinancialParentGroup,
  type WebReportFinancialSummary
} from '../../lib/webReportFinancial';
import { buildWebReportReferencedStandardsView } from '../../lib/webReportStandards';
import {
  buildWebReportPhotoAddendumView,
  includedRecordsHavePhotoAddendumPhotos
} from '../../lib/webReportPhotoAddendum';
import { WebReportStandardsSection } from './WebReportStandardsSection';
import { WebReportPhotoAddendumSection } from './WebReportPhotoAddendumSection';

export type { WebReportSectionInclusion };

const DEFAULT_SECTION_INCLUSION: WebReportSectionInclusion = {
  narrative: true,
  financial: true,
  documentation: true,
  standards: true,
  photoAddendum: true
};

type WebReportViewerProps = {
  clients: Client[];
  facilities: Facility[];
  projects: Project[];
  inspectors: Inspector[];
  rawProjectData: ProjectData[];
  /** Active workspace project id — data subscription scope */
  subscribedProjectId: string;
  glossary: Glossary[];
  categories: Category[];
  items: Item[];
  locations: Location[];
  findings: Finding[];
  standards: MasterStandard[];
  /** Defaults only; viewer does not mutate global selections */
  defaultProjectId: string;
  defaultFacilityId: string;
  /** Workspace client id (selections.clientId) for extra facility inclusion */
  workspaceClientId: string;
};

function formatInspectionDate(dateStr: string | undefined): string {
  if (!dateStr) return 'TBD';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function toSingleLineSnippet(value: string | undefined, maxLen: number): string {
  const normalized = String(value || '').replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  if (normalized.length <= maxLen) return normalized;
  return `${normalized.slice(0, Math.max(1, maxLen - 3)).trimEnd()}...`;
}

function resolveFindingSummary(view: WebReportRecordView): string {
  const shortFinding = toSingleLineSnippet(view.findingShort, 90);
  if (shortFinding) return shortFinding;
  const longFinding = toSingleLineSnippet(view.record.fldFindLong, 90);
  if (longFinding) return longFinding;
  return 'Finding not specified';
}

function resolveRecommendationSummary(view: WebReportRecordView): string {
  const shortRec = toSingleLineSnippet(view.record.fldRecShort, 90);
  if (shortRec) return shortRec;
  const longRec = toSingleLineSnippet(view.record.fldRecLong, 90);
  if (longRec) return longRec;
  return 'Recommendation not specified';
}

function CollapseToggle({
  expanded,
  onToggle,
  label,
  subtitle,
  level
}: {
  expanded: boolean;
  onToggle: () => void;
  label: string;
  subtitle?: string;
  level: 'top' | 'mid' | 'item';
}) {
  const pad = level === 'top' ? 'pl-0' : level === 'mid' ? 'pl-4' : 'pl-8';
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'flex w-full items-center gap-2 rounded-lg py-2 text-left transition-colors hover:bg-zinc-100',
        pad
      )}
    >
      {expanded ? (
        <ChevronDown size={16} className="shrink-0 text-zinc-500" />
      ) : (
        <ChevronRight size={16} className="shrink-0 text-zinc-500" />
      )}
      <span
        className={cn(
          'truncate',
          level === 'top' && 'text-sm font-bold uppercase tracking-wide text-zinc-900',
          level === 'mid' && 'text-sm font-semibold text-zinc-800',
          level === 'item' && 'text-xs font-semibold text-zinc-700'
        )}
      >
        {label}
      </span>
      {subtitle ? (
        <span className="ml-auto shrink-0 text-[10px] font-medium text-zinc-400">{subtitle}</span>
      ) : null}
    </button>
  );
}

/** Header record # width + category meta label width; body label column matches their sum so border-r aligns with the category value cell. */
const WR_CARD_RECORD_NUM_W = 'w-10';
const WR_CARD_HEADER_META_LABEL_W = 'w-20';
const WR_CARD_BODY_LABEL_W = 'w-[7.5rem]';

const WR_CARD_LABEL_CELL = cn(
  'flex shrink-0 items-center self-stretch border-r border-zinc-200 bg-zinc-50 px-2 py-2 text-[9px] font-bold uppercase text-zinc-500',
  WR_CARD_BODY_LABEL_W
);

function WebReportFindingCard({
  view,
  reportNumber
}: {
  view: WebReportRecordView;
  reportNumber: number | null;
}) {
  const { record } = view;
  const images = Array.isArray(record.fldImages) ? record.fldImages.slice(0, 2) : [];

  return (
    <Card className="overflow-hidden border border-zinc-200">
      <div className="flex flex-col items-stretch md:flex-row">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex items-stretch border-b border-zinc-200 bg-zinc-50 text-[10px] font-bold uppercase tracking-wider">
            <div
              className={cn(
                'flex shrink-0 items-center justify-center border-r border-zinc-200 text-lg font-black text-zinc-900',
                WR_CARD_RECORD_NUM_W
              )}
            >
              {reportNumber ?? '—'}
            </div>
            <div className="grid min-w-0 flex-1 grid-cols-2 gap-px bg-zinc-200">
              <div className="flex bg-white">
                <span
                  className={cn(
                    'shrink-0 border-r border-zinc-200 px-2 py-1.5 text-zinc-500',
                    WR_CARD_HEADER_META_LABEL_W
                  )}
                >
                  Category
                </span>
                <span className="min-w-0 flex-1 truncate bg-zinc-900 px-2 py-1.5 text-white">
                  {view.categoryName}
                </span>
              </div>
              <div className="flex bg-white">
                <span className="w-16 shrink-0 border-r border-zinc-200 px-2 py-1.5 text-zinc-500">Item</span>
                <span className="min-w-0 flex-1 truncate bg-zinc-900 px-2 py-1.5 text-white">
                  {view.itemName}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-stretch border-b border-zinc-200 text-xs">
            <div className={WR_CARD_LABEL_CELL}>Location</div>
            <span className="flex min-w-0 flex-1 items-center truncate px-2 py-2 font-medium text-zinc-900">
              {view.locationName}
            </span>
            <span className="flex shrink-0 items-center px-3 py-2 text-xs font-bold text-blue-600">
              Est. {formatCurrency(record.totalCost ?? 0)}
            </span>
          </div>

          <div className="flex items-stretch border-b border-zinc-200">
            <div className={WR_CARD_LABEL_CELL}>Finding</div>
            <div className="flex min-h-0 min-w-0 flex-1 items-center px-2 py-2 text-[11px] leading-snug text-zinc-800 whitespace-pre-line">
              {record.fldFindLong || view.findingShort}
            </div>
            <div className="w-28 shrink-0 border-l border-zinc-200 bg-zinc-50 text-center">
              <div className="border-b border-zinc-200 px-1 py-1 text-[9px] font-bold uppercase text-zinc-500">
                Measurement
              </div>
              <div className="px-1 py-2 text-xs font-bold">
                {formatMeasurement(record.fldMeasurement, record.fldMeasurementUnit || record.fldUnitType)}
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 items-stretch border-b border-zinc-200">
            <div className={WR_CARD_LABEL_CELL}>Recommendation</div>
            <div className="flex min-h-0 min-w-0 flex-1 items-center px-2 py-2 text-[11px] leading-snug text-zinc-800 whitespace-pre-line">
              {record.fldRecLong || record.fldRecShort}
            </div>
          </div>

          {view.citationsLabel ? (
            <div className="flex shrink-0 items-stretch">
              <div className={WR_CARD_LABEL_CELL}>Reference</div>
              <div className="flex min-h-0 min-w-0 flex-1 items-center px-2 py-2 text-xs font-semibold text-zinc-700">
                {view.citationsLabel}
              </div>
            </div>
          ) : null}
        </div>

        {images.length > 0 ? (
          <div
            className={cn(
              'flex w-full shrink-0 self-stretch border-l border-zinc-200 md:w-44',
              'min-h-0'
            )}
          >
            <div className="flex w-full flex-row gap-px self-start bg-zinc-200 md:flex-col">
              {images.map((url, i) => (
                <div key={i} className="h-28 flex-1 overflow-hidden bg-white p-1 md:h-32 md:flex-none">
                  <img
                    src={url}
                    alt=""
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </Card>
  );
}

function WebReportItemGroupBlock({
  group,
  collapsedKeys,
  toggleCollapsed,
  canonicalReportNumbers
}: {
  group: WebReportItemGroup;
  collapsedKeys: Set<string>;
  toggleCollapsed: (key: string) => void;
  canonicalReportNumbers: Map<string, number>;
}) {
  const expanded = !collapsedKeys.has(group.key);
  const summaryRows = group.records.map((view) => {
    const reportNumber = getCanonicalReportNumber(canonicalReportNumbers, view.record.fldPDataID);
    return {
      id: view.record.fldPDataID,
      reportLabel: reportNumber !== null ? `#${reportNumber}` : '#-',
      finding: resolveFindingSummary(view),
      recommendation: resolveRecommendationSummary(view)
    };
  });

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[13rem_minmax(0,1fr)] items-start gap-x-2 gap-y-1 pl-8">
        <button
          type="button"
          onClick={() => toggleCollapsed(group.key)}
          className="flex min-w-0 items-center gap-2 rounded-lg py-2 text-left transition-colors hover:bg-zinc-100"
        >
          {expanded ? (
            <ChevronDown size={16} className="shrink-0 text-zinc-500" />
          ) : (
            <ChevronRight size={16} className="shrink-0 text-zinc-500" />
          )}
          <span className="truncate text-xs font-semibold text-zinc-700">{group.itemName}</span>
        </button>
        {summaryRows[0] ? (
          <p className="truncate py-2 text-[11px] leading-snug text-zinc-600">
            <span className="font-bold text-zinc-700">{summaryRows[0].reportLabel}</span>{' '}
            <span>{summaryRows[0].finding}</span>{' '}
            <span className="text-zinc-400">{'->'}</span>{' '}
            <span>{summaryRows[0].recommendation}</span>
          </p>
        ) : null}
        {summaryRows.slice(1).map((row) => (
          <p key={row.id} className="col-start-2 truncate text-[11px] leading-snug text-zinc-600">
            <span className="font-bold text-zinc-700">{row.reportLabel}</span>{' '}
            <span>{row.finding}</span>{' '}
            <span className="text-zinc-400">{'->'}</span>{' '}
            <span>{row.recommendation}</span>
          </p>
        ))}
      </div>
      {expanded ? (
        <div className="space-y-3 pl-10">
          {group.records.map((view) => (
            <WebReportFindingCard
              key={view.record.fldPDataID}
              view={view}
              reportNumber={getCanonicalReportNumber(canonicalReportNumbers, view.record.fldPDataID)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function WebReportMidGroupBlock({
  group,
  topLabel,
  sortOrder,
  midLevelLabel,
  collapsedKeys,
  toggleCollapsed,
  canonicalReportNumbers
}: {
  group: WebReportMidGroup;
  topLabel: string;
  sortOrder: ReportRecordSortOrder;
  midLevelLabel: string;
  collapsedKeys: Set<string>;
  toggleCollapsed: (key: string) => void;
  canonicalReportNumbers: Map<string, number>;
}) {
  const expanded = !collapsedKeys.has(group.key);
  const recordCount = group.items.reduce((n, g) => n + g.records.length, 0);

  return (
    <div className="space-y-2 border-l-2 border-zinc-100 pl-2">
      <CollapseToggle
        level="mid"
        label={group.label}
        subtitle={`${midLevelLabel} · ${recordCount} records`}
        expanded={expanded}
        onToggle={() => toggleCollapsed(group.key)}
      />
      {expanded ? (
        <div className="space-y-4 pl-2">
          {group.items.map((itemGroup) => (
            <WebReportItemGroupBlock
              key={itemGroup.key}
              group={itemGroup}
              collapsedKeys={collapsedKeys}
              toggleCollapsed={toggleCollapsed}
              canonicalReportNumbers={canonicalReportNumbers}
            />
          ))}
        </div>
      ) : null}
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

function WebReportContentFilters({
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

function WebReportDocumentationAccordionToolbar({
  sortOrder,
  nodeIds,
  onExpandAll,
  onCollapseAll,
  onExpandLevel,
  onCollapseLevel
}: {
  sortOrder: ReportRecordSortOrder;
  nodeIds: ReturnType<typeof collectWebReportAccordionNodeIds>;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onExpandLevel: (level: 'top' | 'mid' | 'item') => void;
  onCollapseLevel: (level: 'top' | 'mid' | 'item') => void;
}) {
  const labels = webReportHierarchyLevelLabels(sortOrder);
  const disabled = nodeIds.all.length === 0;

  const levelButton = (level: 'top' | 'mid' | 'item', label: string) => (
    <span key={level} className="inline-flex flex-wrap gap-1.5">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={disabled || webReportAccordionLevelIds(nodeIds, level).length === 0}
        onClick={() => onExpandLevel(level)}
        className="text-xs"
      >
        Expand {label}
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={disabled || webReportAccordionLevelIds(nodeIds, level).length === 0}
        onClick={() => onCollapseLevel(level)}
        className="text-xs"
      >
        Collapse {label}
      </Button>
    </span>
  );

  return (
    <Card className="border-dashed border-zinc-200 bg-zinc-50/80 p-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
        Documentation hierarchy (display only)
      </p>
      <p className="mt-1 text-xs text-zinc-500">
        Does not change section inclusion, record numbers, or report data.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" disabled={disabled} onClick={onExpandAll}>
          Expand all
        </Button>
        <Button type="button" variant="secondary" size="sm" disabled={disabled} onClick={onCollapseAll}>
          Collapse all
        </Button>
        {levelButton('top', labels.top)}
        {levelButton('mid', labels.mid)}
        {levelButton('item', labels.item)}
      </div>
    </Card>
  );
}

function WebReportTopGroupBlock({
  group,
  sortOrder,
  topLevelLabel,
  midLevelLabel,
  collapsedKeys,
  toggleCollapsed,
  canonicalReportNumbers
}: {
  group: WebReportTopGroup;
  sortOrder: ReportRecordSortOrder;
  topLevelLabel: string;
  midLevelLabel: string;
  collapsedKeys: Set<string>;
  toggleCollapsed: (key: string) => void;
  canonicalReportNumbers: Map<string, number>;
}) {
  const expanded = !collapsedKeys.has(group.key);
  const recordCount = group.children.reduce(
    (n, mid) => n + mid.items.reduce((m, item) => m + item.records.length, 0),
    0
  );

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <CollapseToggle
        level="top"
        label={group.label}
        subtitle={`${topLevelLabel} · ${recordCount} records`}
        expanded={expanded}
        onToggle={() => toggleCollapsed(group.key)}
      />
      {expanded ? (
        <div className="mt-3 space-y-4">
          {group.children.map((mid) => (
            <WebReportMidGroupBlock
              key={mid.key}
              group={mid}
              topLabel={group.label}
              sortOrder={sortOrder}
              midLevelLabel={midLevelLabel}
              collapsedKeys={collapsedKeys}
              toggleCollapsed={toggleCollapsed}
              canonicalReportNumbers={canonicalReportNumbers}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function WebReportFinancialParentBlock({
  group,
  collapsedKeys,
  toggleCollapsed
}: {
  group: WebReportFinancialParentGroup;
  collapsedKeys: Set<string>;
  toggleCollapsed: (key: string) => void;
}) {
  const expanded = !collapsedKeys.has(group.key);

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200">
      <button
        type="button"
        onClick={() => toggleCollapsed(group.key)}
        className="flex w-full items-center gap-2 bg-zinc-900 px-3 py-2 text-left text-xs font-black uppercase tracking-wide text-white hover:bg-zinc-800"
      >
        {expanded ? (
          <ChevronDown size={14} className="shrink-0" />
        ) : (
          <ChevronRight size={14} className="shrink-0" />
        )}
        <span className="min-w-0 flex-1 truncate">{group.label}</span>
        <span className="shrink-0 text-sm font-bold normal-case tracking-normal text-zinc-100">
          Subtotal {formatCurrency(group.subtotal)}
        </span>
      </button>
      {expanded ? (
        <div className="divide-y divide-zinc-100">
          {group.detailRows.map((row) => (
            <div
              key={row.key}
              className="grid grid-cols-1 items-start gap-1 px-3 py-2 text-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-3"
            >
              <div className="min-w-0 pl-4">
                <p className="font-medium text-zinc-800">{row.pathLabel}</p>
                <p className="mt-0.5 text-xs leading-snug text-zinc-600">{row.descriptor}</p>
                <p className="mt-0.5 text-[10px] text-zinc-400">
                  {row.reportNumber !== null ? `#${row.reportNumber}` : '—'}
                  {row.qtyLabel ? ` · ${row.qtyLabel}` : ''}
                </p>
              </div>
              <p className="shrink-0 pl-4 text-right font-bold text-zinc-900 sm:pl-0">
                {formatCurrency(row.reportTotalCost)}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function WebReportFinancialTable({
  summary,
  collapsedKeys,
  toggleCollapsed,
  onExpandAll,
  onCollapseAll
}: {
  summary: WebReportFinancialSummary;
  collapsedKeys: Set<string>;
  toggleCollapsed: (key: string) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
}) {
  const parentKeys = collectWebReportFinancialParentKeys(summary.parentGroups);
  const disabled = parentKeys.length === 0;

  return (
    <Card className="space-y-4 p-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Estimated cost</p>
          <p className="mt-1 text-lg font-black text-zinc-900">
            {formatCurrency(summary.totalEstimatedCost)}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            Included records
          </p>
          <p className="mt-1 text-lg font-black text-zinc-900">{summary.includedRecordCount}</p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Nonzero cost</p>
          <p className="mt-1 text-lg font-black text-zinc-900">{summary.nonzeroCostCount}</p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Zero cost</p>
          <p className="mt-1 text-lg font-black text-zinc-900">{summary.zeroCostCount}</p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            Missing explicit total
          </p>
          <p className="mt-1 text-lg font-black text-zinc-900">{summary.missingExplicitTotalCount}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" disabled={disabled} onClick={onExpandAll}>
          Expand all {summary.parentLevelLabel.toLowerCase()}s
        </Button>
        <Button type="button" variant="secondary" size="sm" disabled={disabled} onClick={onCollapseAll}>
          Collapse all {summary.parentLevelLabel.toLowerCase()}s
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-200">
        <div className="grid grid-cols-1 gap-2 border-b border-zinc-200 bg-zinc-100 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500 sm:grid-cols-[minmax(0,1fr)_auto]">
          <span>
            {summary.parentLevelLabel} · {summary.detailMidLabel} / {summary.detailItemLabel}
          </span>
          <span className="text-right">Estimated cost</span>
        </div>

        <div className="space-y-3 p-3">
          {summary.parentGroups.map((group) => (
            <WebReportFinancialParentBlock
              key={group.key}
              group={group}
              collapsedKeys={collapsedKeys}
              toggleCollapsed={toggleCollapsed}
            />
          ))}
        </div>

        <div className="grid grid-cols-1 items-center gap-2 border-t-2 border-zinc-900 bg-zinc-50 px-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <p className="text-sm font-black uppercase tracking-widest text-zinc-900">Grand total</p>
          <p className="text-right text-lg font-black text-blue-600">
            {formatCurrency(summary.totalEstimatedCost)}
          </p>
        </div>
      </div>
    </Card>
  );
}

export function WebReportViewer({
  clients,
  facilities,
  projects,
  inspectors,
  rawProjectData,
  subscribedProjectId,
  glossary,
  categories,
  items,
  locations,
  findings,
  standards,
  defaultProjectId,
  defaultFacilityId,
  workspaceClientId
}: WebReportViewerProps) {
  const [localProjectId, setLocalProjectId] = useState(defaultProjectId);
  const [localFacilityId, setLocalFacilityId] = useState(defaultFacilityId);

  const initialSession = useMemo(
    () => readWebReportSessionForScope(defaultProjectId, defaultFacilityId),
    [defaultProjectId, defaultFacilityId]
  );

  const [sortOrder, setSortOrder] = useState<ReportRecordSortOrder>(
    () => initialSession?.sortOrder ?? 'category_location_item'
  );
  const [sectionInclusion, setSectionInclusion] = useState<WebReportSectionInclusion>(
    () => initialSession?.sectionInclusion ?? DEFAULT_SECTION_INCLUSION
  );
  const [collapsedKeys, setCollapsedKeys] = useState<Set<string>>(
    () => new Set(initialSession?.collapsedKeys ?? [])
  );
  const [financialCollapsedKeys, setFinancialCollapsedKeys] = useState<Set<string>>(
    () => new Set(initialSession?.financialCollapsedKeys ?? [])
  );
  const [narrativeExpanded, setNarrativeExpanded] = useState(
    () => initialSession?.narrativeExpanded ?? DEFAULT_WEB_REPORT_NARRATIVE_EXPANDED
  );
  const [financialExpanded, setFinancialExpanded] = useState(
    () => initialSession?.financialExpanded ?? DEFAULT_WEB_REPORT_FINANCIAL_EXPANDED
  );
  const [documentationExpanded, setDocumentationExpanded] = useState(
    () => initialSession?.documentationExpanded ?? DEFAULT_WEB_REPORT_DOCUMENTATION_EXPANDED
  );
  const [standardsExpanded, setStandardsExpanded] = useState(
    () => initialSession?.standardsExpanded ?? DEFAULT_WEB_REPORT_STANDARDS_EXPANDED
  );
  const [photoAddendumExpanded, setPhotoAddendumExpanded] = useState(
    () => initialSession?.photoAddendumExpanded ?? DEFAULT_WEB_REPORT_PHOTO_ADDENDUM_EXPANDED
  );
  const [recordInclusionOverride, setRecordInclusionOverride] = useState<WebReportRecordInclusion | null>(
    null
  );

  useEffect(() => {
    if (defaultProjectId) setLocalProjectId(defaultProjectId);
  }, [defaultProjectId]);

  useEffect(() => {
    if (defaultFacilityId) setLocalFacilityId(defaultFacilityId);
  }, [defaultFacilityId]);

  const selectedProject = useMemo(
    () => projects.find((p) => p.fldProjID === localProjectId) || null,
    [projects, localProjectId]
  );

  const workspaceFacilityIds = useMemo(
    () =>
      [...new Set([localFacilityId, defaultFacilityId].map((id) => String(id || '').trim()).filter(Boolean))],
    [localFacilityId, defaultFacilityId]
  );

  const facilityOptions = useMemo(() => {
    if (!selectedProject) return [];
    return facilitiesForWebReport(selectedProject, facilities, {
      includeFacilityIds: workspaceFacilityIds,
      workspaceClientId
    });
  }, [selectedProject, facilities, workspaceFacilityIds, workspaceClientId]);

  const resolvedLocalFacility = useMemo(() => {
    if (!String(localFacilityId || '').trim()) return null;
    return facilities.find((f) => facilityIdsEqual(f.fldFacID, localFacilityId)) || null;
  }, [facilities, localFacilityId]);

  const facilityClientMismatch = useMemo(() => {
    if (!selectedProject || !resolvedLocalFacility) return false;
    return !facilityMatchesWebReportClientContext(
      resolvedLocalFacility,
      selectedProject,
      workspaceClientId
    );
  }, [selectedProject, resolvedLocalFacility, workspaceClientId]);

  const selectedFacility = useMemo(() => {
    if (!String(localFacilityId || '').trim()) return null;
    return facilityOptions.find((f) => facilityIdsEqual(f.fldFacID, localFacilityId)) || null;
  }, [facilityOptions, localFacilityId]);

  const mergedFacilityOptions = useMemo(() => {
    if (!selectedProject || !resolvedLocalFacility || facilityClientMismatch) {
      return facilityOptions;
    }
    if (
      !facilityMatchesWebReportClientContext(
        resolvedLocalFacility,
        selectedProject,
        workspaceClientId
      )
    ) {
      return facilityOptions;
    }
    return mergeWebReportFacilityOptions(facilityOptions, resolvedLocalFacility);
  }, [
    facilityOptions,
    selectedProject,
    resolvedLocalFacility,
    facilityClientMismatch,
    workspaceClientId
  ]);

  const effectiveFacility = useMemo(() => {
    if (facilityClientMismatch) return null;
    if (selectedFacility) return selectedFacility;
    if (
      resolvedLocalFacility &&
      selectedProject &&
      facilityMatchesWebReportClientContext(
        resolvedLocalFacility,
        selectedProject,
        workspaceClientId
      )
    ) {
      return resolvedLocalFacility;
    }
    return null;
  }, [
    facilityClientMismatch,
    selectedFacility,
    resolvedLocalFacility,
    selectedProject,
    workspaceClientId
  ]);

  const facilitySelectValue = useMemo(() => {
    const match = mergedFacilityOptions.find((f) => facilityIdsEqual(f.fldFacID, localFacilityId));
    return match?.fldFacID ?? localFacilityId;
  }, [mergedFacilityOptions, localFacilityId]);

  const selectedClient = useMemo(() => {
    if (!selectedProject) return null;
    return clients.find((c) => c.fldClientID === selectedProject.fldClient) || null;
  }, [clients, selectedProject]);

  const selectedInspector = useMemo(() => {
    if (!selectedProject?.fldInspector) return null;
    return inspectors.find((i) => i.fldInspID === selectedProject.fldInspector) || null;
  }, [inspectors, selectedProject]);

  const dataInScope =
    Boolean(localProjectId) &&
    String(localProjectId).trim().toLowerCase() ===
      String(subscribedProjectId || '').trim().toLowerCase();

  const activeProjectData = useMemo(() => {
    if (!dataInScope) return [];
    return rawProjectData.filter(
      (d) =>
        !d.fldDeleted &&
        !d.fldIsDeleted &&
        d.fldPDataID &&
        String(d.fldPDataProject || '')
          .trim()
          .toLowerCase() === String(localProjectId || '').trim().toLowerCase()
    );
  }, [dataInScope, rawProjectData, localProjectId]);

  const facilityRecords = useMemo(() => {
    if (!selectedProject || !effectiveFacility || !dataInScope) return [];
    return getWebReportFacilityRecords(
      activeProjectData,
      selectedProject,
      effectiveFacility,
      glossary,
      categories,
      items,
      locations,
      findings
    );
  }, [
    activeProjectData,
    selectedProject,
    effectiveFacility,
    dataInScope,
    glossary,
    categories,
    items,
    locations,
    findings
  ]);

  const filterOptions = useMemo(
    () => deriveWebReportFilterOptions(facilityRecords, glossary, categories, items, locations),
    [facilityRecords, glossary, categories, items, locations]
  );

  const defaultRecordInclusion = useMemo(
    () => createDefaultWebReportRecordInclusion(filterOptions),
    [filterOptions]
  );

  const viewerScopeKey = useMemo(() => {
    if (!localProjectId || !localFacilityId) return '';
    return `${String(localProjectId).trim()}|${String(localFacilityId).trim()}`;
  }, [localProjectId, localFacilityId]);

  const filterOptionsKey = useMemo(
    () =>
      [
        filterOptions.categories.map((o) => o.id).join('\0'),
        filterOptions.locations.map((o) => o.id).join('\0'),
        filterOptions.items.map((o) => o.id).join('\0')
      ].join('|'),
    [filterOptions]
  );

  const prevViewerScopeKeyRef = useRef('');

  const canPersistSession =
    Boolean(viewerScopeKey) &&
    dataInScope &&
    Boolean(selectedProject) &&
    Boolean(effectiveFacility);

  const sessionControlsForPersist = useCallback(
    () => ({
      projectId: localProjectId,
      facilityId: localFacilityId,
      sortOrder,
      sectionInclusion,
      inclusion: recordInclusionOverride ?? defaultRecordInclusion,
      narrativeExpanded,
      financialExpanded,
      documentationExpanded,
      standardsExpanded,
      photoAddendumExpanded
    }),
    [
      localProjectId,
      localFacilityId,
      sortOrder,
      sectionInclusion,
      recordInclusionOverride,
      defaultRecordInclusion,
      narrativeExpanded,
      financialExpanded,
      documentationExpanded,
      standardsExpanded,
      photoAddendumExpanded
    ]
  );

  const persistCollapsedKeys = useCallback(
    (keys: Set<string>) => {
      if (!canPersistSession) return;
      saveWebReportSessionControls(sessionControlsForPersist(), { collapsedKeys: keys });
    },
    [canPersistSession, sessionControlsForPersist]
  );

  const applyCollapsedKeys = useCallback(
    (next: Set<string>) => {
      setCollapsedKeys(next);
      persistCollapsedKeys(next);
    },
    [persistCollapsedKeys]
  );

  const resetViewerControlsToDefaults = useCallback(() => {
    setSortOrder('category_location_item');
    setSectionInclusion(DEFAULT_SECTION_INCLUSION);
    setRecordInclusionOverride(null);
    setNarrativeExpanded(DEFAULT_WEB_REPORT_NARRATIVE_EXPANDED);
    setFinancialExpanded(DEFAULT_WEB_REPORT_FINANCIAL_EXPANDED);
    setDocumentationExpanded(DEFAULT_WEB_REPORT_DOCUMENTATION_EXPANDED);
    setStandardsExpanded(DEFAULT_WEB_REPORT_STANDARDS_EXPANDED);
    setPhotoAddendumExpanded(DEFAULT_WEB_REPORT_PHOTO_ADDENDUM_EXPANDED);
    setCollapsedKeys(new Set());
    setFinancialCollapsedKeys(new Set());
  }, []);

  const applyLocalProjectSelection = useCallback(
    (nextProjectId: string) => {
      setLocalProjectId(nextProjectId);
      resetViewerControlsToDefaults();

      if (facilities.length === 0) return;

      const nextProject = projects.find((p) => p.fldProjID === nextProjectId) || null;
      if (!nextProject) return;

      const nextFacilityOptions = facilitiesForWebReport(nextProject, facilities, {
        includeFacilityIds: workspaceFacilityIds,
        workspaceClientId
      });
      const facilityStillValid = nextFacilityOptions.some((f) =>
        facilityIdsEqual(f.fldFacID, localFacilityId)
      );
      if (!facilityStillValid) {
        setLocalFacilityId(nextFacilityOptions[0]?.fldFacID ?? '');
      }
    },
    [facilities, projects, localFacilityId, workspaceFacilityIds, workspaceClientId, resetViewerControlsToDefaults]
  );

  const resetSessionStorageToDefaultsForScope = useCallback(
    (projectId: string, facilityId: string, options: WebReportFilterOptions) => {
      saveWebReportSessionState(createDefaultWebReportSessionState(projectId, facilityId, options));
    },
    []
  );

  useLayoutEffect(() => {
    if (!viewerScopeKey || !dataInScope) return;

    const prevScope = prevViewerScopeKeyRef.current;
    const scopeChanged = prevScope !== viewerScopeKey;
    if (!scopeChanged) return;

    const isRemountHydrate = prevScope === '';
    prevViewerScopeKeyRef.current = viewerScopeKey;

    const saved = loadWebReportSessionState();
    const matchScope =
      Boolean(saved) &&
      webReportSessionMatchesScope(saved, localProjectId, localFacilityId);

    if (isRemountHydrate && matchScope) {
      setSortOrder(saved!.sortOrder);
      setSectionInclusion(saved!.sectionInclusion);
      setRecordInclusionOverride(recordInclusionOverrideFromSession(saved!, filterOptions));
      setNarrativeExpanded(saved!.narrativeExpanded);
      setFinancialExpanded(saved!.financialExpanded);
      setDocumentationExpanded(saved!.documentationExpanded);
      setStandardsExpanded(saved!.standardsExpanded);
      setPhotoAddendumExpanded(saved!.photoAddendumExpanded);
      setCollapsedKeys(new Set(saved!.collapsedKeys));
      setFinancialCollapsedKeys(new Set(saved!.financialCollapsedKeys));
    } else {
      resetViewerControlsToDefaults();
      if (selectedProject && effectiveFacility) {
        resetSessionStorageToDefaultsForScope(
          localProjectId,
          localFacilityId,
          filterOptions
        );
      }
    }
  }, [
    viewerScopeKey,
    dataInScope,
    localProjectId,
    localFacilityId,
    filterOptions,
    selectedProject,
    effectiveFacility,
    resetViewerControlsToDefaults,
    resetSessionStorageToDefaultsForScope
  ]);

  useEffect(() => {
    if (!viewerScopeKey || !dataInScope) return;

    setRecordInclusionOverride((prev) => {
      if (!prev) return null;
      const pruned = pruneWebReportRecordInclusion(prev, filterOptions);
      return isWebReportRecordInclusionAllSelected(pruned, filterOptions) ? null : pruned;
    });
  }, [viewerScopeKey, filterOptionsKey, dataInScope, filterOptions]);

  const activeRecordInclusion = useMemo(() => {
    const base = recordInclusionOverride ?? defaultRecordInclusion;
    return pruneWebReportRecordInclusion(base, filterOptions);
  }, [recordInclusionOverride, defaultRecordInclusion, filterOptions]);

  const filtersRestricted = useMemo(
    () => !isWebReportRecordInclusionAllSelected(activeRecordInclusion, filterOptions),
    [activeRecordInclusion, filterOptions]
  );

  const includedRecords = useMemo(
    () => applyWebReportRecordInclusion(facilityRecords, activeRecordInclusion, glossary),
    [facilityRecords, activeRecordInclusion, glossary]
  );

  const fullRecordCount = facilityRecords.length;
  const filteredRecordCount = includedRecords.length;
  const canonicalReportNumbers = useMemo(() => {
    if (!selectedProject || !effectiveFacility || !dataInScope) {
      return new Map<string, number>();
    }
    return buildCanonicalReportNumberMap(
      activeProjectData,
      selectedProject,
      effectiveFacility,
      glossary,
      categories,
      items,
      locations,
      findings
    );
  }, [
    activeProjectData,
    selectedProject,
    effectiveFacility,
    dataInScope,
    glossary,
    categories,
    items,
    locations,
    findings
  ]);

  const financialSummary = useMemo(
    () =>
      buildWebReportFinancialSummary(
        includedRecords,
        sortOrder,
        glossary,
        categories,
        items,
        locations,
        findings,
        canonicalReportNumbers
      ),
    [
      includedRecords,
      sortOrder,
      glossary,
      categories,
      items,
      locations,
      findings,
      canonicalReportNumbers
    ]
  );

  const documentationTree = useMemo(() => {
    if (!selectedProject || !effectiveFacility || !dataInScope) return null;
    return buildWebReportDocumentationTreeFromRecords(
      includedRecords,
      glossary,
      categories,
      items,
      locations,
      findings,
      standards,
      sortOrder
    );
  }, [
    includedRecords,
    selectedProject,
    effectiveFacility,
    dataInScope,
    glossary,
    categories,
    items,
    locations,
    findings,
    standards,
    sortOrder
  ]);

  const referencedStandardsView = useMemo(
    () => buildWebReportReferencedStandardsView(includedRecords, glossary, standards),
    [includedRecords, glossary, standards]
  );

  const hasPhotoAddendumPhotos = useMemo(
    () => includedRecordsHavePhotoAddendumPhotos(includedRecords),
    [includedRecords]
  );

  const photoAddendumView = useMemo(
    () =>
      buildWebReportPhotoAddendumView(
        includedRecords,
        sortOrder,
        glossary,
        categories,
        items,
        locations,
        findings,
        canonicalReportNumbers
      ),
    [
      includedRecords,
      sortOrder,
      glossary,
      categories,
      items,
      locations,
      findings,
      canonicalReportNumbers
    ]
  );

  const resolveInclusionForUpdate = (): WebReportRecordInclusion =>
    cloneWebReportRecordInclusion(recordInclusionOverride ?? defaultRecordInclusion);

  const updateRecordInclusion = (mutate: (inclusion: WebReportRecordInclusion) => void) => {
    const next = resolveInclusionForUpdate();
    mutate(next);
    setRecordInclusionOverride(next);
  };

  const resetContentFilters = () => setRecordInclusionOverride(null);

  const narrativeText = useMemo(() => {
    if (!selectedProject || !effectiveFacility) return '';
    return resolveFacilityReportNarrative(selectedProject, effectiveFacility.fldFacID);
  }, [selectedProject, effectiveFacility]);

  const accordionNodeIds = useMemo(
    () => collectWebReportAccordionNodeIds(documentationTree),
    [documentationTree]
  );

  useEffect(() => {
    if (accordionNodeIds.all.length === 0) return;
    setCollapsedKeys((prev) => {
      const next = reconcileWebReportCollapsedKeys(prev, accordionNodeIds);
      if (areCollapsedKeySetsEqual(prev, next)) return prev;
      persistCollapsedKeys(next);
      return next;
    });
  }, [accordionNodeIds, persistCollapsedKeys]);

  const financialParentKeys = useMemo(
    () => collectWebReportFinancialParentKeys(financialSummary.parentGroups),
    [financialSummary.parentGroups]
  );

  const persistFinancialCollapsedKeys = useCallback(
    (keys: Set<string>) => {
      if (!canPersistSession) return;
      saveWebReportSessionControls(sessionControlsForPersist(), {
        financialCollapsedKeys: keys
      });
    },
    [canPersistSession, sessionControlsForPersist]
  );

  const applyFinancialCollapsedKeys = useCallback(
    (next: Set<string>) => {
      setFinancialCollapsedKeys(next);
      persistFinancialCollapsedKeys(next);
    },
    [persistFinancialCollapsedKeys]
  );

  useEffect(() => {
    if (financialParentKeys.length === 0) return;
    setFinancialCollapsedKeys((prev) => {
      const next = reconcileWebReportFinancialCollapsedKeys(prev, financialParentKeys);
      if (areCollapsedKeySetsEqual(prev, next)) return prev;
      persistFinancialCollapsedKeys(next);
      return next;
    });
  }, [financialParentKeys, persistFinancialCollapsedKeys]);

  useEffect(() => {
    if (!canPersistSession) return;
    saveWebReportSessionControls(sessionControlsForPersist());
  }, [canPersistSession, sessionControlsForPersist]);

  const handleSortOrderChange = useCallback(
    (next: ReportRecordSortOrder) => {
      if (next === sortOrder) return;
      setSortOrder(next);
      setCollapsedKeys(new Set());
      setFinancialCollapsedKeys(new Set());
      if (!canPersistSession) return;
      saveWebReportSessionControls(
        {
          ...sessionControlsForPersist(),
          sortOrder: next
        },
        { collapsedKeys: [], financialCollapsedKeys: [] }
      );
    },
    [sortOrder, canPersistSession, sessionControlsForPersist]
  );

  const toggleCollapsed = (key: string) => {
    const next = new Set(collapsedKeys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    applyCollapsedKeys(next);
  };

  const toggleFinancialCollapsed = (key: string) => {
    const next = new Set(financialCollapsedKeys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    applyFinancialCollapsedKeys(next);
  };

  const projectOptions = useMemo(
    () =>
      [...projects]
        .sort((a, b) => (a.fldProjName || '').localeCompare(b.fldProjName || '', undefined, { sensitivity: 'base' }))
        .map((p) => ({
          value: p.fldProjID,
          label: p.fldProjName,
          key: `wr-proj-${p.fldProjID}`
        })),
    [projects]
  );

  const topLevelLabel = sortOrder === 'category_location_item' ? 'Category' : 'Location';
  const midLevelLabel = sortOrder === 'category_location_item' ? 'Location' : 'Category';

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 pb-12">
      <div>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-indigo-600 p-2 text-white">
            <Layers size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Web Report Viewer</h1>
            <p className="text-sm text-zinc-500">
              Read-only live report · Phase 1 (heading, narrative, documentation)
            </p>
          </div>
        </div>
      </div>

      <Card className="space-y-4 border-dashed bg-zinc-50/80 p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Select
            label="Project"
            value={localProjectId}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
              applyLocalProjectSelection(e.target.value);
            }}
            options={projectOptions}
            placeholder="Select project…"
          />
          <Select
            label="Facility"
            value={facilitySelectValue}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
              setLocalFacilityId(e.target.value);
              resetViewerControlsToDefaults();
            }}
            options={mergedFacilityOptions.map((f) => ({
              value: f.fldFacID,
              label: f.fldFacName,
              key: `wr-fac-${f.fldFacID}`
            }))}
            placeholder={selectedProject ? 'Select facility…' : 'Select a project first'}
            disabled={!selectedProject || mergedFacilityOptions.length === 0}
          />
        </div>

        <div className="border-t border-zinc-200 pt-4">
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Sort hierarchy</p>
          <div className="mt-2 flex flex-wrap gap-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-800">
              <input
                type="radio"
                name="web-report-sort"
                checked={sortOrder === 'category_location_item'}
                onChange={() => handleSortOrderChange('category_location_item')}
                className="h-4 w-4 border-zinc-300 text-indigo-600"
              />
              Category → Location → Item
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-800">
              <input
                type="radio"
                name="web-report-sort"
                checked={sortOrder === 'location_category_item'}
                onChange={() => handleSortOrderChange('location_category_item')}
                className="h-4 w-4 border-zinc-300 text-indigo-600"
              />
              Location → Category → Item
            </label>
          </div>
        </div>

        {dataInScope && selectedProject && effectiveFacility ? (
          <WebReportContentFilters
            filterOptions={filterOptions}
            inclusion={activeRecordInclusion}
            filtersRestricted={filtersRestricted}
            filteredCount={filteredRecordCount}
            fullCount={fullRecordCount}
            disabled={fullRecordCount === 0}
            onToggleCategory={(id, checked) =>
              updateRecordInclusion((inc) => {
                if (checked) inc.categoryIds.add(id);
                else inc.categoryIds.delete(id);
              })
            }
            onToggleLocation={(id, checked) =>
              updateRecordInclusion((inc) => {
                if (checked) inc.locationIds.add(id);
                else inc.locationIds.delete(id);
              })
            }
            onToggleItem={(id, checked) =>
              updateRecordInclusion((inc) => {
                if (checked) inc.itemIds.add(id);
                else inc.itemIds.delete(id);
              })
            }
            onSelectAllCategories={() =>
              updateRecordInclusion((inc) => {
                inc.categoryIds = new Set(filterOptions.categories.map((o) => o.id));
              })
            }
            onClearAllCategories={() =>
              updateRecordInclusion((inc) => {
                inc.categoryIds = new Set();
              })
            }
            onSelectAllLocations={() =>
              updateRecordInclusion((inc) => {
                inc.locationIds = new Set(filterOptions.locations.map((o) => o.id));
              })
            }
            onClearAllLocations={() =>
              updateRecordInclusion((inc) => {
                inc.locationIds = new Set();
              })
            }
            onSelectAllItems={() =>
              updateRecordInclusion((inc) => {
                inc.itemIds = new Set(filterOptions.items.map((o) => o.id));
              })
            }
            onClearAllItems={() =>
              updateRecordInclusion((inc) => {
                inc.itemIds = new Set();
              })
            }
            onResetFilters={resetContentFilters}
          />
        ) : null}

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
                onChange={(e) =>
                  setSectionInclusion((s) => ({ ...s, narrative: e.target.checked }))
                }
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
                onChange={(e) =>
                  setSectionInclusion((s) => ({ ...s, financial: e.target.checked }))
                }
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
                onChange={(e) =>
                  setSectionInclusion((s) => ({ ...s, documentation: e.target.checked }))
                }
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
                disabled={!referencedStandardsView.hasReferencedStandards}
                onChange={(e) =>
                  setSectionInclusion((s) => ({ ...s, standards: e.target.checked }))
                }
                className="h-4 w-4 rounded border-zinc-300 text-indigo-600 disabled:opacity-40"
              />
              <label
                htmlFor="wr-standards"
                className={cn(
                  'text-sm font-medium text-zinc-800',
                  !referencedStandardsView.hasReferencedStandards && 'text-zinc-500'
                )}
              >
                Referenced Standards
              </label>
              {!referencedStandardsView.hasReferencedStandards ? (
                <span className="text-xs text-zinc-400">(none in included records)</span>
              ) : null}
            </li>
            <li className="flex flex-wrap items-center gap-2">
              <input
                id="wr-photo-addendum"
                type="checkbox"
                checked={sectionInclusion.photoAddendum}
                disabled={!hasPhotoAddendumPhotos}
                onChange={(e) =>
                  setSectionInclusion((s) => ({ ...s, photoAddendum: e.target.checked }))
                }
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
      </Card>

      {!selectedProject || !localFacilityId ? (
        <Card className="p-8 text-center text-sm text-zinc-500 italic">
          Select a project and facility to view the report.
        </Card>
      ) : facilities.length > 0 && !resolvedLocalFacility ? (
        <Card className="border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
          <p className="font-semibold">Selected facility could not be resolved.</p>
          <p className="mt-2 text-amber-800">
            Choose a facility from the list above, or select a valid facility in the workspace header.
          </p>
        </Card>
      ) : facilityClientMismatch ? (
        <Card className="border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
          <p className="font-semibold">Selected facility belongs to a different client than this project.</p>
          <p className="mt-2 text-amber-800">
            <strong>{resolvedLocalFacility?.fldFacName || localFacilityId}</strong> cannot be used with{' '}
            <strong>{selectedProject.fldProjName}</strong>. Choose a matching client/facility/project
            combination in the workspace header or facility list above.
          </p>
        </Card>
      ) : !effectiveFacility ? (
        <Card className="p-8 text-center text-sm text-zinc-500 italic">
          Select a project and facility to view the report.
        </Card>
      ) : !dataInScope ? (
        <Card className="border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
          <p className="font-semibold">Project data not loaded for this selection.</p>
          <p className="mt-2 text-amber-800">
            Live inspection records subscribe to the workspace project in the header tray. Select{' '}
            <strong>{selectedProject.fldProjName}</strong> there to load records, or choose the
            currently active workspace project here.
          </p>
        </Card>
      ) : (
        <>
          <Card className="overflow-hidden border-zinc-300 p-6">
            <div className="flex items-start gap-3 border-b border-zinc-200 pb-4">
              <FileText className="mt-0.5 shrink-0 text-indigo-600" size={20} />
              <div>
                <h2 className="text-lg font-bold uppercase tracking-wide text-zinc-900">Report heading</h2>
                <p className="text-xs text-zinc-500">Always included · read-only</p>
              </div>
            </div>
            <div className="mt-4 grid gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                  Project information
                </h3>
                <InfoRow label="Client" value={selectedClient?.fldClientName || '—'} />
                <InfoRow label="Project" value={selectedProject.fldProjName} />
                <InfoRow label="Facility" value={effectiveFacility.fldFacName} />
                <InfoRow
                  label="Address"
                  value={
                    [effectiveFacility.fldFacAddress, effectiveFacility.fldFacCity, effectiveFacility.fldFacState]
                      .filter(Boolean)
                      .join(', ') || 'TBD'
                  }
                />
                <InfoRow label="OCG Project #" value={selectedProject.fldProjNumber || 'TBD'} />
              </div>
              <div className="space-y-3">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                  Inspection
                </h3>
                <InfoRow
                  label="Inspector"
                  value={
                    selectedInspector
                      ? `${selectedInspector.fldInspName}${selectedInspector.fldTitle ? `, ${selectedInspector.fldTitle}` : ''}`
                      : 'TBD'
                  }
                />
                <InfoRow
                  label="Inspection date"
                  value={formatInspectionDate(
                    effectiveFacility.fldInspectionDate || selectedProject.fldPDDate
                  )}
                />
                <InfoRow
                  label="Records"
                  value={
                    filtersRestricted && fullRecordCount > 0
                      ? `${filteredRecordCount} / ${fullRecordCount}`
                      : String(fullRecordCount)
                  }
                />
              </div>
            </div>
          </Card>

          {sectionInclusion.narrative ? (
            <Card className="p-6">
              <CollapseToggle
                level="top"
                label="Narrative"
                expanded={narrativeExpanded}
                onToggle={() => setNarrativeExpanded((v) => !v)}
              />
              {narrativeExpanded ? (
                <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-zinc-800">
                  {narrativeText}
                </div>
              ) : null}
            </Card>
          ) : null}

          {sectionInclusion.financial ? (
            <div className="space-y-3">
              <Card className="p-4">
                <CollapseToggle
                  level="top"
                  label="Financial"
                  subtitle={`${financialSummary.includedRecordCount} included records`}
                  expanded={financialExpanded}
                  onToggle={() => setFinancialExpanded((v) => !v)}
                />
                <p className="mt-2 border-t border-zinc-100 pt-2 text-xs leading-relaxed text-zinc-500">
                  Totals reflect the currently included Web Report records. Costs are report-adjusted.
                </p>
              </Card>
              {financialExpanded ? (
                financialSummary.includedRecordCount === 0 ? (
                  <Card className="p-6 text-center">
                    <p className="text-sm text-zinc-700">No included records with cost data.</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      Select a project/facility or adjust filters to include records.
                    </p>
                  </Card>
                ) : (
                  <WebReportFinancialTable
                    summary={financialSummary}
                    collapsedKeys={financialCollapsedKeys}
                    toggleCollapsed={toggleFinancialCollapsed}
                    onExpandAll={() => applyFinancialCollapsedKeys(new Set())}
                    onCollapseAll={() =>
                      applyFinancialCollapsedKeys(new Set(financialParentKeys))
                    }
                  />
                )
              ) : null}
            </div>
          ) : null}

          {sectionInclusion.documentation ? (
            <div className="space-y-3">
              <Card className="p-4">
                <CollapseToggle
                  level="top"
                  label="Documentation"
                  subtitle={
                    filtersRestricted && fullRecordCount > 0
                      ? `${filteredRecordCount} of ${fullRecordCount} records · ${topLevelLabel} → ${midLevelLabel} → Item`
                      : `${fullRecordCount} records · ${topLevelLabel} → ${midLevelLabel} → Item`
                  }
                  expanded={documentationExpanded}
                  onToggle={() => setDocumentationExpanded((v) => !v)}
                />
                <p className="mt-2 border-t border-zinc-100 pt-2 text-xs leading-relaxed text-zinc-500">
                  Record numbers are fixed using the default Category → Location → Item report order.
                  Changing the hierarchy or collapsing sections does not renumber records.
                </p>
              </Card>
              {documentationExpanded ? (
                fullRecordCount === 0 ? (
                  <Card className="p-6 text-center text-sm italic text-zinc-500">
                    No documentation records for this project and facility.
                  </Card>
                ) : filteredRecordCount === 0 ? (
                  <Card className="space-y-4 p-6 text-center">
                    <p className="text-sm text-zinc-700">
                      No records match the current filters.
                    </p>
                    <p className="text-xs text-zinc-500">
                      Try selecting more categories, locations, or items, or reset filters to show all{' '}
                      {fullRecordCount} records.
                    </p>
                    <div className="flex justify-center">
                      <Button type="button" variant="secondary" size="sm" onClick={resetContentFilters}>
                        Reset filters
                      </Button>
                    </div>
                  </Card>
                ) : documentationTree && filteredRecordCount > 0 ? (
                  <div className="space-y-4">
                    <WebReportDocumentationAccordionToolbar
                      sortOrder={sortOrder}
                      nodeIds={accordionNodeIds}
                      onExpandAll={() =>
                        applyCollapsedKeys(applyWebReportAccordionExpandAll())
                      }
                      onCollapseAll={() =>
                        applyCollapsedKeys(applyWebReportAccordionCollapseAll(accordionNodeIds))
                      }
                      onExpandLevel={(level) =>
                        applyCollapsedKeys(
                          applyWebReportAccordionExpandLevel(
                            collapsedKeys,
                            webReportAccordionLevelIds(accordionNodeIds, level)
                          )
                        )
                      }
                      onCollapseLevel={(level) =>
                        applyCollapsedKeys(
                          applyWebReportAccordionCollapseLevel(
                            collapsedKeys,
                            webReportAccordionLevelIds(accordionNodeIds, level)
                          )
                        )
                      }
                    />
                    {documentationTree.topGroups.map((top) => (
                      <WebReportTopGroupBlock
                        key={top.key}
                        group={top}
                        sortOrder={sortOrder}
                        topLevelLabel={topLevelLabel}
                        midLevelLabel={midLevelLabel}
                        collapsedKeys={collapsedKeys}
                        toggleCollapsed={toggleCollapsed}
                        canonicalReportNumbers={canonicalReportNumbers}
                      />
                    ))}
                  </div>
                ) : null
              ) : null}
            </div>
          ) : null}

          {sectionInclusion.standards ? (
            <WebReportStandardsSection
              view={referencedStandardsView}
              expanded={standardsExpanded}
              onToggleExpanded={() => setStandardsExpanded((v) => !v)}
              includedRecordCount={filteredRecordCount}
              filtersRestricted={filtersRestricted}
            />
          ) : null}

          {sectionInclusion.photoAddendum ? (
            <WebReportPhotoAddendumSection
              view={photoAddendumView}
              expanded={photoAddendumExpanded}
              onToggleExpanded={() => setPhotoAddendumExpanded((v) => !v)}
              includedRecordCount={filteredRecordCount}
              filtersRestricted={filtersRestricted}
            />
          ) : null}
        </>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 text-sm">
      <span className="w-32 shrink-0 font-semibold text-zinc-600">{label}:</span>
      <span className="min-w-0 text-zinc-900">{value}</span>
    </div>
  );
}
