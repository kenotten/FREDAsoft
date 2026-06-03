import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button, Card } from '../ui/core';
import { formatCurrency } from '../../lib/utils';
import {
  collectWebReportFinancialParentKeys,
  type WebReportFinancialParentGroup,
  type WebReportFinancialSummary
} from '../../lib/webReportFinancial';

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

export function WebReportFinancialTable({
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
