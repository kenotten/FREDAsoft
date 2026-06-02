import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Card } from '../ui/core';
import { cn } from '../../lib/utils';
import type {
  WebReportReferencedStandardsView,
  WebReportStandardCitationView
} from '../../lib/webReportStandards';

function SectionCollapseToggle({
  expanded,
  onToggle,
  label,
  subtitle
}: {
  expanded: boolean;
  onToggle: () => void;
  label: string;
  subtitle?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center gap-2 rounded-lg py-2 text-left transition-colors hover:bg-zinc-100"
    >
      {expanded ? (
        <ChevronDown size={16} className="shrink-0 text-zinc-500" />
      ) : (
        <ChevronRight size={16} className="shrink-0 text-zinc-500" />
      )}
      <span className="truncate text-sm font-bold uppercase tracking-wide text-zinc-900">{label}</span>
      {subtitle ? (
        <span className="ml-auto shrink-0 text-[10px] font-medium text-zinc-400">{subtitle}</span>
      ) : null}
    </button>
  );
}

function StandardCitationBlock({ citation }: { citation: WebReportStandardCitationView }) {
  return (
    <article
      className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm"
      aria-label={citation.citeTitle}
    >
      <h4 className="font-bold text-zinc-900 text-sm" title={citation.citeTitle}>
        {citation.citeLabel}
        {citation.citationName ? ` ${citation.citationName}` : ''}
      </h4>
      {citation.paragraphs.length > 0 ? (
        <div className="mt-2 space-y-2">
          {citation.paragraphs.map((paragraph, i) => (
            <p key={`${citation.standardId}-p-${i}`} className="text-xs leading-relaxed text-zinc-700">
              {paragraph}
            </p>
          ))}
        </div>
      ) : null}
      {citation.imageUrl ? (
        <div className="mt-3 flex justify-center">
          <img
            src={citation.imageUrl}
            alt={citation.citeTitle}
            className="mx-auto block max-h-96 max-w-full rounded-lg border border-zinc-200 object-contain"
            referrerPolicy="no-referrer"
          />
        </div>
      ) : null}
    </article>
  );
}

export type WebReportStandardsSectionProps = {
  view: WebReportReferencedStandardsView;
  expanded: boolean;
  onToggleExpanded: () => void;
  includedRecordCount: number;
  filtersRestricted: boolean;
};

export function WebReportStandardsSection({
  view,
  expanded,
  onToggleExpanded,
  includedRecordCount,
  filtersRestricted
}: WebReportStandardsSectionProps) {
  const subtitle = view.hasReferencedStandards
    ? `${view.citationCount} citation${view.citationCount === 1 ? '' : 's'}`
    : 'No citations';

  return (
    <div className="space-y-3">
      <Card className="p-4">
        <SectionCollapseToggle
          label="Referenced Standards"
          subtitle={subtitle}
          expanded={expanded}
          onToggle={onToggleExpanded}
        />
        <p className="mt-2 border-t border-zinc-100 pt-2 text-xs leading-relaxed text-zinc-500">
          Citations referenced by the currently included documentation records. Category, location, and
          item filters affect this list. Accordion collapse in Documentation does not change included
          standards.
        </p>
      </Card>

      {expanded ? (
        !view.hasReferencedStandards ? (
          <Card className="p-6 text-center">
            <p className="text-sm text-zinc-700">
              No referenced standards for the currently included records.
            </p>
            {includedRecordCount === 0 ? (
              <p className="mt-1 text-xs text-zinc-500">
                No records are included. Adjust filters or select a project/facility with documentation
                records.
              </p>
            ) : filtersRestricted ? (
              <p className="mt-1 text-xs text-zinc-500">
                Try selecting more categories, locations, or items to include records that reference
                standards.
              </p>
            ) : (
              <p className="mt-1 text-xs text-zinc-500">
                Included records do not reference any standards citations.
              </p>
            )}
          </Card>
        ) : (
          <div className="space-y-6">
            {view.typeGroups.map((group) => (
              <div key={group.key} className="space-y-3">
                <h3 className="border-b border-zinc-200 pb-2 text-base font-bold text-zinc-900">
                  {group.standardType}
                </h3>
                <div className={cn('space-y-4')}>
                  {group.citations.map((citation) => (
                    <StandardCitationBlock key={citation.standardId} citation={citation} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      ) : null}
    </div>
  );
}
