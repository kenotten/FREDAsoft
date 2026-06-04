import type { FindingsHeader } from './constants.ts';

export type InputFormat = 'xlsx' | 'csv';

export type ParsedRow = Record<FindingsHeader, string> & {
  /** 1-based spreadsheet row number */
  rowNumber: number;
};

export type ReasonCode =
  | 'import_action_skip'
  | 'import_action_update_not_supported_v1'
  | 'review_status_not_approved'
  | 'missing_required_fields'
  | 'invalid_finding_type'
  | 'invalid_boolean_value'
  | 'invalid_sort_order'
  | 'duplicate_in_batch'
  | 'empty_tas_ref_token';

export type SkippedRowEntry = {
  rowNumber: number;
  importKey?: string;
  reasonCodes: ReasonCode[];
};

export type BlockedRowEntry = {
  rowNumber: number;
  importKey?: string;
  reasonCodes: ReasonCode[];
};

export type MissingRequiredEntry = {
  rowNumber: number;
  fields: string[];
};

export type ForbiddenColumnsEntry = {
  rowNumber?: number;
  columns: string[];
};

export type UnresolvedItemEntry = {
  rowNumber: number;
  categoryName?: string;
  itemName?: string;
  fldItem?: string;
  reason: string;
};

export type UnresolvedStandardEntry = {
  rowNumber: number;
  tasRefs: string;
  tokens: string[];
  reason: string;
};

export type DuplicateWarningEntry = {
  rowNumber: number;
  duplicateOfRow: number;
  key: string;
};

export type ProposedCreatePreview = {
  rowNumber: number;
  preview: Record<string, unknown>;
};

export type DryRunSummary = {
  totalRows: number;
  approvedRows: number;
  structurallyValidRows: number;
  blockedRows: number;
  blockedPendingFirestoreResolution: number;
  skippedRows: number;
  proposedCreatePreviews: number;
};

export type DryRunReport = {
  mode: 'offline_dry_run_v1';
  inputPath: string;
  inputFormat: InputFormat;
  generatedAt: string;
  specVersion: string;
  summary: DryRunSummary;
  skippedRows: SkippedRowEntry[];
  blockedRows: BlockedRowEntry[];
  missingRequired: MissingRequiredEntry[];
  forbiddenColumnsPopulated: ForbiddenColumnsEntry[];
  unresolvedItems: UnresolvedItemEntry[];
  unresolvedStandards: UnresolvedStandardEntry[];
  duplicateWarnings: DuplicateWarningEntry[];
  proposedCreates: ProposedCreatePreview[];
  proposedUpdates: [];
  warnings: string[];
};

export type ParseResult =
  | { ok: true; rows: ParsedRow[]; format: InputFormat }
  | { ok: false; fatalError: string; forbiddenColumnsPopulated?: ForbiddenColumnsEntry[] };

export type RowValidationResult = {
  skipped: SkippedRowEntry | null;
  blocked: BlockedRowEntry | null;
  missingRequired: MissingRequiredEntry | null;
  duplicateWarning: DuplicateWarningEntry | null;
  structurallyValid: boolean;
  approved: boolean;
  unresolvedItem: UnresolvedItemEntry | null;
  unresolvedStandards: UnresolvedStandardEntry[];
  proposedCreate: ProposedCreatePreview | null;
};
