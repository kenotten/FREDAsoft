import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, ClipboardCheck, Search } from 'lucide-react';
import type {
  Category,
  Facility,
  Finding,
  Glossary,
  Item,
  Location,
  MasterRecommendation,
  MasterStandard,
  Project,
  ProjectData,
} from '../../types';
import { Button, Card, Select } from '../ui/core';
import { cn, formatCurrency } from '../../lib/utils';
import {
  ALL_AUDIT_WARNING_CODES,
  AUDIT_WARNING_CATEGORIES,
  AUDIT_WARNING_CATEGORY_ORDER,
  AUDIT_WARNING_LABELS,
  buildProjectAuditReport,
  CONTENT_AUDIT_WARNING_CODES,
  countRecordsWithReportContentIssues,
  countVisibleAuditWarnings,
  createDefaultWarningVisibility,
  filterProjectAuditGroups,
  filterVisibleAuditWarnings,
  getGroupsForMode,
  isWarningCodeFilterAtDefault,
  isWarningTypeRecordFilterActive,
  type AuditMode,
  type AuditWarning,
  type AuditWarningCategoryId,
  type AuditWarningCode,
  type ProjectAuditGroup,
  type ProjectAuditRecordView,
  type ProjectAuditWarningVisibility,
} from '../../lib/projectAuditReport';
import {
  createDefaultProjectAuditProjectState,
  loadProjectAuditStateForProject,
  reconcileCollapsedGroupKeys,
  reconcileProjectAuditProjectState,
  saveProjectAuditStateForProject,
} from '../../lib/projectAuditSessionState';

export type ProjectAuditReportViewProps = {
  projectId: string;
  project: Project | null;
  projectData: ProjectData[];
  facilities: Facility[];
  locations: Location[];
  categories: Category[];
  items: Item[];
  glossary: Glossary[];
  findings: Finding[];
  resolvableFindings: Finding[];
  masterRecommendations: MasterRecommendation[];
  resolvableMasterRecommendations: MasterRecommendation[];
  standards: MasterStandard[];
};

function WarningBadges({
  warnings,
  compact,
  visibility,
  record,
  group,
  context,
}: {
  warnings: AuditWarning[];
  compact?: boolean;
  visibility: ProjectAuditWarningVisibility;
  record?: ProjectAuditRecordView | null;
  group?: ProjectAuditGroup | null;
  context: 'record' | 'group';
}) {
  const visible = filterVisibleAuditWarnings(warnings, context, record ?? null, group ?? null, visibility);
  if (visible.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((w, i) => {
        const isContent = CONTENT_AUDIT_WARNING_CODES.has(w.code);
        return (
          <span
            key={`${w.code}-${i}`}
            title={w.message}
            className={cn(
              'inline-flex rounded border font-semibold',
              isContent
                ? 'border-rose-400 bg-rose-100 text-rose-950'
                : 'border-amber-200 bg-amber-50 text-amber-900',
              compact
                ? 'px-1 py-0 text-[8px] font-bold uppercase tracking-wide'
                : 'px-1.5 py-0.5 text-[9px]'
            )}
          >
            {AUDIT_WARNING_LABELS[w.code] || w.code}
          </span>
        );
      })}
    </div>
  );
}

function RecordRow({
  record,
  visibility,
}: {
  record: ProjectAuditRecordView;
  visibility: ProjectAuditWarningVisibility;
}) {
  return (
    <div className="border-t border-zinc-100 bg-white px-4 py-3 text-xs">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <div className="font-mono text-[10px] text-zinc-400" title={record.recordId}>
          {record.recordId}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-zinc-600">
            {record.recordSource}
          </span>
          <WarningBadges
            warnings={record.warnings}
            compact
            visibility={visibility}
            record={record}
            group={null}
            context="record"
          />
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">Facility</p>
          <p className="font-medium text-zinc-800">{record.facilityLabel}</p>
        </div>
        <div>
          <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">Location</p>
          <p className="text-zinc-700">{record.locationLabel}</p>
        </div>
        <div>
          <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">Category</p>
          <p className="text-zinc-700">{record.categoryLabel}</p>
        </div>
        <div>
          <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">Item</p>
          <p className="text-zinc-700">{record.itemLabel}</p>
        </div>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">Finding (snapshot)</p>
          <p className="font-semibold text-zinc-900">{record.findShort || '—'}</p>
          <p className="mt-1 whitespace-pre-wrap text-zinc-600 leading-relaxed">{record.findLong || '—'}</p>
          {record.findingId ? (
            <p className="mt-1 font-mono text-[9px] text-zinc-400">ID: {record.findingId}</p>
          ) : null}
        </div>
        <div>
          <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">Recommendation (snapshot)</p>
          <p className="font-semibold text-zinc-900">{record.recShort || '—'}</p>
          <p className="mt-1 whitespace-pre-wrap text-zinc-600 leading-relaxed">{record.recLong || '—'}</p>
          {record.recommendationId ? (
            <p className="mt-1 font-mono text-[9px] text-zinc-400">ID: {record.recommendationId}</p>
          ) : null}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">Cost (raw saved)</p>
          <p className="text-zinc-800">
            Unit {record.unitCost !== null ? formatCurrency(record.unitCost) : '—'} × Qty {record.qty} ={' '}
            <span className="font-semibold">{formatCurrency(record.totalCost)}</span>
          </p>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">Citations</p>
          <p className="text-zinc-700" title={record.citationIds.join(', ')}>
            {record.citationLabels}
          </p>
          {record.citationIds.length > 0 ? (
            <p className="mt-0.5 font-mono text-[9px] text-zinc-400">{record.citationIds.join(', ')}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function AuditGroupPanel({
  group,
  mode,
  expanded,
  onToggle,
  visibility,
}: {
  group: ProjectAuditGroup;
  mode: AuditMode;
  expanded: boolean;
  onToggle: () => void;
  visibility: ProjectAuditWarningVisibility;
}) {
  const title =
    mode === 'finding'
      ? group.masterShort || group.masterId || 'Unassigned finding'
      : group.masterShort || group.masterId || 'Unassigned recommendation';

  const costSummary =
    group.distinctTotalCosts.length === 0
      ? '—'
      : group.distinctTotalCosts.length === 1
        ? formatCurrency(group.distinctTotalCosts[0])
        : `${formatCurrency(group.costMin ?? 0)} – ${formatCurrency(group.costMax ?? 0)} (${group.distinctTotalCosts.length} values)`;

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50/50">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start gap-2 px-4 py-3 text-left hover:bg-zinc-100/80 transition-colors"
      >
        {expanded ? (
          <ChevronDown size={16} className="mt-0.5 shrink-0 text-zinc-500" />
        ) : (
          <ChevronRight size={16} className="mt-0.5 shrink-0 text-zinc-500" />
        )}
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-sm font-bold text-zinc-900">{title}</p>
              {group.masterId ? (
                <p className="font-mono text-[10px] text-zinc-400">{group.masterId}</p>
              ) : null}
            </div>
            <span className="shrink-0 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-black text-indigo-800">
              {group.recordCount} record{group.recordCount === 1 ? '' : 's'}
            </span>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-zinc-600">
            <span>
              <span className="font-semibold text-zinc-500">Facilities:</span>{' '}
              {group.facilityLabels.join(', ') || '—'}
            </span>
            <span>
              <span className="font-semibold text-zinc-500">Cost:</span> {costSummary}
            </span>
            <span>
              <span className="font-semibold text-zinc-500">Citation sets:</span> {group.citationSets.length}
            </span>
            <span>
              <span className="font-semibold text-zinc-500">
                {mode === 'finding' ? 'Recs' : 'Findings'}:
              </span>{' '}
              {group.pairedIds.length || '—'}
            </span>
          </div>
          {group.citationSets.length > 0 && (
            <p className="text-[10px] text-zinc-500 line-clamp-2" title={group.citationSets.map((c) => c.labels).join(' | ')}>
              {group.citationSets.map((c) => `${c.recordCount}× ${c.labels || '(none)'}`).join(' · ')}
            </p>
          )}
          <WarningBadges
            warnings={group.warnings}
            visibility={visibility}
            group={group}
            context="group"
          />
        </div>
      </button>
      {expanded && (
        <div className="border-t border-zinc-200 bg-zinc-50/30">
          {group.records.map((r) => (
            <RecordRow key={r.recordId} record={r} visibility={visibility} />
          ))}
        </div>
      )}
    </div>
  );
}

function categoryCodes(categoryId: AuditWarningCategoryId): readonly AuditWarningCode[] {
  return AUDIT_WARNING_CATEGORIES[categoryId].codes;
}

function categorySelectionState(
  categoryId: AuditWarningCategoryId,
  enabledCodes: ReadonlySet<AuditWarningCode>
): 'all' | 'none' | 'partial' {
  const codes = categoryCodes(categoryId);
  const enabled = codes.filter((c) => enabledCodes.has(c)).length;
  if (enabled === 0) return 'none';
  if (enabled === codes.length) return 'all';
  return 'partial';
}

function WarningFilterPanel({
  enabledCodes,
  hideCustomLinkageNoise,
  warningPanelOpen,
  warningCodesCleared,
  onTogglePanel,
  onSelectAll,
  onClearAll,
  onResetDefaults,
  onToggleCategory,
  onToggleCode,
  onHideCustomLinkageNoiseChange,
}: {
  enabledCodes: ReadonlySet<AuditWarningCode>;
  hideCustomLinkageNoise: boolean;
  warningPanelOpen: boolean;
  warningCodesCleared: boolean;
  onTogglePanel: () => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  onResetDefaults: () => void;
  onToggleCategory: (categoryId: AuditWarningCategoryId) => void;
  onToggleCode: (code: AuditWarningCode) => void;
  onHideCustomLinkageNoiseChange: (checked: boolean) => void;
}) {
  return (
    <div className="border-t border-zinc-200 pt-4">
      <button
        type="button"
        onClick={onTogglePanel}
        className="flex w-full items-center gap-2 text-left text-xs font-bold uppercase tracking-wide text-zinc-500 hover:text-zinc-800"
      >
        {warningPanelOpen ? (
          <ChevronDown size={14} className="shrink-0" />
        ) : (
          <ChevronRight size={14} className="shrink-0" />
        )}
        Warning filters
        {isWarningTypeRecordFilterActive({ enabledCodes, hideCustomLinkageNoise: false }) ||
        hideCustomLinkageNoise ? (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-black normal-case text-amber-900">
            Active
          </span>
        ) : warningCodesCleared ? (
          <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[9px] font-black normal-case text-zinc-700">
            Badges hidden
          </span>
        ) : null}
      </button>

      {warningPanelOpen ? (
        <div className="mt-3 space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={onSelectAll}>
              Select all
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={onClearAll}>
              Clear all
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={onResetDefaults}>
              Reset defaults
            </Button>
          </div>

          <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-zinc-200 bg-zinc-50/80 px-3 py-2 text-xs text-zinc-800">
            <input
              type="checkbox"
              checked={hideCustomLinkageNoise}
              onChange={(e) => onHideCustomLinkageNoiseChange(e.target.checked)}
              className="mt-0.5 rounded border-zinc-300"
            />
            <span className="leading-snug">
              <span className="font-semibold">Hide expected custom/unassigned noise</span>
              <span className="mt-0.5 block text-[10px] text-zinc-500">
                Hides expected metadata badges on custom records with report snapshots (IDs, glossary row,
                missing masters), and group consistency badges on Unassigned groups. Report-content
                warnings are never hidden. Warnings are still generated.
              </span>
            </span>
          </label>

          <div className="flex flex-wrap gap-2">
            {AUDIT_WARNING_CATEGORY_ORDER.map((categoryId) => {
              const cat = AUDIT_WARNING_CATEGORIES[categoryId];
              const state = categorySelectionState(categoryId, enabledCodes);
              return (
                <button
                  key={categoryId}
                  type="button"
                  onClick={() => onToggleCategory(categoryId)}
                  className={cn(
                    'rounded-lg border px-2.5 py-1 text-[10px] font-bold transition-colors',
                    state === 'all'
                      ? categoryId === 'report_content'
                        ? 'border-rose-300 bg-rose-50 text-rose-950'
                        : 'border-amber-300 bg-amber-50 text-amber-950'
                      : state === 'partial'
                        ? 'border-zinc-300 bg-zinc-100 text-zinc-700'
                        : 'border-zinc-200 bg-white text-zinc-500'
                  )}
                  title={`Toggle all ${cat.label} warning types`}
                >
                  {cat.label}
                  {state === 'partial' ? ' (partial)' : ''}
                </button>
              );
            })}
          </div>

          {warningCodesCleared ? (
            <p className="text-[11px] leading-snug text-amber-900">
              All warning types are unchecked — warning badges are hidden. Records and groups are still
              shown. Use Select all or Reset defaults to restore badges.
            </p>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {AUDIT_WARNING_CATEGORY_ORDER.map((categoryId) => {
              const cat = AUDIT_WARNING_CATEGORIES[categoryId];
              return (
                <fieldset
                  key={categoryId}
                  className={cn(
                    'rounded-lg border p-3',
                    categoryId === 'report_content' ? 'border-rose-200 bg-rose-50/30' : 'border-zinc-200'
                  )}
                >
                  <legend className="px-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    {cat.label}
                  </legend>
                  <ul className="mt-2 space-y-1.5">
                    {cat.codes.map((code) => (
                      <li key={code}>
                        <label className="flex cursor-pointer items-start gap-2 text-xs text-zinc-800">
                          <input
                            type="checkbox"
                            checked={enabledCodes.has(code)}
                            onChange={() => onToggleCode(code)}
                            className={cn(
                              'mt-0.5 rounded',
                              CONTENT_AUDIT_WARNING_CODES.has(code)
                                ? 'border-rose-300 text-rose-700'
                                : 'border-zinc-300'
                            )}
                          />
                          <span className="leading-snug">{AUDIT_WARNING_LABELS[code] || code}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </fieldset>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function ProjectAuditReportView({
  projectId,
  project,
  projectData,
  facilities,
  locations,
  categories,
  items,
  glossary,
  findings,
  resolvableFindings,
  masterRecommendations,
  resolvableMasterRecommendations,
  standards,
}: ProjectAuditReportViewProps) {
  const [mode, setMode] = useState<AuditMode>('finding');
  const [facilityFilter, setFacilityFilter] = useState('__all__');
  const [search, setSearch] = useState('');
  const [contentIssuesOnly, setContentIssuesOnly] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [enabledCodes, setEnabledCodes] = useState<Set<AuditWarningCode>>(
    () => new Set(ALL_AUDIT_WARNING_CODES)
  );
  const [hideCustomLinkageNoise, setHideCustomLinkageNoise] = useState(false);
  const [warningPanelOpen, setWarningPanelOpen] = useState(false);

  const hydratedProjectIdRef = useRef<string | null>(null);

  const warningVisibility = useMemo<ProjectAuditWarningVisibility>(
    () => ({ enabledCodes, hideCustomLinkageNoise }),
    [enabledCodes, hideCustomLinkageNoise]
  );

  const built = useMemo(
    () =>
      buildProjectAuditReport({
        projectId,
        projectData,
        facilities,
        locations,
        categories,
        items,
        glossary,
        findings,
        resolvableFindings,
        masterRecommendations,
        resolvableMasterRecommendations,
        standards,
      }),
    [
      projectId,
      projectData,
      facilities,
      locations,
      categories,
      items,
      glossary,
      findings,
      resolvableFindings,
      masterRecommendations,
      resolvableMasterRecommendations,
      standards,
    ]
  );

  const baseGroups = useMemo(() => getGroupsForMode(built, mode), [built, mode]);

  const persistableGroupKeys = useMemo(
    () => new Set(baseGroups.map((g) => g.groupKey)),
    [baseGroups]
  );

  useEffect(() => {
    const pid = String(projectId || '').trim();
    if (!pid) {
      hydratedProjectIdRef.current = null;
      return;
    }
    if (hydratedProjectIdRef.current === pid) return;

    const saved = loadProjectAuditStateForProject(pid);
    const facilityIds = built.facilityOptions.map((o) => o.id);
    const base = saved
      ? reconcileProjectAuditProjectState(saved, facilityIds)
      : createDefaultProjectAuditProjectState();
    const groupKeys = new Set(getGroupsForMode(built, base.mode).map((g) => g.groupKey));

    setMode(base.mode);
    setFacilityFilter(base.facilityFilter);
    setSearch(base.search);
    setContentIssuesOnly(base.contentIssuesOnly);
    setWarningPanelOpen(base.warningPanelOpen);
    setEnabledCodes(new Set(base.enabledCodes));
    setHideCustomLinkageNoise(base.hideCustomLinkageNoise);
    setCollapsed(new Set(reconcileCollapsedGroupKeys(base.collapsedGroupKeys, groupKeys)));

    hydratedProjectIdRef.current = pid;
    // Hydrate once per project selection; `built` reflects the active project on switch.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: do not re-hydrate when built updates in-place
  }, [projectId]);

  useEffect(() => {
    const pid = String(projectId || '').trim();
    if (!pid || hydratedProjectIdRef.current !== pid) return;

    saveProjectAuditStateForProject(pid, {
      mode,
      facilityFilter,
      search,
      contentIssuesOnly,
      warningPanelOpen,
      enabledCodes,
      hideCustomLinkageNoise,
      collapsedGroupKeys: reconcileCollapsedGroupKeys(collapsed, persistableGroupKeys),
    });
  }, [
    projectId,
    mode,
    facilityFilter,
    search,
    contentIssuesOnly,
    warningPanelOpen,
    enabledCodes,
    hideCustomLinkageNoise,
    collapsed,
    persistableGroupKeys,
  ]);

  const scopedGroups = useMemo(
    () =>
      filterProjectAuditGroups(baseGroups, {
        facilityId: facilityFilter,
        search,
        contentIssuesOnly: false,
      }),
    [baseGroups, facilityFilter, search]
  );

  const filteredGroups = useMemo(
    () =>
      filterProjectAuditGroups(baseGroups, {
        facilityId: facilityFilter,
        search,
        contentIssuesOnly,
        warningVisibility,
      }),
    [baseGroups, facilityFilter, search, contentIssuesOnly, warningVisibility]
  );

  const visibleRecordCount = useMemo(
    () => filteredGroups.reduce((n, g) => n + g.recordCount, 0),
    [filteredGroups]
  );

  const reportContentIssueCount = useMemo(
    () => countRecordsWithReportContentIssues(scopedGroups),
    [scopedGroups]
  );

  const visibleWarningCount = useMemo(
    () => countVisibleAuditWarnings(filteredGroups, warningVisibility),
    [filteredGroups, warningVisibility]
  );

  const recordsStatUsesFilteredCount = useMemo(
    () => contentIssuesOnly || isWarningTypeRecordFilterActive(warningVisibility),
    [contentIssuesOnly, warningVisibility]
  );

  const warningCodesCleared = enabledCodes.size === 0;

  const allGroupKeys = useMemo(() => filteredGroups.map((g) => g.groupKey), [filteredGroups]);

  const expandAll = () => setCollapsed(new Set());
  const collapseAll = () => setCollapsed(new Set(allGroupKeys));

  const toggleGroup = (key: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSelectAllWarnings = useCallback(() => {
    setEnabledCodes(new Set(ALL_AUDIT_WARNING_CODES));
  }, []);

  const handleClearAllWarnings = useCallback(() => {
    setEnabledCodes(new Set());
  }, []);

  const handleResetWarningDefaults = useCallback(() => {
    const defaults = createDefaultWarningVisibility();
    setEnabledCodes(new Set(defaults.enabledCodes));
    setHideCustomLinkageNoise(defaults.hideCustomLinkageNoise);
  }, []);

  const handleToggleCategory = useCallback((categoryId: AuditWarningCategoryId) => {
    const codes = categoryCodes(categoryId);
    setEnabledCodes((prev) => {
      const next = new Set(prev);
      const state = categorySelectionState(categoryId, prev);
      if (state === 'all') {
        for (const code of codes) next.delete(code);
      } else {
        for (const code of codes) next.add(code);
      }
      return next;
    });
  }, []);

  const handleToggleCode = useCallback((code: AuditWarningCode) => {
    setEnabledCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }, []);

  const emptyMessage = useMemo(() => {
    if (built.summary.recordCount === 0) {
      return 'No active project records for this project.';
    }
    if (contentIssuesOnly) {
      if (reportContentIssueCount === 0) {
        return 'No report content issues found for the current facility and search scope.';
      }
      return 'No records with report content issues match the current facility or search filters.';
    }
    if (isWarningTypeRecordFilterActive(warningVisibility)) {
      return 'No records or groups have any of the selected warning types in the current scope.';
    }
    if (facilityFilter !== '__all__' || search.trim()) {
      return 'No groups match the current facility or search filters.';
    }
    return 'No groups to show.';
  }, [
    built.summary.recordCount,
    contentIssuesOnly,
    reportContentIssueCount,
    warningVisibility,
    facilityFilter,
    search,
  ]);

  const emptyStateIsSuccess =
    contentIssuesOnly && built.summary.recordCount > 0 && reportContentIssueCount === 0;

  if (!projectId) {
    return (
      <div className="mx-auto max-w-4xl py-12 text-center text-zinc-500">
        <ClipboardCheck size={40} className="mx-auto mb-4 opacity-20" />
        <p className="text-sm font-medium">Select a project to open Project Audit.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Project Audit</h1>
        <p className="text-zinc-500">{project?.fldProjName || projectId}</p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-snug text-slate-800">
        <span className="font-semibold">Internal Project Audit — read-only.</span> This view does not change
        project data or client reports. Costs shown are raw saved values (no cost multiplier applied).
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {[
          {
            label: recordsStatUsesFilteredCount ? 'Records (filtered)' : 'Records',
            value: recordsStatUsesFilteredCount ? visibleRecordCount : built.summary.recordCount,
          },
          { label: 'Groups', value: filteredGroups.length },
          {
            label: 'Report content issues',
            value: reportContentIssueCount,
            highlight: reportContentIssueCount > 0,
          },
          { label: 'Facilities', value: built.summary.facilityCount },
          { label: 'Warnings', value: visibleWarningCount },
        ].map((stat) => (
          <Card key={stat.label} className="px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">{stat.label}</p>
            <p
              className={cn(
                'text-xl font-black',
                'highlight' in stat && stat.highlight ? 'text-rose-700' : 'text-zinc-900'
              )}
            >
              {stat.value}
            </p>
          </Card>
        ))}
      </div>

      <Card className="space-y-4 p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex rounded-lg border border-zinc-200 p-0.5">
            {(['finding', 'recommendation'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  setCollapsed(new Set());
                }}
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
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFacilityFilter(e.target.value)}
              options={built.facilityOptions.map((o) => ({ value: o.id, label: o.label }))}
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
                onChange={(e) => setSearch(e.target.value)}
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
              onChange={(e) => setContentIssuesOnly(e.target.checked)}
              className="rounded border-rose-300 text-rose-700 focus:ring-rose-500"
            />
            <span className="font-semibold leading-snug">Report content issues only</span>
          </label>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={expandAll}>
              Expand all
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={collapseAll}>
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

        <WarningFilterPanel
          enabledCodes={enabledCodes}
          hideCustomLinkageNoise={hideCustomLinkageNoise}
          warningPanelOpen={warningPanelOpen}
          warningCodesCleared={warningCodesCleared}
          onTogglePanel={() => setWarningPanelOpen((o) => !o)}
          onSelectAll={handleSelectAllWarnings}
          onClearAll={handleClearAllWarnings}
          onResetDefaults={handleResetWarningDefaults}
          onToggleCategory={handleToggleCategory}
          onToggleCode={handleToggleCode}
          onHideCustomLinkageNoiseChange={setHideCustomLinkageNoise}
        />

        {isWarningTypeRecordFilterActive(warningVisibility) && !contentIssuesOnly ? (
          <p className="text-[11px] leading-snug text-amber-900">
            Warning type filters are active. Groups and records must match at least one enabled warning
            type (after custom/unassigned noise suppression). Underlying warnings are unchanged.
          </p>
        ) : warningCodesCleared ? (
          <p className="text-[11px] leading-snug text-amber-900">
            All warning types are unchecked — badges are hidden; records and groups are unchanged. Select
            all or Reset defaults to restore badges.
          </p>
        ) : hideCustomLinkageNoise ? (
          <p className="text-[11px] leading-snug text-zinc-600">
            Expected custom-record linkage and unassigned-group consistency warning badges are hidden.
            Underlying warnings are unchanged.
          </p>
        ) : null}
      </Card>

      {filteredGroups.length === 0 ? (
        <Card
          className={cn(
            'p-12 text-center',
            emptyStateIsSuccess ? 'border-emerald-200 bg-emerald-50/50 text-emerald-800' : 'text-zinc-500'
          )}
        >
          <p className={cn('text-sm', emptyStateIsSuccess && 'font-medium')}>{emptyMessage}</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredGroups.map((group) => (
            <AuditGroupPanel
              key={group.groupKey}
              group={group}
              mode={mode}
              expanded={!collapsed.has(group.groupKey)}
              onToggle={() => toggleGroup(group.groupKey)}
              visibility={warningVisibility}
            />
          ))}
        </div>
      )}
    </div>
  );
}
