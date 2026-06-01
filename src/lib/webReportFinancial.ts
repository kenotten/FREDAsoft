import type { Category, Finding, Glossary, Item, Location } from '../types';
import type { ReportRecordSortOrder } from './reportPreviewShared';
import {
  compareReportRecordSortKeys,
  compareReportRecordSortKeysLocationFirst,
  getReportRecordSortKeys
} from './reportPreviewShared';
import {
  resolveWebReportLocationId,
  resolveWebReportRecordDimensionIds,
  type WebReportEnrichedRecord
} from './webReportTree';

export type WebReportFinancialRecord = {
  recordId: string;
  categoryId: string;
  categoryName: string;
  categoryOrder: number;
  locationId: string;
  locationName: string;
  itemId: string;
  itemName: string;
  itemOrder: number;
  findingShort: string;
  qty: number;
  unitType: string;
  rawUnitCost: number;
  rawTotalCost: number | null;
  reportUnitCost: number;
  reportTotalCost: number;
  hasExplicitTotal: boolean;
};

export type WebReportFinancialDetailRow = {
  key: string;
  recordId: string;
  reportNumber: number | null;
  pathLabel: string;
  descriptor: string;
  qtyLabel: string;
  reportTotalCost: number;
};

export type WebReportFinancialParentGroup = {
  key: string;
  label: string;
  sortOrder: number;
  subtotal: number;
  recordCount: number;
  detailRows: WebReportFinancialDetailRow[];
};

export type WebReportFinancialSummary = {
  sortOrder: ReportRecordSortOrder;
  parentLevelLabel: string;
  detailMidLabel: string;
  detailItemLabel: string;
  records: WebReportFinancialRecord[];
  totalEstimatedCost: number;
  includedRecordCount: number;
  nonzeroCostCount: number;
  zeroCostCount: number;
  missingExplicitTotalCount: number;
  parentGroups: WebReportFinancialParentGroup[];
};

function finiteNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeLabel(value: unknown, fallback: string): string {
  const text = String(value || '').trim();
  return text || fallback;
}

function toFindingDescriptor(record: WebReportEnrichedRecord): string {
  const short = String(record.fldFindShort || '').trim();
  if (short) return short;
  const long = String(record.fldFindLong || '').replace(/\s+/g, ' ').trim();
  if (long.length > 90) return `${long.slice(0, 87).trimEnd()}...`;
  return long || 'Finding not specified';
}

function formatQtyLabel(qty: number, unitType: string): string {
  const unit = String(unitType || '').trim();
  if (!unit || unit === 'N/A') return String(qty);
  return `${qty} ${unit}`;
}

function resolveFinancialRecord(
  record: WebReportEnrichedRecord,
  glossary: Glossary[],
  categories: Category[],
  items: Item[],
  locations: Location[]
): WebReportFinancialRecord {
  const { catId, itemId } = resolveWebReportRecordDimensionIds(record, glossary);
  const locId = resolveWebReportLocationId(record);
  const cat = categories.find((c) => c.fldCategoryID === catId);
  const item = items.find((i) => i.fldItemID === itemId);
  const location = locations.find((l) => l.fldLocID === locId);

  const rawUnitCost = finiteNumber(record.fldUnitCost, 0);
  const qty = finiteNumber(record.fldQTY, 0);
  const rawTotalFromSnapshot = record.fldTotalCost;
  const hasExplicitTotal = Number.isFinite(Number(rawTotalFromSnapshot));
  const rawTotalCost = hasExplicitTotal ? finiteNumber(rawTotalFromSnapshot, 0) : null;

  const reportUnitCost = finiteNumber(record.displayUnitCost, rawUnitCost);
  const reportTotalCost = finiteNumber(
    record.totalCost,
    rawTotalCost !== null ? rawTotalCost : rawUnitCost * qty
  );

  return {
    recordId: String(record.fldPDataID || '').trim(),
    categoryId: catId,
    categoryName: normalizeLabel(cat?.fldCategoryName, 'Uncategorized'),
    categoryOrder: cat?.fldOrder ?? 999,
    locationId: locId,
    locationName: normalizeLabel(location?.fldLocName, 'Unknown location'),
    itemId,
    itemName: normalizeLabel(item?.fldItemName, 'N/A'),
    itemOrder: item?.fldOrder ?? 999,
    findingShort: toFindingDescriptor(record),
    qty,
    unitType: normalizeLabel(record.fldUnitType, 'N/A'),
    rawUnitCost,
    rawTotalCost,
    reportUnitCost,
    reportTotalCost,
    hasExplicitTotal
  };
}

function sortRecordsForFinancial(
  records: WebReportFinancialRecord[],
  sortOrder: ReportRecordSortOrder,
  glossary: Glossary[],
  categories: Category[],
  items: Item[],
  locations: Location[],
  findings: Finding[],
  enrichedById: Map<string, WebReportEnrichedRecord>
): WebReportFinancialRecord[] {
  const compare =
    sortOrder === 'location_category_item'
      ? compareReportRecordSortKeysLocationFirst
      : compareReportRecordSortKeys;

  return [...records].sort((a, b) => {
    const ra = enrichedById.get(a.recordId);
    const rb = enrichedById.get(b.recordId);
    if (!ra || !rb) return a.recordId.localeCompare(b.recordId);
    const ka = getReportRecordSortKeys(ra, glossary, categories, items, locations, findings);
    const kb = getReportRecordSortKeys(rb, glossary, categories, items, locations, findings);
    return compare(ka, kb);
  });
}

function buildDetailRow(
  record: WebReportFinancialRecord,
  sortOrder: ReportRecordSortOrder,
  reportNumber: number | null
): WebReportFinancialDetailRow {
  const pathLabel =
    sortOrder === 'category_location_item'
      ? `${record.locationName} / ${record.itemName}`
      : `${record.categoryName} / ${record.itemName}`;

  return {
    key: record.recordId,
    recordId: record.recordId,
    reportNumber,
    pathLabel,
    descriptor: record.findingShort,
    qtyLabel: formatQtyLabel(record.qty, record.unitType),
    reportTotalCost: record.reportTotalCost
  };
}

function buildParentGroups(
  records: WebReportFinancialRecord[],
  sortOrder: ReportRecordSortOrder,
  glossary: Glossary[],
  categories: Category[],
  items: Item[],
  locations: Location[],
  findings: Finding[],
  enrichedById: Map<string, WebReportEnrichedRecord>,
  reportNumbers: Map<string, number> | undefined
): WebReportFinancialParentGroup[] {
  const isCategoryParent = sortOrder === 'category_location_item';
  const byParent = new Map<string, WebReportFinancialRecord[]>();

  for (const record of records) {
    const parentKey = isCategoryParent
      ? `fin:cat:${record.categoryId || '__none__'}`
      : `fin:loc:${record.locationId || '__none__'}`;
    if (!byParent.has(parentKey)) byParent.set(parentKey, []);
    byParent.get(parentKey)!.push(record);
  }

  const groups: WebReportFinancialParentGroup[] = [];

  for (const [key, groupRecords] of byParent.entries()) {
    const sample = groupRecords[0]!;
    const label = isCategoryParent ? sample.categoryName : sample.locationName;
    const sortOrderValue = isCategoryParent ? sample.categoryOrder : 0;
    const sorted = sortRecordsForFinancial(
      groupRecords,
      sortOrder,
      glossary,
      categories,
      items,
      locations,
      findings,
      enrichedById
    );

    const detailRows = sorted.map((record) =>
      buildDetailRow(
        record,
        sortOrder,
        reportNumbers?.get(record.recordId) ?? null
      )
    );

    const subtotal = sorted.reduce((sum, r) => sum + r.reportTotalCost, 0);

    groups.push({
      key,
      label,
      sortOrder: sortOrderValue,
      subtotal,
      recordCount: sorted.length,
      detailRows
    });
  }

  if (isCategoryParent) {
    return groups.sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return a.label.localeCompare(b.label, undefined, { sensitivity: 'base' });
    });
  }

  return groups.sort((a, b) =>
    a.label.localeCompare(b.label, undefined, { sensitivity: 'base' })
  );
}

export function collectWebReportFinancialParentKeys(
  groups: WebReportFinancialParentGroup[]
): string[] {
  return groups.map((g) => g.key);
}

export function reconcileWebReportFinancialCollapsedKeys(
  collapsed: Set<string>,
  validKeys: string[]
): Set<string> {
  const valid = new Set(validKeys);
  const next = new Set<string>();
  for (const key of collapsed) {
    if (valid.has(key)) next.add(key);
  }
  return next;
}

export function buildWebReportFinancialSummary(
  includedRecords: WebReportEnrichedRecord[],
  sortOrder: ReportRecordSortOrder,
  glossary: Glossary[],
  categories: Category[],
  items: Item[],
  locations: Location[],
  findings: Finding[],
  reportNumbers?: Map<string, number>
): WebReportFinancialSummary {
  const enrichedById = new Map<string, WebReportEnrichedRecord>();
  for (const record of includedRecords) {
    const id = String(record.fldPDataID || '').trim();
    if (id) enrichedById.set(id, record);
  }

  const records = includedRecords.map((record) =>
    resolveFinancialRecord(record, glossary, categories, items, locations)
  );

  const totalEstimatedCost = records.reduce((sum, record) => sum + record.reportTotalCost, 0);
  const includedRecordCount = records.length;
  const zeroCostCount = records.filter((record) => record.reportTotalCost === 0).length;
  const nonzeroCostCount = includedRecordCount - zeroCostCount;
  const missingExplicitTotalCount = records.filter((record) => !record.hasExplicitTotal).length;

  const isCategoryParent = sortOrder === 'category_location_item';

  return {
    sortOrder,
    parentLevelLabel: isCategoryParent ? 'Category' : 'Location',
    detailMidLabel: isCategoryParent ? 'Location' : 'Category',
    detailItemLabel: 'Item',
    records,
    totalEstimatedCost,
    includedRecordCount,
    nonzeroCostCount,
    zeroCostCount,
    missingExplicitTotalCount,
    parentGroups: buildParentGroups(
      records,
      sortOrder,
      glossary,
      categories,
      items,
      locations,
      findings,
      enrichedById,
      reportNumbers
    )
  };
}
