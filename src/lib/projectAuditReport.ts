import type {
  Category,
  Facility,
  Finding,
  Glossary,
  Item,
  Location,
  MasterRecommendation,
  MasterStandard,
  ProjectData,
} from '../types';
import {
  getRecordStandardIds,
  formatGroupedStandardCitations,
} from './reportPreviewShared';
import { isArchivedLibraryMaster } from './libraryMasterLifecycle';

export type AuditMode = 'finding' | 'recommendation';

export type AuditWarningCode =
  | 'missing_finding_id'
  | 'missing_recommendation_id'
  | 'unresolved_facility'
  | 'unresolved_location'
  | 'unresolved_category'
  | 'unresolved_item'
  | 'missing_glossary_row'
  | 'master_finding_archived'
  | 'master_finding_missing'
  | 'master_rec_archived'
  | 'master_rec_missing'
  | 'snapshot_finding_differs'
  | 'snapshot_rec_differs'
  | 'multiple_costs'
  | 'multiple_paired_recommendations'
  | 'multiple_paired_findings'
  | 'inconsistent_citations'
  | 'missing_finding_short'
  | 'missing_finding_long'
  | 'missing_recommendation_short'
  | 'missing_recommendation_long';

export type AuditWarning = {
  code: AuditWarningCode;
  message: string;
};

export type CitationSetSummary = {
  signature: string;
  standardIds: string[];
  labels: string;
  recordCount: number;
};

export type ProjectAuditRecordView = {
  recordId: string;
  facilityId: string;
  facilityLabel: string;
  locationId: string;
  locationLabel: string;
  categoryId: string;
  categoryLabel: string;
  itemId: string;
  itemLabel: string;
  recordSource: 'glossary' | 'custom' | 'unknown';
  findingId: string | null;
  recommendationId: string | null;
  findShort: string;
  findLong: string;
  recShort: string;
  recLong: string;
  /** Raw saved fldUnitCost; null when missing (not coerced to 0 for audit). */
  unitCost: number | null;
  qty: number;
  totalCost: number;
  citationIds: string[];
  citationLabels: string;
  warnings: AuditWarning[];
};

export type ProjectAuditGroup = {
  groupKey: string;
  mode: AuditMode;
  masterId: string | null;
  masterShort: string | null;
  masterLong: string | null;
  masterArchived: boolean;
  masterMissing: boolean;
  records: ProjectAuditRecordView[];
  recordCount: number;
  facilityIds: string[];
  facilityLabels: string[];
  distinctTotalCosts: number[];
  costMin: number | null;
  costMax: number | null;
  pairedIds: string[];
  citationSets: CitationSetSummary[];
  warnings: AuditWarning[];
};

export type ProjectAuditFacilityOption = {
  id: string;
  label: string;
};

export type ProjectAuditBuildResult = {
  findingGroups: ProjectAuditGroup[];
  recommendationGroups: ProjectAuditGroup[];
  records: ProjectAuditRecordView[];
  facilityOptions: ProjectAuditFacilityOption[];
  summary: {
    recordCount: number;
    findingGroupCount: number;
    recommendationGroupCount: number;
    facilityCount: number;
    warningCount: number;
  };
};

export type ProjectAuditBuildInput = {
  projectId: string;
  projectData: ProjectData[];
  facilities: Facility[];
  locations: Location[];
  categories: Category[];
  items: Item[];
  glossary: Glossary[];
  findings: Finding[];
  resolvableFindings: Finding[];
  masterRecommendations: MasterRecommendation[];
  resolvableMasterRecommendations: MasterRecommendation[];
  standards: MasterStandard[];
};

const UNASSIGNED_FINDING_KEY = '__unassigned_finding__';
const UNASSIGNED_REC_KEY = '__unassigned_recommendation__';

function normId(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

/** Blank projectData snapshot text: null, undefined, empty, or whitespace-only after trim. */
export function isBlankSnapshotText(value: unknown): boolean {
  return !String(value ?? '').trim();
}

export const BLANK_SNAPSHOT_TEXT_WARNING_CODES: ReadonlySet<AuditWarningCode> = new Set([
  'missing_finding_short',
  'missing_finding_long',
  'missing_recommendation_short',
  'missing_recommendation_long',
]);

/** Unresolved/missing category, item, location, or blank report snapshot text. */
export const REPORT_CONTENT_AUDIT_WARNING_CODES: ReadonlySet<AuditWarningCode> = new Set([
  'unresolved_category',
  'unresolved_item',
  'unresolved_location',
  'missing_finding_short',
  'missing_finding_long',
  'missing_recommendation_short',
  'missing_recommendation_long',
]);

export function recordHasBlankSnapshotTextWarning(record: ProjectAuditRecordView): boolean {
  return record.warnings.some((w) => BLANK_SNAPSHOT_TEXT_WARNING_CODES.has(w.code));
}

export function hasProjectAuditReportContentIssue(record: ProjectAuditRecordView): boolean {
  return record.warnings.some((w) => REPORT_CONTENT_AUDIT_WARNING_CODES.has(w.code));
}

function normalizeCompareText(value: unknown): string {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function textsDiffer(snapshot: unknown, master: unknown): boolean {
  const s = normalizeCompareText(snapshot);
  const m = normalizeCompareText(master);
  if (!s && !m) return false;
  return s !== m;
}

function isCustomProjectDataRecord(rec: ProjectData): boolean {
  const fldDataBlank = !(rec.fldData || '').trim();
  const hasPDataCatItem =
    !!(rec.fldPDataCategoryID || '').trim() && !!(rec.fldPDataItemID || '').trim();
  return rec.fldRecordSource === 'custom' || (fldDataBlank && hasPDataCatItem);
}

function resolveGlossaryRow(record: ProjectData, glossaryByKey: Map<string, Glossary>): Glossary | undefined {
  const key = normId(record.fldData);
  if (!key) return undefined;
  return glossaryByKey.get(key);
}

function citationSignature(ids: string[]): string {
  return [...ids].map((id) => String(id).trim()).filter(Boolean).sort().join('|');
}

function buildCitationSetSummaries(
  records: ProjectAuditRecordView[]
): CitationSetSummary[] {
  const map = new Map<string, CitationSetSummary>();
  for (const r of records) {
    const sig = citationSignature(r.citationIds);
    const existing = map.get(sig);
    if (existing) {
      existing.recordCount += 1;
    } else {
      map.set(sig, {
        signature: sig,
        standardIds: [...r.citationIds],
        labels: r.citationLabels,
        recordCount: 1,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.recordCount - a.recordCount);
}

function filterActiveProjectRecords(projectData: ProjectData[], projectId: string): ProjectData[] {
  const pid = normId(projectId);
  if (!pid) return [];
  const seen = new Set<string>();
  const out: ProjectData[] = [];
  for (const d of projectData) {
    if (d.fldDeleted || d.fldIsDeleted) continue;
    if (!String(d.fldPDataID || '').trim()) continue;
    if (normId(d.fldPDataProject) !== pid) continue;
    if (seen.has(d.fldPDataID)) continue;
    seen.add(d.fldPDataID);
    out.push(d);
  }
  return out;
}

type ResolvedContext = {
  glossaryRow?: Glossary;
  recordSource: 'glossary' | 'custom' | 'unknown';
  categoryId: string;
  categoryLabel: string;
  itemId: string;
  itemLabel: string;
  findingId: string | null;
  recommendationId: string | null;
  categoryResolved: boolean;
  itemResolved: boolean;
  missingGlossaryRow: boolean;
};

function resolveRecordContext(
  record: ProjectData,
  glossaryByKey: Map<string, Glossary>,
  categoryById: Map<string, Category>,
  itemById: Map<string, Item>
): ResolvedContext {
  const glos = resolveGlossaryRow(record, glossaryByKey);
  const custom = isCustomProjectDataRecord(record);
  const hasFldData = !!(record.fldData || '').trim();

  let recordSource: ResolvedContext['recordSource'] = 'unknown';
  if (record.fldRecordSource === 'custom' || custom) recordSource = 'custom';
  else if (hasFldData && glos) recordSource = 'glossary';
  else if (hasFldData && !glos) recordSource = 'glossary';
  else if (!hasFldData && custom) recordSource = 'custom';

  let categoryId = '';
  let itemId = '';
  let findingId: string | null = null;
  let recommendationId: string | null = null;

  if (glos && !custom) {
    categoryId = String(glos.fldCat || '').trim();
    itemId = String(glos.fldItem || '').trim();
    findingId = String(glos.fldFind || '').trim() || null;
    recommendationId = String(glos.fldRec || (glos as { fldRecID?: string }).fldRecID || '').trim() || null;
  } else if (custom) {
    categoryId = String(record.fldPDataCategoryID || '').trim();
    itemId = String(record.fldPDataItemID || '').trim();
    findingId = String(record.fldPDataMasterFindID || '').trim() || null;
    recommendationId = String(record.fldPDataMasterRecID || '').trim() || null;
  } else if (glos) {
    categoryId = String(glos.fldCat || '').trim();
    itemId = String(glos.fldItem || '').trim();
    findingId = String(glos.fldFind || '').trim() || null;
    recommendationId = String(glos.fldRec || '').trim() || null;
  }

  const cat = categoryId ? categoryById.get(normId(categoryId)) : undefined;
  const item = itemId ? itemById.get(normId(itemId)) : undefined;

  return {
    glossaryRow: glos,
    recordSource,
    categoryId,
    categoryLabel: cat?.fldCategoryName || (categoryId ? categoryId : '—'),
    itemId,
    itemLabel: item?.fldItemName || (itemId ? itemId : '—'),
    findingId,
    recommendationId,
    categoryResolved: !!cat || !categoryId,
    itemResolved: !!item || !itemId,
    missingGlossaryRow: hasFldData && !glos,
  };
}

function resolveMasterFinding(
  findingId: string | null,
  selectableById: Map<string, Finding>,
  resolvableById: Map<string, Finding>
): { short: string | null; long: string | null; archived: boolean; missing: boolean } {
  if (!findingId) {
    return { short: null, long: null, archived: false, missing: false };
  }
  const key = normId(findingId);
  const resolvable = resolvableById.get(key);
  if (!resolvable) {
    return { short: null, long: null, archived: false, missing: true };
  }
  const selectable = selectableById.get(key);
  return {
    short: resolvable.fldFindShort ?? null,
    long: resolvable.fldFindLong ?? null,
    archived: isArchivedLibraryMaster(resolvable),
    missing: false,
  };
}

function resolveMasterRec(
  recId: string | null,
  selectableById: Map<string, MasterRecommendation>,
  resolvableById: Map<string, MasterRecommendation>
): { short: string | null; long: string | null; archived: boolean; missing: boolean } {
  if (!recId) {
    return { short: null, long: null, archived: false, missing: false };
  }
  const key = normId(recId);
  const resolvable = resolvableById.get(key);
  if (!resolvable) {
    return { short: null, long: null, archived: false, missing: true };
  }
  return {
    short: resolvable.fldRecShort ?? null,
    long: resolvable.fldRecLong ?? null,
    archived: isArchivedLibraryMaster(resolvable),
    missing: false,
  };
}

function recordWarnings(
  ctx: ResolvedContext,
  record: ProjectData,
  facilityResolved: boolean,
  locationResolved: boolean,
  findingMaster: ReturnType<typeof resolveMasterFinding>,
  recMaster: ReturnType<typeof resolveMasterRec>
): AuditWarning[] {
  const warnings: AuditWarning[] = [];

  if (!ctx.findingId) {
    warnings.push({ code: 'missing_finding_id', message: 'No finding ID resolved' });
  }
  if (!ctx.recommendationId) {
    warnings.push({ code: 'missing_recommendation_id', message: 'No recommendation ID resolved' });
  }
  if (!facilityResolved && String(record.fldFacility || '').trim()) {
    warnings.push({ code: 'unresolved_facility', message: 'Facility ID not found in library' });
  }
  if (!facilityResolved && !String(record.fldFacility || '').trim()) {
    warnings.push({ code: 'unresolved_facility', message: 'Missing facility ID' });
  }
  const locId = String(record.fldLocation || '').trim();
  if (!locId) {
    warnings.push({ code: 'unresolved_location', message: 'Missing location' });
  } else if (!locationResolved) {
    warnings.push({ code: 'unresolved_location', message: 'Location ID not found' });
  }
  if (!ctx.categoryId) {
    warnings.push({ code: 'unresolved_category', message: 'Missing category' });
  } else if (!ctx.categoryResolved) {
    warnings.push({ code: 'unresolved_category', message: 'Category ID not found' });
  }
  if (!ctx.itemId) {
    warnings.push({ code: 'unresolved_item', message: 'Missing item' });
  } else if (!ctx.itemResolved) {
    warnings.push({ code: 'unresolved_item', message: 'Item ID not found' });
  }
  if (ctx.missingGlossaryRow) {
    warnings.push({ code: 'missing_glossary_row', message: 'fldData set but glossary row missing' });
  }
  if (ctx.findingId && findingMaster.missing) {
    warnings.push({ code: 'master_finding_missing', message: 'Master finding not found' });
  }
  if (ctx.findingId && findingMaster.archived) {
    warnings.push({ code: 'master_finding_archived', message: 'Master finding is archived' });
  }
  if (ctx.recommendationId && recMaster.missing) {
    warnings.push({ code: 'master_rec_missing', message: 'Master recommendation not found' });
  }
  if (ctx.recommendationId && recMaster.archived) {
    warnings.push({ code: 'master_rec_archived', message: 'Master recommendation is archived' });
  }
  if (ctx.findingId && findingMaster.short !== null && textsDiffer(record.fldFindShort, findingMaster.short)) {
    warnings.push({ code: 'snapshot_finding_differs', message: 'Finding short text differs from master' });
  }
  if (ctx.findingId && findingMaster.long !== null && textsDiffer(record.fldFindLong, findingMaster.long)) {
    warnings.push({ code: 'snapshot_finding_differs', message: 'Finding long text differs from master' });
  }
  if (ctx.recommendationId && recMaster.short !== null && textsDiffer(record.fldRecShort, recMaster.short)) {
    warnings.push({ code: 'snapshot_rec_differs', message: 'Recommendation short text differs from master' });
  }
  if (ctx.recommendationId && recMaster.long !== null && textsDiffer(record.fldRecLong, recMaster.long)) {
    warnings.push({ code: 'snapshot_rec_differs', message: 'Recommendation long text differs from master' });
  }

  if (isBlankSnapshotText(record.fldFindShort)) {
    warnings.push({
      code: 'missing_finding_short',
      message: 'Report snapshot: finding short text is blank',
    });
  }
  if (isBlankSnapshotText(record.fldFindLong)) {
    warnings.push({
      code: 'missing_finding_long',
      message: 'Report snapshot: finding long text is blank',
    });
  }
  if (isBlankSnapshotText(record.fldRecShort)) {
    warnings.push({
      code: 'missing_recommendation_short',
      message: 'Report snapshot: recommendation short text is blank',
    });
  }
  if (isBlankSnapshotText(record.fldRecLong)) {
    warnings.push({
      code: 'missing_recommendation_long',
      message: 'Report snapshot: recommendation long text is blank',
    });
  }

  return warnings;
}

function buildRecordViews(input: ProjectAuditBuildInput): ProjectAuditRecordView[] {
  const active = filterActiveProjectRecords(input.projectData, input.projectId);

  const glossaryByKey = new Map<string, Glossary>();
  for (const g of input.glossary) {
    const k1 = normId(g.fldGlosId);
    const k2 = normId(g.id);
    if (k1) glossaryByKey.set(k1, g);
    if (k2) glossaryByKey.set(k2, g);
  }

  const facilityById = new Map<string, Facility>();
  for (const f of input.facilities) {
    const k = normId(f.fldFacID);
    if (k) facilityById.set(k, f);
  }

  const locationById = new Map<string, Location>();
  for (const l of input.locations) {
    const k = normId(l.fldLocID);
    if (k) locationById.set(k, l);
  }

  const categoryById = new Map<string, Category>();
  for (const c of input.categories) {
    const k = normId(c.fldCategoryID);
    if (k) categoryById.set(k, c);
  }

  const itemById = new Map<string, Item>();
  for (const i of input.items) {
    const k = normId(i.fldItemID);
    if (k) itemById.set(k, i);
  }

  const selectableFindingById = new Map<string, Finding>();
  for (const f of input.findings) {
    const k = normId(f.fldFindID || f.id);
    if (k) selectableFindingById.set(k, f);
  }

  const resolvableFindingById = new Map<string, Finding>();
  for (const f of input.resolvableFindings) {
    const k = normId(f.fldFindID || f.id);
    if (k) resolvableFindingById.set(k, f);
  }

  const selectableRecById = new Map<string, MasterRecommendation>();
  for (const r of input.masterRecommendations) {
    const k = normId(r.fldRecID || r.id);
    if (k) selectableRecById.set(k, r);
  }

  const resolvableRecById = new Map<string, MasterRecommendation>();
  for (const r of input.resolvableMasterRecommendations) {
    const k = normId(r.fldRecID || r.id);
    if (k) resolvableRecById.set(k, r);
  }

  return active.map((record) => {
    const ctx = resolveRecordContext(record, glossaryByKey, categoryById, itemById);
    const facId = String(record.fldFacility || '').trim();
    const fac = facId ? facilityById.get(normId(facId)) : undefined;
    const locId = String(record.fldLocation || '').trim();
    const loc = locId ? locationById.get(normId(locId)) : undefined;

    const findingMaster = resolveMasterFinding(
      ctx.findingId,
      selectableFindingById,
      resolvableFindingById
    );
    const recMaster = resolveMasterRec(ctx.recommendationId, selectableRecById, resolvableRecById);

    const citationIds = getRecordStandardIds(record, ctx.glossaryRow);
    const citationLabels =
      citationIds.length > 0
        ? formatGroupedStandardCitations(
            citationIds,
            input.standards.filter((s) => citationIds.includes(String(s.id || '').trim()))
          )
        : '';

    const unitCost = parseAuditRecordUnitCost(record.fldUnitCost);
    const qty = Number(record.fldQTY) || 0;
    const totalCost =
      Number(record.fldTotalCost) || (unitCost !== null ? unitCost * qty : 0);

    return {
      recordId: record.fldPDataID,
      facilityId: facId,
      facilityLabel: fac?.fldFacName || (facId || '—'),
      locationId: locId,
      locationLabel: loc?.fldLocName?.trim() || (locId || '—'),
      categoryId: ctx.categoryId,
      categoryLabel: ctx.categoryLabel,
      itemId: ctx.itemId,
      itemLabel: ctx.itemLabel,
      recordSource: ctx.recordSource,
      findingId: ctx.findingId,
      recommendationId: ctx.recommendationId,
      findShort: String(record.fldFindShort || ''),
      findLong: String(record.fldFindLong || ''),
      recShort: String(record.fldRecShort || ''),
      recLong: String(record.fldRecLong || ''),
      unitCost,
      qty,
      totalCost,
      citationIds,
      citationLabels: citationLabels || '—',
      warnings: recordWarnings(
        ctx,
        record,
        !!fac || !facId,
        !!loc || !locId,
        findingMaster,
        recMaster
      ),
    };
  });
}

function parseAuditRecordUnitCost(raw: unknown): number | null {
  if (raw === undefined || raw === null) return null;
  if (typeof raw === 'string' && !raw.trim()) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/** Cents-rounded unit cost for stable Set comparison (multiple_costs uses unit cost only). */
export function normalizeUnitCostForComparison(unitCost: number): number {
  return Math.round(unitCost * 100) / 100;
}

/** Comparable unit cost from audit record, or null to skip multiple_costs checks. */
export function auditRecordComparableUnitCost(record: ProjectAuditRecordView): number | null {
  if (record.unitCost === null || !Number.isFinite(record.unitCost)) return null;
  return normalizeUnitCostForComparison(record.unitCost);
}

/**
 * Stable recommendation bucket for unit-cost checks (never finding-scoped).
 * Prefers master recommendation ID; includes snapshot text so rows with the same
 * library rec ID but different report snapshots are not merged into one cost bucket.
 */
export function recommendationCostBucketKey(record: ProjectAuditRecordView): string | null {
  const recId = String(record.recommendationId ?? '').trim();
  const short = normalizeCompareText(record.recShort);
  const long = normalizeCompareText(record.recLong);
  const snap = short || long ? `${short}|${long}` : '';

  if (recId && snap) return `id:${normId(recId)}|snap:${snap}`;
  if (recId) return `id:${normId(recId)}`;
  if (snap) return `snap:${snap}`;
  return null;
}

/** Distinct unit costs per recommendation bucket (skips null unit costs and no rec identity). */
export function getRecommendationUnitCostBuckets(
  records: ProjectAuditRecordView[]
): Map<string, Set<number>> {
  const buckets = new Map<string, Set<number>>();
  for (const r of records) {
    const key = recommendationCostBucketKey(r);
    if (!key) continue;
    const unitCost = auditRecordComparableUnitCost(r);
    if (unitCost === null) continue;
    let costs = buckets.get(key);
    if (!costs) {
      costs = new Set<number>();
      buckets.set(key, costs);
    }
    costs.add(unitCost);
  }
  return buckets;
}

/** @deprecated Use getRecommendationUnitCostBuckets */
export const getRecommendationCostBuckets = getRecommendationUnitCostBuckets;

/** True when any recommendation bucket has more than one distinct unit cost. */
export function hasMultipleUnitCostsForSameRecommendation(
  records: ProjectAuditRecordView[],
  mode: AuditMode,
  masterId: string | null
): boolean {
  if (!masterId || records.length === 0) return false;

  if (mode === 'recommendation') {
    const unitCosts = records
      .map(auditRecordComparableUnitCost)
      .filter((c): c is number => c !== null);
    return new Set(unitCosts).size > 1;
  }

  for (const unitCosts of getRecommendationUnitCostBuckets(records).values()) {
    if (unitCosts.size > 1) return true;
  }
  return false;
}

/** @deprecated Use hasMultipleUnitCostsForSameRecommendation */
export const hasMultipleCostsForSameRecommendation = hasMultipleUnitCostsForSameRecommendation;

function countRecommendationUnitCostBucketsWithVariance(
  mode: AuditMode,
  records: ProjectAuditRecordView[]
): number {
  if (mode === 'recommendation') {
    const unitCosts = records
      .map(auditRecordComparableUnitCost)
      .filter((c): c is number => c !== null);
    return new Set(unitCosts).size > 1 ? 1 : 0;
  }
  let count = 0;
  for (const unitCosts of getRecommendationUnitCostBuckets(records).values()) {
    if (unitCosts.size > 1) count += 1;
  }
  return count;
}

function groupWarnings(
  mode: AuditMode,
  records: ProjectAuditRecordView[],
  citationSets: CitationSetSummary[],
  masterArchived: boolean,
  masterMissing: boolean,
  masterId: string | null
): AuditWarning[] {
  const warnings: AuditWarning[] = [];
  const codes = new Set<AuditWarningCode>();

  for (const r of records) {
    for (const w of r.warnings) codes.add(w.code);
  }

  if (mode === 'finding' && !masterId) {
    warnings.push({ code: 'missing_finding_id', message: 'Group has no finding ID' });
  }
  if (mode === 'recommendation' && !masterId) {
    warnings.push({ code: 'missing_recommendation_id', message: 'Group has no recommendation ID' });
  }
  if (masterMissing && masterId) {
    warnings.push({
      code: mode === 'finding' ? 'master_finding_missing' : 'master_rec_missing',
      message: 'Master record not found',
    });
  }
  if (masterArchived && masterId) {
    warnings.push({
      code: mode === 'finding' ? 'master_finding_archived' : 'master_rec_archived',
      message: 'Master record is archived',
    });
  }

  const paired = new Set<string>();
  for (const r of records) {
    const id = mode === 'finding' ? r.recommendationId : r.findingId;
    if (id) paired.add(normId(id));
  }
  if (mode === 'finding' && paired.size > 1) {
    warnings.push({
      code: 'multiple_paired_recommendations',
      message: `${paired.size} distinct recommendations paired with this finding`,
    });
  }
  if (mode === 'recommendation' && paired.size > 1) {
    warnings.push({
      code: 'multiple_paired_findings',
      message: `${paired.size} distinct findings paired with this recommendation`,
    });
  }

  if (hasMultipleUnitCostsForSameRecommendation(records, mode, masterId)) {
    const bucketCount = countRecommendationUnitCostBucketsWithVariance(mode, records);
    warnings.push({
      code: 'multiple_costs',
      message:
        mode === 'finding'
          ? `${bucketCount} recommendation(s) with multiple unit cost values in this finding group`
          : `${new Set(records.map(auditRecordComparableUnitCost).filter((c): c is number => c !== null)).size} distinct unit cost values in group`,
    });
  }

  if (citationSets.length > 1) {
    warnings.push({
      code: 'inconsistent_citations',
      message: `${citationSets.length} distinct citation sets in group`,
    });
  }

  const rowLevelCodes: AuditWarningCode[] = [
    'unresolved_facility',
    'unresolved_location',
    'unresolved_category',
    'unresolved_item',
    'missing_glossary_row',
    'snapshot_finding_differs',
    'snapshot_rec_differs',
  ];
  for (const code of rowLevelCodes) {
    if (codes.has(code)) {
      const msg =
        code === 'inconsistent_citations'
          ? 'Some records have row-level issues'
          : records.find((r) => r.warnings.some((w) => w.code === code))?.warnings.find((w) => w.code === code)
              ?.message || code;
      if (!warnings.some((w) => w.code === code)) {
        warnings.push({ code, message: msg });
      }
    }
  }

  return warnings;
}

function buildGroups(
  mode: AuditMode,
  records: ProjectAuditRecordView[],
  input: ProjectAuditBuildInput
): ProjectAuditGroup[] {
  const selectableFindingById = new Map<string, Finding>();
  for (const f of input.findings) {
    const k = normId(f.fldFindID || f.id);
    if (k) selectableFindingById.set(k, f);
  }
  const resolvableFindingById = new Map<string, Finding>();
  for (const f of input.resolvableFindings) {
    const k = normId(f.fldFindID || f.id);
    if (k) resolvableFindingById.set(k, f);
  }
  const selectableRecById = new Map<string, MasterRecommendation>();
  for (const r of input.masterRecommendations) {
    const k = normId(r.fldRecID || r.id);
    if (k) selectableRecById.set(k, r);
  }
  const resolvableRecById = new Map<string, MasterRecommendation>();
  for (const r of input.resolvableMasterRecommendations) {
    const k = normId(r.fldRecID || r.id);
    if (k) resolvableRecById.set(k, r);
  }

  const byKey = new Map<string, ProjectAuditRecordView[]>();
  for (const r of records) {
    const id = mode === 'finding' ? r.findingId : r.recommendationId;
    const key = id ? normId(id) : mode === 'finding' ? UNASSIGNED_FINDING_KEY : UNASSIGNED_REC_KEY;
    const list = byKey.get(key) || [];
    list.push(r);
    byKey.set(key, list);
  }

  const groups: ProjectAuditGroup[] = [];

  for (const [key, recs] of byKey.entries()) {
    const isUnassigned = key === UNASSIGNED_FINDING_KEY || key === UNASSIGNED_REC_KEY;
    const resolvedId = isUnassigned
      ? null
      : String(mode === 'finding' ? recs[0]?.findingId : recs[0]?.recommendationId || '').trim() || null;

    const findingMaster =
      mode === 'finding'
        ? resolveMasterFinding(resolvedId, selectableFindingById, resolvableFindingById)
        : { short: null, long: null, archived: false, missing: false };
    const recMaster =
      mode === 'recommendation'
        ? resolveMasterRec(resolvedId, selectableRecById, resolvableRecById)
        : { short: null, long: null, archived: false, missing: false };

    const masterShort = mode === 'finding' ? findingMaster.short : recMaster.short;
    const masterLong = mode === 'finding' ? findingMaster.long : recMaster.long;
    const masterArchived = mode === 'finding' ? findingMaster.archived : recMaster.archived;
    const masterMissing = mode === 'finding' ? findingMaster.missing : recMaster.missing;

    const citationSets = buildCitationSetSummaries(recs);
    const facilityIds = [...new Set(recs.map((r) => r.facilityId).filter(Boolean))];
    const facilityLabels = [...new Set(recs.map((r) => r.facilityLabel))];
    const distinctTotalCosts = [...new Set(recs.map((r) => r.totalCost))].sort((a, b) => a - b);
    const pairedIds = [
      ...new Set(
        recs
          .map((r) => (mode === 'finding' ? r.recommendationId : r.findingId))
          .filter(Boolean)
          .map((id) => String(id))
      ),
    ];

    const groupKey = `${mode}:${key}`;

    groups.push({
      groupKey,
      mode,
      masterId: resolvedId,
      masterShort,
      masterLong,
      masterArchived,
      masterMissing,
      records: recs,
      recordCount: recs.length,
      facilityIds,
      facilityLabels,
      distinctTotalCosts,
      costMin: distinctTotalCosts.length ? Math.min(...distinctTotalCosts) : null,
      costMax: distinctTotalCosts.length ? Math.max(...distinctTotalCosts) : null,
      pairedIds,
      citationSets,
      warnings: groupWarnings(mode, recs, citationSets, masterArchived, masterMissing, resolvedId),
    });
  }

  return groups.sort((a, b) => {
    const labelA = a.masterShort || a.masterId || '';
    const labelB = b.masterShort || b.masterId || '';
    return labelA.localeCompare(labelB, undefined, { sensitivity: 'base' });
  });
}

export function buildProjectAuditReport(input: ProjectAuditBuildInput): ProjectAuditBuildResult {
  const records = buildRecordViews(input);
  const facilityMap = new Map<string, string>();
  for (const r of records) {
    const id = r.facilityId || '__none__';
    facilityMap.set(id, r.facilityLabel);
  }
  const facilityOptions: ProjectAuditFacilityOption[] = [
    { id: '__all__', label: 'All facilities' },
    ...[...facilityMap.entries()]
      .filter(([id]) => id !== '__none__' || records.some((r) => !r.facilityId))
      .sort((a, b) => a[1].localeCompare(b[1], undefined, { sensitivity: 'base' }))
      .map(([id, label]) => ({ id, label: id === '__none__' ? '(no facility)' : label })),
  ];

  const findingGroups = buildGroups('finding', records, input);
  const recommendationGroups = buildGroups('recommendation', records, input);

  const allWarnings = new Set<string>();
  for (const g of [...findingGroups, ...recommendationGroups]) {
    for (const w of g.warnings) allWarnings.add(`${g.groupKey}:${w.code}`);
    for (const r of g.records) {
      for (const w of r.warnings) allWarnings.add(`${r.recordId}:${w.code}`);
    }
  }

  return {
    findingGroups,
    recommendationGroups,
    records,
    facilityOptions,
    summary: {
      recordCount: records.length,
      findingGroupCount: findingGroups.length,
      recommendationGroupCount: recommendationGroups.length,
      facilityCount: facilityMap.size,
      warningCount: allWarnings.size,
    },
  };
}

export function filterProjectAuditGroups(
  groups: ProjectAuditGroup[],
  opts: {
    facilityId: string;
    search: string;
    contentIssuesOnly?: boolean;
    warningVisibility?: ProjectAuditWarningVisibility;
  }
): ProjectAuditGroup[] {
  const term = opts.search.trim().toLowerCase();
  const facFilter = opts.facilityId;
  const contentOnly = Boolean(opts.contentIssuesOnly);
  const visibility = opts.warningVisibility ?? createDefaultWarningVisibility();

  return groups
    .map((group) => {
      let records = group.records;
      if (facFilter && facFilter !== '__all__') {
        records = records.filter((r) => {
          if (facFilter === '__none__') return !r.facilityId;
          return normId(r.facilityId) === normId(facFilter);
        });
      }
      if (contentOnly) {
        records = records.filter((r) => hasProjectAuditReportContentIssue(r));
      }
      if (records.length === 0) return null;

      if (!term) {
        return applyWarningVisibilityFilter(group, records, visibility);
      }

      const groupHaystack = [
        group.masterId,
        group.masterShort,
        group.masterLong,
        group.pairedIds.join(' '),
        group.facilityLabels.join(' '),
        group.citationSets.map((c) => c.labels).join(' '),
      ]
        .join(' ')
        .toLowerCase();

      const matchingRecords = records.filter((r) => {
        const hay = [
          r.recordId,
          r.facilityLabel,
          r.locationLabel,
          r.categoryLabel,
          r.itemLabel,
          r.findShort,
          r.findLong,
          r.recShort,
          r.recLong,
          r.citationLabels,
          r.findingId,
          r.recommendationId,
        ]
          .join(' ')
          .toLowerCase();
        return hay.includes(term);
      });

      if (matchingRecords.length === 0 && !groupHaystack.includes(term)) return null;

      const finalRecords = matchingRecords.length > 0 ? matchingRecords : records;
      return applyWarningVisibilityFilter(group, finalRecords, visibility);
    })
    .filter((g): g is ProjectAuditGroup => g !== null);
}

function recomputeGroup(group: ProjectAuditGroup, records: ProjectAuditRecordView[]): ProjectAuditGroup {
  const citationSets = buildCitationSetSummaries(records);
  const facilityIds = [...new Set(records.map((r) => r.facilityId).filter(Boolean))];
  const facilityLabels = [...new Set(records.map((r) => r.facilityLabel))];
  const distinctTotalCosts = [...new Set(records.map((r) => r.totalCost))].sort((a, b) => a - b);
  const pairedIds = [
    ...new Set(
      records
        .map((r) => (group.mode === 'finding' ? r.recommendationId : r.findingId))
        .filter(Boolean)
        .map((id) => String(id))
    ),
  ];

  return {
    ...group,
    records,
    recordCount: records.length,
    facilityIds,
    facilityLabels,
    distinctTotalCosts,
    costMin: distinctTotalCosts.length ? Math.min(...distinctTotalCosts) : null,
    costMax: distinctTotalCosts.length ? Math.max(...distinctTotalCosts) : null,
    pairedIds,
    citationSets,
    warnings: groupWarnings(
      group.mode,
      records,
      citationSets,
      group.masterArchived,
      group.masterMissing,
      group.masterId
    ),
  };
}

export function getGroupsForMode(built: ProjectAuditBuildResult, mode: AuditMode): ProjectAuditGroup[] {
  return mode === 'finding' ? built.findingGroups : built.recommendationGroups;
}

export function countAuditWarnings(groups: ProjectAuditGroup[]): number {
  const seen = new Set<string>();
  for (const g of groups) {
    for (const w of g.warnings) seen.add(`${g.groupKey}:${w.code}`);
    for (const r of g.records) {
      for (const w of r.warnings) seen.add(`${r.recordId}:${w.code}`);
    }
  }
  return seen.size;
}

export function countRecordsWithReportContentIssues(groups: ProjectAuditGroup[]): number {
  let count = 0;
  for (const g of groups) {
    for (const r of g.records) {
      if (hasProjectAuditReportContentIssue(r)) count += 1;
    }
  }
  return count;
}

export const AUDIT_WARNING_LABELS: Partial<Record<AuditWarningCode, string>> = {
  missing_finding_id: 'Missing finding ID',
  missing_recommendation_id: 'Missing recommendation ID',
  unresolved_facility: 'Facility missing or unresolved',
  unresolved_location: 'Missing location',
  unresolved_category: 'Missing category',
  unresolved_item: 'Missing item',
  missing_glossary_row: 'Missing glossary row',
  master_finding_archived: 'Finding archived',
  master_finding_missing: 'Finding missing',
  master_rec_archived: 'Recommendation archived',
  master_rec_missing: 'Recommendation missing',
  snapshot_finding_differs: 'Finding snapshot differs from master',
  snapshot_rec_differs: 'Recommendation snapshot differs from master',
  multiple_costs: 'Multiple unit costs',
  multiple_paired_recommendations: 'Multiple recommendations in group',
  multiple_paired_findings: 'Multiple findings in group',
  inconsistent_citations: 'Mixed citation sets in group',
  missing_finding_short: 'Missing finding short',
  missing_finding_long: 'Missing finding long',
  missing_recommendation_short: 'Missing recommendation short',
  missing_recommendation_long: 'Missing recommendation long',
};

/** Report-critical content/path warnings (rose styling in UI). */
export const CONTENT_AUDIT_WARNING_CODES: ReadonlySet<AuditWarningCode> =
  REPORT_CONTENT_AUDIT_WARNING_CODES;

export type AuditWarningCategoryId =
  | 'report_content'
  | 'metadata_linkage'
  | 'snapshot_drift'
  | 'group_consistency'
  | 'lookup_glossary';

export const AUDIT_WARNING_CATEGORY_ORDER: readonly AuditWarningCategoryId[] = [
  'report_content',
  'metadata_linkage',
  'snapshot_drift',
  'group_consistency',
  'lookup_glossary',
] as const;

export const AUDIT_WARNING_CATEGORIES: Record<
  AuditWarningCategoryId,
  { label: string; codes: readonly AuditWarningCode[] }
> = {
  report_content: {
    label: 'Report content',
    codes: [
      'unresolved_category',
      'unresolved_item',
      'unresolved_location',
      'missing_finding_short',
      'missing_finding_long',
      'missing_recommendation_short',
      'missing_recommendation_long',
    ],
  },
  metadata_linkage: {
    label: 'Metadata & linkage',
    codes: [
      'missing_finding_id',
      'missing_recommendation_id',
      'master_finding_archived',
      'master_finding_missing',
      'master_rec_archived',
      'master_rec_missing',
    ],
  },
  snapshot_drift: {
    label: 'Snapshot drift',
    codes: ['snapshot_finding_differs', 'snapshot_rec_differs'],
  },
  group_consistency: {
    label: 'Group consistency',
    codes: [
      'multiple_costs',
      'multiple_paired_recommendations',
      'multiple_paired_findings',
      'inconsistent_citations',
    ],
  },
  lookup_glossary: {
    label: 'Lookup & glossary',
    codes: ['unresolved_facility', 'missing_glossary_row'],
  },
};

export const ALL_AUDIT_WARNING_CODES: readonly AuditWarningCode[] = AUDIT_WARNING_CATEGORY_ORDER.flatMap(
  (id) => AUDIT_WARNING_CATEGORIES[id].codes
);

export type ProjectAuditWarningVisibility = {
  enabledCodes: ReadonlySet<AuditWarningCode>;
  hideCustomLinkageNoise: boolean;
};

export function createDefaultWarningVisibility(): ProjectAuditWarningVisibility {
  return {
    enabledCodes: new Set(ALL_AUDIT_WARNING_CODES),
    hideCustomLinkageNoise: false,
  };
}

/** All warning codes enabled (custom-noise toggle does not affect this). */
export function isWarningCodeFilterAtDefault(visibility: ProjectAuditWarningVisibility): boolean {
  if (visibility.enabledCodes.size !== ALL_AUDIT_WARNING_CODES.length) return false;
  return ALL_AUDIT_WARNING_CODES.every((code) => visibility.enabledCodes.has(code));
}

/**
 * When true, groups/records are narrowed to those with at least one visible enabled warning.
 * False when all codes enabled OR when no codes enabled (badges-only clear state).
 *
 * Project Audit filter rules:
 * 1. Default (all facilities, no search, content-only off, all warning codes) → all records.
 * 2. Warning codes cleared → all records; badges hidden; warnings count 0.
 * 3. Partial warning-code selection → only records/groups with ≥1 enabled visible warning.
 * 4. Report content issues only → report-content records only (separate filter).
 * 5. Hide custom/unassigned noise → badge visibility only; never removes records.
 */
export function isWarningTypeRecordFilterActive(
  visibility: ProjectAuditWarningVisibility
): boolean {
  if (visibility.enabledCodes.size === 0) return false;
  return !isWarningCodeFilterAtDefault(visibility);
}

/** True when facility, search, content-only, or partial warning-type filters may hide records. */
export function isProjectAuditRecordLimitingFilterActive(opts: {
  facilityId: string;
  search: string;
  contentIssuesOnly: boolean;
  warningVisibility: ProjectAuditWarningVisibility;
}): boolean {
  if (opts.contentIssuesOnly) return true;
  if (isWarningTypeRecordFilterActive(opts.warningVisibility)) return true;
  if (opts.facilityId && opts.facilityId !== '__all__') return true;
  if (String(opts.search ?? '').trim()) return true;
  return false;
}

/** True when any warning-type filter differs from factory defaults. */
export function isWarningFilterActive(visibility: ProjectAuditWarningVisibility): boolean {
  return !isWarningCodeFilterAtDefault(visibility) || visibility.hideCustomLinkageNoise;
}

export function hasFindingSnapshotText(record: ProjectAuditRecordView): boolean {
  return !!String(record.findShort || '').trim() || !!String(record.findLong || '').trim();
}

export function hasRecommendationSnapshotText(record: ProjectAuditRecordView): boolean {
  return !!String(record.recShort || '').trim() || !!String(record.recLong || '').trim();
}

/** Custom record with report-path snapshot fields populated (category, item, location, finding, rec). */
export function hasCustomReportPathSnapshots(record: ProjectAuditRecordView): boolean {
  return (
    !!String(record.categoryId || '').trim() &&
    !!String(record.itemId || '').trim() &&
    !!String(record.locationId || '').trim() &&
    hasFindingSnapshotText(record) &&
    hasRecommendationSnapshotText(record)
  );
}

/** Group-level consistency warnings often expected on unassigned catch-all groups. */
export const UNASSIGNED_GROUP_CONSISTENCY_NOISE_CODES: ReadonlySet<AuditWarningCode> = new Set([
  'multiple_costs',
  'multiple_paired_recommendations',
  'multiple_paired_findings',
  'inconsistent_citations',
]);

export function isUnassignedAuditGroup(group: ProjectAuditGroup): boolean {
  return group.masterId === null;
}

export function isCustomRecordMetadataNoiseWarning(
  code: AuditWarningCode,
  record: ProjectAuditRecordView,
  hideNoise: boolean
): boolean {
  if (!hideNoise || record.recordSource !== 'custom') return false;
  if (code === 'missing_finding_id' && hasFindingSnapshotText(record)) return true;
  if (code === 'missing_recommendation_id' && hasRecommendationSnapshotText(record)) return true;
  if (code === 'missing_glossary_row' && hasCustomReportPathSnapshots(record)) return true;
  if (code === 'master_finding_missing' && hasFindingSnapshotText(record)) return true;
  if (code === 'master_rec_missing' && hasRecommendationSnapshotText(record)) return true;
  return false;
}

/** @deprecated Use isCustomRecordMetadataNoiseWarning */
export function isCustomLinkageNoiseWarning(
  code: AuditWarningCode,
  record: ProjectAuditRecordView,
  hideNoise: boolean
): boolean {
  return isCustomRecordMetadataNoiseWarning(code, record, hideNoise);
}

export function isUnassignedGroupConsistencyNoiseWarning(
  code: AuditWarningCode,
  group: ProjectAuditGroup,
  hideNoise: boolean
): boolean {
  if (!hideNoise || !isUnassignedAuditGroup(group)) return false;
  return UNASSIGNED_GROUP_CONSISTENCY_NOISE_CODES.has(code);
}

/** Visibility-only suppression for the custom/unassigned noise toggle. */
export function isExpectedCustomUnassignedNoiseWarning(
  code: AuditWarningCode,
  context: 'record' | 'group',
  record: ProjectAuditRecordView | null,
  group: ProjectAuditGroup | null,
  hideNoise: boolean
): boolean {
  if (!hideNoise) return false;
  if (context === 'record' && record) {
    return isCustomRecordMetadataNoiseWarning(code, record, true);
  }
  if (context === 'group' && group) {
    return isUnassignedGroupConsistencyNoiseWarning(code, group, true);
  }
  return false;
}

export function isAuditWarningCodeEnabled(
  code: AuditWarningCode,
  visibility: ProjectAuditWarningVisibility
): boolean {
  return visibility.enabledCodes.has(code);
}

export function isAuditWarningVisible(
  warning: AuditWarning,
  context: 'record' | 'group',
  record: ProjectAuditRecordView | null,
  group: ProjectAuditGroup | null,
  visibility: ProjectAuditWarningVisibility
): boolean {
  if (!isAuditWarningCodeEnabled(warning.code, visibility)) return false;
  if (
    isExpectedCustomUnassignedNoiseWarning(
      warning.code,
      context,
      record,
      group,
      visibility.hideCustomLinkageNoise
    )
  ) {
    return false;
  }
  return true;
}

export function filterVisibleAuditWarnings(
  warnings: AuditWarning[],
  context: 'record' | 'group',
  record: ProjectAuditRecordView | null,
  group: ProjectAuditGroup | null,
  visibility: ProjectAuditWarningVisibility
): AuditWarning[] {
  return warnings.filter((w) => isAuditWarningVisible(w, context, record, group, visibility));
}

export function recordHasVisibleWarning(
  record: ProjectAuditRecordView,
  visibility: ProjectAuditWarningVisibility
): boolean {
  return filterVisibleAuditWarnings(record.warnings, 'record', record, null, visibility).length > 0;
}

export function groupHasVisibleGroupWarning(
  group: ProjectAuditGroup,
  visibility: ProjectAuditWarningVisibility
): boolean {
  return filterVisibleAuditWarnings(group.warnings, 'group', null, group, visibility).length > 0;
}

export function countVisibleAuditWarnings(
  groups: ProjectAuditGroup[],
  visibility: ProjectAuditWarningVisibility
): number {
  const seen = new Set<string>();
  for (const g of groups) {
    for (const w of filterVisibleAuditWarnings(g.warnings, 'group', null, g, visibility)) {
      seen.add(`${g.groupKey}:${w.code}`);
    }
    for (const r of g.records) {
      for (const w of filterVisibleAuditWarnings(r.warnings, 'record', r, g, visibility)) {
        seen.add(`${r.recordId}:${w.code}`);
      }
    }
  }
  return seen.size;
}

function applyWarningVisibilityFilter(
  group: ProjectAuditGroup,
  records: ProjectAuditRecordView[],
  visibility: ProjectAuditWarningVisibility
): ProjectAuditGroup | null {
  if (!isWarningTypeRecordFilterActive(visibility)) {
    return recomputeGroup(group, records);
  }

  const recomputed = recomputeGroup(group, records);
  const visibleGroupWarnings = groupHasVisibleGroupWarning(recomputed, visibility);
  const finalRecords = visibleGroupWarnings
    ? records
    : records.filter((r) => recordHasVisibleWarning(r, visibility));

  if (finalRecords.length === 0 && !visibleGroupWarnings) return null;
  return recomputeGroup(group, finalRecords);
}
