import type { Glossary, Category, Item, Location } from '../types';
import {
  resolveWebReportLocationId,
  resolveWebReportRecordDimensionIds,
  type WebReportEnrichedRecord
} from './webReportTree';

export type WebReportFilterOption = {
  id: string;
  label: string;
  sortOrder: number;
};

export type WebReportFilterOptions = {
  categories: WebReportFilterOption[];
  locations: WebReportFilterOption[];
  items: WebReportFilterOption[];
};

export type WebReportRecordInclusion = {
  categoryIds: Set<string>;
  locationIds: Set<string>;
  itemIds: Set<string>;
};

const NONE_CATEGORY_LABEL = 'Uncategorized';
const NONE_LOCATION_LABEL = 'Unknown location';
const NONE_ITEM_LABEL = 'N/A';

export function deriveWebReportFilterOptions(
  facilityRecords: WebReportEnrichedRecord[],
  glossary: Glossary[],
  categories: Category[],
  items: Item[],
  locations: Location[]
): WebReportFilterOptions {
  const catMap = new Map<string, { label: string; sortOrder: number }>();
  const locMap = new Map<string, { label: string }>();
  const itemMap = new Map<string, { label: string; sortOrder: number }>();

  for (const record of facilityRecords) {
    const { catId, itemId } = resolveWebReportRecordDimensionIds(record, glossary);
    const locId = resolveWebReportLocationId(record);

    if (!catMap.has(catId)) {
      const cat = categories.find((c) => c.fldCategoryID === catId);
      catMap.set(catId, {
        label: catId === '__none__' ? NONE_CATEGORY_LABEL : cat?.fldCategoryName || NONE_CATEGORY_LABEL,
        sortOrder: cat?.fldOrder ?? 999
      });
    }

    if (!locMap.has(locId)) {
      const loc = locations.find((l) => l.fldLocID === locId);
      locMap.set(locId, {
        label:
          locId === '__none__'
            ? NONE_LOCATION_LABEL
            : loc?.fldLocName?.trim() || NONE_LOCATION_LABEL
      });
    }

    if (!itemMap.has(itemId)) {
      const item = items.find((i) => i.fldItemID === itemId);
      itemMap.set(itemId, {
        label: itemId === '__none__' ? NONE_ITEM_LABEL : item?.fldItemName || NONE_ITEM_LABEL,
        sortOrder: item?.fldOrder ?? 999
      });
    }
  }

  const categoryOptions: WebReportFilterOption[] = [...catMap.entries()]
    .map(([id, { label, sortOrder }]) => ({ id, label, sortOrder }))
    .sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return a.label.localeCompare(b.label, undefined, { sensitivity: 'base' });
    });

  const locationOptions: WebReportFilterOption[] = [...locMap.entries()]
    .map(([id, { label }]) => ({ id, label, sortOrder: 0 }))
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));

  const itemOptions: WebReportFilterOption[] = [...itemMap.entries()]
    .map(([id, { label, sortOrder }]) => ({ id, label, sortOrder }))
    .sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return a.label.localeCompare(b.label, undefined, { sensitivity: 'base' });
    });

  return {
    categories: categoryOptions,
    locations: locationOptions,
    items: itemOptions
  };
}

export function createDefaultWebReportRecordInclusion(
  options: WebReportFilterOptions
): WebReportRecordInclusion {
  return {
    categoryIds: new Set(options.categories.map((o) => o.id)),
    locationIds: new Set(options.locations.map((o) => o.id)),
    itemIds: new Set(options.items.map((o) => o.id))
  };
}

export function pruneWebReportRecordInclusion(
  inclusion: WebReportRecordInclusion,
  options: WebReportFilterOptions
): WebReportRecordInclusion {
  const availableCats = new Set(options.categories.map((o) => o.id));
  const availableLocs = new Set(options.locations.map((o) => o.id));
  const availableItems = new Set(options.items.map((o) => o.id));

  return {
    categoryIds: new Set([...inclusion.categoryIds].filter((id) => availableCats.has(id))),
    locationIds: new Set([...inclusion.locationIds].filter((id) => availableLocs.has(id))),
    itemIds: new Set([...inclusion.itemIds].filter((id) => availableItems.has(id)))
  };
}

export function isWebReportRecordInclusionAllSelected(
  inclusion: WebReportRecordInclusion,
  options: WebReportFilterOptions
): boolean {
  if (options.categories.length === 0 && options.locations.length === 0 && options.items.length === 0) {
    return true;
  }
  return (
    options.categories.every((o) => inclusion.categoryIds.has(o.id)) &&
    options.locations.every((o) => inclusion.locationIds.has(o.id)) &&
    options.items.every((o) => inclusion.itemIds.has(o.id))
  );
}

export function applyWebReportRecordInclusion(
  facilityRecords: WebReportEnrichedRecord[],
  inclusion: WebReportRecordInclusion,
  glossary: Glossary[]
): WebReportEnrichedRecord[] {
  return facilityRecords.filter((record) => {
    const { catId, itemId } = resolveWebReportRecordDimensionIds(record, glossary);
    const locId = resolveWebReportLocationId(record);
    return (
      inclusion.categoryIds.has(catId) &&
      inclusion.locationIds.has(locId) &&
      inclusion.itemIds.has(itemId)
    );
  });
}

export function cloneWebReportRecordInclusion(
  inclusion: WebReportRecordInclusion
): WebReportRecordInclusion {
  return {
    categoryIds: new Set(inclusion.categoryIds),
    locationIds: new Set(inclusion.locationIds),
    itemIds: new Set(inclusion.itemIds)
  };
}
