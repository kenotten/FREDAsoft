import React from 'react';
import { Card } from '../ui/core';
import { cn } from '../../lib/utils';

export function ProjectAuditSummaryCards({
  recordsStatUsesFilteredCount,
  visibleRecordCount,
  totalRecordCount,
  groupCount,
  reportContentIssueCount,
  facilityCount,
  visibleWarningCount,
}: {
  recordsStatUsesFilteredCount: boolean;
  visibleRecordCount: number;
  totalRecordCount: number;
  groupCount: number;
  reportContentIssueCount: number;
  facilityCount: number;
  visibleWarningCount: number;
}) {
  const stats = [
    {
      label: recordsStatUsesFilteredCount ? 'Records (filtered)' : 'Records',
      value: recordsStatUsesFilteredCount ? visibleRecordCount : totalRecordCount,
    },
    { label: 'Groups', value: groupCount },
    {
      label: 'Report content issues',
      value: reportContentIssueCount,
      highlight: reportContentIssueCount > 0,
    },
    { label: 'Facilities', value: facilityCount },
    { label: 'Warnings', value: visibleWarningCount },
  ] as const;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {stats.map((stat) => (
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
  );
}
