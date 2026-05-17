import type {
  ProjectData,
  Project,
  Facility,
  Glossary,
  Category,
  Item,
  Location,
  Finding,
  MasterStandard
} from '../types';
import { compareStandardCitations, formatStandardCitationLabel, type StandardCitationSortInput } from './standardCitationLabel';

export interface StandardSnapshot {
  fldStandardType: string;
  fldStandardVersion: string;
  fldCitationNum: string;
  fldCitationName: string;
  fldContentText: string;
  fldStandardId: string;
  fldImageUrl?: string;
  fldRelationType?: MasterStandard['relation_type'];
  fldOrder?: number;
  fldSubSequence?: number;
}

export type AddendumEntry =
  | { kind: 'header'; standardType: string; key: string }
  | { kind: 'standard'; standard: StandardSnapshot };

export type ReportRecordSortOrder = 'category_location_item' | 'location_category_item';

export type ReportRecordSortKeys = {
  catOrder: number;
  locName: string;
  itemOrder: number;
  findOrder: number;
  itemName: string;
};

export function getReportRecordSortKeys(
  record: ProjectData,
  glossary: Glossary[],
  categories: Category[],
  items: Item[],
  locations: Location[],
  findings: Finding[]
): ReportRecordSortKeys {
  const key = (record.fldData || '').trim().toLowerCase();
  const glos = glossary.find((g) => (g.fldGlosId || '').trim().toLowerCase() === key);
  const isCustom = record?.fldRecordSource === 'custom' && !glos;
  const catId = glos?.fldCat || (isCustom ? record?.fldPDataCategoryID || '' : '');
  const itemId = glos?.fldItem || (isCustom ? record?.fldPDataItemID || '' : '');
  const findId = glos?.fldFind || '';
  const cat = categories.find((c) => c.fldCategoryID === catId);
  const item = items.find((i) => i.fldItemID === itemId);
  const find = findings.find((f) => f.fldFindID === findId);
  const locName = locations.find((l) => l.fldLocID === record.fldLocation)?.fldLocName || '';
  return {
    catOrder: cat?.fldOrder ?? 999,
    locName,
    itemOrder: item?.fldOrder ?? 999,
    findOrder: find?.fldOrder ?? 999,
    itemName: item?.fldItemName || ''
  };
}

export function compareReportRecordSortKeys(a: ReportRecordSortKeys, b: ReportRecordSortKeys): number {
  if (a.catOrder !== b.catOrder) return a.catOrder - b.catOrder;
  const loc = a.locName.localeCompare(b.locName);
  if (loc !== 0) return loc;
  if (a.itemOrder !== b.itemOrder) return a.itemOrder - b.itemOrder;
  if (a.findOrder !== b.findOrder) return a.findOrder - b.findOrder;
  return a.itemName.localeCompare(b.itemName);
}

export function compareReportRecordSortKeysLocationFirst(a: ReportRecordSortKeys, b: ReportRecordSortKeys): number {
  const loc = a.locName.localeCompare(b.locName);
  if (loc !== 0) return loc;
  if (a.catOrder !== b.catOrder) return a.catOrder - b.catOrder;
  if (a.itemOrder !== b.itemOrder) return a.itemOrder - b.itemOrder;
  if (a.findOrder !== b.findOrder) return a.findOrder - b.findOrder;
  return a.itemName.localeCompare(b.itemName);
}

function normalizeStandardIds(raw: unknown): string[] {
  if (raw === undefined || raw === null) return [];
  const arr = Array.isArray(raw) ? raw : typeof raw === 'string' && raw ? [raw] : [];
  return arr.map((id) => String(id).trim()).filter(Boolean);
}

export function getRecordStandardIds(record: any, glos: Glossary | undefined): string[] {
  const raw = record?.fldStandards;
  if (Array.isArray(raw)) {
    return normalizeStandardIds(raw);
  }
  if (raw !== undefined && raw !== null && typeof raw === 'object') {
    return Object.values(raw as Record<string, unknown>)
      .filter(Boolean)
      .map((v) => String(v).trim())
      .filter(Boolean);
  }
  const fldData = (record?.fldData || '').trim();
  if (fldData !== '' && glos) {
    return normalizeStandardIds(glos.fldStandards);
  }
  return [];
}

export function standardTypeKey(std: { fldStandardType?: string }): string {
  const t = std.fldStandardType;
  if (t === undefined || t === null || String(t).trim() === '') return 'Unknown';
  return String(t).trim();
}

export function formatGroupedStandardCitations(ids: string[], standards: MasterStandard[]): string {
  const seen = new Set<string>();
  const list: MasterStandard[] = [];
  for (const rawId of ids) {
    const id = String(rawId).trim();
    if (!id || seen.has(id)) continue;
    const std = standards.find((s) => s.id === id);
    if (!std) continue;
    seen.add(id);
    list.push(std);
  }
  const byType = new Map<string, MasterStandard[]>();
  for (const std of list) {
    const t = standardTypeKey(std);
    if (!byType.has(t)) byType.set(t, []);
    byType.get(t)!.push(std);
  }
  const types = Array.from(byType.keys()).sort((a, b) => a.localeCompare(b));
  const parts: string[] = [];
  for (const t of types) {
    const arr = byType.get(t)!;
    arr.sort((a, b) => compareStandardCitations(a, b));
    for (const s of arr) {
      const label =
        formatStandardCitationLabel(s) ?? `${t} ${(s.citation_num || '').trim()}`.trim();
      if (label) parts.push(label);
    }
  }
  return parts.join('; ');
}

function addendumSnapshotSortInput(s: StandardSnapshot): StandardCitationSortInput {
  return {
    order: s.fldOrder,
    fldStandardType: s.fldStandardType,
    citation_num: s.fldCitationNum,
    relation_type: s.fldRelationType,
    sub_sequence: s.fldSubSequence,
    id: s.fldStandardId
  };
}

export function buildReferencedAddendumEntries(
  filteredData: ProjectData[],
  glossary: Glossary[],
  standards: MasterStandard[]
): AddendumEntry[] {
  const standardsMap = new Map<string, StandardSnapshot>();
  filteredData.forEach((d) => {
    const cleanKey = (d.fldData || '').trim().toLowerCase();
    const glos = glossary.find((g) => (g.fldGlosId || '').trim().toLowerCase() === cleanKey);
    const ids = getRecordStandardIds(d, glos);
    ids.forEach((id) => {
      if (standardsMap.has(id)) return;
      const std = standards.find((s) => s.id === id);
      if (!std) return;
      const tKey = standardTypeKey(std);
      standardsMap.set(id, {
        fldStandardType: tKey,
        fldStandardVersion: std.fldStandardVersion ?? '',
        fldCitationNum: std.citation_num,
        fldCitationName: std.citation_name,
        fldContentText: std.content_text,
        fldStandardId: id,
        fldImageUrl: std.image_url,
        fldRelationType: std.relation_type,
        fldOrder: std.order,
        fldSubSequence: std.sub_sequence
      });
    });
  });
  const snapshots = Array.from(standardsMap.values());
  const byType = new Map<string, StandardSnapshot[]>();
  for (const snap of snapshots) {
    const t = standardTypeKey(snap);
    if (!byType.has(t)) byType.set(t, []);
    byType.get(t)!.push({ ...snap, fldStandardType: t });
  }
  const types = Array.from(byType.keys()).sort((a, b) => a.localeCompare(b));
  const entries: AddendumEntry[] = [];
  for (const t of types) {
    entries.push({ kind: 'header', standardType: t, key: `__addendum_header__${t}` });
    const arr = byType.get(t)!;
    arr.sort((a, b) => compareStandardCitations(addendumSnapshotSortInput(a), addendumSnapshotSortInput(b)));
    for (const s of arr) entries.push({ kind: 'standard', standard: s });
  }
  return entries;
}

/** Same filter/sort/enrich as ReportPreview `filteredData`. */
export function filterReportProjectForPreview(
  projectData: ProjectData[],
  project: Project,
  facility: Facility,
  glossary: Glossary[],
  categories: Category[],
  items: Item[],
  locations: Location[],
  findings: Finding[],
  recordSortOrder?: ReportRecordSortOrder
): ProjectData[] {
  const rawData = projectData.filter(
    (d) =>
      String(d.fldPDataProject || '')
        .trim()
        .toLowerCase() === String(project.fldProjID || '').trim().toLowerCase() &&
      String(d.fldFacility || '')
        .trim()
        .toLowerCase() === String(facility.fldFacID || '').trim().toLowerCase()
  );

  const uniqueMap = new Map<string, ProjectData>();
  rawData.forEach((d) => uniqueMap.set(d.fldPDataID, d));
  const data = Array.from(uniqueMap.values());

  const multiplier = project.fldCostMultiplier || 1;

  const enriched = data.map((record) => {
    const unitCost = record.fldUnitCost || 0;
    const baseTotal = record.fldTotalCost || unitCost * (record.fldQTY || 0);
    const cost = baseTotal * multiplier;
    return {
      ...record,
      totalCost: cost,
      displayUnitCost: unitCost * multiplier,
      displayUnitType: record.fldUnitType || 'N/A'
    };
  });

  const order = recordSortOrder ?? 'category_location_item';
  const compare =
    order === 'location_category_item' ? compareReportRecordSortKeysLocationFirst : compareReportRecordSortKeys;

  return enriched.sort((a, b) => {
    const ka = getReportRecordSortKeys(a, glossary, categories, items, locations, findings);
    const kb = getReportRecordSortKeys(b, glossary, categories, items, locations, findings);
    return compare(ka, kb);
  });
}

export function getReportSectionAvailability(
  projectData: ProjectData[],
  project: Project,
  facility: Facility,
  glossary: Glossary[],
  standards: MasterStandard[],
  categories: Category[],
  items: Item[],
  locations: Location[],
  findings: Finding[]
): { hasReferencedStandards: boolean; hasPhotoAddendum: boolean } {
  const filtered = filterReportProjectForPreview(
    projectData,
    project,
    facility,
    glossary,
    categories,
    items,
    locations,
    findings
  );
  return {
    hasReferencedStandards: buildReferencedAddendumEntries(filtered, glossary, standards).length > 0,
    hasPhotoAddendum: filtered.some((d) => Array.isArray(d.fldImages) && d.fldImages.length > 2)
  };
}
