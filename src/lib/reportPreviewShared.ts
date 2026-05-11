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
  findings: Finding[]
): ProjectData[] {
  const rawData = projectData.filter(
    (d) =>
      String(d.fldPDataProject || '')
        .trim()
        .toLowerCase() === String(project.fldProjID || '').trim().toLowerCase() &&
      String(d.fldFacility || '')
        .trim()
        .toLowerCase() === String(facility.fldFacID || facility.id || '').trim().toLowerCase()
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

  return enriched.sort((a, b) => {
    const keyA = (a.fldData || '').trim().toLowerCase();
    const keyB = (b.fldData || '').trim().toLowerCase();
    const glosA = glossary.find((g) => (g.fldGlosId || '').trim().toLowerCase() === keyA);
    const glosB = glossary.find((g) => (g.fldGlosId || '').trim().toLowerCase() === keyB);
    const isCustomA = a?.fldRecordSource === 'custom' && !glosA;
    const isCustomB = b?.fldRecordSource === 'custom' && !glosB;
    const catIdA = glosA?.fldCat || (isCustomA ? a?.fldPDataCategoryID || '' : '');
    const catIdB = glosB?.fldCat || (isCustomB ? b?.fldPDataCategoryID || '' : '');
    const itemIdA = glosA?.fldItem || (isCustomA ? a?.fldPDataItemID || '' : '');
    const itemIdB = glosB?.fldItem || (isCustomB ? b?.fldPDataItemID || '' : '');
    const findIdA = glosA?.fldFind || '';
    const findIdB = glosB?.fldFind || '';

    const catA = categories.find((c) => c.fldCategoryID === catIdA);
    const catB = categories.find((c) => c.fldCategoryID === catIdB);
    const catOrderA = catA?.fldOrder ?? 999;
    const catOrderB = catB?.fldOrder ?? 999;
    if (catOrderA !== catOrderB) return catOrderA - catOrderB;
    const locA = locations.find((l) => l.fldLocID === a.fldLocation)?.fldLocName || '';
    const locB = locations.find((l) => l.fldLocID === b.fldLocation)?.fldLocName || '';
    const locCompare = locA.localeCompare(locB);
    if (locCompare !== 0) return locCompare;
    const itemA = items.find((i) => i.fldItemID === itemIdA);
    const itemB = items.find((i) => i.fldItemID === itemIdB);
    const itemOrderA = itemA?.fldOrder ?? 999;
    const itemOrderB = itemB?.fldOrder ?? 999;
    if (itemOrderA !== itemOrderB) return itemOrderA - itemOrderB;
    const findA = findings.find((f) => f.fldFindID === findIdA);
    const findB = findings.find((f) => f.fldFindID === findIdB);
    const findOrderA = findA?.fldOrder ?? 999;
    const findOrderB = findB?.fldOrder ?? 999;
    if (findOrderA !== findOrderB) return findOrderA - findOrderB;
    return (itemA?.fldItemName || '').localeCompare(itemB?.fldItemName || '');
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
