import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
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
import { Card } from '../ui/core';
import { cn, formatCurrency } from '../../lib/utils';
import {
  ALL_AUDIT_WARNING_CODES,
  AUDIT_WARNING_LABELS,
  buildProjectAuditReport,
  CONTENT_AUDIT_WARNING_CODES,
  countRecordsWithReportContentIssues,
  countVisibleAuditWarnings,
  createDefaultWarningVisibility,
  filterProjectAuditGroups,
  filterVisibleAuditWarnings,
  getGroupsForMode,
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
import { ProjectAuditFilterControls } from './ProjectAuditFilterControls';
import {
  ProjectAuditNoProjectEmpty,
  ProjectAuditResultsEmptyState,
} from './ProjectAuditEmptyState';
import { ProjectAuditSummaryCards } from './ProjectAuditSummaryCards';
import {
  categoryCodes,
  categorySelectionState,
  ProjectAuditWarningFilterPanel,
} from './ProjectAuditWarningFilters';

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
    return <ProjectAuditNoProjectEmpty />;
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

      <ProjectAuditSummaryCards
        recordsStatUsesFilteredCount={recordsStatUsesFilteredCount}
        visibleRecordCount={visibleRecordCount}
        totalRecordCount={built.summary.recordCount}
        groupCount={filteredGroups.length}
        reportContentIssueCount={reportContentIssueCount}
        facilityCount={built.summary.facilityCount}
        visibleWarningCount={visibleWarningCount}
      />

      <Card className="space-y-4 p-4">
        <ProjectAuditFilterControls
          mode={mode}
          onModeChange={(m) => {
            setMode(m);
            setCollapsed(new Set());
          }}
          facilityFilter={facilityFilter}
          onFacilityFilterChange={setFacilityFilter}
          facilityOptions={built.facilityOptions}
          search={search}
          onSearchChange={setSearch}
          contentIssuesOnly={contentIssuesOnly}
          onContentIssuesOnlyChange={setContentIssuesOnly}
          onExpandAll={expandAll}
          onCollapseAll={collapseAll}
        />

        <ProjectAuditWarningFilterPanel
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
        <ProjectAuditResultsEmptyState message={emptyMessage} isSuccess={emptyStateIsSuccess} />
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
