import type { Category, Finding, Glossary, Item, MasterRecommendation, MasterStandard } from '../types';
import {
  GLOSSARY_SET_DEFS,
  GLOSSARY_SET_UNASSIGNED_LABEL,
  resolveGlossarySetForRecord,
  resolveGlossarySetLabelForKey,
} from './glossarySets';
import { compareStandardCitations, formatStandardCitationLabel } from './standardCitationLabel';

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

export type StandardsAssocCatItemCitationNode = {
  standardId: string;
  citationLabel: string;
  citationName: string;
  contentPreview: string;
  relationType: string;
  findings: StandardsAssocFindingRow[];
  recommendations: StandardsAssocRecommendationRow[];
};

export type StandardsAssocCatItemItemNode = {
  itemId: string;
  itemName: string;
  sortItemOrder: number;
  citations: StandardsAssocCatItemCitationNode[];
};

export type StandardsAssocCatItemCategoryNode = {
  categoryId: string;
  categoryName: string;
  sortCategoryOrder: number;
  items: StandardsAssocCatItemItemNode[];
};

export type StandardsAssocCatItemSetGroup = {
  setKey: StandardSetKey;
  setLabel: string;
  categories: StandardsAssocCatItemCategoryNode[];
  citationSlotCount: number;
  findingLinkCount: number;
  recommendationLinkCount: number;
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

  addItemId(rec.fldItem ?? '');

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

function ensureCatItemCitationSlot(
  slotMap: Map<string, StandardsAssocCatItemCitationNode>,
  std: StandardsAssocStandardNode
): StandardsAssocCatItemCitationNode {
  const existing = slotMap.get(normId(std.standardId));
  if (existing) return existing;
  const node: StandardsAssocCatItemCitationNode = {
    standardId: std.standardId,
    citationLabel: std.citationLabel,
    citationName: std.citationName,
    contentPreview: std.contentPreview,
    relationType: std.relationType,
    findings: [],
    recommendations: [],
  };
  slotMap.set(normId(std.standardId), node);
  return node;
}

/**
 * Category / Item hierarchy: each citation appears once per (category, item) pair that has
 * linked findings or recommendations for that standard.
 */
export function buildStandardsAssociationsCatItemReport(input: {
  standards: MasterStandard[];
  findings: Finding[];
  recommendations: MasterRecommendation[];
  glossary: Glossary[];
  categories: Category[];
  items: Item[];
}): StandardsAssocCatItemSetGroup[] {
  const citationGroups = buildStandardsAssociationsReport(input);
  const {
    glossary,
    findings,
    recommendations,
    categories: masterCategories,
    items: masterItems,
  } = input;
  const recById = new Map(recommendations.map((r) => [normId(r.fldRecID), r]));
  const standardById = new Map<string, MasterStandard>();
  for (const s of input.standards.filter((row) => !row.fldIsArchived)) {
    standardById.set(normId(s.id), s);
  }

  const groups: StandardsAssocCatItemSetGroup[] = [];

  for (const setGroup of citationGroups) {
    type ItemAcc = {
      itemId: string;
      itemName: string;
      sortItemOrder: number;
      citations: Map<string, StandardsAssocCatItemCitationNode>;
    };
    type CatAcc = {
      categoryId: string;
      categoryName: string;
      sortCategoryOrder: number;
      items: Map<string, ItemAcc>;
    };
    const catMap = new Map<string, CatAcc>();

    const ensureItem = (path: LibraryReportCatItemPath): ItemAcc => {
      const catKey = normId(path.categoryId);
      let cat = catMap.get(catKey);
      if (!cat) {
        cat = {
          categoryId: path.categoryId,
          categoryName: path.categoryName,
          sortCategoryOrder: path.sortCategoryOrder,
          items: new Map(),
        };
        catMap.set(catKey, cat);
      }
      const itemKey = normId(path.itemId);
      let item = cat.items.get(itemKey);
      if (!item) {
        item = {
          itemId: path.itemId,
          itemName: path.itemName,
          sortItemOrder: path.sortItemOrder,
          citations: new Map(),
        };
        cat.items.set(itemKey, item);
      }
      return item;
    };

    for (const std of setGroup.standards) {
      for (const f of std.findings) {
        const item = ensureItem(f.path);
        const slot = ensureCatItemCitationSlot(item.citations, std);
        if (!slot.findings.some((row) => row.findingId === f.findingId)) {
          slot.findings.push(f);
        }
      }
      for (const r of std.recommendations) {
        const masterRec = recById.get(normId(r.recId));
        if (!masterRec) continue;

        const paths = collectRecommendationCatItemPaths(masterRec, {
          standardId: std.standardId,
          glossary,
          findings,
          categories: masterCategories,
          items: masterItems,
        });

        const pathsToUse = paths.length > 0 ? paths : isPlaceableCatItemPath(r.path) ? [r.path] : [];

        for (const path of pathsToUse) {
          const item = ensureItem(path);
          const slot = ensureCatItemCitationSlot(item.citations, std);
          if (!slot.recommendations.some((row) => row.recId === r.recId)) {
            slot.recommendations.push({ ...r, path });
          }
        }
      }
    }

    const categories: StandardsAssocCatItemCategoryNode[] = [];

    for (const cat of catMap.values()) {
      const itemNodes: StandardsAssocCatItemItemNode[] = [];
      for (const item of cat.items.values()) {
        const citations = Array.from(item.citations.values()).sort((a, b) => {
          const sa = standardById.get(normId(a.standardId));
          const sb = standardById.get(normId(b.standardId));
          const c = compareStandardCitations(sa, sb);
          if (c !== 0) return c;
          return a.standardId.localeCompare(b.standardId, undefined, { sensitivity: 'base' });
        });
        if (citations.length === 0) continue;
        citations.forEach((c) => {
          c.findings.sort((a, b) =>
            a.findingShort.localeCompare(b.findingShort, undefined, { sensitivity: 'base' })
          );
          c.recommendations.sort((a, b) =>
            a.recShort.localeCompare(b.recShort, undefined, { sensitivity: 'base' })
          );
        });
        itemNodes.push({
          itemId: item.itemId,
          itemName: item.itemName,
          sortItemOrder: item.sortItemOrder,
          citations,
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

    let citationSlotCount = 0;
    let findingLinkCount = 0;
    let recommendationLinkCount = 0;
    for (const cat of categories) {
      for (const item of cat.items) {
        citationSlotCount += item.citations.length;
        for (const c of item.citations) {
          findingLinkCount += c.findings.length;
          recommendationLinkCount += c.recommendations.length;
        }
      }
    }

    groups.push({
      setKey: setGroup.setKey,
      setLabel: setGroup.setLabel,
      categories,
      citationSlotCount,
      findingLinkCount,
      recommendationLinkCount,
    });
  }

  groups.sort((a, b) => a.setLabel.localeCompare(b.setLabel, undefined, { sensitivity: 'base' }));
  return groups;
}

function catItemCitationHasAssociations(node: StandardsAssocCatItemCitationNode): boolean {
  return node.findings.length > 0 || node.recommendations.length > 0;
}

function recomputeCatItemSetCounts(categories: StandardsAssocCatItemCategoryNode[]) {
  let citationSlotCount = 0;
  let findingLinkCount = 0;
  let recommendationLinkCount = 0;
  for (const cat of categories) {
    for (const item of cat.items) {
      citationSlotCount += item.citations.length;
      for (const c of item.citations) {
        findingLinkCount += c.findings.length;
        recommendationLinkCount += c.recommendations.length;
      }
    }
  }
  return { citationSlotCount, findingLinkCount, recommendationLinkCount };
}

/** UI filters for Standards Associations Category / Item hierarchy. */
export function filterStandardsAssociationsCatItemGroups(
  groups: StandardsAssocCatItemSetGroup[],
  options: { search?: string; hideUnassociated?: boolean }
): StandardsAssocCatItemSetGroup[] {
  const q = String(options.search ?? '').trim().toLowerCase();
  const hideUnassociated = options.hideUnassociated === true;

  let result = groups;

  if (hideUnassociated) {
    result = result
      .map((g) => {
        const categories = g.categories
          .map((cat) => {
            const items = cat.items
              .map((item) => ({
                ...item,
                citations: item.citations.filter(catItemCitationHasAssociations),
              }))
              .filter((item) => item.citations.length > 0);
            return { ...cat, items };
          })
          .filter((cat) => cat.items.length > 0);
        return { ...g, categories, ...recomputeCatItemSetCounts(categories) };
      })
      .filter((g) => g.categories.length > 0);
  }

  if (!q) return result;

  return result
    .map((g) => {
      const categories = g.categories
        .map((cat) => {
          const items = cat.items
            .map((item) => {
              const citations = item.citations.filter((c) => {
                const hay = [
                  cat.categoryName,
                  item.itemName,
                  c.citationLabel,
                  c.citationName,
                  c.contentPreview,
                  ...c.findings.map((f) => `${f.findingShort} ${f.findingLong}`),
                  ...c.recommendations.map((r) => `${r.recShort} ${r.recLong}`),
                ]
                  .join(' ')
                  .toLowerCase();
                return hay.includes(q);
              });
              return { ...item, citations };
            })
            .filter((item) => item.citations.length > 0);
          return { ...cat, items };
        })
        .filter((cat) => cat.items.length > 0);
      return { ...g, categories, ...recomputeCatItemSetCounts(categories) };
    })
    .filter((g) => g.categories.length > 0);
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
