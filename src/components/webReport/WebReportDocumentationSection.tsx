import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button, Card } from '../ui/core';
import type { ReportRecordSortOrder } from '../../lib/reportPreviewShared';
import {
  collectWebReportAccordionNodeIds,
  webReportAccordionLevelIds,
  webReportHierarchyLevelLabels
} from '../../lib/webReportAccordion';
import {
  getCanonicalReportNumber,
  type WebReportItemGroup,
  type WebReportMidGroup,
  type WebReportTopGroup
} from '../../lib/webReportTree';
import { WebReportCollapseToggle } from './WebReportCollapseToggle';
import { WebReportFindingCard } from './WebReportFindingCard';
import {
  resolveFindingSummary,
  resolveRecommendationSummary
} from './webReportRecordSummaries';

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
      <WebReportCollapseToggle
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

export function WebReportDocumentationAccordionToolbar({
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

export function WebReportTopGroupBlock({
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
      <WebReportCollapseToggle
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
