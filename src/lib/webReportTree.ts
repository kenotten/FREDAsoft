import type {
  Project,
  Facility,
  ProjectData,
  Glossary,
  Category,
  Item,
  Location,
  Finding,
  MasterStandard,
  Client,
  Inspector
} from '../types';
import {
  filterReportProjectForPreview,
  getRecordStandardIds,
  formatGroupedStandardCitations,
  compareReportRecordSortKeys,
  compareReportRecordSortKeysLocationFirst,
  getReportRecordSortKeys,
  type ReportRecordSortOrder
} from './reportPreviewShared';

export type WebReportEnrichedRecord = ProjectData & {
  totalCost?: number;
  displayUnitCost?: number;
  displayUnitType?: string;
};

/** Canonical report order for stable record numbers (independent of viewer hierarchy mode). */
export const CANONICAL_WEB_REPORT_SORT_ORDER: ReportRecordSortOrder = 'category_location_item';

export function reportRecordIdKey(record: Pick<ProjectData, 'fldPDataID'>): string {
  return String(record.fldPDataID || '').trim();
}

/**
 * Stable 1-based report numbers for all records in project + facility scope.
 * Uses the same filter/dedupe/sort as PDF reports with Category → Location → Item.
 * Not affected by viewer hierarchy mode, filters, accordion, or section toggles.
 */
export function buildCanonicalReportNumberMap(
  projectData: ProjectData[],
  project: Project,
  facility: Facility,
  glossary: Glossary[],
  categories: Category[],
  items: Item[],
  locations: Location[],
  findings: Finding[]
): Map<string, number> {
  const filtered = filterReportProjectForPreview(
    projectData,
    project,
    facility,
    glossary,
    categories,
    items,
    locations,
    findings,
    CANONICAL_WEB_REPORT_SORT_ORDER
  );

  const map = new Map<string, number>();
  filtered.forEach((record, index) => {
    const key = reportRecordIdKey(record);
    if (key && !map.has(key)) {
      map.set(key, index + 1);
    }
  });
  return map;
}

export function getCanonicalReportNumber(
  map: Map<string, number>,
  recordId: string | undefined | null
): number | null {
  const key = String(recordId || '').trim();
  if (!key) return null;
  const n = map.get(key);
  return n !== undefined ? n : null;
}

export type WebReportRecordView = {
  record: WebReportEnrichedRecord;
  categoryName: string;
  itemName: string;
  locationName: string;
  findingShort: string;
  citationsLabel: string;
};

export type WebReportItemGroup = {
  key: string;
  itemId: string;
  itemName: string;
  itemOrder: number;
  records: WebReportRecordView[];
};

export type WebReportMidGroup = {
  key: string;
  label: string;
  sortOrder: number;
  items: WebReportItemGroup[];
};

export type WebReportTopGroup = {
  key: string;
  label: string;
  sortOrder: number;
  children: WebReportMidGroup[];
};

export type WebReportDocumentationTree = {
  sortOrder: ReportRecordSortOrder;
  topGroups: WebReportTopGroup[];
  recordCount: number;
};

function sortFacilitiesByName(list: Facility[]): Facility[] {
  return [...list].sort((a, b) =>
    (a.fldFacName || '').localeCompare(b.fldFacName || '', undefined, { sensitivity: 'base' })
  );
}

export function normalizeFacilityId(id: string | undefined | null): string {
  return String(id || '').trim().toLowerCase();
}

export function facilityIdsEqual(
  a: string | undefined | null,
  b: string | undefined | null
): boolean {
  return normalizeFacilityId(a) === normalizeFacilityId(b);
}

function findFacilityById(facilities: Facility[], id: string): Facility | undefined {
  const key = normalizeFacilityId(id);
  if (!key) return undefined;
  return facilities.find((f) => normalizeFacilityId(f.fldFacID) === key);
}

export function facilityMatchesWebReportClientContext(
  facility: Facility,
  project: Project,
  workspaceClientId?: string
): boolean {
  const facClient = String(facility.fldClient || '').trim();
  const projectClientId = String(project.fldClient || '').trim();
  const wsClientId = String(workspaceClientId || '').trim();
  return (
    facClient === projectClientId || (wsClientId !== '' && facClient === wsClientId)
  );
}

export function mergeWebReportFacilityOptions(
  base: Facility[],
  extra: Facility | null | undefined
): Facility[] {
  if (!extra) return base;
  if (base.some((f) => facilityIdsEqual(f.fldFacID, extra.fldFacID))) return base;
  return sortFacilitiesByName([...base, extra]);
}

export function facilitiesForProject(project: Project, facilities: Facility[]): Facility[] {
  const clientId = String(project.fldClient || '').trim();
  const facIds = Array.isArray(project.fldFacilities) ? project.fldFacilities : [];
  const linkedFacilityIds = new Set(
    facIds.map((id) => normalizeFacilityId(id)).filter(Boolean)
  );
  const legacyFacId = normalizeFacilityId(project.fldFacID);

  return sortFacilitiesByName(
    facilities.filter((f) => {
      if (String(f.fldClient || '').trim() !== clientId) return false;
      const facId = normalizeFacilityId(f.fldFacID);
      if (linkedFacilityIds.has(facId)) return true;
      if (legacyFacId && facId === legacyFacId) return true;
      return false;
    })
  );
}

/** Project-linked facilities plus same-client workspace selections for Web Report Viewer. */
export function facilitiesForWebReport(
  project: Project,
  facilities: Facility[],
  options?: { includeFacilityIds?: string[]; workspaceClientId?: string }
): Facility[] {
  const base = facilitiesForProject(project, facilities);
  const existingIds = new Set(
    base.map((f) => normalizeFacilityId(f.fldFacID)).filter(Boolean)
  );
  const workspaceClientId = String(options?.workspaceClientId || '').trim();

  const extraIds = [
    ...new Set(
      (options?.includeFacilityIds ?? [])
        .map((id) => normalizeFacilityId(id))
        .filter(Boolean)
    )
  ];

  const extras = extraIds
    .filter((id) => !existingIds.has(id))
    .map((id) => findFacilityById(facilities, id))
    .filter(
      (f): f is Facility =>
        Boolean(f) &&
        facilityMatchesWebReportClientContext(f!, project, workspaceClientId)
    );

  return sortFacilitiesByName([...base, ...extras]);
}

function resolveGlossaryRow(record: ProjectData, glossary: Glossary[]): Glossary | undefined {
  const cleanKey = (record.fldData || '').trim().toLowerCase();
  return glossary.find((g) => (g.fldGlosId || '').trim().toLowerCase() === cleanKey);
}

export function resolveWebReportRecordView(
  record: WebReportEnrichedRecord,
  glossary: Glossary[],
  categories: Category[],
  items: Item[],
  locations: Location[],
  standards: MasterStandard[]
): WebReportRecordView {
  const glos = resolveGlossaryRow(record, glossary);
  const isCustom = record?.fldRecordSource === 'custom' && !glos;
  const catId = glos?.fldCat || (isCustom ? record?.fldPDataCategoryID || '' : '');
  const itemId = glos?.fldItem || (isCustom ? record?.fldPDataItemID || '' : '');
  const cat = categories.find((c) => c.fldCategoryID === catId);
  const item = items.find((i) => i.fldItemID === itemId);
  const location = locations.find((l) => l.fldLocID === record.fldLocation);
  const stdIds = getRecordStandardIds(record, glos);
  const citationsLabel =
    stdIds.length > 0 ? formatGroupedStandardCitations(stdIds, standards) : '';

  return {
    record,
    categoryName: cat?.fldCategoryName || 'Uncategorized',
    itemName: item?.fldItemName || 'N/A',
    locationName: location?.fldLocName?.trim() || 'Unknown location',
    findingShort: record.fldFindShort || 'Untitled finding',
    citationsLabel
  };
}

function compareTopGroups(a: WebReportTopGroup, b: WebReportTopGroup): number {
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
  return a.label.localeCompare(b.label, undefined, { sensitivity: 'base' });
}

function compareItemGroups(a: WebReportItemGroup, b: WebReportItemGroup): number {
  if (a.itemOrder !== b.itemOrder) return a.itemOrder - b.itemOrder;
  return a.itemName.localeCompare(b.itemName, undefined, { sensitivity: 'base' });
}

function buildRecordViews(
  records: WebReportEnrichedRecord[],
  glossary: Glossary[],
  categories: Category[],
  items: Item[],
  locations: Location[],
  standards: MasterStandard[]
): WebReportRecordView[] {
  return records.map((r) =>
    resolveWebReportRecordView(r, glossary, categories, items, locations, standards)
  );
}

export function resolveWebReportRecordDimensionIds(
  record: WebReportEnrichedRecord,
  glossary: Glossary[]
): { catId: string; itemId: string } {
  const glos = resolveGlossaryRow(record, glossary);
  const isCustom = record?.fldRecordSource === 'custom' && !glos;
  return {
    catId: glos?.fldCat || (isCustom ? record?.fldPDataCategoryID || '' : '') || '__none__',
    itemId: glos?.fldItem || (isCustom ? record?.fldPDataItemID || '' : '') || '__none__'
  };
}

export function resolveWebReportLocationId(record: WebReportEnrichedRecord): string {
  return String(record.fldLocation || '__none__').trim() || '__none__';
}

/** Full facility report records (deduped, enriched). Sort order is canonical; re-sort for display separately. */
export function getWebReportFacilityRecords(
  projectData: ProjectData[],
  project: Project,
  facility: Facility,
  glossary: Glossary[],
  categories: Category[],
  items: Item[],
  locations: Location[],
  findings: Finding[]
): WebReportEnrichedRecord[] {
  return filterReportProjectForPreview(
    projectData,
    project,
    facility,
    glossary,
    categories,
    items,
    locations,
    findings,
    CANONICAL_WEB_REPORT_SORT_ORDER
  ) as WebReportEnrichedRecord[];
}

export function sortWebReportRecordsForDisplay(
  records: WebReportEnrichedRecord[],
  sortOrder: ReportRecordSortOrder,
  glossary: Glossary[],
  categories: Category[],
  items: Item[],
  locations: Location[],
  findings: Finding[]
): WebReportEnrichedRecord[] {
  const compare =
    sortOrder === 'location_category_item'
      ? compareReportRecordSortKeysLocationFirst
      : compareReportRecordSortKeys;

  return [...records].sort((a, b) => {
    const ka = getReportRecordSortKeys(a, glossary, categories, items, locations, findings);
    const kb = getReportRecordSortKeys(b, glossary, categories, items, locations, findings);
    return compare(ka, kb);
  });
}

function groupRecordsCategoryLocationItem(
  views: WebReportRecordView[],
  glossary: Glossary[],
  categories: Category[],
  items: Item[]
): WebReportTopGroup[] {
  type CatBucket = {
    catId: string;
    catOrder: number;
    catName: string;
    locs: Map<string, { locId: string; locName: string; itemMap: Map<string, WebReportRecordView[]> }>;
  };

  const catMap = new Map<string, CatBucket>();

  for (const view of views) {
    const { catId, itemId } = resolveWebReportRecordDimensionIds(view.record, glossary);
    const locId = resolveWebReportLocationId(view.record);

    const cat = categories.find((c) => c.fldCategoryID === catId);
    const catOrder = cat?.fldOrder ?? 999;
    const catName = view.categoryName;

    if (!catMap.has(catId)) {
      catMap.set(catId, { catId, catOrder, catName, locs: new Map() });
    }
    const catBucket = catMap.get(catId)!;
    if (!catBucket.locs.has(locId)) {
      catBucket.locs.set(locId, { locId, locName: view.locationName, itemMap: new Map() });
    }
    const locBucket = catBucket.locs.get(locId)!;
    if (!locBucket.itemMap.has(itemId)) {
      locBucket.itemMap.set(itemId, []);
    }
    locBucket.itemMap.get(itemId)!.push(view);
  }

  const topGroups: WebReportTopGroup[] = [];

  for (const catBucket of catMap.values()) {
    const midGroups: WebReportMidGroup[] = [];
    const locList = Array.from(catBucket.locs.values()).sort((a, b) =>
      a.locName.localeCompare(b.locName, undefined, { sensitivity: 'base' })
    );

    for (const locBucket of locList) {
      const itemGroups: WebReportItemGroup[] = [];
      for (const [itemId, recs] of locBucket.itemMap.entries()) {
        const item = items.find((i) => i.fldItemID === itemId);
        itemGroups.push({
          key: `item:${catBucket.catId}:${locBucket.locId}:${itemId}`,
          itemId,
          itemName: item?.fldItemName || recs[0]?.itemName || 'N/A',
          itemOrder: item?.fldOrder ?? 999,
          records: recs
        });
      }
      itemGroups.sort(compareItemGroups);
      midGroups.push({
        key: `loc:${catBucket.catId}:${locBucket.locId}`,
        label: locBucket.locName,
        sortOrder: 0,
        items: itemGroups
      });
    }

    topGroups.push({
      key: `cat:${catBucket.catId}`,
      label: catBucket.catName,
      sortOrder: catBucket.catOrder,
      children: midGroups
    });
  }

  topGroups.sort(compareTopGroups);
  return topGroups;
}

function groupRecordsLocationCategoryItem(
  views: WebReportRecordView[],
  glossary: Glossary[],
  categories: Category[],
  items: Item[]
): WebReportTopGroup[] {
  type LocBucket = {
    locId: string;
    locName: string;
    cats: Map<string, { catId: string; catOrder: number; catName: string; itemMap: Map<string, WebReportRecordView[]> }>;
  };

  const locMap = new Map<string, LocBucket>();

  for (const view of views) {
    const { catId, itemId } = resolveWebReportRecordDimensionIds(view.record, glossary);
    const locId = resolveWebReportLocationId(view.record);

    const cat = categories.find((c) => c.fldCategoryID === catId);
    const catOrder = cat?.fldOrder ?? 999;
    const catName = view.categoryName;

    if (!locMap.has(locId)) {
      locMap.set(locId, { locId, locName: view.locationName, cats: new Map() });
    }
    const locBucket = locMap.get(locId)!;
    if (!locBucket.cats.has(catId)) {
      locBucket.cats.set(catId, { catId, catOrder, catName, itemMap: new Map() });
    }
    const catBucket = locBucket.cats.get(catId)!;
    if (!catBucket.itemMap.has(itemId)) {
      catBucket.itemMap.set(itemId, []);
    }
    catBucket.itemMap.get(itemId)!.push(view);
  }

  const topGroups: WebReportTopGroup[] = [];

  for (const locBucket of locMap.values()) {
    const midGroups: WebReportMidGroup[] = [];
    const catList = Array.from(locBucket.cats.values()).sort((a, b) => {
      if (a.catOrder !== b.catOrder) return a.catOrder - b.catOrder;
      return a.catName.localeCompare(b.catName, undefined, { sensitivity: 'base' });
    });

    for (const catBucket of catList) {
      const itemGroups: WebReportItemGroup[] = [];
      for (const [itemId, recs] of catBucket.itemMap.entries()) {
        const item = items.find((i) => i.fldItemID === itemId);
        itemGroups.push({
          key: `item:${locBucket.locId}:${catBucket.catId}:${itemId}`,
          itemId,
          itemName: item?.fldItemName || recs[0]?.itemName || 'N/A',
          itemOrder: item?.fldOrder ?? 999,
          records: recs
        });
      }
      itemGroups.sort(compareItemGroups);
      midGroups.push({
        key: `cat:${locBucket.locId}:${catBucket.catId}`,
        label: catBucket.catName,
        sortOrder: catBucket.catOrder,
        items: itemGroups
      });
    }

    topGroups.push({
      key: `loc:${locBucket.locId}`,
      label: locBucket.locName,
      sortOrder: 0,
      children: midGroups
    });
  }

  topGroups.sort((a, b) =>
    a.label.localeCompare(b.label, undefined, { sensitivity: 'base' })
  );
  return topGroups;
}

export function buildWebReportDocumentationTreeFromRecords(
  facilityRecords: WebReportEnrichedRecord[],
  glossary: Glossary[],
  categories: Category[],
  items: Item[],
  locations: Location[],
  findings: Finding[],
  standards: MasterStandard[],
  sortOrder: ReportRecordSortOrder
): WebReportDocumentationTree {
  const sorted = sortWebReportRecordsForDisplay(
    facilityRecords,
    sortOrder,
    glossary,
    categories,
    items,
    locations,
    findings
  );

  const views = buildRecordViews(sorted, glossary, categories, items, locations, standards);

  const topGroups =
    sortOrder === 'location_category_item'
      ? groupRecordsLocationCategoryItem(views, glossary, categories, items)
      : groupRecordsCategoryLocationItem(views, glossary, categories, items);

  return {
    sortOrder,
    topGroups,
    recordCount: facilityRecords.length
  };
}

export function buildWebReportDocumentationTree(
  projectData: ProjectData[],
  project: Project,
  facility: Facility,
  glossary: Glossary[],
  categories: Category[],
  items: Item[],
  locations: Location[],
  findings: Finding[],
  standards: MasterStandard[],
  sortOrder: ReportRecordSortOrder
): WebReportDocumentationTree {
  const facilityRecords = getWebReportFacilityRecords(
    projectData,
    project,
    facility,
    glossary,
    categories,
    items,
    locations,
    findings
  );
  return buildWebReportDocumentationTreeFromRecords(
    facilityRecords,
    glossary,
    categories,
    items,
    locations,
    findings,
    standards,
    sortOrder
  );
}

export type WebReportHeadingContext = {
  client: Client | null;
  project: Project;
  facility: Facility;
  inspector: Inspector | null;
};
