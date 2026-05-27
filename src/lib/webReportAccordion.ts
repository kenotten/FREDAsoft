import type { ReportRecordSortOrder } from './reportPreviewShared';
import type { WebReportDocumentationTree } from './webReportTree';

export type WebReportAccordionLevel = 'top' | 'mid' | 'item';

export type WebReportAccordionNodeIds = {
  all: string[];
  top: string[];
  mid: string[];
  item: string[];
};

export type WebReportHierarchyLevelLabels = {
  top: string;
  mid: string;
  item: string;
};

/** Display labels for hierarchy accordion controls (plural nouns). */
export function webReportHierarchyLevelLabels(
  sortOrder: ReportRecordSortOrder
): WebReportHierarchyLevelLabels {
  if (sortOrder === 'category_location_item') {
    return { top: 'Categories', mid: 'Locations', item: 'Items' };
  }
  return { top: 'Locations', mid: 'Categories', item: 'Items' };
}

/** Collect stable accordion node IDs from the current documentation tree. */
export function collectWebReportAccordionNodeIds(
  tree: WebReportDocumentationTree | null
): WebReportAccordionNodeIds {
  const top: string[] = [];
  const mid: string[] = [];
  const item: string[] = [];

  if (!tree) {
    return { all: [], top, mid, item };
  }

  for (const t of tree.topGroups) {
    top.push(t.key);
    for (const m of t.children) {
      mid.push(m.key);
      for (const i of m.items) {
        item.push(i.key);
      }
    }
  }

  return { all: [...top, ...mid, ...item], top, mid, item };
}

/** Keys in `collapsed` are collapsed; absent keys are expanded. */
export function applyWebReportAccordionExpandAll(): Set<string> {
  return new Set();
}

export function applyWebReportAccordionCollapseAll(nodeIds: WebReportAccordionNodeIds): Set<string> {
  return new Set(nodeIds.all);
}

export function applyWebReportAccordionExpandLevel(
  collapsed: Set<string>,
  levelIds: readonly string[]
): Set<string> {
  const next = new Set(collapsed);
  for (const id of levelIds) {
    next.delete(id);
  }
  return next;
}

export function applyWebReportAccordionCollapseLevel(
  collapsed: Set<string>,
  levelIds: readonly string[]
): Set<string> {
  const next = new Set(collapsed);
  for (const id of levelIds) {
    next.add(id);
  }
  return next;
}

/** Drop collapsed keys that are not in the current tree (e.g. after sort or data change). */
export function reconcileWebReportCollapsedKeys(
  collapsed: Set<string>,
  nodeIds: WebReportAccordionNodeIds
): Set<string> {
  const valid = new Set(nodeIds.all);
  const next = new Set<string>();
  for (const key of collapsed) {
    if (valid.has(key)) {
      next.add(key);
    }
  }
  return next;
}

export function webReportAccordionLevelIds(
  nodeIds: WebReportAccordionNodeIds,
  level: WebReportAccordionLevel
): readonly string[] {
  if (level === 'top') return nodeIds.top;
  if (level === 'mid') return nodeIds.mid;
  return nodeIds.item;
}
