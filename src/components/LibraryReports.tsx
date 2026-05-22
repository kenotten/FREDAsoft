import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BookMarked, ChevronRight, ListTree, Search, Shield } from 'lucide-react';
import type { Category, Finding, Glossary, Item, MasterRecommendation, MasterStandard } from '../types';
import { cn } from '../lib/utils';
import {
  buildGlossaryHierarchyReport,
  buildStandardsAssociationsReport,
  type GlossaryHierarchySetGroup,
  type StandardsAssocSetGroup,
} from '../lib/libraryReportsModel';
import {
  collectGlossaryExpandedKeys,
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

function mergeExpandedKeysForMode(
  mode: LibraryReportsReportMode,
  all: Set<string>,
  modeKeys: string[]
): Set<string> {
  const prefix = mode === 'standards' ? 's:' : 'g:';
  const otherPrefix = mode === 'standards' ? 'g:' : 's:';
  const next = new Set(Array.from(all).filter((k) => k.startsWith(otherPrefix)));
  for (const k of modeKeys) next.add(k);
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
      title="Missing glossary set metadata on this library record"
    >
      Missing set
    </span>
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
  expandedKeys,
  onToggle,
}: {
  groups: StandardsAssocSetGroup[];
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
        standards: g.standards.filter((s) => {
          const hay = [
            s.citationLabel,
            s.citationName,
            s.contentPreview,
            ...s.findings.map((f) => `${f.path.categoryName} ${f.path.itemName} ${f.findingShort}`),
            ...s.recommendations.map((r) => `${r.path.categoryName} ${r.path.itemName} ${r.recShort}`),
          ]
            .join(' ')
            .toLowerCase();
          return hay.includes(q);
        }),
      }))
      .filter((g) => g.standards.length > 0);
  }, [groups, q]);

  if (filtered.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500">
        {q ? 'No standards match your search.' : 'No standards loaded.'}
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
                    </span>
                  </span>
                }
              >
                {std.contentPreview ? (
                  <p className="mb-3 text-xs leading-relaxed text-zinc-600">{std.contentPreview}</p>
                ) : null}
                <p className="mb-2 font-mono text-[10px] text-zinc-400">ID: {std.standardId}</p>

                <div className="mb-4">
                  <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-zinc-500">
                    Findings ({std.findings.length})
                  </h4>
                  {std.findings.length === 0 ? (
                    <p className="text-xs text-zinc-400">No library findings cite this standard.</p>
                  ) : (
                    <ul className="space-y-2">
                      {std.findings.map((f) => (
                        <li
                          key={`${std.standardId}-${f.findingId}`}
                          className="rounded-md border border-zinc-100 bg-zinc-50/80 px-3 py-2"
                        >
                          <p className="text-sm font-semibold text-zinc-900">
                            {f.findingShort}
                            {f.missingGlossarySetMetadata ? <MissingSetBadge /> : null}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {f.path.categoryName} → {f.path.itemName}
                          </p>
                          {f.findingLong ? (
                            <p className="mt-1 text-xs text-zinc-500 line-clamp-2">{f.findingLong}</p>
                          ) : null}
                          <p className="mt-1 font-mono text-[10px] text-zinc-400">{f.findingId}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-zinc-500">
                    Recommendations ({std.recommendations.length})
                  </h4>
                  {std.recommendations.length === 0 ? (
                    <p className="text-xs text-zinc-400">No library recommendations cite this standard.</p>
                  ) : (
                    <ul className="space-y-2">
                      {std.recommendations.map((r) => (
                        <li
                          key={`${std.standardId}-${r.recId}`}
                          className="rounded-md border border-zinc-100 bg-zinc-50/80 px-3 py-2"
                        >
                          <p className="text-sm font-semibold text-zinc-900">
                            {r.recShort}
                            {r.missingGlossarySetMetadata ? <MissingSetBadge /> : null}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {r.path.categoryName} → {r.path.itemName}
                          </p>
                          {r.recLong ? (
                            <p className="mt-1 text-xs text-zinc-500 line-clamp-2">{r.recLong}</p>
                          ) : null}
                          <p className="mt-1 font-mono text-[10px] text-zinc-400">{r.recId}</p>
                        </li>
                      ))}
                    </ul>
                  )}
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
              {setGroup.isUnassigned ? <MissingSetBadge /> : null}
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
                                      {r.missingGlossarySetMetadata ? <MissingSetBadge /> : null}
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

  const handleSectionToggle = useCallback((key: string, open: boolean) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (open) next.add(key);
      else next.delete(key);
      return next;
    });
  }, []);

  const handleExpandAll = useCallback(() => {
    const keys =
      mode === 'standards'
        ? collectStandardsExpandedKeys(standardsGroups)
        : collectGlossaryExpandedKeys(glossaryGroups);
    setExpandedKeys((prev) => mergeExpandedKeysForMode(mode, prev, keys));
  }, [mode, standardsGroups, glossaryGroups]);

  const handleCollapseAll = useCallback(() => {
    setExpandedKeys((prev) => mergeExpandedKeysForMode(mode, prev, []));
  }, [mode]);

  useEffect(() => {
    saveLibraryReportsSessionState({
      v: 1,
      mode,
      search,
      expandedKeys: Array.from(expandedKeys),
    });
  }, [mode, search, expandedKeys]);

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

      <div className="flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50/80 px-4 py-3 text-xs text-blue-900">
        <BookMarked size={16} className="mt-0.5 shrink-0" />
        <span>
          {mode === 'standards'
            ? 'Standards are grouped by type and version. Findings and recommendations listed under each citation reference that standard via library default citations (fldStandards).'
            : 'Hierarchy is built from glossary rows (fldGlosId), grouped by glossary set, then Category → Item → Finding → Recommendation.'}
        </span>
      </div>

      {mode === 'standards' ? (
        <StandardsAssociationsPanel
          groups={standardsGroups}
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
