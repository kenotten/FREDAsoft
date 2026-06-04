/** Canonical Findings tab columns (case-sensitive, v1). */
export const FINDINGS_HEADERS = [
  'importKey',
  'importAction',
  'reviewStatus',
  'rasFindShort',
  'rasFindLong',
  'categoryName',
  'itemName',
  'fldItem',
  'tasRefs',
  'findingType',
  'applicabilityTags',
  'isCompound',
  'sortOrder',
  'reviewerNotes',
  'active',
] as const;

export type FindingsHeader = (typeof FINDINGS_HEADERS)[number];

/** Forbidden column names (assessment / rec / cost). Header presence fails the file. */
export const FORBIDDEN_COLUMN_NAMES = [
  'recShort',
  'recLong',
  'recommendation',
  'recommendationShort',
  'recommendationLong',
  'fldRecShort',
  'fldRecLong',
  'fldUnitCost',
  'fldQTY',
  'fldTotalCost',
  'quantity',
  'qty',
  'unitCost',
  'totalCost',
  'cost',
  'fldUnit',
] as const;

export const IMPORT_ACTIONS = ['create', 'update', 'skip'] as const;
export const REVIEW_STATUSES = [
  'draft',
  'needs_review',
  'approved',
  'rejected',
  'imported',
] as const;
export const FINDING_TYPES = [
  'noncompliance',
  'insufficient_information',
  'coordination_issue',
  'best_practice',
  'caution',
  'informational',
] as const;

export const BOOLEAN_VALUES = ['true', 'false'] as const;

export const FINDINGS_SHEET_NAME = 'Findings';

export const FIRESTORE_RESOLUTION_DEFERRED = 'firestore_resolution_deferred_v1';

export const SPEC_VERSION = 'RAS_FINDINGS_IMPORT_FORMAT v1';
