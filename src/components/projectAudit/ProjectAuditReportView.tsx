import React, { useMemo, useState } from 'react';
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
  AUDIT_WARNING_LABELS,
  buildProjectAuditReport,
  CONTENT_AUDIT_WARNING_CODES,
  countAuditWarnings,
  filterProjectAuditGroups,
  getGroupsForMode,
  type AuditMode,
  type AuditWarning,
  type ProjectAuditGroup,
  type ProjectAuditRecordView,
} from '../../lib/projectAuditReport';

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

function WarningBadges({ warnings, compact }: { warnings: AuditWarning[]; compact?: boolean }) {
  if (warnings.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {warnings.map((w, i) => {
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

function RecordRow({ record }: { record: ProjectAuditRecordView }) {
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
          <WarningBadges warnings={record.warnings} compact />
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
            Unit {formatCurrency(record.unitCost)} × Qty {record.qty} ={' '}
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
}: {
  group: ProjectAuditGroup;
  mode: AuditMode;
  expanded: boolean;
  onToggle: () => void;
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
          <WarningBadges warnings={group.warnings} />
        </div>
      </button>
      {expanded && (
        <div className="border-t border-zinc-200 bg-zinc-50/30">
          {group.records.map((r) => (
            <RecordRow key={r.recordId} record={r} />
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

  const filteredGroups = useMemo(
    () =>
      filterProjectAuditGroups(baseGroups, {
        facilityId: facilityFilter,
        search,
        contentIssuesOnly,
      }),
    [baseGroups, facilityFilter, search, contentIssuesOnly]
  );

  const visibleRecordCount = useMemo(
    () => filteredGroups.reduce((n, g) => n + g.recordCount, 0),
    [filteredGroups]
  );

  const visibleWarningCount = useMemo(() => countAuditWarnings(filteredGroups), [filteredGroups]);

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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: contentIssuesOnly ? 'Records (filtered)' : 'Records',
            value: contentIssuesOnly ? visibleRecordCount : built.summary.recordCount,
          },
          { label: 'Groups', value: filteredGroups.length },
          { label: 'Facilities', value: built.summary.facilityCount },
          { label: 'Warnings', value: visibleWarningCount },
        ].map((stat) => (
          <Card key={stat.label} className="px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">{stat.label}</p>
            <p className="text-xl font-black text-zinc-900">{stat.value}</p>
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
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-rose-200 bg-rose-50/80 px-3 py-2 text-xs text-rose-950">
            <input
              type="checkbox"
              checked={contentIssuesOnly}
              onChange={(e) => setContentIssuesOnly(e.target.checked)}
              className="rounded border-rose-300 text-rose-700 focus:ring-rose-500"
            />
            <span className="font-semibold leading-snug">Only blank finding/recommendation text</span>
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
            Showing groups with at least one record where saved finding or recommendation snapshot text
            (short or long) is blank. Metadata-only issues are hidden until this filter is off.
          </p>
        ) : null}
      </Card>

      {filteredGroups.length === 0 ? (
        <Card className="p-12 text-center text-zinc-500">
          <p className="text-sm">
            {built.summary.recordCount === 0
              ? 'No active project records for this project.'
              : contentIssuesOnly
                ? 'No records with blank finding or recommendation snapshot text match the current filters.'
                : 'No groups match the current filters.'}
          </p>
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
            />
          ))}
        </div>
      )}
    </div>
  );
}
