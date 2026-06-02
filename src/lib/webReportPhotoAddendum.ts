import type {
  Category,
  Finding,
  Glossary,
  Item,
  Location,
  MasterStandard,
  ProjectData
} from '../types';
import type { ReportRecordSortOrder } from './reportPreviewShared';
import {
  getCanonicalReportNumber,
  resolveWebReportLocationId,
  resolveWebReportRecordDimensionIds,
  resolveWebReportRecordView,
  sortWebReportRecordsForDisplay,
  type WebReportEnrichedRecord
} from './webReportTree';

/** Indices 0–1 are reserved for documentation cards; addendum uses index 2+. */
export const WEB_REPORT_PHOTO_ADDENDUM_START_INDEX = 2;

export type WebReportPhotoItem = {
  key: string;
  url: string;
  recordId: string;
  imageIndex: number;
  topKey: string;
  topLabel: string;
  midKey: string;
  midLabel: string;
  locationName: string;
  categoryName: string;
  itemName: string;
  findingShort: string;
  recommendationShort: string;
  reportNumber: number | null;
};

export type WebReportPhotoMidSection = {
  key: string;
  label: string;
  photos: WebReportPhotoItem[];
};

export type WebReportPhotoTopSection = {
  key: string;
  label: string;
  midSections: WebReportPhotoMidSection[];
  photoCount: number;
};

export type WebReportPhotoAddendumView = {
  topSections: WebReportPhotoTopSection[];
  photoCount: number;
  hasPhotos: boolean;
};

function supplementalImageUrls(record: ProjectData): string[] {
  const imgs = record.fldImages;
  if (!Array.isArray(imgs) || imgs.length <= WEB_REPORT_PHOTO_ADDENDUM_START_INDEX) {
    return [];
  }
  const out: string[] = [];
  for (let i = WEB_REPORT_PHOTO_ADDENDUM_START_INDEX; i < imgs.length; i++) {
    const url = imgs[i];
    if (url === undefined || url === null) continue;
    const trimmed = String(url).trim();
    if (trimmed) out.push(trimmed);
  }
  return out;
}

export function includedRecordsHavePhotoAddendumPhotos(records: ProjectData[]): boolean {
  for (const record of records) {
    if (supplementalImageUrls(record).length > 0) return true;
  }
  return false;
}

function comparePhotoItems(a: WebReportPhotoItem, b: WebReportPhotoItem): number {
  if (a.reportNumber !== null && b.reportNumber !== null && a.reportNumber !== b.reportNumber) {
    return a.reportNumber - b.reportNumber;
  }
  if (a.reportNumber !== null && b.reportNumber === null) return -1;
  if (a.reportNumber === null && b.reportNumber !== null) return 1;
  const loc = a.locationName.localeCompare(b.locationName, undefined, { sensitivity: 'base' });
  if (loc !== 0) return loc;
  const cat = a.categoryName.localeCompare(b.categoryName, undefined, { sensitivity: 'base' });
  if (cat !== 0) return cat;
  if (a.imageIndex !== b.imageIndex) return a.imageIndex - b.imageIndex;
  return a.recordId.localeCompare(b.recordId, undefined, { sensitivity: 'base' });
}

function hierarchyKeys(
  record: WebReportEnrichedRecord,
  sortOrder: ReportRecordSortOrder,
  glossary: Glossary[],
  categories: Category[],
  items: Item[]
): { topKey: string; topLabel: string; midKey: string; midLabel: string } {
  const view = resolveWebReportRecordView(record, glossary, categories, items, [], []);
  const { catId } = resolveWebReportRecordDimensionIds(record, glossary);
  const locId = resolveWebReportLocationId(record);

  if (sortOrder === 'location_category_item') {
    return {
      topKey: `loc:${locId}`,
      topLabel: view.locationName,
      midKey: `cat:${catId}`,
      midLabel: view.categoryName
    };
  }

  return {
    topKey: `cat:${catId}`,
    topLabel: view.categoryName,
    midKey: `loc:${locId}`,
    midLabel: view.locationName
  };
}

function groupPhotoItems(items: WebReportPhotoItem[]): WebReportPhotoTopSection[] {
  if (items.length === 0) return [];

  const sorted = [...items].sort(comparePhotoItems);
  const topSections: WebReportPhotoTopSection[] = [];
  let currentTop: WebReportPhotoTopSection | null = null;
  let currentMid: WebReportPhotoMidSection | null = null;

  const flushMid = () => {
    if (currentTop && currentMid && currentMid.photos.length > 0) {
      currentTop.midSections.push(currentMid);
    }
    currentMid = null;
  };

  const flushTop = () => {
    flushMid();
    currentTop = null;
  };

  for (const photo of sorted) {
    if (!currentTop || currentTop.key !== photo.topKey) {
      flushTop();
      currentTop = {
        key: photo.topKey,
        label: photo.topLabel,
        midSections: [],
        photoCount: 0
      };
      topSections.push(currentTop);
      currentMid = null;
    }

    if (!currentMid || currentMid.key !== photo.midKey) {
      flushMid();
      currentMid = { key: photo.midKey, label: photo.midLabel, photos: [] };
    }

    currentMid!.photos.push(photo);
    currentTop.photoCount += 1;
  }

  flushTop();
  return topSections;
}

/** Read-only supplemental photos for currently included Web Report records. */
export function buildWebReportPhotoAddendumView(
  includedRecords: WebReportEnrichedRecord[],
  sortOrder: ReportRecordSortOrder,
  glossary: Glossary[],
  categories: Category[],
  items: Item[],
  locations: Location[],
  findings: Finding[],
  canonicalReportNumbers: Map<string, number>
): WebReportPhotoAddendumView {
  const sorted = sortWebReportRecordsForDisplay(
    includedRecords,
    sortOrder,
    glossary,
    categories,
    items,
    locations,
    findings
  );

  const photoItems: WebReportPhotoItem[] = [];

  for (const record of sorted) {
    const urls = supplementalImageUrls(record);
    if (urls.length === 0) continue;

    const view = resolveWebReportRecordView(record, glossary, categories, items, locations, []);
    const recShort = String(record.fldRecShort || '').trim();

    const { topKey, topLabel, midKey, midLabel } = hierarchyKeys(
      record,
      sortOrder,
      glossary,
      categories,
      items
    );

    urls.forEach((url, offset) => {
      const imageIndex = WEB_REPORT_PHOTO_ADDENDUM_START_INDEX + offset;
      photoItems.push({
        key: `${record.fldPDataID}:${imageIndex}`,
        url,
        recordId: record.fldPDataID,
        imageIndex,
        topKey,
        topLabel,
        midKey,
        midLabel,
        locationName: view.locationName,
        categoryName: view.categoryName,
        itemName: view.itemName,
        findingShort: view.findingShort,
        recommendationShort: recShort,
        reportNumber: getCanonicalReportNumber(canonicalReportNumbers, record.fldPDataID)
      });
    });
  }

  const topSections = groupPhotoItems(photoItems);
  const photoCount = photoItems.length;

  return {
    topSections,
    photoCount,
    hasPhotos: photoCount > 0
  };
}
