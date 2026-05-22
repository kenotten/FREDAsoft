import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BookMarked, ChevronRight, FileSearch, ListTree, Search, Shield } from 'lucide-react';
import type { Category, Finding, Glossary, Item, MasterRecommendation, MasterStandard } from '../types';
import { cn } from '../lib/utils';
import {
  buildGlossaryHierarchyReport,
  buildGlossarySetMetadataAuditReport,
  buildStandardsAssociationsCatItemReport,
  buildStandardsAssociationsReport,
  filterGlossarySetMetadataAuditReport,
  filterStandardsAssociationsCatItemGroups,
  filterStandardsAssociationsGroups,
  GLOSSARY_SET_METADATA_AUDIT_STATUS_LABELS,
  GLOSSARY_SET_METADATA_AUDIT_STATUS_ORDER,
  standardsAssocCitationHasAssociations,
  type GlossaryHierarchySetGroup,
  type GlossarySetAssociationStatus,
  type GlossarySetMetadataAuditReport,
  type GlossarySetMetadataAuditRow,
  type GlossarySetMetadataAuditStatus,
  type StandardsAssocCatItemSetGroup,
  type StandardsAssocFindingRow,
  type StandardsAssocRecommendationRow,
  type StandardsAssocSetGroup,
  type StandardsAssocStandardNode,
  type StandardsAssocViewMode,
} from '../lib/libraryReportsModel';
import {
  collectGlossaryExpandedKeys,
  collectGlossarySetMetadataAuditExpandedKeys,
  collectStandardsCatItemExpandedKeys,
  collectStandardsExpandedKeys,
  libraryReportsSectionKeys,
  loadLibraryReportsSessionState,
  saveLibraryReportsSessionState,
  type LibraryReportsReportMode,
} from '../lib/libraryReportsSessionState';

export interface LibraryReportsProps {
  standards: MasterStandard[];
  findings: Finding[];
  recommendations: MasterRecommendation[];
  glossary: Glossary[];
  categories: Category[];
  items: Item[];
}

function mergeExpandedKeysForGlossary(all: Set<string>, glossaryKeys: string[]): Set<string> {
  const next = new Set(
    Array.from(all).filter((k) => k.startsWith('s:') || k.startsWith('sc:'))
  );
  for (const k of glossaryKeys) next.add(k);
  return next;
}

function mergeExpandedKeysForGlossaryAudit(all: Set<string>, auditKeys: string[]): Set<string> {
  const next = new Set(
    Array.from(all).filter((k) => k.startsWith('s:') || k.startsWith('sc:') || k.startsWith('g:'))
  );
  for (const k of auditKeys) next.add(k);
  return next;
}

function mergeExpandedKeysForStandardsView(
  all: Set<string>,
  activePrefix: 's:' | 'sc:',
  viewKeys: string[]
): Set<string> {
  const next = new Set(
    Array.from(all).filter((k) => !k.startsWith(activePrefix))
  );
  for (const k of viewKeys) next.add(k);
  return next;
}

function ReportTabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-all',
        active ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
      )}
    >
      {icon} {label}
    </button>
  );
}

function MissingSetBadge() {
  return (
    <span
      className="ml-2 inline-flex rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800"
      title="Glossary set cannot be derived from id, name, or standard type/version on this record"
    >
      Missing set
    </span>
  );
}

function SetMismatchBadge() {
  return (
    <span
      className="ml-2 inline-flex rounded border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-800"
      title="Glossary row and master finding/recommendation resolve to different glossary sets"
    >
      Set mismatch
    </span>
  );
}

function GlossarySetStatusBadge({ status }: { status: GlossarySetAssociationStatus }) {
  if (status === 'missing') return <MissingSetBadge />;
  if (status === 'mismatch') return <SetMismatchBadge />;
  return null;
}

const AUDIT_STATUS_BADGE_CLASS: Record<GlossarySetMetadataAuditStatus, string> = {
  ok: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  derivable: 'border-blue-200 bg-blue-50 text-blue-800',
  missing: 'border-amber-200 bg-amber-50 text-amber-800',
  mismatch: 'border-rose-200 bg-rose-50 text-rose-800',
  partial: 'border-orange-200 bg-orange-50 text-orange-800',
};

function AuditStatusBadge({ status }: { status: GlossarySetMetadataAuditStatus }) {
  return (
    <span
      className={cn(
        'inline-flex rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide',
        AUDIT_STATUS_BADGE_CLASS[status]
      )}
    >
      {GLOSSARY_SET_METADATA_AUDIT_STATUS_LABELS[status]}
    </span>
  );
}

function SetFieldsBlock({
  title,
  fields,
}: {
  title: string;
  fields: {
    fldGlossarySetId: string;
    fldGlossarySetName: string;
    fldGlossaryStandardType: string;
    fldGlossaryStandardVersion: string;
  };
}) {
  const empty = '(empty)';
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">{title}</p>
      <dl className="mt-1 grid gap-0.5 font-mono text-[10px] text-zinc-600">
        <div>
          <dt className="inline text-zinc-400">fldGlossarySetId: </dt>
          <dd className="inline">{fields.fldGlossarySetId || empty}</dd>
        </div>
        <div>
          <dt className="inline text-zinc-400">fldGlossarySetName: </dt>
          <dd className="inline">{fields.fldGlossarySetName || empty}</dd>
        </div>
        <div>
          <dt className="inline text-zinc-400">fldGlossaryStandardType: </dt>
          <dd className="inline">{fields.fldGlossaryStandardType || empty}</dd>
        </div>
        <div>
          <dt className="inline text-zinc-400">fldGlossaryStandardVersion: </dt>
          <dd className="inline">{fields.fldGlossaryStandardVersion || empty}</dd>
        </div>
      </dl>
    </div>
  );
}

function LinkedSetBlock({ title, snapshot }: { title: string; snapshot: GlossarySetMetadataAuditRow['findingResolved'] }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">{title}</p>
      <p className="mt-1 text-xs text-zinc-700">
        {snapshot.setLabel}
        <span className="ml-1 font-mono text-[10px] text-zinc-400">
          {snapshot.setKey ? `(${snapshot.setKey}, ${snapshot.source})` : `(none, ${snapshot.source})`}
        </span>
      </p>
    </div>
  );
}

function GlossarySetMetadataAuditPanel({
  report,
  search,
  expandedKeys,
  onToggle,
}: {
  report: GlossarySetMetadataAuditReport;
  search: string;
  expandedKeys: Set<string>;
  onToggle: (key: string, open: boolean) => void;
}) {
  const filtered = useMemo(
    () => filterGlossarySetMetadataAuditReport(report, search),
    [report, search]
  );
  const { summary } = filtered;

  if (summary.totalRows === 0) {
    return (
      <p className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500">
        {search.trim() ? 'No glossary rows match your search.' : 'No glossary records loaded.'}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Total rows</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900">{summary.totalRows}</p>
        </div>
        {GLOSSARY_SET_METADATA_AUDIT_STATUS_ORDER.map((status) => (
          <div
            key={status}
            className="rounded-lg border border-zinc-200 bg-white px-4 py-3"
          >
            <p className="text-xs font-semibold text-zinc-600">
              {GLOSSARY_SET_METADATA_AUDIT_STATUS_LABELS[status]}
            </p>
            <p className="mt-1 text-2xl font-bold text-zinc-900">{summary.counts[status]}</p>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        {GLOSSARY_SET_METADATA_AUDIT_STATUS_ORDER.map((status) => {
          const rows = filtered.byStatus[status];
          if (rows.length === 0) return null;
          const sectionKey = libraryReportsSectionKeys.glossaryAuditStatus(status);
          return (
            <DetailsSection
              key={status}
              sectionKey={sectionKey}
              isOpen={expandedKeys.has(sectionKey)}
              onToggle={onToggle}
              summary={
                <span className="flex flex-wrap items-center gap-2">
                  <AuditStatusBadge status={status} />
                  <span className="text-xs font-normal text-zinc-500">
                    {rows.length} row{rows.length === 1 ? '' : 's'}
                  </span>
                </span>
              }
            >
              <ul className="space-y-3">
                {rows.map((row) => (
                  <li
                    key={row.glossaryRowId}
                    className="rounded-md border border-zinc-100 bg-zinc-50/80 px-3 py-3"
                  >
                    <p className="text-sm font-semibold text-zinc-900">{row.pathLabel}</p>
                    <p className="mt-1 font-mono text-[10px] text-zinc-400">{row.glossaryRowId}</p>
                    <p className="mt-2 text-xs text-zinc-600">
                      Derived set:{' '}
                      <span className="font-semibold text-zinc-800">{row.derivedSetLabel}</span>
                      {row.derivedSetKey ? (
                        <span className="font-mono text-[10px] text-zinc-400">
                          {' '}
                          ({row.derivedSetKey} from {row.derivedFrom})
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-2 text-xs font-medium text-zinc-700">
                      Suggested action: {row.suggestedActionLabel}
                    </p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <SetFieldsBlock title="Glossary row fields" fields={row.rowFields} />
                      <div className="space-y-3">
                        <LinkedSetBlock title="Linked finding set" snapshot={row.findingResolved} />
                        <LinkedSetBlock
                          title="Linked recommendation set"
                          snapshot={row.recommendationResolved}
                        />
                      </div>
                    </div>
                    <p className="mt-2 font-mono text-[10px] text-zinc-400">
                      finding: {row.findingId || '—'} · rec: {row.recId || '—'}
                    </p>
                  </li>
                ))}
              </ul>
            </DetailsSection>
          );
        })}
      </div>
    </div>
  );
}

function ExpandControls({
  onExpandAll,
  onCollapseAll,
}: {
  onExpandAll: () => void;
  onCollapseAll: () => void;
}) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={onExpandAll}
        className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-50"
      >
        Expand all
      </button>
      <button
        type="button"
        onClick={onCollapseAll}
        className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-50"
      >
        Collapse all
      </button>
    </div>
  );
}

function AssocFindingList({
  standardId,
  findings,
  showCatItemPath,
}: {
  standardId: string;
  findings: StandardsAssocFindingRow[];
  showCatItemPath?: boolean;
}) {
  if (findings.length === 0) {
    return <p className="text-xs text-zinc-400">No library findings cite this standard.</p>;
  }
  return (
    <ul className="space-y-2">
      {findings.map((f) => (
        <li
          key={`${standardId}-${f.findingId}`}
          className="rounded-md border border-zinc-100 bg-zinc-50/80 px-3 py-2"
        >
          <p className="text-sm font-semibold text-zinc-900">
            {f.findingShort}
            {f.missingGlossarySetMetadata ? <MissingSetBadge /> : null}
          </p>
          {showCatItemPath ? (
            <p className="text-xs text-zinc-500">
              {f.path.categoryName} → {f.path.itemName}
            </p>
          ) : null}
          {f.findingLong ? (
            <p className="mt-1 text-xs text-zinc-500 line-clamp-2">{f.findingLong}</p>
          ) : null}
          <p className="mt-1 font-mono text-[10px] text-zinc-400">{f.findingId}</p>
        </li>
      ))}
    </ul>
  );
}

function AssocRecommendationList({
  standardId,
  recommendations,
  showCatItemPath,
}: {
  standardId: string;
  recommendations: StandardsAssocRecommendationRow[];
  showCatItemPath?: boolean;
}) {
  if (recommendations.length === 0) {
    return <p className="text-xs text-zinc-400">No library recommendations cite this standard.</p>;
  }
  return (
    <ul className="space-y-2">
      {recommendations.map((r) => (
        <li
          key={`${standardId}-${r.recId}`}
          className="rounded-md border border-zinc-100 bg-zinc-50/80 px-3 py-2"
        >
          <p className="text-sm font-semibold text-zinc-900">
            {r.recShort}
            {r.missingGlossarySetMetadata ? <MissingSetBadge /> : null}
          </p>
          {showCatItemPath ? (
            <p className="text-xs text-zinc-500">
              {r.path.categoryName} → {r.path.itemName}
            </p>
          ) : null}
          {r.recLong ? <p className="mt-1 text-xs text-zinc-500 line-clamp-2">{r.recLong}</p> : null}
          <p className="mt-1 font-mono text-[10px] text-zinc-400">{r.recId}</p>
        </li>
      ))}
    </ul>
  );
}

function CitationAssociationsBody({
  std,
  showPathsOnRows = true,
}: {
  std: StandardsAssocStandardNode;
  showPathsOnRows?: boolean;
}) {
  return (
    <>
      {std.contentPreview ? (
        <p className="mb-3 text-xs leading-relaxed text-zinc-600">{std.contentPreview}</p>
      ) : null}
      <p className="mb-2 font-mono text-[10px] text-zinc-400">ID: {std.standardId}</p>
      <div className="mb-4">
        <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-zinc-500">
          Findings ({std.findings.length})
        </h4>
        <AssocFindingList
          standardId={std.standardId}
          findings={std.findings}
          showCatItemPath={showPathsOnRows}
        />
      </div>
      <div>
        <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-zinc-500">
          Recommendations ({std.recommendations.length})
        </h4>
        <AssocRecommendationList
          standardId={std.standardId}
          recommendations={std.recommendations}
          showCatItemPath={showPathsOnRows}
        />
      </div>
    </>
  );
}

function DetailsSection({
  summary,
  children,
  sectionKey,
  isOpen,
  onToggle,
}: {
  summary: React.ReactNode;
  children: React.ReactNode;
  sectionKey: string;
  isOpen: boolean;
  onToggle: (key: string, open: boolean) => void;
}) {
  return (
    <details className="group rounded-lg border border-zinc-200 bg-white" open={isOpen}>
      <summary
        className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-semibold text-zinc-900 [&::-webkit-details-marker]:hidden"
        onClick={(e) => {
          e.preventDefault();
          onToggle(sectionKey, !isOpen);
        }}
      >
        <ChevronRight
          size={16}
          className="shrink-0 text-zinc-400 transition-transform group-open:rotate-90"
        />
        {summary}
      </summary>
      <div className="border-t border-zinc-100 px-4 py-3">{children}</div>
    </details>
  );
}

function StandardsAssociationsPanel({
  groups,
  search,
  hideUnassociatedCitations,
  expandedKeys,
  onToggle,
}: {
  groups: StandardsAssocSetGroup[];
  search: string;
  hideUnassociatedCitations: boolean;
  expandedKeys: Set<string>;
  onToggle: (key: string, open: boolean) => void;
}) {
  const q = search.trim().toLowerCase();

  const filtered = useMemo(
    () =>
      filterStandardsAssociationsGroups(groups, {
        search,
        hideUnassociated: hideUnassociatedCitations,
      }),
    [groups, search, hideUnassociatedCitations]
  );

  if (filtered.length === 0) {
    const emptyMessage =
      groups.length === 0
        ? 'No standards loaded.'
        : q && hideUnassociatedCitations
          ? 'No citations with library associations match your search and filters.'
          : q
            ? 'No standards match your search.'
            : hideUnassociatedCitations
              ? 'No citations with library findings or recommendations. Turn off “Hide citations with no associations” to see all citations.'
              : 'No standards loaded.';
    return (
      <p className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {filtered.map((setGroup) => (
        <DetailsSection
          key={setGroup.setKey}
          sectionKey={libraryReportsSectionKeys.standardsSet(setGroup.setKey)}
          isOpen={expandedKeys.has(libraryReportsSectionKeys.standardsSet(setGroup.setKey))}
          onToggle={onToggle}
          summary={
            <span className="flex flex-wrap items-center gap-2">
              <span>{setGroup.setLabel}</span>
              <span className="text-xs font-normal text-zinc-500">
                {setGroup.standardCount} standards · {setGroup.findingLinkCount} finding links ·{' '}
                {setGroup.recommendationLinkCount} recommendation links
              </span>
            </span>
          }
        >
          <div className="space-y-3">
            {setGroup.standards.map((std) => (
              <DetailsSection
                key={std.standardId}
                sectionKey={libraryReportsSectionKeys.standardsCitation(std.standardId)}
                isOpen={expandedKeys.has(libraryReportsSectionKeys.standardsCitation(std.standardId))}
                onToggle={onToggle}
                summary={
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-3">
                    <span className="font-bold text-zinc-900">{std.citationLabel}</span>
                    {std.citationName ? (
                      <span className="truncate text-xs font-normal text-zinc-500">{std.citationName}</span>
                    ) : null}
                    <span className="text-xs font-normal text-zinc-400">
                      {std.findings.length} findings · {std.recommendations.length} recommendations
                      {!standardsAssocCitationHasAssociations(std) ? (
                        <span className="ml-1 font-semibold text-amber-700">· 0 associations</span>
                      ) : null}
                    </span>
                  </span>
                }
              >
                <CitationAssociationsBody std={std} />
              </DetailsSection>
            ))}
          </div>
        </DetailsSection>
      ))}
    </div>
  );
}

function StandardsAssociationsCatItemPanel({
  groups,
  search,
  hideUnassociatedCitations,
  expandedKeys,
  onToggle,
}: {
  groups: StandardsAssocCatItemSetGroup[];
  search: string;
  hideUnassociatedCitations: boolean;
  expandedKeys: Set<string>;
  onToggle: (key: string, open: boolean) => void;
}) {
  const q = search.trim().toLowerCase();

  const filtered = useMemo(
    () =>
      filterStandardsAssociationsCatItemGroups(groups, {
        search,
        hideUnassociated: hideUnassociatedCitations,
      }),
    [groups, search, hideUnassociatedCitations]
  );

  if (filtered.length === 0) {
    const emptyMessage =
      groups.length === 0
        ? 'No standards loaded.'
        : q && hideUnassociatedCitations
          ? 'No category/item associations match your search and filters.'
          : q
            ? 'No category/item associations match your search.'
            : hideUnassociatedCitations
              ? 'No library findings or recommendations are linked to standards. Turn off “Hide citations with no associations” to browse by citation order.'
              : 'No category/item associations for standards in the library.';
    return (
      <p className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {filtered.map((setGroup) => (
        <DetailsSection
          key={setGroup.setKey}
          sectionKey={libraryReportsSectionKeys.standardsCatItemSet(setGroup.setKey)}
          isOpen={expandedKeys.has(libraryReportsSectionKeys.standardsCatItemSet(setGroup.setKey))}
          onToggle={onToggle}
          summary={
            <span className="flex flex-wrap items-center gap-2">
              <span>{setGroup.setLabel}</span>
              <span className="text-xs font-normal text-zinc-500">
                {setGroup.citationSlotCount} citation
                {setGroup.citationSlotCount === 1 ? '' : 's'} · {setGroup.findingLinkCount} finding
                links · {setGroup.recommendationLinkCount} recommendation links
              </span>
            </span>
          }
        >
          <div className="space-y-3">
            {setGroup.categories.map((cat) => (
              <DetailsSection
                key={`${setGroup.setKey}-${cat.categoryId}`}
                sectionKey={libraryReportsSectionKeys.standardsCatItemCategory(
                  setGroup.setKey,
                  cat.categoryId
                )}
                isOpen={expandedKeys.has(
                  libraryReportsSectionKeys.standardsCatItemCategory(setGroup.setKey, cat.categoryId)
                )}
                onToggle={onToggle}
                summary={
                  <span>
                    {cat.categoryName}
                    <span className="ml-2 text-xs font-normal text-zinc-500">
                      {cat.items.length} items
                    </span>
                  </span>
                }
              >
                <div className="space-y-3">
                  {cat.items.map((item) => (
                    <DetailsSection
                      key={`${setGroup.setKey}-${cat.categoryId}-${item.itemId}`}
                      sectionKey={libraryReportsSectionKeys.standardsCatItemItem(
                        setGroup.setKey,
                        cat.categoryId,
                        item.itemId
                      )}
                      isOpen={expandedKeys.has(
                        libraryReportsSectionKeys.standardsCatItemItem(
                          setGroup.setKey,
                          cat.categoryId,
                          item.itemId
                        )
                      )}
                      onToggle={onToggle}
                      summary={
                        <span>
                          {item.itemName}
                          <span className="ml-2 text-xs font-normal text-zinc-500">
                            {item.citations.length} citation
                            {item.citations.length === 1 ? '' : 's'}
                          </span>
                        </span>
                      }
                    >
                      <div className="space-y-3">
                        {item.citations.map((c) => (
                          <DetailsSection
                            key={`${setGroup.setKey}-${cat.categoryId}-${item.itemId}-${c.standardId}`}
                            sectionKey={libraryReportsSectionKeys.standardsCatItemCitation(
                              setGroup.setKey,
                              cat.categoryId,
                              item.itemId,
                              c.standardId
                            )}
                            isOpen={expandedKeys.has(
                              libraryReportsSectionKeys.standardsCatItemCitation(
                                setGroup.setKey,
                                cat.categoryId,
                                item.itemId,
                                c.standardId
                              )
                            )}
                            onToggle={onToggle}
                            summary={
                              <span className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-3">
                                <span className="font-bold text-zinc-900">{c.citationLabel}</span>
                                {c.citationName ? (
                                  <span className="truncate text-xs font-normal text-zinc-500">
                                    {c.citationName}
                                  </span>
                                ) : null}
                                <span className="text-xs font-normal text-zinc-400">
                                  {c.findings.length} findings · {c.recommendations.length}{' '}
                                  recommendations
                                </span>
                              </span>
                            }
                          >
                            <CitationAssociationsBody
                              showPathsOnRows={false}
                              std={{
                                standardId: c.standardId,
                                citationLabel: c.citationLabel,
                                citationName: c.citationName,
                                contentPreview: c.contentPreview,
                                relationType: c.relationType,
                                findings: c.findings,
                                recommendations: c.recommendations,
                              }}
                            />
                          </DetailsSection>
                        ))}
                      </div>
                    </DetailsSection>
                  ))}
                </div>
              </DetailsSection>
            ))}
          </div>
        </DetailsSection>
      ))}
    </div>
  );
}

function GlossaryHierarchyPanel({
  groups,
  search,
  expandedKeys,
  onToggle,
}: {
  groups: GlossaryHierarchySetGroup[];
  search: string;
  expandedKeys: Set<string>;
  onToggle: (key: string, open: boolean) => void;
}) {
  const q = search.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!q) return groups;
    return groups
      .map((g) => ({
        ...g,
        categories: g.categories
          .map((cat) => ({
            ...cat,
            items: cat.items
              .map((item) => ({
                ...item,
                findings: item.findings.filter((f) => {
                  const hay = [
                    cat.categoryName,
                    item.itemName,
                    f.findingShort,
                    f.findingLong,
                    ...f.recommendations.map((r) => `${r.recShort} ${r.recLong}`),
                  ]
                    .join(' ')
                    .toLowerCase();
                  return hay.includes(q);
                }),
              }))
              .filter((item) => item.findings.length > 0),
          }))
          .filter((cat) => cat.items.length > 0),
      }))
      .filter((g) => g.categories.length > 0);
  }, [groups, q]);

  if (filtered.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500">
        {q ? 'No glossary rows match your search.' : 'No glossary records loaded.'}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {filtered.map((setGroup) => (
        <DetailsSection
          key={setGroup.setKey || '__unassigned__'}
          sectionKey={libraryReportsSectionKeys.glossarySet(setGroup.setKey)}
          isOpen={expandedKeys.has(libraryReportsSectionKeys.glossarySet(setGroup.setKey))}
          onToggle={onToggle}
          summary={
            <span className="flex flex-wrap items-center gap-2">
              <span>{setGroup.setLabel}</span>
              <span className="text-xs font-normal text-zinc-500">
                {setGroup.glossaryRowCount} glossary rows · {setGroup.categories.length} categories
              </span>
            </span>
          }
        >
          {setGroup.categories.length === 0 ? (
            <p className="text-xs text-zinc-400">No glossary rows in this set.</p>
          ) : (
            <div className="space-y-3">
              {setGroup.categories.map((cat) => (
                <DetailsSection
                  key={`${setGroup.setKey}-${cat.categoryId}`}
                  sectionKey={libraryReportsSectionKeys.glossaryCategory(
                    setGroup.setKey,
                    cat.categoryId
                  )}
                  isOpen={expandedKeys.has(
                    libraryReportsSectionKeys.glossaryCategory(setGroup.setKey, cat.categoryId)
                  )}
                  onToggle={onToggle}
                  summary={
                    <span>
                      {cat.categoryName}
                      <span className="ml-2 text-xs font-normal text-zinc-500">
                        {cat.items.length} items
                      </span>
                    </span>
                  }
                >
                  <div className="space-y-3">
                    {cat.items.map((item) => (
                      <DetailsSection
                        key={`${setGroup.setKey}-${cat.categoryId}-${item.itemId}`}
                        sectionKey={libraryReportsSectionKeys.glossaryItem(
                          setGroup.setKey,
                          cat.categoryId,
                          item.itemId
                        )}
                        isOpen={expandedKeys.has(
                          libraryReportsSectionKeys.glossaryItem(
                            setGroup.setKey,
                            cat.categoryId,
                            item.itemId
                          )
                        )}
                        onToggle={onToggle}
                        summary={
                          <span>
                            {item.itemName}
                            <span className="ml-2 text-xs font-normal text-zinc-500">
                              {item.findings.length} findings
                            </span>
                          </span>
                        }
                      >
                        <div className="space-y-3">
                          {item.findings.map((f) => (
                            <DetailsSection
                              key={`${setGroup.setKey}-${f.findingId}`}
                              sectionKey={libraryReportsSectionKeys.glossaryFinding(
                                setGroup.setKey,
                                f.findingId
                              )}
                              isOpen={expandedKeys.has(
                                libraryReportsSectionKeys.glossaryFinding(
                                  setGroup.setKey,
                                  f.findingId
                                )
                              )}
                              onToggle={onToggle}
                              summary={
                                <span className="flex flex-wrap items-center gap-2">
                                  <span>{f.findingShort}</span>
                                  <span className="text-xs font-normal text-zinc-500">
                                    {f.recommendations.length} recommendation
                                    {f.recommendations.length === 1 ? '' : 's'} · {f.glossaryRowCount}{' '}
                                    row{f.glossaryRowCount === 1 ? '' : 's'}
                                  </span>
                                </span>
                              }
                            >
                              {f.findingLong ? (
                                <p className="mb-2 text-xs text-zinc-500">{f.findingLong}</p>
                              ) : null}
                              <p className="mb-2 font-mono text-[10px] text-zinc-400">{f.findingId}</p>
                              <ul className="space-y-2">
                                {f.recommendations.map((r) => (
                                  <li
                                    key={`${f.findingId}-${r.recId}`}
                                    className="rounded-md border border-zinc-100 bg-zinc-50/80 px-3 py-2"
                                  >
                                    <p className="text-sm font-semibold text-zinc-900">
                                      {r.recShort}
                                      <GlossarySetStatusBadge status={r.setAssociationStatus} />
                                    </p>
                                    {r.recLong ? (
                                      <p className="mt-1 text-xs text-zinc-500 line-clamp-2">{r.recLong}</p>
                                    ) : null}
                                    <p className="mt-1 font-mono text-[10px] text-zinc-400">
                                      {r.recId}
                                      {r.glossaryRowIds.length > 0
                                        ? ` · glos: ${r.glossaryRowIds.join(', ')}`
                                        : ''}
                                    </p>
                                  </li>
                                ))}
                              </ul>
                            </DetailsSection>
                          ))}
                        </div>
                      </DetailsSection>
                    ))}
                  </div>
                </DetailsSection>
              ))}
            </div>
          )}
        </DetailsSection>
      ))}
    </div>
  );
}

export function LibraryReports({
  standards,
  findings,
  recommendations,
  glossary,
  categories,
  items,
}: LibraryReportsProps) {
  const initialSession = useMemo(() => loadLibraryReportsSessionState(), []);
  const [mode, setMode] = useState<LibraryReportsReportMode>(initialSession.mode);
  const [search, setSearch] = useState(initialSession.search);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(
    () => new Set(initialSession.expandedKeys)
  );
  const [hideUnassociatedCitations, setHideUnassociatedCitations] = useState(
    initialSession.hideUnassociatedCitations
  );
  const [standardsAssocViewMode, setStandardsAssocViewMode] = useState<StandardsAssocViewMode>(
    initialSession.standardsAssocViewMode
  );
  const standardsGroups = useMemo(
    () =>
      buildStandardsAssociationsReport({
        standards,
        findings,
        recommendations,
        categories,
        items,
      }),
    [standards, findings, recommendations, categories, items]
  );

  const standardsCatItemGroups = useMemo(
    () =>
      buildStandardsAssociationsCatItemReport({
        standards,
        findings,
        recommendations,
        glossary,
        categories,
        items,
      }),
    [standards, findings, recommendations, glossary, categories, items]
  );

  const glossaryGroups = useMemo(
    () =>
      buildGlossaryHierarchyReport({
        glossary,
        findings,
        recommendations,
        categories,
        items,
      }),
    [glossary, findings, recommendations, categories, items]
  );

  const glossarySetMetadataAudit = useMemo(
    () =>
      buildGlossarySetMetadataAuditReport({
        glossary,
        findings,
        recommendations,
        categories,
        items,
      }),
    [glossary, findings, recommendations, categories, items]
  );

  const handleSectionToggle = useCallback((key: string, open: boolean) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (open) next.add(key);
      else next.delete(key);
      return next;
    });
  }, []);

  const visibleStandardsGroups = useMemo(
    () =>
      filterStandardsAssociationsGroups(standardsGroups, {
        search,
        hideUnassociated: hideUnassociatedCitations,
      }),
    [standardsGroups, search, hideUnassociatedCitations]
  );

  const visibleStandardsCatItemGroups = useMemo(
    () =>
      filterStandardsAssociationsCatItemGroups(standardsCatItemGroups, {
        search,
        hideUnassociated: hideUnassociatedCitations,
      }),
    [standardsCatItemGroups, search, hideUnassociatedCitations]
  );

  const standardsExpandPrefix: 's:' | 'sc:' =
    standardsAssocViewMode === 'category_item' ? 'sc:' : 's:';

  const handleExpandAll = useCallback(() => {
    if (mode === 'glossary_audit') {
      const statusesWithRows = GLOSSARY_SET_METADATA_AUDIT_STATUS_ORDER.filter(
        (s) => glossarySetMetadataAudit.byStatus[s].length > 0
      );
      setExpandedKeys((prev) =>
        mergeExpandedKeysForGlossaryAudit(
          prev,
          collectGlossarySetMetadataAuditExpandedKeys(statusesWithRows)
        )
      );
      return;
    }
    if (mode === 'glossary') {
      setExpandedKeys((prev) =>
        mergeExpandedKeysForGlossary(prev, collectGlossaryExpandedKeys(glossaryGroups))
      );
      return;
    }
    const keys =
      standardsAssocViewMode === 'category_item'
        ? collectStandardsCatItemExpandedKeys(visibleStandardsCatItemGroups)
        : collectStandardsExpandedKeys(visibleStandardsGroups);
    setExpandedKeys((prev) => mergeExpandedKeysForStandardsView(prev, standardsExpandPrefix, keys));
  }, [
    mode,
    standardsAssocViewMode,
    standardsExpandPrefix,
    visibleStandardsGroups,
    visibleStandardsCatItemGroups,
    glossaryGroups,
    glossarySetMetadataAudit,
  ]);

  const handleCollapseAll = useCallback(() => {
    if (mode === 'glossary_audit') {
      setExpandedKeys((prev) => mergeExpandedKeysForGlossaryAudit(prev, []));
      return;
    }
    if (mode === 'glossary') {
      setExpandedKeys((prev) => mergeExpandedKeysForGlossary(prev, []));
      return;
    }
    setExpandedKeys((prev) => mergeExpandedKeysForStandardsView(prev, standardsExpandPrefix, []));
  }, [mode, standardsExpandPrefix]);

  useEffect(() => {
    saveLibraryReportsSessionState({
      v: 1,
      mode,
      search,
      expandedKeys: Array.from(expandedKeys),
      hideUnassociatedCitations,
      standardsAssocViewMode,
    });
  }, [mode, search, expandedKeys, hideUnassociatedCitations, standardsAssocViewMode]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Library Reports</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Read-only inspection of Standards Library associations and Glossary Library hierarchy. No
          edits or saves from this screen.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-100/80 p-1">
        <ReportTabButton
          active={mode === 'standards'}
          onClick={() => setMode('standards')}
          icon={<Shield size={16} />}
          label="Standards Associations"
        />
        <ReportTabButton
          active={mode === 'glossary'}
          onClick={() => setMode('glossary')}
          icon={<ListTree size={16} />}
          label="Glossary Hierarchy"
        />
        <ReportTabButton
          active={mode === 'glossary_audit'}
          onClick={() => setMode('glossary_audit')}
          icon={<FileSearch size={16} />}
          label="Glossary Set Metadata Audit"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter visible rows…"
            className="h-10 w-full rounded-lg border border-zinc-200 bg-white pl-9 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400"
          />
        </div>
        <ExpandControls onExpandAll={handleExpandAll} onCollapseAll={handleCollapseAll} />
      </div>

      {mode === 'standards' && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap items-center gap-1 rounded-xl border border-zinc-200 bg-zinc-100/80 p-1">
            <ReportTabButton
              active={standardsAssocViewMode === 'citation_order'}
              onClick={() => setStandardsAssocViewMode('citation_order')}
              icon={<Shield size={16} />}
              label="Citation order"
            />
            <ReportTabButton
              active={standardsAssocViewMode === 'category_item'}
              onClick={() => setStandardsAssocViewMode('category_item')}
              icon={<ListTree size={16} />}
              label="Category / Item"
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={hideUnassociatedCitations}
              onChange={(e) => setHideUnassociatedCitations(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 text-zinc-900"
            />
            <span>Hide citations with no associations</span>
          </label>
        </div>
      )}

      <div className="flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50/80 px-4 py-3 text-xs text-blue-900">
        <BookMarked size={16} className="mt-0.5 shrink-0" />
        <span>
          {mode === 'standards'
            ? standardsAssocViewMode === 'category_item'
              ? 'Grouped by standard set, then Category → Item → Citation. Each citation lists only findings and recommendations for that category/item pair (a citation may appear under multiple pairs).'
              : 'Standards are grouped by type and version. Citations use Standards Library order. Findings and recommendations reference each standard via library default citations (fldStandards).'
            : mode === 'glossary_audit'
              ? 'Read-only audit of glossary row set metadata (fldGlossarySetId, fldGlossarySetName, fldGlossaryStandardType, fldGlossaryStandardVersion) vs linked masters. No Firestore writes from this screen.'
              : 'Hierarchy is built from glossary rows (fldGlosId), grouped by glossary set, then Category → Item → Finding → Recommendation.'}
        </span>
      </div>

      {mode === 'standards' ? (
        standardsAssocViewMode === 'category_item' ? (
          <StandardsAssociationsCatItemPanel
            groups={standardsCatItemGroups}
            search={search}
            hideUnassociatedCitations={hideUnassociatedCitations}
            expandedKeys={expandedKeys}
            onToggle={handleSectionToggle}
          />
        ) : (
          <StandardsAssociationsPanel
            groups={standardsGroups}
            search={search}
            hideUnassociatedCitations={hideUnassociatedCitations}
            expandedKeys={expandedKeys}
            onToggle={handleSectionToggle}
          />
        )
      ) : mode === 'glossary_audit' ? (
        <GlossarySetMetadataAuditPanel
          report={glossarySetMetadataAudit}
          search={search}
          expandedKeys={expandedKeys}
          onToggle={handleSectionToggle}
        />
      ) : (
        <GlossaryHierarchyPanel
          groups={glossaryGroups}
          search={search}
          expandedKeys={expandedKeys}
          onToggle={handleSectionToggle}
        />
      )}
    </div>
  );
}
