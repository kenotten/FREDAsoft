import {
  createDefaultWebReportRecordInclusion,
  isWebReportRecordInclusionAllSelected,
  pruneWebReportRecordInclusion,
  type WebReportFilterOptions,
  type WebReportRecordInclusion
} from './webReportFilters';
import type { ReportRecordSortOrder } from './reportPreviewShared';
import { WEB_REPORT_SESSION_STORAGE_KEY } from './storageKeys';

export type WebReportSectionInclusion = {
  narrative: boolean;
  financial: boolean;
  documentation: boolean;
  standards: boolean;
  photoAddendum: boolean;
};

export type WebReportSessionStateV1 = {
  v: 1;
  projectId: string;
  facilityId: string;
  sortOrder: ReportRecordSortOrder;
  sectionInclusion: WebReportSectionInclusion;
  categoryIds: string[];
  locationIds: string[];
  itemIds: string[];
  narrativeExpanded: boolean;
  financialExpanded: boolean;
  documentationExpanded: boolean;
  standardsExpanded: boolean;
  photoAddendumExpanded: boolean;
  collapsedKeys: string[];
  financialCollapsedKeys: string[];
};

const DEFAULT_SECTION_INCLUSION: WebReportSectionInclusion = {
  narrative: true,
  financial: true,
  documentation: true,
  standards: true,
  photoAddendum: true
};

export const DEFAULT_WEB_REPORT_NARRATIVE_EXPANDED = true;
export const DEFAULT_WEB_REPORT_FINANCIAL_EXPANDED = true;
export const DEFAULT_WEB_REPORT_DOCUMENTATION_EXPANDED = true;
export const DEFAULT_WEB_REPORT_STANDARDS_EXPANDED = true;
export const DEFAULT_WEB_REPORT_PHOTO_ADDENDUM_EXPANDED = true;

function isSortOrder(value: unknown): value is ReportRecordSortOrder {
  return value === 'category_location_item' || value === 'location_category_item';
}

function parseSectionInclusion(value: unknown): WebReportSectionInclusion {
  if (!value || typeof value !== 'object') return { ...DEFAULT_SECTION_INCLUSION };
  const o = value as Record<string, unknown>;
  return {
    narrative: typeof o.narrative === 'boolean' ? o.narrative : DEFAULT_SECTION_INCLUSION.narrative,
    financial: typeof o.financial === 'boolean' ? o.financial : DEFAULT_SECTION_INCLUSION.financial,
    documentation:
      typeof o.documentation === 'boolean'
        ? o.documentation
        : DEFAULT_SECTION_INCLUSION.documentation,
    standards: typeof o.standards === 'boolean' ? o.standards : DEFAULT_SECTION_INCLUSION.standards,
    photoAddendum:
      typeof o.photoAddendum === 'boolean'
        ? o.photoAddendum
        : typeof o.photos === 'boolean'
          ? o.photos
          : DEFAULT_SECTION_INCLUSION.photoAddendum
  };
}

function parseIdArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((id): id is string => typeof id === 'string' && id.trim() !== '');
}

function parseBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

export function normalizeWebReportScopeId(id: string): string {
  return String(id || '').trim();
}

export function webReportSessionMatchesScope(
  state: WebReportSessionStateV1,
  projectId: string,
  facilityId: string
): boolean {
  return (
    normalizeWebReportScopeId(state.projectId) === normalizeWebReportScopeId(projectId) &&
    normalizeWebReportScopeId(state.facilityId) === normalizeWebReportScopeId(facilityId)
  );
}

export function loadWebReportSessionState(): WebReportSessionStateV1 | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(WEB_REPORT_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    const o = parsed as Record<string, unknown>;
    if (o.v !== 1) return null;
    const projectId = normalizeWebReportScopeId(String(o.projectId ?? ''));
    const facilityId = normalizeWebReportScopeId(String(o.facilityId ?? ''));
    if (!projectId || !facilityId) return null;
    if (!isSortOrder(o.sortOrder)) return null;
    return {
      v: 1,
      projectId,
      facilityId,
      sortOrder: o.sortOrder,
      sectionInclusion: parseSectionInclusion(o.sectionInclusion),
      categoryIds: parseIdArray(o.categoryIds),
      locationIds: parseIdArray(o.locationIds),
      itemIds: parseIdArray(o.itemIds),
      narrativeExpanded: parseBoolean(o.narrativeExpanded, DEFAULT_WEB_REPORT_NARRATIVE_EXPANDED),
      financialExpanded: parseBoolean(o.financialExpanded, DEFAULT_WEB_REPORT_FINANCIAL_EXPANDED),
      documentationExpanded: parseBoolean(
        o.documentationExpanded,
        DEFAULT_WEB_REPORT_DOCUMENTATION_EXPANDED
      ),
      standardsExpanded: parseBoolean(o.standardsExpanded, DEFAULT_WEB_REPORT_STANDARDS_EXPANDED),
      photoAddendumExpanded: parseBoolean(
        o.photoAddendumExpanded ?? o.photosExpanded,
        DEFAULT_WEB_REPORT_PHOTO_ADDENDUM_EXPANDED
      ),
      collapsedKeys: parseIdArray(o.collapsedKeys),
      financialCollapsedKeys: parseIdArray(o.financialCollapsedKeys)
    };
  } catch {
    return null;
  }
}

export function saveWebReportSessionState(state: WebReportSessionStateV1): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    const payload: WebReportSessionStateV1 = {
      v: 1,
      projectId: normalizeWebReportScopeId(state.projectId),
      facilityId: normalizeWebReportScopeId(state.facilityId),
      sortOrder: state.sortOrder,
      sectionInclusion: {
        narrative: Boolean(state.sectionInclusion.narrative),
        financial: Boolean(state.sectionInclusion.financial),
        documentation: Boolean(state.sectionInclusion.documentation),
        standards: Boolean(state.sectionInclusion.standards),
        photoAddendum: Boolean(state.sectionInclusion.photoAddendum)
      },
      categoryIds: state.categoryIds.filter((id) => id.trim() !== ''),
      locationIds: state.locationIds.filter((id) => id.trim() !== ''),
      itemIds: state.itemIds.filter((id) => id.trim() !== ''),
      narrativeExpanded: Boolean(state.narrativeExpanded),
      financialExpanded: Boolean(state.financialExpanded),
      documentationExpanded: Boolean(state.documentationExpanded),
      standardsExpanded: Boolean(state.standardsExpanded),
      photoAddendumExpanded: Boolean(state.photoAddendumExpanded),
      collapsedKeys: state.collapsedKeys.filter((key) => key.trim() !== ''),
      financialCollapsedKeys: state.financialCollapsedKeys.filter((key) => key.trim() !== '')
    };
    sessionStorage.setItem(WEB_REPORT_SESSION_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}

export function clearWebReportSessionState(): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.removeItem(WEB_REPORT_SESSION_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function recordInclusionFromSessionArrays(
  categoryIds: string[],
  locationIds: string[],
  itemIds: string[],
  filterOptions: WebReportFilterOptions
): WebReportRecordInclusion {
  const pruned = pruneWebReportRecordInclusion(
    {
      categoryIds: new Set(categoryIds),
      locationIds: new Set(locationIds),
      itemIds: new Set(itemIds)
    },
    filterOptions
  );
  const hasAnyOptions =
    filterOptions.categories.length > 0 ||
    filterOptions.locations.length > 0 ||
    filterOptions.items.length > 0;
  if (!hasAnyOptions) {
    return createDefaultWebReportRecordInclusion(filterOptions);
  }
  if (
    pruned.categoryIds.size === 0 &&
    pruned.locationIds.size === 0 &&
    pruned.itemIds.size === 0
  ) {
    return createDefaultWebReportRecordInclusion(filterOptions);
  }
  return pruned;
}

export function recordInclusionOverrideFromSession(
  state: WebReportSessionStateV1,
  filterOptions: WebReportFilterOptions
): WebReportRecordInclusion | null {
  const inclusion = recordInclusionFromSessionArrays(
    state.categoryIds,
    state.locationIds,
    state.itemIds,
    filterOptions
  );
  return isWebReportRecordInclusionAllSelected(inclusion, filterOptions) ? null : inclusion;
}

export type WebReportSessionControlsInput = {
  projectId: string;
  facilityId: string;
  sortOrder: ReportRecordSortOrder;
  sectionInclusion: WebReportSectionInclusion;
  inclusion: WebReportRecordInclusion;
  narrativeExpanded: boolean;
  financialExpanded: boolean;
  documentationExpanded: boolean;
  standardsExpanded: boolean;
  photoAddendumExpanded: boolean;
};

export function areCollapsedKeySetsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const key of a) {
    if (!b.has(key)) return false;
  }
  return true;
}

function resolveCollapsedKeysForSave(
  projectId: string,
  facilityId: string,
  sortOrder: ReportRecordSortOrder,
  explicit?: Iterable<string>
): string[] {
  if (explicit !== undefined) {
    return [...explicit].filter((key) => key.trim() !== '');
  }
  const existing = loadWebReportSessionState();
  if (
    existing &&
    webReportSessionMatchesScope(existing, projectId, facilityId) &&
    existing.sortOrder === sortOrder
  ) {
    return existing.collapsedKeys;
  }
  return [];
}

function resolveFinancialCollapsedKeysForSave(
  projectId: string,
  facilityId: string,
  sortOrder: ReportRecordSortOrder,
  explicit?: Iterable<string>
): string[] {
  if (explicit !== undefined) {
    return [...explicit].filter((key) => key.trim() !== '');
  }
  const existing = loadWebReportSessionState();
  if (
    existing &&
    webReportSessionMatchesScope(existing, projectId, facilityId) &&
    existing.sortOrder === sortOrder
  ) {
    return existing.financialCollapsedKeys;
  }
  return [];
}

/** Session blob for matching project/facility on mount, or null. */
export function readWebReportSessionForScope(
  projectId: string,
  facilityId: string
): WebReportSessionStateV1 | null {
  const saved = loadWebReportSessionState();
  if (!saved || !webReportSessionMatchesScope(saved, projectId, facilityId)) {
    return null;
  }
  return saved;
}

/** Persist viewer controls; preserves stored collapsedKeys unless explicit keys are provided. */
export function saveWebReportSessionControls(
  controls: WebReportSessionControlsInput,
  options?: { collapsedKeys?: Iterable<string>; financialCollapsedKeys?: Iterable<string> }
): void {
  const collapsedKeys = resolveCollapsedKeysForSave(
    controls.projectId,
    controls.facilityId,
    controls.sortOrder,
    options?.collapsedKeys
  );
  const financialCollapsedKeys = resolveFinancialCollapsedKeysForSave(
    controls.projectId,
    controls.facilityId,
    controls.sortOrder,
    options?.financialCollapsedKeys
  );
  saveWebReportSessionState(
    buildWebReportSessionStatePayload({
      ...controls,
      collapsedKeys,
      financialCollapsedKeys
    })
  );
}

export function buildWebReportSessionStatePayload(args: {
  projectId: string;
  facilityId: string;
  sortOrder: ReportRecordSortOrder;
  sectionInclusion: WebReportSectionInclusion;
  inclusion: WebReportRecordInclusion;
  narrativeExpanded: boolean;
  financialExpanded: boolean;
  documentationExpanded: boolean;
  standardsExpanded: boolean;
  photoAddendumExpanded: boolean;
  collapsedKeys: Iterable<string>;
  financialCollapsedKeys: Iterable<string>;
}): WebReportSessionStateV1 {
  return {
    v: 1,
    projectId: normalizeWebReportScopeId(args.projectId),
    facilityId: normalizeWebReportScopeId(args.facilityId),
    sortOrder: args.sortOrder,
    sectionInclusion: {
      narrative: Boolean(args.sectionInclusion.narrative),
      financial: Boolean(args.sectionInclusion.financial),
      documentation: Boolean(args.sectionInclusion.documentation),
      standards: Boolean(args.sectionInclusion.standards),
      photoAddendum: Boolean(args.sectionInclusion.photoAddendum)
    },
    categoryIds: [...args.inclusion.categoryIds],
    locationIds: [...args.inclusion.locationIds],
    itemIds: [...args.inclusion.itemIds],
    narrativeExpanded: Boolean(args.narrativeExpanded),
    financialExpanded: Boolean(args.financialExpanded),
    documentationExpanded: Boolean(args.documentationExpanded),
    standardsExpanded: Boolean(args.standardsExpanded),
    photoAddendumExpanded: Boolean(args.photoAddendumExpanded),
    collapsedKeys: [...args.collapsedKeys].filter((key) => key.trim() !== ''),
    financialCollapsedKeys: [...args.financialCollapsedKeys].filter((key) => key.trim() !== '')
  };
}

export function createDefaultWebReportSessionState(
  projectId: string,
  facilityId: string,
  filterOptions: WebReportFilterOptions
): WebReportSessionStateV1 {
  const inclusion = createDefaultWebReportRecordInclusion(filterOptions);
  return buildWebReportSessionStatePayload({
    projectId,
    facilityId,
    sortOrder: 'category_location_item',
    sectionInclusion: { ...DEFAULT_SECTION_INCLUSION },
    inclusion,
    narrativeExpanded: DEFAULT_WEB_REPORT_NARRATIVE_EXPANDED,
    financialExpanded: DEFAULT_WEB_REPORT_FINANCIAL_EXPANDED,
    documentationExpanded: DEFAULT_WEB_REPORT_DOCUMENTATION_EXPANDED,
    standardsExpanded: DEFAULT_WEB_REPORT_STANDARDS_EXPANDED,
    photoAddendumExpanded: DEFAULT_WEB_REPORT_PHOTO_ADDENDUM_EXPANDED,
    collapsedKeys: [],
    financialCollapsedKeys: []
  });
}
