import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { FileText, Layers } from 'lucide-react';
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
import { resolveFacilityReportNarrative, type ReportRecordSortOrder } from '../../lib/reportPreviewShared';
import {
  applyWebReportRecordInclusion,
  cloneWebReportRecordInclusion,
  createDefaultWebReportRecordInclusion,
  deriveWebReportFilterOptions,
  isWebReportRecordInclusionAllSelected,
  pruneWebReportRecordInclusion,
  type WebReportFilterOptions,
  type WebReportRecordInclusion
} from '../../lib/webReportFilters';
import {
  buildCanonicalReportNumberMap,
  buildWebReportDocumentationTreeFromRecords,
  facilitiesForWebReport,
  facilityIdsEqual,
  facilityMatchesWebReportClientContext,
  getWebReportFacilityRecords,
  mergeWebReportFacilityOptions
} from '../../lib/webReportTree';
import {
  applyWebReportAccordionCollapseAll,
  applyWebReportAccordionCollapseLevel,
  applyWebReportAccordionExpandAll,
  applyWebReportAccordionExpandLevel,
  collectWebReportAccordionNodeIds,
  reconcileWebReportCollapsedKeys,
  webReportAccordionLevelIds
} from '../../lib/webReportAccordion';
import {
  areCollapsedKeySetsEqual,
  createDefaultWebReportSessionState,
  DEFAULT_WEB_REPORT_DOCUMENTATION_EXPANDED,
  DEFAULT_WEB_REPORT_FINANCIAL_EXPANDED,
  DEFAULT_WEB_REPORT_NARRATIVE_EXPANDED,
  DEFAULT_WEB_REPORT_STANDARDS_EXPANDED,
  DEFAULT_WEB_REPORT_PHOTO_ADDENDUM_EXPANDED,
  loadWebReportSessionState,
  readWebReportSessionForScope,
  recordInclusionOverrideFromSession,
  saveWebReportSessionControls,
  saveWebReportSessionState,
  webReportSessionMatchesScope,
  type WebReportSectionInclusion
} from '../../lib/webReportSessionState';
import {
  buildWebReportFinancialSummary,
  collectWebReportFinancialParentKeys,
  reconcileWebReportFinancialCollapsedKeys
} from '../../lib/webReportFinancial';
import { buildWebReportReferencedStandardsView } from '../../lib/webReportStandards';
import {
  buildWebReportPhotoAddendumView,
  includedRecordsHavePhotoAddendumPhotos
} from '../../lib/webReportPhotoAddendum';
import { WebReportStandardsSection } from './WebReportStandardsSection';
import { WebReportPhotoAddendumSection } from './WebReportPhotoAddendumSection';
import { WebReportCollapseToggle } from './WebReportCollapseToggle';
import {
  WebReportContentFilters,
  WebReportInfoRow,
  WebReportSectionInclusionControls,
  formatInspectionDate
} from './WebReportControls';
import {
  WebReportDocumentationAccordionToolbar,
  WebReportTopGroupBlock
} from './WebReportDocumentationSection';
import { WebReportFinancialTable } from './WebReportFinancialSection';

export type { WebReportSectionInclusion };

const DEFAULT_SECTION_INCLUSION: WebReportSectionInclusion = {
  narrative: true,
  financial: true,
  documentation: true,
  standards: true,
  photoAddendum: true
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
  /** Workspace client id (selections.clientId) for extra facility inclusion */
  workspaceClientId: string;
};

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
  defaultFacilityId,
  workspaceClientId
}: WebReportViewerProps) {
  const [localProjectId, setLocalProjectId] = useState(defaultProjectId);
  const [localFacilityId, setLocalFacilityId] = useState(defaultFacilityId);

  const initialSession = useMemo(
    () => readWebReportSessionForScope(defaultProjectId, defaultFacilityId),
    [defaultProjectId, defaultFacilityId]
  );

  const [sortOrder, setSortOrder] = useState<ReportRecordSortOrder>(
    () => initialSession?.sortOrder ?? 'category_location_item'
  );
  const [sectionInclusion, setSectionInclusion] = useState<WebReportSectionInclusion>(
    () => initialSession?.sectionInclusion ?? DEFAULT_SECTION_INCLUSION
  );
  const [collapsedKeys, setCollapsedKeys] = useState<Set<string>>(
    () => new Set(initialSession?.collapsedKeys ?? [])
  );
  const [financialCollapsedKeys, setFinancialCollapsedKeys] = useState<Set<string>>(
    () => new Set(initialSession?.financialCollapsedKeys ?? [])
  );
  const [narrativeExpanded, setNarrativeExpanded] = useState(
    () => initialSession?.narrativeExpanded ?? DEFAULT_WEB_REPORT_NARRATIVE_EXPANDED
  );
  const [financialExpanded, setFinancialExpanded] = useState(
    () => initialSession?.financialExpanded ?? DEFAULT_WEB_REPORT_FINANCIAL_EXPANDED
  );
  const [documentationExpanded, setDocumentationExpanded] = useState(
    () => initialSession?.documentationExpanded ?? DEFAULT_WEB_REPORT_DOCUMENTATION_EXPANDED
  );
  const [standardsExpanded, setStandardsExpanded] = useState(
    () => initialSession?.standardsExpanded ?? DEFAULT_WEB_REPORT_STANDARDS_EXPANDED
  );
  const [photoAddendumExpanded, setPhotoAddendumExpanded] = useState(
    () => initialSession?.photoAddendumExpanded ?? DEFAULT_WEB_REPORT_PHOTO_ADDENDUM_EXPANDED
  );
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

  const workspaceFacilityIds = useMemo(
    () =>
      [...new Set([localFacilityId, defaultFacilityId].map((id) => String(id || '').trim()).filter(Boolean))],
    [localFacilityId, defaultFacilityId]
  );

  const facilityOptions = useMemo(() => {
    if (!selectedProject) return [];
    return facilitiesForWebReport(selectedProject, facilities, {
      includeFacilityIds: workspaceFacilityIds,
      workspaceClientId
    });
  }, [selectedProject, facilities, workspaceFacilityIds, workspaceClientId]);

  const resolvedLocalFacility = useMemo(() => {
    if (!String(localFacilityId || '').trim()) return null;
    return facilities.find((f) => facilityIdsEqual(f.fldFacID, localFacilityId)) || null;
  }, [facilities, localFacilityId]);

  const facilityClientMismatch = useMemo(() => {
    if (!selectedProject || !resolvedLocalFacility) return false;
    return !facilityMatchesWebReportClientContext(
      resolvedLocalFacility,
      selectedProject,
      workspaceClientId
    );
  }, [selectedProject, resolvedLocalFacility, workspaceClientId]);

  const selectedFacility = useMemo(() => {
    if (!String(localFacilityId || '').trim()) return null;
    return facilityOptions.find((f) => facilityIdsEqual(f.fldFacID, localFacilityId)) || null;
  }, [facilityOptions, localFacilityId]);

  const mergedFacilityOptions = useMemo(() => {
    if (!selectedProject || !resolvedLocalFacility || facilityClientMismatch) {
      return facilityOptions;
    }
    if (
      !facilityMatchesWebReportClientContext(
        resolvedLocalFacility,
        selectedProject,
        workspaceClientId
      )
    ) {
      return facilityOptions;
    }
    return mergeWebReportFacilityOptions(facilityOptions, resolvedLocalFacility);
  }, [
    facilityOptions,
    selectedProject,
    resolvedLocalFacility,
    facilityClientMismatch,
    workspaceClientId
  ]);

  const effectiveFacility = useMemo(() => {
    if (facilityClientMismatch) return null;
    if (selectedFacility) return selectedFacility;
    if (
      resolvedLocalFacility &&
      selectedProject &&
      facilityMatchesWebReportClientContext(
        resolvedLocalFacility,
        selectedProject,
        workspaceClientId
      )
    ) {
      return resolvedLocalFacility;
    }
    return null;
  }, [
    facilityClientMismatch,
    selectedFacility,
    resolvedLocalFacility,
    selectedProject,
    workspaceClientId
  ]);

  const facilitySelectValue = useMemo(() => {
    const match = mergedFacilityOptions.find((f) => facilityIdsEqual(f.fldFacID, localFacilityId));
    return match?.fldFacID ?? localFacilityId;
  }, [mergedFacilityOptions, localFacilityId]);

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
    if (!selectedProject || !effectiveFacility || !dataInScope) return [];
    return getWebReportFacilityRecords(
      activeProjectData,
      selectedProject,
      effectiveFacility,
      glossary,
      categories,
      items,
      locations,
      findings
    );
  }, [
    activeProjectData,
    selectedProject,
    effectiveFacility,
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

  const defaultRecordInclusion = useMemo(
    () => createDefaultWebReportRecordInclusion(filterOptions),
    [filterOptions]
  );

  const viewerScopeKey = useMemo(() => {
    if (!localProjectId || !localFacilityId) return '';
    return `${String(localProjectId).trim()}|${String(localFacilityId).trim()}`;
  }, [localProjectId, localFacilityId]);

  const filterOptionsKey = useMemo(
    () =>
      [
        filterOptions.categories.map((o) => o.id).join('\0'),
        filterOptions.locations.map((o) => o.id).join('\0'),
        filterOptions.items.map((o) => o.id).join('\0')
      ].join('|'),
    [filterOptions]
  );

  const prevViewerScopeKeyRef = useRef('');

  const canPersistSession =
    Boolean(viewerScopeKey) &&
    dataInScope &&
    Boolean(selectedProject) &&
    Boolean(effectiveFacility);

  const sessionControlsForPersist = useCallback(
    () => ({
      projectId: localProjectId,
      facilityId: localFacilityId,
      sortOrder,
      sectionInclusion,
      inclusion: recordInclusionOverride ?? defaultRecordInclusion,
      narrativeExpanded,
      financialExpanded,
      documentationExpanded,
      standardsExpanded,
      photoAddendumExpanded
    }),
    [
      localProjectId,
      localFacilityId,
      sortOrder,
      sectionInclusion,
      recordInclusionOverride,
      defaultRecordInclusion,
      narrativeExpanded,
      financialExpanded,
      documentationExpanded,
      standardsExpanded,
      photoAddendumExpanded
    ]
  );

  const persistCollapsedKeys = useCallback(
    (keys: Set<string>) => {
      if (!canPersistSession) return;
      saveWebReportSessionControls(sessionControlsForPersist(), { collapsedKeys: keys });
    },
    [canPersistSession, sessionControlsForPersist]
  );

  const applyCollapsedKeys = useCallback(
    (next: Set<string>) => {
      setCollapsedKeys(next);
      persistCollapsedKeys(next);
    },
    [persistCollapsedKeys]
  );

  const resetViewerControlsToDefaults = useCallback(() => {
    setSortOrder('category_location_item');
    setSectionInclusion(DEFAULT_SECTION_INCLUSION);
    setRecordInclusionOverride(null);
    setNarrativeExpanded(DEFAULT_WEB_REPORT_NARRATIVE_EXPANDED);
    setFinancialExpanded(DEFAULT_WEB_REPORT_FINANCIAL_EXPANDED);
    setDocumentationExpanded(DEFAULT_WEB_REPORT_DOCUMENTATION_EXPANDED);
    setStandardsExpanded(DEFAULT_WEB_REPORT_STANDARDS_EXPANDED);
    setPhotoAddendumExpanded(DEFAULT_WEB_REPORT_PHOTO_ADDENDUM_EXPANDED);
    setCollapsedKeys(new Set());
    setFinancialCollapsedKeys(new Set());
  }, []);

  const applyLocalProjectSelection = useCallback(
    (nextProjectId: string) => {
      setLocalProjectId(nextProjectId);
      resetViewerControlsToDefaults();

      if (facilities.length === 0) return;

      const nextProject = projects.find((p) => p.fldProjID === nextProjectId) || null;
      if (!nextProject) return;

      const nextFacilityOptions = facilitiesForWebReport(nextProject, facilities, {
        includeFacilityIds: workspaceFacilityIds,
        workspaceClientId
      });
      const facilityStillValid = nextFacilityOptions.some((f) =>
        facilityIdsEqual(f.fldFacID, localFacilityId)
      );
      if (!facilityStillValid) {
        setLocalFacilityId(nextFacilityOptions[0]?.fldFacID ?? '');
      }
    },
    [facilities, projects, localFacilityId, workspaceFacilityIds, workspaceClientId, resetViewerControlsToDefaults]
  );

  const resetSessionStorageToDefaultsForScope = useCallback(
    (projectId: string, facilityId: string, options: WebReportFilterOptions) => {
      saveWebReportSessionState(createDefaultWebReportSessionState(projectId, facilityId, options));
    },
    []
  );

  useLayoutEffect(() => {
    if (!viewerScopeKey || !dataInScope) return;

    const prevScope = prevViewerScopeKeyRef.current;
    const scopeChanged = prevScope !== viewerScopeKey;
    if (!scopeChanged) return;

    const isRemountHydrate = prevScope === '';
    prevViewerScopeKeyRef.current = viewerScopeKey;

    const saved = loadWebReportSessionState();
    const matchScope =
      Boolean(saved) &&
      webReportSessionMatchesScope(saved, localProjectId, localFacilityId);

    if (isRemountHydrate && matchScope) {
      setSortOrder(saved!.sortOrder);
      setSectionInclusion(saved!.sectionInclusion);
      setRecordInclusionOverride(recordInclusionOverrideFromSession(saved!, filterOptions));
      setNarrativeExpanded(saved!.narrativeExpanded);
      setFinancialExpanded(saved!.financialExpanded);
      setDocumentationExpanded(saved!.documentationExpanded);
      setStandardsExpanded(saved!.standardsExpanded);
      setPhotoAddendumExpanded(saved!.photoAddendumExpanded);
      setCollapsedKeys(new Set(saved!.collapsedKeys));
      setFinancialCollapsedKeys(new Set(saved!.financialCollapsedKeys));
    } else {
      resetViewerControlsToDefaults();
      if (selectedProject && effectiveFacility) {
        resetSessionStorageToDefaultsForScope(
          localProjectId,
          localFacilityId,
          filterOptions
        );
      }
    }
  }, [
    viewerScopeKey,
    dataInScope,
    localProjectId,
    localFacilityId,
    filterOptions,
    selectedProject,
    effectiveFacility,
    resetViewerControlsToDefaults,
    resetSessionStorageToDefaultsForScope
  ]);

  useEffect(() => {
    if (!viewerScopeKey || !dataInScope) return;

    setRecordInclusionOverride((prev) => {
      if (!prev) return null;
      const pruned = pruneWebReportRecordInclusion(prev, filterOptions);
      return isWebReportRecordInclusionAllSelected(pruned, filterOptions) ? null : pruned;
    });
  }, [viewerScopeKey, filterOptionsKey, dataInScope, filterOptions]);

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
    if (!selectedProject || !effectiveFacility || !dataInScope) {
      return new Map<string, number>();
    }
    return buildCanonicalReportNumberMap(
      activeProjectData,
      selectedProject,
      effectiveFacility,
      glossary,
      categories,
      items,
      locations,
      findings
    );
  }, [
    activeProjectData,
    selectedProject,
    effectiveFacility,
    dataInScope,
    glossary,
    categories,
    items,
    locations,
    findings
  ]);

  const financialSummary = useMemo(
    () =>
      buildWebReportFinancialSummary(
        includedRecords,
        sortOrder,
        glossary,
        categories,
        items,
        locations,
        findings,
        canonicalReportNumbers
      ),
    [
      includedRecords,
      sortOrder,
      glossary,
      categories,
      items,
      locations,
      findings,
      canonicalReportNumbers
    ]
  );

  const documentationTree = useMemo(() => {
    if (!selectedProject || !effectiveFacility || !dataInScope) return null;
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
    effectiveFacility,
    dataInScope,
    glossary,
    categories,
    items,
    locations,
    findings,
    standards,
    sortOrder
  ]);

  const referencedStandardsView = useMemo(
    () => buildWebReportReferencedStandardsView(includedRecords, glossary, standards),
    [includedRecords, glossary, standards]
  );

  const hasPhotoAddendumPhotos = useMemo(
    () => includedRecordsHavePhotoAddendumPhotos(includedRecords),
    [includedRecords]
  );

  const photoAddendumView = useMemo(
    () =>
      buildWebReportPhotoAddendumView(
        includedRecords,
        sortOrder,
        glossary,
        categories,
        items,
        locations,
        findings,
        canonicalReportNumbers
      ),
    [
      includedRecords,
      sortOrder,
      glossary,
      categories,
      items,
      locations,
      findings,
      canonicalReportNumbers
    ]
  );

  const resolveInclusionForUpdate = (): WebReportRecordInclusion =>
    cloneWebReportRecordInclusion(recordInclusionOverride ?? defaultRecordInclusion);

  const updateRecordInclusion = (mutate: (inclusion: WebReportRecordInclusion) => void) => {
    const next = resolveInclusionForUpdate();
    mutate(next);
    setRecordInclusionOverride(next);
  };

  const resetContentFilters = () => setRecordInclusionOverride(null);

  const narrativeText = useMemo(() => {
    if (!selectedProject || !effectiveFacility) return '';
    return resolveFacilityReportNarrative(selectedProject, effectiveFacility.fldFacID);
  }, [selectedProject, effectiveFacility]);

  const accordionNodeIds = useMemo(
    () => collectWebReportAccordionNodeIds(documentationTree),
    [documentationTree]
  );

  useEffect(() => {
    if (accordionNodeIds.all.length === 0) return;
    setCollapsedKeys((prev) => {
      const next = reconcileWebReportCollapsedKeys(prev, accordionNodeIds);
      if (areCollapsedKeySetsEqual(prev, next)) return prev;
      persistCollapsedKeys(next);
      return next;
    });
  }, [accordionNodeIds, persistCollapsedKeys]);

  const financialParentKeys = useMemo(
    () => collectWebReportFinancialParentKeys(financialSummary.parentGroups),
    [financialSummary.parentGroups]
  );

  const persistFinancialCollapsedKeys = useCallback(
    (keys: Set<string>) => {
      if (!canPersistSession) return;
      saveWebReportSessionControls(sessionControlsForPersist(), {
        financialCollapsedKeys: keys
      });
    },
    [canPersistSession, sessionControlsForPersist]
  );

  const applyFinancialCollapsedKeys = useCallback(
    (next: Set<string>) => {
      setFinancialCollapsedKeys(next);
      persistFinancialCollapsedKeys(next);
    },
    [persistFinancialCollapsedKeys]
  );

  useEffect(() => {
    if (financialParentKeys.length === 0) return;
    setFinancialCollapsedKeys((prev) => {
      const next = reconcileWebReportFinancialCollapsedKeys(prev, financialParentKeys);
      if (areCollapsedKeySetsEqual(prev, next)) return prev;
      persistFinancialCollapsedKeys(next);
      return next;
    });
  }, [financialParentKeys, persistFinancialCollapsedKeys]);

  useEffect(() => {
    if (!canPersistSession) return;
    saveWebReportSessionControls(sessionControlsForPersist());
  }, [canPersistSession, sessionControlsForPersist]);

  const handleSortOrderChange = useCallback(
    (next: ReportRecordSortOrder) => {
      if (next === sortOrder) return;
      setSortOrder(next);
      setCollapsedKeys(new Set());
      setFinancialCollapsedKeys(new Set());
      if (!canPersistSession) return;
      saveWebReportSessionControls(
        {
          ...sessionControlsForPersist(),
          sortOrder: next
        },
        { collapsedKeys: [], financialCollapsedKeys: [] }
      );
    },
    [sortOrder, canPersistSession, sessionControlsForPersist]
  );

  const toggleCollapsed = (key: string) => {
    const next = new Set(collapsedKeys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    applyCollapsedKeys(next);
  };

  const toggleFinancialCollapsed = (key: string) => {
    const next = new Set(financialCollapsedKeys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    applyFinancialCollapsedKeys(next);
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
      </div>

      <Card className="space-y-4 border-dashed bg-zinc-50/80 p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Select
            label="Project"
            value={localProjectId}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
              applyLocalProjectSelection(e.target.value);
            }}
            options={projectOptions}
            placeholder="Select project…"
          />
          <Select
            label="Facility"
            value={facilitySelectValue}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
              setLocalFacilityId(e.target.value);
              resetViewerControlsToDefaults();
            }}
            options={mergedFacilityOptions.map((f) => ({
              value: f.fldFacID,
              label: f.fldFacName,
              key: `wr-fac-${f.fldFacID}`
            }))}
            placeholder={selectedProject ? 'Select facility…' : 'Select a project first'}
            disabled={!selectedProject || mergedFacilityOptions.length === 0}
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
                onChange={() => handleSortOrderChange('category_location_item')}
                className="h-4 w-4 border-zinc-300 text-indigo-600"
              />
              Category → Location → Item
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-800">
              <input
                type="radio"
                name="web-report-sort"
                checked={sortOrder === 'location_category_item'}
                onChange={() => handleSortOrderChange('location_category_item')}
                className="h-4 w-4 border-zinc-300 text-indigo-600"
              />
              Location → Category → Item
            </label>
          </div>
        </div>

        {dataInScope && selectedProject && effectiveFacility ? (
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

        <WebReportSectionInclusionControls
          sectionInclusion={sectionInclusion}
          onSectionInclusionChange={(patch) => setSectionInclusion((s) => ({ ...s, ...patch }))}
          hasReferencedStandards={referencedStandardsView.hasReferencedStandards}
          hasPhotoAddendumPhotos={hasPhotoAddendumPhotos}
        />
      </Card>

      {!selectedProject || !localFacilityId ? (
        <Card className="p-8 text-center text-sm text-zinc-500 italic">
          Select a project and facility to view the report.
        </Card>
      ) : facilities.length > 0 && !resolvedLocalFacility ? (
        <Card className="border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
          <p className="font-semibold">Selected facility could not be resolved.</p>
          <p className="mt-2 text-amber-800">
            Choose a facility from the list above, or select a valid facility in the workspace header.
          </p>
        </Card>
      ) : facilityClientMismatch ? (
        <Card className="border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
          <p className="font-semibold">Selected facility belongs to a different client than this project.</p>
          <p className="mt-2 text-amber-800">
            <strong>{resolvedLocalFacility?.fldFacName || localFacilityId}</strong> cannot be used with{' '}
            <strong>{selectedProject.fldProjName}</strong>. Choose a matching client/facility/project
            combination in the workspace header or facility list above.
          </p>
        </Card>
      ) : !effectiveFacility ? (
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
                <WebReportInfoRow label="Client" value={selectedClient?.fldClientName || '—'} />
                <WebReportInfoRow label="Project" value={selectedProject.fldProjName} />
                <WebReportInfoRow label="Facility" value={effectiveFacility.fldFacName} />
                <WebReportInfoRow
                  label="Address"
                  value={
                    [effectiveFacility.fldFacAddress, effectiveFacility.fldFacCity, effectiveFacility.fldFacState]
                      .filter(Boolean)
                      .join(', ') || 'TBD'
                  }
                />
                <WebReportInfoRow label="OCG Project #" value={selectedProject.fldProjNumber || 'TBD'} />
              </div>
              <div className="space-y-3">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                  Inspection
                </h3>
                <WebReportInfoRow
                  label="Inspector"
                  value={
                    selectedInspector
                      ? `${selectedInspector.fldInspName}${selectedInspector.fldTitle ? `, ${selectedInspector.fldTitle}` : ''}`
                      : 'TBD'
                  }
                />
                <WebReportInfoRow
                  label="Inspection date"
                  value={formatInspectionDate(
                    effectiveFacility.fldInspectionDate || selectedProject.fldPDDate
                  )}
                />
                <WebReportInfoRow
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
              <WebReportCollapseToggle
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

          {sectionInclusion.financial ? (
            <div className="space-y-3">
              <Card className="p-4">
                <WebReportCollapseToggle
                  level="top"
                  label="Financial"
                  subtitle={`${financialSummary.includedRecordCount} included records`}
                  expanded={financialExpanded}
                  onToggle={() => setFinancialExpanded((v) => !v)}
                />
                <p className="mt-2 border-t border-zinc-100 pt-2 text-xs leading-relaxed text-zinc-500">
                  Totals reflect the currently included Web Report records. Costs are report-adjusted.
                </p>
              </Card>
              {financialExpanded ? (
                financialSummary.includedRecordCount === 0 ? (
                  <Card className="p-6 text-center">
                    <p className="text-sm text-zinc-700">No included records with cost data.</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      Select a project/facility or adjust filters to include records.
                    </p>
                  </Card>
                ) : (
                  <WebReportFinancialTable
                    summary={financialSummary}
                    collapsedKeys={financialCollapsedKeys}
                    toggleCollapsed={toggleFinancialCollapsed}
                    onExpandAll={() => applyFinancialCollapsedKeys(new Set())}
                    onCollapseAll={() =>
                      applyFinancialCollapsedKeys(new Set(financialParentKeys))
                    }
                  />
                )
              ) : null}
            </div>
          ) : null}

          {sectionInclusion.documentation ? (
            <div className="space-y-3">
              <Card className="p-4">
                <WebReportCollapseToggle
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
                      onExpandAll={() =>
                        applyCollapsedKeys(applyWebReportAccordionExpandAll())
                      }
                      onCollapseAll={() =>
                        applyCollapsedKeys(applyWebReportAccordionCollapseAll(accordionNodeIds))
                      }
                      onExpandLevel={(level) =>
                        applyCollapsedKeys(
                          applyWebReportAccordionExpandLevel(
                            collapsedKeys,
                            webReportAccordionLevelIds(accordionNodeIds, level)
                          )
                        )
                      }
                      onCollapseLevel={(level) =>
                        applyCollapsedKeys(
                          applyWebReportAccordionCollapseLevel(
                            collapsedKeys,
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

          {sectionInclusion.standards ? (
            <WebReportStandardsSection
              view={referencedStandardsView}
              expanded={standardsExpanded}
              onToggleExpanded={() => setStandardsExpanded((v) => !v)}
              includedRecordCount={filteredRecordCount}
              filtersRestricted={filtersRestricted}
            />
          ) : null}

          {sectionInclusion.photoAddendum ? (
            <WebReportPhotoAddendumSection
              view={photoAddendumView}
              expanded={photoAddendumExpanded}
              onToggleExpanded={() => setPhotoAddendumExpanded((v) => !v)}
              includedRecordCount={filteredRecordCount}
              filtersRestricted={filtersRestricted}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
