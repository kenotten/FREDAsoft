import React, { useEffect, useMemo, useState } from 'react';
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
  facilitiesForProject,
  getCanonicalReportNumber,
  getWebReportFacilityRecords,
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

export type WebReportSectionInclusion = {
  narrative: boolean;
  documentation: boolean;
};

const DEFAULT_SECTION_INCLUSION: WebReportSectionInclusion = {
  narrative: true,
  documentation: true
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
      <div className="flex flex-col md:flex-row">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-stretch border-b border-zinc-200 bg-zinc-50 text-[10px] font-bold uppercase tracking-wider">
            <div className="flex w-10 shrink-0 items-center justify-center border-r border-zinc-200 text-lg font-black text-zinc-900">
              {reportNumber ?? '—'}
            </div>
            <div className="grid min-w-0 flex-1 grid-cols-2 gap-px bg-zinc-200">
              <div className="flex bg-white">
                <span className="w-20 shrink-0 border-r border-zinc-200 px-2 py-1.5 text-zinc-500">Category</span>
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

          <div className="flex border-b border-zinc-200 text-xs">
            <span className="w-24 shrink-0 border-r border-zinc-200 bg-zinc-50 px-2 py-2 font-bold uppercase text-[9px] text-zinc-500">
              Location
            </span>
            <span className="min-w-0 flex-1 truncate px-2 py-2 font-medium text-zinc-900">
              {view.locationName}
            </span>
            <span className="shrink-0 px-3 py-2 text-xs font-bold text-blue-600">
              Est. {formatCurrency(record.totalCost ?? 0)}
            </span>
          </div>

          <div className="flex border-b border-zinc-200">
            <span className="w-24 shrink-0 border-r border-zinc-200 bg-zinc-50 px-2 py-2 text-[9px] font-bold uppercase text-zinc-500">
              Finding
            </span>
            <div className="min-w-0 flex-1 px-2 py-2 text-[11px] leading-snug text-zinc-800 whitespace-pre-line">
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

          <div className="flex border-b border-zinc-200">
            <span className="w-24 shrink-0 border-r border-zinc-200 bg-zinc-50 px-2 py-2 text-[9px] font-bold uppercase text-zinc-500">
              Recommendation
            </span>
            <div className="min-w-0 flex-1 px-2 py-2 text-[11px] leading-snug text-zinc-800 whitespace-pre-line">
              {record.fldRecLong || record.fldRecShort}
            </div>
          </div>

          {view.citationsLabel ? (
            <div className="flex">
              <span className="w-24 shrink-0 border-r border-zinc-200 bg-zinc-50 px-2 py-2 text-[9px] font-bold uppercase text-zinc-500">
                Reference
              </span>
              <div className="min-w-0 flex-1 px-2 py-2 text-xs font-semibold text-zinc-700">
                {view.citationsLabel}
              </div>
            </div>
          ) : null}
        </div>

        {images.length > 0 ? (
          <div className="flex w-full shrink-0 flex-row gap-px bg-zinc-900 md:w-44 md:flex-col">
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
  defaultFacilityId
}: WebReportViewerProps) {
  const [localProjectId, setLocalProjectId] = useState(defaultProjectId);
  const [localFacilityId, setLocalFacilityId] = useState(defaultFacilityId);
  const [sortOrder, setSortOrder] = useState<ReportRecordSortOrder>('category_location_item');
  const [sectionInclusion, setSectionInclusion] = useState<WebReportSectionInclusion>(
    DEFAULT_SECTION_INCLUSION
  );
  const [collapsedKeys, setCollapsedKeys] = useState<Set<string>>(new Set());
  const [narrativeExpanded, setNarrativeExpanded] = useState(true);
  const [documentationExpanded, setDocumentationExpanded] = useState(true);
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

  const facilityOptions = useMemo(() => {
    if (!selectedProject) return [];
    return facilitiesForProject(selectedProject, facilities);
  }, [selectedProject, facilities]);

  useEffect(() => {
    if (!selectedProject) return;
    const valid = facilityOptions.some((f) => f.fldFacID === localFacilityId);
    if (!valid && facilityOptions.length > 0) {
      setLocalFacilityId(facilityOptions[0].fldFacID);
    }
  }, [selectedProject, facilityOptions, localFacilityId]);

  const selectedFacility = useMemo(
    () => facilityOptions.find((f) => f.fldFacID === localFacilityId) || null,
    [facilityOptions, localFacilityId]
  );

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
    if (!selectedProject || !selectedFacility || !dataInScope) return [];
    return getWebReportFacilityRecords(
      activeProjectData,
      selectedProject,
      selectedFacility,
      glossary,
      categories,
      items,
      locations,
      findings
    );
  }, [
    activeProjectData,
    selectedProject,
    selectedFacility,
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

  const filterScopeKey = useMemo(() => {
    if (!localProjectId || !localFacilityId) return '';
    return [
      localProjectId,
      localFacilityId,
      filterOptions.categories.map((o) => o.id).join('\0'),
      filterOptions.locations.map((o) => o.id).join('\0'),
      filterOptions.items.map((o) => o.id).join('\0')
    ].join('|');
  }, [localProjectId, localFacilityId, filterOptions]);

  useEffect(() => {
    setRecordInclusionOverride(null);
  }, [filterScopeKey]);

  const defaultRecordInclusion = useMemo(
    () => createDefaultWebReportRecordInclusion(filterOptions),
    [filterOptions]
  );

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
    if (!selectedProject || !selectedFacility || !dataInScope) {
      return new Map<string, number>();
    }
    return buildCanonicalReportNumberMap(
      activeProjectData,
      selectedProject,
      selectedFacility,
      glossary,
      categories,
      items,
      locations,
      findings
    );
  }, [
    activeProjectData,
    selectedProject,
    selectedFacility,
    dataInScope,
    glossary,
    categories,
    items,
    locations,
    findings
  ]);

  const documentationTree = useMemo(() => {
    if (!selectedProject || !selectedFacility || !dataInScope) return null;
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
    selectedFacility,
    dataInScope,
    glossary,
    categories,
    items,
    locations,
    findings,
    standards,
    sortOrder
  ]);

  const resolveInclusionForUpdate = (): WebReportRecordInclusion =>
    cloneWebReportRecordInclusion(recordInclusionOverride ?? defaultRecordInclusion);

  const updateRecordInclusion = (mutate: (inclusion: WebReportRecordInclusion) => void) => {
    const next = resolveInclusionForUpdate();
    mutate(next);
    setRecordInclusionOverride(next);
  };

  const resetContentFilters = () => setRecordInclusionOverride(null);

  const narrativeText = useMemo(() => {
    if (!selectedProject || !selectedFacility) return '';
    return resolveFacilityReportNarrative(selectedProject, selectedFacility.fldFacID);
  }, [selectedProject, selectedFacility]);

  const accordionNodeIds = useMemo(
    () => collectWebReportAccordionNodeIds(documentationTree),
    [documentationTree]
  );

  useEffect(() => {
    setCollapsedKeys((prev) => reconcileWebReportCollapsedKeys(prev, accordionNodeIds));
  }, [accordionNodeIds]);

  const toggleCollapsed = (key: string) => {
    setCollapsedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
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
        <p className="mt-3 text-xs text-zinc-500">
          Pilot QA: Harris Center → Accessibility Assessment → Admin Building (select by name; IDs are not hardcoded).
        </p>
      </div>

      <Card className="space-y-4 border-dashed bg-zinc-50/80 p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Select
            label="Project"
            value={localProjectId}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setLocalProjectId(e.target.value)}
            options={projectOptions}
            placeholder="Select project…"
          />
          <Select
            label="Facility"
            value={localFacilityId}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setLocalFacilityId(e.target.value)}
            options={facilityOptions.map((f) => ({
              value: f.fldFacID,
              label: f.fldFacName,
              key: `wr-fac-${f.fldFacID}`
            }))}
            placeholder={selectedProject ? 'Select facility…' : 'Select a project first'}
            disabled={!selectedProject || facilityOptions.length === 0}
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
                onChange={() => setSortOrder('category_location_item')}
                className="h-4 w-4 border-zinc-300 text-indigo-600"
              />
              Category → Location → Item
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-800">
              <input
                type="radio"
                name="web-report-sort"
                checked={sortOrder === 'location_category_item'}
                onChange={() => setSortOrder('location_category_item')}
                className="h-4 w-4 border-zinc-300 text-indigo-600"
              />
              Location → Category → Item
            </label>
          </div>
        </div>

        {dataInScope && selectedProject && selectedFacility ? (
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
          </ul>
        </div>
      </Card>

      {!selectedProject || !selectedFacility ? (
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
                <InfoRow label="Facility" value={selectedFacility.fldFacName} />
                <InfoRow
                  label="Address"
                  value={
                    [selectedFacility.fldFacAddress, selectedFacility.fldFacCity, selectedFacility.fldFacState]
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
                    selectedFacility.fldInspectionDate || selectedProject.fldPDDate
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
                      onExpandAll={() => setCollapsedKeys(applyWebReportAccordionExpandAll())}
                      onCollapseAll={() =>
                        setCollapsedKeys(applyWebReportAccordionCollapseAll(accordionNodeIds))
                      }
                      onExpandLevel={(level) =>
                        setCollapsedKeys((prev) =>
                          applyWebReportAccordionExpandLevel(
                            prev,
                            webReportAccordionLevelIds(accordionNodeIds, level)
                          )
                        )
                      }
                      onCollapseLevel={(level) =>
                        setCollapsedKeys((prev) =>
                          applyWebReportAccordionCollapseLevel(
                            prev,
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
