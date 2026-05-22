import type { Category, Finding, Glossary, Item, MasterRecommendation, MasterStandard } from '../types';
import {
  GLOSSARY_SET_DEFS,
  GLOSSARY_SET_UNASSIGNED_LABEL,
  glossaryRowSetMetadataPayload,
  resolveGlossarySetForRecord,
  resolveGlossarySetLabelForKey,
  type GlossarySetResolveSource,
  type ResolvedGlossarySet,
} from './glossarySets';
import { compareStandardCitations, formatStandardCitationLabel } from './standardCitationLabel';
import { getRecommendationAssociatedItemIds } from './libraryRecommendationMetadata';

export const GLOSSARY_SET_UNASSIGNED_KEY = '';

/** Re-export for report consumers */
export { GLOSSARY_SET_UNASSIGNED_LABEL };

function normId(value: unknown): string {
  return String(value ?? '').toLowerCase().trim();
}

function safeStandardsArray(value: unknown): string[] {
  if (!value) return [];
  const raw = Array.isArray(value) ? value : typeof value === 'object' ? Object.values(value as object) : [value];
  return Array.from(new Set(raw.map((v) => String(v ?? '').trim()).filter(Boolean)));
}

function sortByOrderThenName<T extends { fldOrder?: number }>(
  a: T,
  b: T,
  nameA: string,
  nameB: string
): number {
  const oa = a.fldOrder ?? 999;
  const ob = b.fldOrder ?? 999;
  if (oa !== ob) return oa - ob;
  return nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
}

export type StandardSetKey = string;

export function standardSetKey(s: Pick<MasterStandard, 'fldStandardType' | 'fldStandardVersion'>): StandardSetKey {
  const t = String(s.fldStandardType ?? '').trim() || 'Unknown';
  const v = String(s.fldStandardVersion ?? '').trim() || 'Unknown';
  return `${t}::${v}`;
}

export function standardSetLabel(key: StandardSetKey): string {
  const [t, v] = key.split('::');
  if (t === 'Unknown' && v === 'Unknown') return 'Unknown standard set';
  return `${t} ${v}`.trim();
}

export type LibraryReportCatItemPath = {
  categoryId: string;
  categoryName: string;
  itemId: string;
  itemName: string;
  sortCategoryOrder: number;
  sortItemOrder: number;
};

export type StandardsAssocFindingRow = {
  findingId: string;
  findingShort: string;
  findingLong: string;
  path: LibraryReportCatItemPath;
  missingGlossarySetMetadata: boolean;
};

export type StandardsAssocRecommendationRow = {
  recId: string;
  recShort: string;
  recLong: string;
  path: LibraryReportCatItemPath;
  missingGlossarySetMetadata: boolean;
};

export type StandardsAssocStandardNode = {
  standardId: string;
  citationLabel: string;
  citationName: string;
  contentPreview: string;
  relationType: string;
  findings: StandardsAssocFindingRow[];
  recommendations: StandardsAssocRecommendationRow[];
};

export type StandardsAssocSetGroup = {
  setKey: StandardSetKey;
  setLabel: string;
  standards: StandardsAssocStandardNode[];
  standardCount: number;
  findingLinkCount: number;
  recommendationLinkCount: number;
};

/** Standards Associations view: citation order vs category/item hierarchy */
export type StandardsAssocViewMode = 'citation_order' | 'category_item';

export type StandardsAssocCatItemCitationRow = {
  standardId: string;
  citationLabel: string;
  citationName: string;
  contentPreview: string;
  relationType: string;
};

export type StandardsAssocCatItemRecRow = {
  recId: string;
  recShort: string;
  recLong: string;
  missingGlossarySetMetadata: boolean;
  /** Citations from this recommendation's fldStandards only */
  citations: StandardsAssocCatItemCitationRow[];
};

export type StandardsAssocCatItemFindingNode = {
  findingId: string;
  findingShort: string;
  findingLong: string;
  missingGlossarySetMetadata: boolean;
  /** Citations from this finding's fldStandards only */
  findingCitations: StandardsAssocCatItemCitationRow[];
  recommendations: StandardsAssocCatItemRecRow[];
};

export type StandardsAssocCatItemItemNode = {
  itemId: string;
  itemName: string;
  sortItemOrder: number;
  findings: StandardsAssocCatItemFindingNode[];
  /** Recommendations at this item not linked to a finding via suggested recs or glossary */
  standaloneRecommendations: StandardsAssocCatItemRecRow[];
};

export type StandardsAssocCatItemCategoryNode = {
  categoryId: string;
  categoryName: string;
  sortCategoryOrder: number;
  items: StandardsAssocCatItemItemNode[];
};

export type StandardsAssocCatItemSetGroup = {
  /** Glossary / standard set key (empty = unassigned) */
  setKey: string;
  setLabel: string;
  isUnassigned: boolean;
  categories: StandardsAssocCatItemCategoryNode[];
  findingCount: number;
  recommendationLinkCount: number;
  citationSlotCount: number;
};

export type GlossarySetAssociationStatus = 'ok' | 'missing' | 'mismatch';

export type GlossaryHierarchyRecNode = {
  recId: string;
  recShort: string;
  recLong: string;
  glossaryRowIds: string[];
  setAssociationStatus: GlossarySetAssociationStatus;
};

export type GlossaryHierarchyFindingNode = {
  findingId: string;
  findingShort: string;
  findingLong: string;
  recommendations: GlossaryHierarchyRecNode[];
  glossaryRowCount: number;
};

export type GlossaryHierarchyItemNode = {
  itemId: string;
  itemName: string;
  findings: GlossaryHierarchyFindingNode[];
};

export type GlossaryHierarchyCategoryNode = {
  categoryId: string;
  categoryName: string;
  items: GlossaryHierarchyItemNode[];
};

export type GlossaryHierarchySetGroup = {
  setKey: string;
  setLabel: string;
  isUnassigned: boolean;
  categories: GlossaryHierarchyCategoryNode[];
  glossaryRowCount: number;
};

function resolveCatItemPath(
  itemId: string,
  categories: Category[],
  items: Item[]
): LibraryReportCatItemPath {
  const item = items.find((i) => normId(i.fldItemID) === normId(itemId));
  const catId = item?.fldCatID ?? '';
  const cat = categories.find((c) => normId(c.fldCategoryID) === normId(catId));
  return {
    categoryId: (cat?.fldCategoryID ?? catId) || '(unknown category)',
    categoryName: cat?.fldCategoryName ?? '(unknown category)',
    itemId: (item?.fldItemID ?? itemId) || '(unknown item)',
    itemName: item?.fldItemName ?? '(unknown item)',
    sortCategoryOrder: cat?.fldOrder ?? 999,
    sortItemOrder: item?.fldOrder ?? 999,
  };
}

function catItemPathDedupeKey(path: LibraryReportCatItemPath): string {
  return `${normId(path.categoryId)}|${normId(path.itemId)}`;
}

function isPlaceableCatItemPath(path: LibraryReportCatItemPath): boolean {
  return Boolean(String(path.itemId ?? '').trim()) && path.itemName !== '(unknown item)';
}

function normalizeSuggestedRecIds(value: unknown): string[] {
  if (!value) return [];
  const raw = Array.isArray(value) ? value : [value];
  return raw.map((v) => String(v ?? '').trim()).filter(Boolean);
}

/**
 * Category / Item paths for a recommendation: direct fldItem, glossary rows (fldRec),
 * and findings that cite a standard and list this rec in fldSuggestedRecs.
 */
export function collectRecommendationCatItemPaths(
  rec: MasterRecommendation,
  options: {
    standardId: string;
    glossary: Glossary[];
    findings: Finding[];
    categories: Category[];
    items: Item[];
  }
): LibraryReportCatItemPath[] {
  const { standardId, glossary, findings, categories, items } = options;
  const sid = normId(standardId);
  const recKey = normId(rec.fldRecID || rec.id);
  const seen = new Set<string>();
  const paths: LibraryReportCatItemPath[] = [];

  const addItemId = (itemId: string) => {
    const trimmed = String(itemId ?? '').trim();
    if (!trimmed) return;
    const path = resolveCatItemPath(trimmed, categories, items);
    if (!isPlaceableCatItemPath(path)) return;
    const key = catItemPathDedupeKey(path);
    if (seen.has(key)) return;
    seen.add(key);
    paths.push(path);
  };

  for (const itemId of getRecommendationAssociatedItemIds(rec)) {
    addItemId(itemId);
  }

  for (const g of glossary) {
    if (g.fldDeleted || g.fldIsDeleted) continue;
    const gRec = normId(g.fldRec);
    if (!gRec || (gRec !== recKey && gRec !== normId(rec.id))) continue;
    addItemId(g.fldItem);
  }

  for (const f of findings) {
    const citesStandard = safeStandardsArray(f.fldStandards).some((id) => normId(id) === sid);
    if (!citesStandard) continue;
    const suggested = normalizeSuggestedRecIds(f.fldSuggestedRecs);
    if (!suggested.some((id) => normId(id) === recKey)) continue;
    addItemId(f.fldItem);
  }

  return paths;
}

function compareCatItemPath(a: LibraryReportCatItemPath, b: LibraryReportCatItemPath): number {
  if (a.sortCategoryOrder !== b.sortCategoryOrder) return a.sortCategoryOrder - b.sortCategoryOrder;
  const c = a.categoryName.localeCompare(b.categoryName, undefined, { sensitivity: 'base' });
  if (c !== 0) return c;
  if (a.sortItemOrder !== b.sortItemOrder) return a.sortItemOrder - b.sortItemOrder;
  return a.itemName.localeCompare(b.itemName, undefined, { sensitivity: 'base' });
}

function hasMissingGlossarySetMetadata(
  entity: Parameters<typeof resolveGlossarySetForRecord>[0]
): boolean {
  return resolveGlossarySetForRecord(entity).setKey === '';
}

function resolveGlossaryHierarchySetKey(
  glossaryRow: Glossary,
  finding?: Finding,
  rec?: MasterRecommendation
): string {
  const fromRow = resolveGlossarySetForRecord(glossaryRow);
  if (fromRow.setKey) return fromRow.setKey;
  if (finding) {
    const fromFinding = resolveGlossarySetForRecord(finding);
    if (fromFinding.setKey) return fromFinding.setKey;
  }
  if (rec) {
    const fromRec = resolveGlossarySetForRecord(rec);
    if (fromRec.setKey) return fromRec.setKey;
  }
  return '';
}

function computeGlossarySetAssociationStatus(
  glossaryRow: Glossary | undefined,
  finding: Finding | undefined,
  rec: MasterRecommendation | undefined
): GlossarySetAssociationStatus {
  const keys = [
    resolveGlossarySetForRecord(glossaryRow),
    resolveGlossarySetForRecord(finding),
    resolveGlossarySetForRecord(rec),
  ]
    .map((r) => r.setKey)
    .filter((k) => k !== '');
  const unique = new Set(keys);
  if (unique.size === 0) return 'missing';
  if (unique.size > 1) return 'mismatch';
  return 'ok';
}

export function standardsAssocCitationHasAssociations(node: StandardsAssocStandardNode): boolean {
  return node.findings.length > 0 || node.recommendations.length > 0;
}

function recomputeStandardsSetCounts(standards: StandardsAssocStandardNode[]) {
  return {
    standardCount: standards.length,
    findingLinkCount: standards.reduce((n, s) => n + s.findings.length, 0),
    recommendationLinkCount: standards.reduce((n, s) => n + s.recommendations.length, 0),
  };
}

/** UI filters for Standards Associations (search + hide unassociated citations). */
export function filterStandardsAssociationsGroups(
  groups: StandardsAssocSetGroup[],
  options: { search?: string; hideUnassociated?: boolean }
): StandardsAssocSetGroup[] {
  const q = String(options.search ?? '').trim().toLowerCase();
  const hideUnassociated = options.hideUnassociated === true;

  let result = groups;

  if (hideUnassociated) {
    result = result
      .map((g) => {
        const standards = g.standards.filter(standardsAssocCitationHasAssociations);
        return { ...g, standards, ...recomputeStandardsSetCounts(standards) };
      })
      .filter((g) => g.standards.length > 0);
  }

  if (!q) return result;

  return result
    .map((g) => {
      const standards = g.standards.filter((s) => {
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
      });
      return { ...g, standards, ...recomputeStandardsSetCounts(standards) };
    })
    .filter((g) => g.standards.length > 0);
}

function isActiveLibraryMaster(row: { fldDeleted?: boolean; fldIsDeleted?: boolean }): boolean {
  return row.fldDeleted !== true && row.fldIsDeleted !== true;
}

function catItemGlossarySetLabel(setKey: string): string {
  if (!setKey) return GLOSSARY_SET_UNASSIGNED_LABEL;
  return resolveGlossarySetLabelForKey(setKey);
}

function collectFindingGlossarySetKeys(finding: Finding, glossary: Glossary[]): string[] {
  const keys = new Set<string>();
  const fromMaster = resolveGlossarySetForRecord(finding);
  if (fromMaster.setKey) keys.add(fromMaster.setKey);

  const findKey = normId(finding.fldFindID || finding.id);
  const itemKey = normId(finding.fldItem);

  for (const g of glossary) {
    if (!isActiveLibraryMaster(g)) continue;
    if (normId(g.fldFind) !== findKey) continue;
    if (itemKey && normId(g.fldItem) !== itemKey) continue;
    keys.add(resolveGlossaryHierarchySetKey(g, finding, undefined));
  }

  if (keys.size === 0) keys.add(GLOSSARY_SET_UNASSIGNED_KEY);
  return Array.from(keys);
}

function collectRecommendationGlossarySetKeys(
  rec: MasterRecommendation,
  glossary: Glossary[],
  itemId: string
): string[] {
  const keys = new Set<string>();
  const fromMaster = resolveGlossarySetForRecord(rec);
  if (fromMaster.setKey) keys.add(fromMaster.setKey);

  const recKey = normId(rec.fldRecID || rec.id);
  const itemKey = normId(itemId);

  for (const g of glossary) {
    if (!isActiveLibraryMaster(g)) continue;
    if (normId(g.fldRec) !== recKey) continue;
    if (itemKey && normId(g.fldItem) !== itemKey) continue;
    keys.add(resolveGlossaryHierarchySetKey(g, undefined, rec));
  }

  if (keys.size === 0) keys.add(GLOSSARY_SET_UNASSIGNED_KEY);
  return Array.from(keys);
}

function collectFindingContextRecommendations(
  finding: Finding,
  path: LibraryReportCatItemPath,
  glossary: Glossary[],
  recById: Map<string, MasterRecommendation>,
  standardById: Map<string, MasterStandard>
): StandardsAssocCatItemRecRow[] {
  const findKey = normId(finding.fldFindID || finding.id);
  const itemKey = normId(path.itemId);
  const catKey = normId(path.categoryId);
  const seen = new Set<string>();
  const rows: StandardsAssocCatItemRecRow[] = [];

  const pushRec = (r: MasterRecommendation, standardById: Map<string, MasterStandard>) => {
    const id = normId(r.fldRecID || r.id);
    if (!id || seen.has(id)) return;
    seen.add(id);
    rows.push(toCatItemRecRow(r, standardById));
  };

  for (const rid of normalizeSuggestedRecIds(finding.fldSuggestedRecs)) {
    const r = recById.get(normId(rid));
    if (r) pushRec(r, standardById);
  }

  for (const g of glossary) {
    if (!isActiveLibraryMaster(g)) continue;
    if (normId(g.fldFind) !== findKey) continue;
    if (itemKey && normId(g.fldItem) !== itemKey) continue;
    if (catKey && normId(g.fldCat) !== catKey) continue;
    const r = recById.get(normId(g.fldRec));
    if (r) pushRec(r, standardById);
  }

  rows.sort((a, b) =>
    a.recShort.localeCompare(b.recShort, undefined, { sensitivity: 'base' })
  );
  return rows;
}

function buildCitationRowsFromStandardIds(
  standardIds: string[],
  standardById: Map<string, MasterStandard>
): StandardsAssocCatItemCitationRow[] {
  const idOrder: string[] = [];
  const seen = new Set<string>();

  for (const raw of standardIds) {
    const key = normId(raw);
    if (!key || !standardById.has(key) || seen.has(key)) continue;
    seen.add(key);
    idOrder.push(key);
  }

  const citations: StandardsAssocCatItemCitationRow[] = [];
  for (const key of idOrder) {
    const s = standardById.get(key)!;
    const content = String(s.content_text ?? '').trim();
    const contentPreview = content.length > 280 ? `${content.slice(0, 280)}…` : content;
    citations.push({
      standardId: s.id,
      citationLabel: formatStandardCitationLabel(s) ?? s.citation_num ?? s.id,
      citationName: String(s.citation_name ?? '').trim(),
      contentPreview,
      relationType: String(s.relation_type ?? '').trim(),
    });
  }

  citations.sort((a, b) => {
    const sa = standardById.get(normId(a.standardId));
    const sb = standardById.get(normId(b.standardId));
    const c = compareStandardCitations(sa, sb);
    if (c !== 0) return c;
    return a.standardId.localeCompare(b.standardId, undefined, { sensitivity: 'base' });
  });
  return citations;
}

function collectMasterFldStandardsCitations(
  entity: { fldStandards?: unknown },
  standardById: Map<string, MasterStandard>
): StandardsAssocCatItemCitationRow[] {
  return buildCitationRowsFromStandardIds(safeStandardsArray(entity.fldStandards), standardById);
}

function toCatItemRecRow(
  r: MasterRecommendation,
  standardById: Map<string, MasterStandard>
): StandardsAssocCatItemRecRow {
  return {
    recId: r.fldRecID || r.id,
    recShort: r.fldRecShort,
    recLong: r.fldRecLong,
    missingGlossarySetMetadata: hasMissingGlossarySetMetadata(r),
    citations: collectMasterFldStandardsCitations(r, standardById),
  };
}

function buildCatItemFindingNode(
  finding: Finding,
  path: LibraryReportCatItemPath,
  glossary: Glossary[],
  recById: Map<string, MasterRecommendation>,
  standardById: Map<string, MasterStandard>
): StandardsAssocCatItemFindingNode {
  const recommendations = collectFindingContextRecommendations(
    finding,
    path,
    glossary,
    recById,
    standardById
  );
  return {
    findingId: finding.fldFindID || finding.id,
    findingShort: finding.fldFindShort,
    findingLong: finding.fldFindLong,
    missingGlossarySetMetadata: hasMissingGlossarySetMetadata(finding),
    findingCitations: collectMasterFldStandardsCitations(finding, standardById),
    recommendations,
  };
}

/**
 * Category / Item / Finding hierarchy: glossary set → category → item → finding →
 * recommendations (each with its own fldStandards citations) → finding fldStandards citations.
 * Includes uncited findings and recommendations when placed via metadata or glossary usage.
 */
export function buildStandardsAssociationsCatItemReport(input: {
  standards: MasterStandard[];
  findings: Finding[];
  recommendations: MasterRecommendation[];
  glossary: Glossary[];
  categories: Category[];
  items: Item[];
}): StandardsAssocCatItemSetGroup[] {
  const { standards, findings, recommendations, glossary, categories, items } = input;

  const standardById = new Map<string, MasterStandard>();
  for (const s of standards.filter((row) => !row.fldIsArchived)) {
    standardById.set(normId(s.id), s);
  }

  const recById = new Map(
    recommendations
      .filter(isActiveLibraryMaster)
      .map((r) => [normId(r.fldRecID || r.id), r])
  );

  type ItemAcc = {
    itemId: string;
    itemName: string;
    sortItemOrder: number;
    findings: Map<string, StandardsAssocCatItemFindingNode>;
    placedRecIds: Set<string>;
    standaloneRecommendations: Map<string, StandardsAssocCatItemRecRow>;
  };
  type CatAcc = {
    categoryId: string;
    categoryName: string;
    sortCategoryOrder: number;
    items: Map<string, ItemAcc>;
  };

  const setMap = new Map<string, Map<string, CatAcc>>();

  const ensureCat = (setKey: string, path: LibraryReportCatItemPath): CatAcc => {
    let cats = setMap.get(setKey);
    if (!cats) {
      cats = new Map();
      setMap.set(setKey, cats);
    }
    const catKey = normId(path.categoryId);
    let cat = cats.get(catKey);
    if (!cat) {
      cat = {
        categoryId: path.categoryId,
        categoryName: path.categoryName,
        sortCategoryOrder: path.sortCategoryOrder,
        items: new Map(),
      };
      cats.set(catKey, cat);
    }
    return cat;
  };

  const ensureItem = (setKey: string, path: LibraryReportCatItemPath): ItemAcc => {
    const cat = ensureCat(setKey, path);
    const itemKey = normId(path.itemId);
    let item = cat.items.get(itemKey);
    if (!item) {
      item = {
        itemId: path.itemId,
        itemName: path.itemName,
        sortItemOrder: path.sortItemOrder,
        findings: new Map(),
        placedRecIds: new Set(),
        standaloneRecommendations: new Map(),
      };
      cat.items.set(itemKey, item);
    }
    return item;
  };

  const placeFinding = (setKey: string, finding: Finding, path: LibraryReportCatItemPath) => {
    const item = ensureItem(setKey, path);
    const fid = normId(finding.fldFindID || finding.id);
    if (!item.findings.has(fid)) {
      const node = buildCatItemFindingNode(finding, path, glossary, recById, standardById);
      item.findings.set(fid, node);
      for (const r of node.recommendations) {
        item.placedRecIds.add(normId(r.recId));
      }
    }
  };

  for (const finding of findings.filter(isActiveLibraryMaster)) {
    const path = resolveCatItemPath(finding.fldItem, categories, items);
    if (!isPlaceableCatItemPath(path)) continue;
    for (const setKey of collectFindingGlossarySetKeys(finding, glossary)) {
      placeFinding(setKey, finding, path);
    }
  }

  for (const rec of recommendations.filter(isActiveLibraryMaster)) {
    const path = resolveCatItemPath(rec.fldItem ?? '', categories, items);
    if (!isPlaceableCatItemPath(path)) continue;
    const recKey = normId(rec.fldRecID || rec.id);
    for (const setKey of collectRecommendationGlossarySetKeys(rec, glossary, path.itemId)) {
      const item = ensureItem(setKey, path);
      if (item.placedRecIds.has(recKey)) continue;
      if (!item.standaloneRecommendations.has(recKey)) {
        item.standaloneRecommendations.set(recKey, toCatItemRecRow(rec, standardById));
      }
    }
  }

  const setKeys = new Set<string>(setMap.keys());
  for (const def of GLOSSARY_SET_DEFS) {
    if (setMap.has(def.id)) setKeys.add(def.id);
  }

  const orderedSetKeys = [
    ...GLOSSARY_SET_DEFS.map((d) => d.id).filter((id) => setKeys.has(id)),
    ...Array.from(setKeys)
      .filter((k) => k && !GLOSSARY_SET_DEFS.some((d) => d.id === k))
      .sort((a, b) =>
        catItemGlossarySetLabel(a).localeCompare(catItemGlossarySetLabel(b), undefined, {
          sensitivity: 'base',
        })
      ),
  ];
  if (setKeys.has(GLOSSARY_SET_UNASSIGNED_KEY)) {
    orderedSetKeys.unshift(GLOSSARY_SET_UNASSIGNED_KEY);
  }

  const groups: StandardsAssocCatItemSetGroup[] = [];

  for (const setKey of orderedSetKeys) {
    const catMap = setMap.get(setKey);
    if (!catMap) continue;

    const categories: StandardsAssocCatItemCategoryNode[] = [];

    for (const cat of catMap.values()) {
      const itemNodes: StandardsAssocCatItemItemNode[] = [];
      for (const item of cat.items.values()) {
        const findingsList = Array.from(item.findings.values()).sort((a, b) =>
          a.findingShort.localeCompare(b.findingShort, undefined, { sensitivity: 'base' })
        );
        const standalone = Array.from(item.standaloneRecommendations.values()).sort((a, b) =>
          a.recShort.localeCompare(b.recShort, undefined, { sensitivity: 'base' })
        );
        if (findingsList.length === 0 && standalone.length === 0) continue;
        itemNodes.push({
          itemId: item.itemId,
          itemName: item.itemName,
          sortItemOrder: item.sortItemOrder,
          findings: findingsList,
          standaloneRecommendations: standalone,
        });
      }
      itemNodes.sort((a, b) => {
        if (a.sortItemOrder !== b.sortItemOrder) return a.sortItemOrder - b.sortItemOrder;
        return a.itemName.localeCompare(b.itemName, undefined, { sensitivity: 'base' });
      });
      if (itemNodes.length === 0) continue;
      categories.push({
        categoryId: cat.categoryId,
        categoryName: cat.categoryName,
        sortCategoryOrder: cat.sortCategoryOrder,
        items: itemNodes,
      });
    }

    categories.sort((a, b) => {
      if (a.sortCategoryOrder !== b.sortCategoryOrder) return a.sortCategoryOrder - b.sortCategoryOrder;
      return a.categoryName.localeCompare(b.categoryName, undefined, { sensitivity: 'base' });
    });

    if (categories.length === 0) continue;

    groups.push({
      setKey,
      setLabel: catItemGlossarySetLabel(setKey),
      isUnassigned: setKey === GLOSSARY_SET_UNASSIGNED_KEY,
      categories,
      ...recomputeCatItemSetCounts(categories),
    });
  }

  return groups;
}

function catItemFindingMatchesSearch(
  cat: StandardsAssocCatItemCategoryNode,
  item: StandardsAssocCatItemItemNode,
  finding: StandardsAssocCatItemFindingNode,
  q: string
): boolean {
  const hay = [
    cat.categoryName,
    item.itemName,
    finding.findingShort,
    finding.findingLong,
    ...finding.recommendations.map(
      (r) =>
        `${r.recShort} ${r.recLong} ${r.citations.map((c) => `${c.citationLabel} ${c.citationName} ${c.contentPreview}`).join(' ')}`
    ),
    ...finding.findingCitations.map((c) => `${c.citationLabel} ${c.citationName} ${c.contentPreview}`),
  ]
    .join(' ')
    .toLowerCase();
  return hay.includes(q);
}

function recomputeCatItemSetCounts(categories: StandardsAssocCatItemCategoryNode[]) {
  let citationSlotCount = 0;
  let findingCount = 0;
  let recommendationLinkCount = 0;
  for (const cat of categories) {
    for (const item of cat.items) {
      findingCount += item.findings.length;
      recommendationLinkCount += item.standaloneRecommendations.length;
      for (const f of item.findings) {
        recommendationLinkCount += f.recommendations.length;
        citationSlotCount += f.findingCitations.length;
        for (const r of f.recommendations) {
          citationSlotCount += r.citations.length;
        }
      }
      for (const r of item.standaloneRecommendations) {
        citationSlotCount += r.citations.length;
      }
    }
  }
  return { citationSlotCount, findingCount, recommendationLinkCount };
}

/** UI filters for Standards Associations Category / Item / Finding hierarchy. */
export function filterStandardsAssociationsCatItemGroups(
  groups: StandardsAssocCatItemSetGroup[],
  options: { search?: string; hideUnassociated?: boolean }
): StandardsAssocCatItemSetGroup[] {
  const q = String(options.search ?? '').trim().toLowerCase();
  void options.hideUnassociated;

  if (!q) return groups;

  return groups
    .map((g) => {
      const categories = g.categories
        .map((cat) => {
          const items = cat.items
            .map((item) => {
              const findings = item.findings.filter((f) =>
                catItemFindingMatchesSearch(cat, item, f, q)
              );
              const standaloneRecommendations = item.standaloneRecommendations.filter((r) => {
                const hay = [
                  cat.categoryName,
                  item.itemName,
                  r.recShort,
                  r.recLong,
                  ...r.citations.map((c) => `${c.citationLabel} ${c.citationName} ${c.contentPreview}`),
                ]
                  .join(' ')
                  .toLowerCase();
                return hay.includes(q);
              });
              const includeItem =
                findings.length > 0 ||
                standaloneRecommendations.length > 0 ||
                (!findings.length &&
                  !standaloneRecommendations.length &&
                  `${cat.categoryName} ${item.itemName}`.toLowerCase().includes(q));
              if (!includeItem) return null;
              return { ...item, findings, standaloneRecommendations };
            })
            .filter((item): item is StandardsAssocCatItemItemNode => item != null);
          const includeCat =
            items.length > 0 ||
            cat.categoryName.toLowerCase().includes(q);
          if (!includeCat) return null;
          return { ...cat, items };
        })
        .filter((cat): cat is StandardsAssocCatItemCategoryNode => cat != null);
      if (categories.length === 0) return null;
      return { ...g, categories, ...recomputeCatItemSetCounts(categories) };
    })
    .filter((g): g is StandardsAssocCatItemSetGroup => g != null);
}

export function buildStandardsAssociationsReport(input: {
  standards: MasterStandard[];
  findings: Finding[];
  recommendations: MasterRecommendation[];
  categories: Category[];
  items: Item[];
}): StandardsAssocSetGroup[] {
  const { standards, findings, recommendations, categories, items } = input;

  const activeStandards = standards.filter((s) => !s.fldIsArchived);
  const standardById = new Map<string, MasterStandard>();
  for (const s of activeStandards) {
    standardById.set(normId(s.id), s);
  }

  const findingsByStandard = new Map<string, Finding[]>();
  const recsByStandard = new Map<string, MasterRecommendation[]>();

  for (const f of findings) {
    for (const sid of safeStandardsArray(f.fldStandards)) {
      const key = normId(sid);
      if (!standardById.has(key)) continue;
      const list = findingsByStandard.get(key) ?? [];
      list.push(f);
      findingsByStandard.set(key, list);
    }
  }

  for (const r of recommendations) {
    for (const sid of safeStandardsArray(r.fldStandards)) {
      const key = normId(sid);
      if (!standardById.has(key)) continue;
      const list = recsByStandard.get(key) ?? [];
      list.push(r);
      recsByStandard.set(key, list);
    }
  }

  const setMap = new Map<StandardSetKey, StandardsAssocStandardNode[]>();

  for (const s of activeStandards) {
    const sid = normId(s.id);
    const setKey = standardSetKey(s);
    const citationLabel = formatStandardCitationLabel(s) ?? s.citation_num ?? s.id;
    const content = String(s.content_text ?? '').trim();
    const contentPreview = content.length > 280 ? `${content.slice(0, 280)}…` : content;

    const linkedFindings = (findingsByStandard.get(sid) ?? [])
      .map((f): StandardsAssocFindingRow => ({
        findingId: f.fldFindID,
        findingShort: f.fldFindShort,
        findingLong: f.fldFindLong,
        path: resolveCatItemPath(f.fldItem, categories, items),
        missingGlossarySetMetadata: hasMissingGlossarySetMetadata(f),
      }))
      .sort((a, b) => {
        const p = compareCatItemPath(a.path, b.path);
        if (p !== 0) return p;
        return a.findingShort.localeCompare(b.findingShort, undefined, { sensitivity: 'base' });
      });

    const linkedRecs = (recsByStandard.get(sid) ?? [])
      .map((r): StandardsAssocRecommendationRow => {
        const itemId = r.fldItem ?? '';
        return {
          recId: r.fldRecID,
          recShort: r.fldRecShort,
          recLong: r.fldRecLong,
          path: itemId ? resolveCatItemPath(itemId, categories, items) : {
            categoryId: '',
            categoryName: '(no item)',
            itemId: '',
            itemName: '(no item)',
            sortCategoryOrder: 9999,
            sortItemOrder: 9999,
          },
          missingGlossarySetMetadata: hasMissingGlossarySetMetadata(r),
        };
      })
      .sort((a, b) => {
        const p = compareCatItemPath(a.path, b.path);
        if (p !== 0) return p;
        return a.recShort.localeCompare(b.recShort, undefined, { sensitivity: 'base' });
      });

    const node: StandardsAssocStandardNode = {
      standardId: s.id,
      citationLabel,
      citationName: String(s.citation_name ?? '').trim(),
      contentPreview,
      relationType: String(s.relation_type ?? '').trim(),
      findings: linkedFindings,
      recommendations: linkedRecs,
    };

    const list = setMap.get(setKey) ?? [];
    list.push(node);
    setMap.set(setKey, list);
  }

  const groups: StandardsAssocSetGroup[] = [];

  for (const [setKey, nodes] of setMap.entries()) {
    nodes.sort((a, b) => {
      const sa = standardById.get(normId(a.standardId));
      const sb = standardById.get(normId(b.standardId));
      const c = compareStandardCitations(sa, sb);
      if (c !== 0) return c;
      return a.standardId.localeCompare(b.standardId, undefined, { sensitivity: 'base' });
    });
    const findingLinkCount = nodes.reduce((n, s) => n + s.findings.length, 0);
    const recommendationLinkCount = nodes.reduce((n, s) => n + s.recommendations.length, 0);
    groups.push({
      setKey,
      setLabel: standardSetLabel(setKey),
      standards: nodes,
      standardCount: nodes.length,
      findingLinkCount,
      recommendationLinkCount,
    });
  }

  groups.sort((a, b) => a.setLabel.localeCompare(b.setLabel, undefined, { sensitivity: 'base' }));
  return groups;
}

export function buildGlossaryHierarchyReport(input: {
  glossary: Glossary[];
  findings: Finding[];
  recommendations: MasterRecommendation[];
  categories: Category[];
  items: Item[];
}): GlossaryHierarchySetGroup[] {
  const { glossary, findings, recommendations, categories, items } = input;

  const findingById = new Map(findings.map((f) => [normId(f.fldFindID), f]));
  const recById = new Map(recommendations.map((r) => [normId(r.fldRecID), r]));
  const glossaryById = new Map(
    glossary.map((g) => [normId(String(g.fldGlosId ?? g.id ?? '')), g])
  );
  const catById = new Map(categories.map((c) => [normId(c.fldCategoryID), c]));
  const itemById = new Map(items.map((i) => [normId(i.fldItemID), i]));

  type RowAcc = {
    setKey: string;
    catId: string;
    itemId: string;
    findId: string;
    recId: string;
    glossaryRowId: string;
  };

  const rows: RowAcc[] = [];
  for (const g of glossary) {
    if (g.fldDeleted || g.fldIsDeleted) continue;
    const finding = findingById.get(normId(g.fldFind));
    const rec = recById.get(normId(g.fldRec));
    const setKey = resolveGlossaryHierarchySetKey(g, finding, rec);
    rows.push({
      setKey,
      catId: String(g.fldCat ?? '').trim(),
      itemId: String(g.fldItem ?? '').trim(),
      findId: String(g.fldFind ?? '').trim(),
      recId: String(g.fldRec ?? '').trim(),
      glossaryRowId: String(g.fldGlosId ?? g.id ?? '').trim(),
    });
  }

  const setKeys = new Set<string>(rows.map((r) => r.setKey));
  for (const def of GLOSSARY_SET_DEFS) {
    if (rows.some((r) => r.setKey === def.id)) setKeys.add(def.id);
  }

  const orderedSetKeys = [
    ...GLOSSARY_SET_DEFS.map((d) => d.id).filter((id) => setKeys.has(id)),
    ...Array.from(setKeys).filter((k) => k && !GLOSSARY_SET_DEFS.some((d) => d.id === k)).sort(),
  ];
  if (setKeys.has(GLOSSARY_SET_UNASSIGNED_KEY)) {
    orderedSetKeys.unshift(GLOSSARY_SET_UNASSIGNED_KEY);
  }

  const groups: GlossaryHierarchySetGroup[] = [];

  for (const setKey of orderedSetKeys) {
    const setRows = rows.filter((r) => r.setKey === setKey);
    if (setRows.length === 0 && setKey !== GLOSSARY_SET_UNASSIGNED_KEY) continue;

    const catMap = new Map<string, Map<string, Map<string, Map<string, RowAcc[]>>>>();

    for (const row of setRows) {
      let cat = catMap.get(row.catId);
      if (!cat) {
        cat = new Map();
        catMap.set(row.catId, cat);
      }
      let item = cat.get(row.itemId);
      if (!item) {
        item = new Map();
        cat.set(row.itemId, item);
      }
      let find = item.get(row.findId);
      if (!find) {
        find = new Map();
        item.set(row.findId, find);
      }
      const recList = find.get(row.recId) ?? [];
      recList.push(row);
      find.set(row.recId, recList);
    }

    const categories: GlossaryHierarchyCategoryNode[] = [];

    for (const [catId, itemMap] of catMap.entries()) {
      const cat = catById.get(normId(catId));
      const categoryNode: GlossaryHierarchyCategoryNode = {
        categoryId: (cat?.fldCategoryID ?? catId) || '(unknown)',
        categoryName: cat?.fldCategoryName ?? '(unknown category)',
        items: [],
      };

      for (const [itemId, findMap] of itemMap.entries()) {
        const item = itemById.get(normId(itemId));
        const itemNode: GlossaryHierarchyItemNode = {
          itemId: (item?.fldItemID ?? itemId) || '(unknown)',
          itemName: item?.fldItemName ?? '(unknown item)',
          findings: [],
        };

        for (const [findId, recMap] of findMap.entries()) {
          const finding = findingById.get(normId(findId));
          const findingNode: GlossaryHierarchyFindingNode = {
            findingId: (finding?.fldFindID ?? findId) || '(unknown)',
            findingShort: finding?.fldFindShort ?? '(unknown finding)',
            findingLong: finding?.fldFindLong ?? '',
            recommendations: [],
            glossaryRowCount: 0,
          };

          for (const [recId, accRows] of recMap.entries()) {
            const rec = recById.get(normId(recId));
            const glossaryRow =
              glossaryById.get(normId(accRows[0]?.glossaryRowId ?? '')) ??
              glossary.find(
                (g) =>
                  normId(String(g.fldGlosId ?? g.id ?? '')) ===
                  normId(accRows[0]?.glossaryRowId ?? '')
              );
            findingNode.recommendations.push({
              recId: (rec?.fldRecID ?? recId) || '(unknown)',
              recShort: rec?.fldRecShort ?? '(unknown recommendation)',
              recLong: rec?.fldRecLong ?? '',
              glossaryRowIds: accRows.map((r) => r.glossaryRowId).filter(Boolean),
              setAssociationStatus: computeGlossarySetAssociationStatus(
                glossaryRow,
                finding,
                rec
              ),
            });
            findingNode.glossaryRowCount += accRows.length;
          }

          findingNode.recommendations.sort((a, b) =>
            a.recShort.localeCompare(b.recShort, undefined, { sensitivity: 'base' })
          );
          itemNode.findings.push(findingNode);
        }

        itemNode.findings.sort((a, b) => {
          const fa = findingById.get(normId(a.findingId));
          const fb = findingById.get(normId(b.findingId));
          return sortByOrderThenName(
            { fldOrder: fa?.fldOrder },
            { fldOrder: fb?.fldOrder },
            a.findingShort,
            b.findingShort
          );
        });

        categoryNode.items.push(itemNode);
      }

      categoryNode.items.sort((a, b) => {
        const ia = itemById.get(normId(a.itemId));
        const ib = itemById.get(normId(b.itemId));
        return sortByOrderThenName(
          { fldOrder: ia?.fldOrder },
          { fldOrder: ib?.fldOrder },
          a.itemName,
          b.itemName
        );
      });

      categories.push(categoryNode);
    }

    categories.sort((a, b) => {
      const ca = catById.get(normId(a.categoryId));
      const cb = catById.get(normId(b.categoryId));
      return sortByOrderThenName(
        { fldOrder: ca?.fldOrder },
        { fldOrder: cb?.fldOrder },
        a.categoryName,
        b.categoryName
      );
    });

    groups.push({
      setKey,
      setLabel: resolveGlossarySetLabelForKey(setKey),
      isUnassigned: setKey === GLOSSARY_SET_UNASSIGNED_KEY,
      categories,
      glossaryRowCount: setRows.length,
    });
  }

  return groups.filter((g) => g.glossaryRowCount > 0 || g.categories.length > 0);
}

// --- Glossary Set Metadata Audit (read-only) ---

export type GlossarySetMetadataAuditStatus =
  | 'ok'
  | 'derivable'
  | 'missing'
  | 'mismatch'
  | 'partial';

export type GlossarySetMetadataAuditAction =
  | 'none'
  | 'backfill'
  | 'manual_review_mismatch'
  | 'manual_review_unknown';

export type GlossaryRowSetFieldsSnapshot = {
  fldGlossarySetId: string;
  fldGlossarySetName: string;
  fldGlossaryStandardType: string;
  fldGlossaryStandardVersion: string;
};

export type LinkedEntitySetSnapshot = {
  setKey: string;
  setLabel: string;
  source: GlossarySetResolveSource;
};

export type GlossarySetMetadataAuditRow = {
  glossaryRowId: string;
  status: GlossarySetMetadataAuditStatus;
  suggestedAction: GlossarySetMetadataAuditAction;
  suggestedActionLabel: string;
  derivedSetKey: string;
  derivedSetLabel: string;
  derivedFrom: 'row' | 'finding' | 'recommendation' | 'none';
  rowFields: GlossaryRowSetFieldsSnapshot;
  rowResolved: ResolvedGlossarySet;
  findingResolved: LinkedEntitySetSnapshot;
  recommendationResolved: LinkedEntitySetSnapshot;
  findingId: string;
  findingShort: string;
  recId: string;
  recShort: string;
  categoryName: string;
  itemName: string;
  pathLabel: string;
};

export type GlossarySetMetadataAuditSummary = {
  totalRows: number;
  counts: Record<GlossarySetMetadataAuditStatus, number>;
};

export type GlossarySetMetadataAuditReport = {
  summary: GlossarySetMetadataAuditSummary;
  byStatus: Record<GlossarySetMetadataAuditStatus, GlossarySetMetadataAuditRow[]>;
};

export const GLOSSARY_SET_METADATA_AUDIT_STATUS_ORDER: GlossarySetMetadataAuditStatus[] = [
  'mismatch',
  'missing',
  'partial',
  'derivable',
  'ok',
];

export const GLOSSARY_SET_METADATA_AUDIT_STATUS_LABELS: Record<
  GlossarySetMetadataAuditStatus,
  string
> = {
  ok: 'OK',
  derivable: 'Derivable / Backfillable',
  missing: 'Missing / Unknown',
  mismatch: 'Set Mismatch',
  partial: 'Partial Metadata',
};

function emptyAuditStatusCounts(): Record<GlossarySetMetadataAuditStatus, number> {
  return { ok: 0, derivable: 0, missing: 0, mismatch: 0, partial: 0 };
}

function glossaryRowSetFieldsSnapshot(g: Glossary): GlossaryRowSetFieldsSnapshot {
  return {
    fldGlossarySetId: String(g.fldGlossarySetId ?? '').trim(),
    fldGlossarySetName: String(g.fldGlossarySetName ?? '').trim(),
    fldGlossaryStandardType: String(g.fldGlossaryStandardType ?? '').trim(),
    fldGlossaryStandardVersion: String(g.fldGlossaryStandardVersion ?? '').trim(),
  };
}

function rowHasAnyGlossarySetField(fields: GlossaryRowSetFieldsSnapshot): boolean {
  return Boolean(
    fields.fldGlossarySetId ||
      fields.fldGlossarySetName ||
      fields.fldGlossaryStandardType ||
      fields.fldGlossaryStandardVersion
  );
}

function rowMatchesCanonicalSetFields(
  fields: GlossaryRowSetFieldsSnapshot,
  setKey: string
): boolean {
  if (!setKey) return false;
  const canonical = glossaryRowSetMetadataPayload(setKey);
  if (!canonical.fldGlossarySetId) return false;
  return (
    fields.fldGlossarySetId === canonical.fldGlossarySetId &&
    fields.fldGlossarySetName === canonical.fldGlossarySetName &&
    fields.fldGlossaryStandardType === canonical.fldGlossaryStandardType &&
    fields.fldGlossaryStandardVersion === canonical.fldGlossaryStandardVersion
  );
}

function isRowPartialGlossarySetMetadata(fields: GlossaryRowSetFieldsSnapshot): boolean {
  if (!rowHasAnyGlossarySetField(fields)) return false;
  if (fields.fldGlossarySetId) {
    if (!fields.fldGlossarySetName || !fields.fldGlossaryStandardType || !fields.fldGlossaryStandardVersion) {
      return true;
    }
  } else if (fields.fldGlossarySetName || fields.fldGlossaryStandardType) {
    return true;
  }
  const rowKey = resolveGlossarySetForRecord(fields).setKey;
  if (rowKey && !rowMatchesCanonicalSetFields(fields, rowKey)) return true;
  if (!rowKey && rowHasAnyGlossarySetField(fields)) return true;
  return false;
}

function entitySetKeysForAudit(
  glossaryRow: Glossary,
  finding: Finding | undefined,
  rec: MasterRecommendation | undefined
): string[] {
  return [
    resolveGlossarySetForRecord(glossaryRow).setKey,
    resolveGlossarySetForRecord(finding).setKey,
    resolveGlossarySetForRecord(rec).setKey,
  ].filter((k) => k !== '');
}

function hasGlossarySetMismatchForAudit(
  glossaryRow: Glossary,
  finding: Finding | undefined,
  rec: MasterRecommendation | undefined
): boolean {
  return new Set(entitySetKeysForAudit(glossaryRow, finding, rec)).size > 1;
}

function deriveConfidentGlossarySetForAudit(
  glossaryRow: Glossary,
  finding: Finding | undefined,
  rec: MasterRecommendation | undefined
): { setKey: string; setLabel: string; derivedFrom: GlossarySetMetadataAuditRow['derivedFrom'] } {
  const fromRow = resolveGlossarySetForRecord(glossaryRow);
  if (fromRow.setKey) {
    return { setKey: fromRow.setKey, setLabel: fromRow.setLabel, derivedFrom: 'row' };
  }
  const fromFinding = resolveGlossarySetForRecord(finding);
  const fromRec = resolveGlossarySetForRecord(rec);
  if (fromFinding.setKey && fromRec.setKey && fromFinding.setKey === fromRec.setKey) {
    return {
      setKey: fromFinding.setKey,
      setLabel: fromFinding.setLabel,
      derivedFrom: 'finding',
    };
  }
  if (fromFinding.setKey) {
    return { setKey: fromFinding.setKey, setLabel: fromFinding.setLabel, derivedFrom: 'finding' };
  }
  if (fromRec.setKey) {
    return { setKey: fromRec.setKey, setLabel: fromRec.setLabel, derivedFrom: 'recommendation' };
  }
  return {
    setKey: '',
    setLabel: GLOSSARY_SET_UNASSIGNED_LABEL,
    derivedFrom: 'none',
  };
}

function toLinkedEntitySnapshot(
  entity: Parameters<typeof resolveGlossarySetForRecord>[0]
): LinkedEntitySetSnapshot {
  const r = resolveGlossarySetForRecord(entity);
  return { setKey: r.setKey, setLabel: r.setLabel, source: r.source };
}

function suggestedActionForAuditRow(
  status: GlossarySetMetadataAuditStatus,
  derivedSetKey: string
): { action: GlossarySetMetadataAuditAction; label: string } {
  if (status === 'ok') return { action: 'none', label: 'No action' };
  if (status === 'mismatch') {
    return { action: 'manual_review_mismatch', label: 'Manual review: mismatch' };
  }
  if (status === 'missing') {
    return { action: 'manual_review_unknown', label: 'Manual review: unknown' };
  }
  if (derivedSetKey) {
    return {
      action: 'backfill',
      label: `Backfill row set metadata to ${resolveGlossarySetLabelForKey(derivedSetKey)}`,
    };
  }
  return { action: 'manual_review_unknown', label: 'Manual review: unknown' };
}

function classifyGlossaryRowSetMetadataAudit(
  glossaryRow: Glossary,
  finding: Finding | undefined,
  rec: MasterRecommendation | undefined
): GlossarySetMetadataAuditStatus {
  if (hasGlossarySetMismatchForAudit(glossaryRow, finding, rec)) return 'mismatch';
  const fields = glossaryRowSetFieldsSnapshot(glossaryRow);
  const { setKey } = deriveConfidentGlossarySetForAudit(glossaryRow, finding, rec);
  if (!setKey) return 'missing';
  if (isRowPartialGlossarySetMetadata(fields)) return 'partial';
  if (rowMatchesCanonicalSetFields(fields, setKey)) return 'ok';
  return 'derivable';
}

function compareGlossaryAuditRows(a: GlossarySetMetadataAuditRow, b: GlossarySetMetadataAuditRow): number {
  const path = a.pathLabel.localeCompare(b.pathLabel, undefined, { sensitivity: 'base' });
  if (path !== 0) return path;
  return a.glossaryRowId.localeCompare(b.glossaryRowId, undefined, { sensitivity: 'base' });
}

export function buildGlossarySetMetadataAuditReport(input: {
  glossary: Glossary[];
  findings: Finding[];
  recommendations: MasterRecommendation[];
  categories: Category[];
  items: Item[];
}): GlossarySetMetadataAuditReport {
  const { glossary, findings, recommendations, categories, items } = input;
  const findingById = new Map(findings.map((f) => [normId(f.fldFindID), f]));
  const recById = new Map(recommendations.map((r) => [normId(r.fldRecID), r]));
  const catById = new Map(categories.map((c) => [normId(c.fldCategoryID), c]));
  const itemById = new Map(items.map((i) => [normId(i.fldItemID), i]));

  const byStatus: Record<GlossarySetMetadataAuditStatus, GlossarySetMetadataAuditRow[]> = {
    ok: [],
    derivable: [],
    missing: [],
    mismatch: [],
    partial: [],
  };

  for (const g of glossary) {
    if (g.fldDeleted || g.fldIsDeleted) continue;
    const glossaryRowId = String(g.fldGlosId ?? g.id ?? '').trim();
    if (!glossaryRowId) continue;

    const finding = findingById.get(normId(g.fldFind));
    const rec = recById.get(normId(g.fldRec));
    const cat = catById.get(normId(g.fldCat));
    const item = itemById.get(normId(g.fldItem));
    const categoryName = cat?.fldCategoryName ?? '(unknown category)';
    const itemName = item?.fldItemName ?? '(unknown item)';
    const findingShort = finding?.fldFindShort ?? '(unknown finding)';
    const recShort = rec?.fldRecShort ?? '(unknown recommendation)';
    const pathLabel = `${categoryName} → ${itemName} → ${findingShort} → ${recShort}`;

    const status = classifyGlossaryRowSetMetadataAudit(g, finding, rec);
    const derived = deriveConfidentGlossarySetForAudit(g, finding, rec);
    const { action, label } = suggestedActionForAuditRow(status, derived.setKey);

    byStatus[status].push({
      glossaryRowId,
      status,
      suggestedAction: action,
      suggestedActionLabel: label,
      derivedSetKey: derived.setKey,
      derivedSetLabel: derived.setLabel,
      derivedFrom: derived.derivedFrom,
      rowFields: glossaryRowSetFieldsSnapshot(g),
      rowResolved: resolveGlossarySetForRecord(g),
      findingResolved: toLinkedEntitySnapshot(finding),
      recommendationResolved: toLinkedEntitySnapshot(rec),
      findingId: String(g.fldFind ?? finding?.fldFindID ?? '').trim(),
      findingShort,
      recId: String(g.fldRec ?? rec?.fldRecID ?? '').trim(),
      recShort,
      categoryName,
      itemName,
      pathLabel,
    });
  }

  for (const status of GLOSSARY_SET_METADATA_AUDIT_STATUS_ORDER) {
    byStatus[status].sort(compareGlossaryAuditRows);
  }

  const counts = emptyAuditStatusCounts();
  let totalRows = 0;
  for (const status of GLOSSARY_SET_METADATA_AUDIT_STATUS_ORDER) {
    counts[status] = byStatus[status].length;
    totalRows += counts[status];
  }

  return {
    summary: { totalRows, counts },
    byStatus,
  };
}

export function filterGlossarySetMetadataAuditReport(
  report: GlossarySetMetadataAuditReport,
  search: string
): GlossarySetMetadataAuditReport {
  const q = String(search ?? '').trim().toLowerCase();
  if (!q) return report;

  const byStatus: Record<GlossarySetMetadataAuditStatus, GlossarySetMetadataAuditRow[]> = {
    ok: [],
    derivable: [],
    missing: [],
    mismatch: [],
    partial: [],
  };

  for (const status of GLOSSARY_SET_METADATA_AUDIT_STATUS_ORDER) {
    byStatus[status] = report.byStatus[status].filter((row) => {
      const hay = [
        row.glossaryRowId,
        row.pathLabel,
        row.status,
        row.derivedSetLabel,
        row.suggestedActionLabel,
        row.rowFields.fldGlossarySetId,
        row.rowFields.fldGlossarySetName,
        row.rowFields.fldGlossaryStandardType,
        row.rowFields.fldGlossaryStandardVersion,
        row.findingResolved.setLabel,
        row.recommendationResolved.setLabel,
        row.findingId,
        row.recId,
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }

  const counts = emptyAuditStatusCounts();
  let totalRows = 0;
  for (const status of GLOSSARY_SET_METADATA_AUDIT_STATUS_ORDER) {
    counts[status] = byStatus[status].length;
    totalRows += counts[status];
  }

  return { summary: { totalRows, counts }, byStatus };
}
