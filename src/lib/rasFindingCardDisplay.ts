/**
 * RAS finding-card display model. Finding text only — no Recommendation, no cost.
 */

import type { Category, Glossary, Item, Location, MasterStandard, ProjectData } from '../types';
import {
  formatGroupedStandardCitations,
  getRecordStandardIds,
} from './reportPreviewShared';
import { getRecordLocator, getReportProfileSemantics, type ReportProfile } from './reportProfile';
import { formatMeasurement } from './utils';

export type RasFindingCardDisplay = {
  findingText: string;
  locationLabel: string;
  sheet: string | undefined;
  referenceText: string;
  categoryName: string;
  itemName: string;
  measurementText: string;
  imageUrls: string[];
  imageAlts: string[];
  imageSingular: string;
  imagePlural: string;
};

export type RasFindingCardPairCells = {
  label: string;
  value: string;
};

export type RasFindingCardMetadataRow =
  | { kind: 'pair'; left: RasFindingCardPairCells; right: RasFindingCardPairCells }
  | { kind: 'locationSpan'; label: string; value: string };

/** Category/Item and Location/Sheet share this pair structure so columns align. */
export function buildRasFindingCardMetadataRows(
  display: RasFindingCardDisplay
): RasFindingCardMetadataRow[] {
  const categoryItem: RasFindingCardMetadataRow = {
    kind: 'pair',
    left: { label: 'Category', value: display.categoryName || 'N/A' },
    right: { label: 'Item', value: display.itemName || 'N/A' },
  };
  if (display.sheet) {
    return [
      categoryItem,
      {
        kind: 'pair',
        left: { label: 'Location', value: display.locationLabel },
        right: { label: 'Sheet', value: display.sheet },
      },
    ];
  }
  return [
    categoryItem,
    { kind: 'locationSpan', label: 'Location', value: display.locationLabel },
  ];
}

export function buildRasFindingCardDisplay(
  record: ProjectData,
  profile: ReportProfile,
  glossary: Glossary[],
  standards: MasterStandard[],
  locations: Location[],
  categories: Category[],
  items: Item[]
): RasFindingCardDisplay {
  const semantics = getReportProfileSemantics(profile);
  const cleanKey = (record.fldData || '').trim().toLowerCase();
  const glos = glossary.find((g) => (g.fldGlosId || '').trim().toLowerCase() === cleanKey);
  const isCustom = record?.fldRecordSource === 'custom' && !glos;
  const catId = glos?.fldCat || (isCustom ? record?.fldPDataCategoryID || '' : '');
  const itemId = glos?.fldItem || (isCustom ? record?.fldPDataItemID || '' : '');
  const cat = categories.find((c) => c.fldCategoryID === catId);
  const item = items.find((i) => i.fldItemID === itemId);
  const locator = getRecordLocator(record, profile, locations);
  const ids = getRecordStandardIds(record, glos);
  const imageUrls = Array.isArray(record.fldImages)
    ? record.fldImages.filter((url) => typeof url === 'string' && url.trim() !== '').slice(0, 2)
    : [];
  return {
    findingText: record.fldFindLong || record.fldFindShort || '',
    locationLabel: locator.location,
    sheet: locator.sheet,
    referenceText: ids.length === 0 ? '' : formatGroupedStandardCitations(ids, standards),
    categoryName: cat?.fldCategoryName || '',
    itemName: item?.fldItemName || '',
    measurementText: formatMeasurement(record.fldMeasurement, record.fldMeasurementUnit || record.fldUnitType),
    imageUrls,
    imageAlts: imageUrls.map((_, i) => `${semantics.imageTerminology.singular} ${i + 1}`),
    imageSingular: semantics.imageTerminology.singular,
    imagePlural: semantics.imageTerminology.plural,
  };
}
