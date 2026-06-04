import { randomUUID } from 'crypto';
import {
  BOOLEAN_VALUES,
  FINDING_TYPES,
  FIRESTORE_RESOLUTION_DEFERRED,
  FORBIDDEN_COLUMN_NAMES,
} from './constants.ts';
import type {
  BlockedRowEntry,
  DuplicateWarningEntry,
  ForbiddenColumnsEntry,
  MissingRequiredEntry,
  ParsedRow,
  ProposedCreatePreview,
  RowValidationResult,
  SkippedRowEntry,
  UnresolvedItemEntry,
  UnresolvedStandardEntry,
} from './types.ts';

function norm(s: string): string {
  return s.trim().toLowerCase();
}

function splitSemicolonList(raw: string): string[] {
  if (!raw.trim()) return [];
  return raw
    .split(';')
    .map((t) => t.trim())
    .filter((t) => t !== '');
}

function parseImportAction(raw: string): 'create' | 'update' | 'skip' {
  const v = norm(raw);
  if (v === 'skip') return 'skip';
  if (v === 'update') return 'update';
  return 'create';
}

function parseBoolean(raw: string): boolean | null {
  if (!raw.trim()) return null;
  const v = norm(raw);
  if (v === 'true') return true;
  if (v === 'false') return false;
  return null;
}

function parseSortOrder(raw: string): number | null | 'invalid' {
  if (!raw.trim()) return null;
  const n = Number(raw);
  if (!Number.isInteger(n)) return 'invalid';
  return n;
}

function itemResolutionKey(row: ParsedRow): string {
  const fldItem = row.fldItem.trim();
  if (fldItem) return `id:${norm(fldItem)}`;
  return `name:${norm(row.categoryName)}|${norm(row.itemName)}`;
}

function duplicateKey(row: ParsedRow): string {
  return `${norm(row.rasFindShort)}|${itemResolutionKey(row)}`;
}

function missingRequiredFields(row: ParsedRow): string[] {
  const missing: string[] = [];
  if (!row.rasFindShort.trim()) missing.push('rasFindShort');
  if (!row.rasFindLong.trim()) missing.push('rasFindLong');
  if (!row.reviewStatus.trim()) missing.push('reviewStatus');
  if (!row.tasRefs.trim()) missing.push('tasRefs');
  const hasItemId = !!row.fldItem.trim();
  const hasNames = !!row.categoryName.trim() && !!row.itemName.trim();
  if (!hasItemId && !hasNames) {
    missing.push('fldItem_or_categoryName_itemName');
  }
  return missing;
}

function buildUnresolvedItem(row: ParsedRow): UnresolvedItemEntry {
  return {
    rowNumber: row.rowNumber,
    categoryName: row.categoryName.trim() || undefined,
    itemName: row.itemName.trim() || undefined,
    fldItem: row.fldItem.trim() || undefined,
    reason: FIRESTORE_RESOLUTION_DEFERRED,
  };
}

function buildUnresolvedStandards(row: ParsedRow): UnresolvedStandardEntry[] {
  const tokens = splitSemicolonList(row.tasRefs);
  if (tokens.length === 0) return [];
  return [
    {
      rowNumber: row.rowNumber,
      tasRefs: row.tasRefs.trim(),
      tokens,
      reason: FIRESTORE_RESOLUTION_DEFERRED,
    },
  ];
}

function buildProposedCreate(row: ParsedRow): ProposedCreatePreview {
  const tags = splitSemicolonList(row.applicabilityTags);
  const isCompound = parseBoolean(row.isCompound);
  const active = parseBoolean(row.active);
  const sortOrder = parseSortOrder(row.sortOrder);
  const tokens = splitSemicolonList(row.tasRefs);

  return {
    rowNumber: row.rowNumber,
    preview: {
      fldFindID: randomUUID(),
      fldFindShort: row.rasFindShort.trim(),
      fldFindLong: row.rasFindLong.trim(),
      fldItem: row.fldItem.trim() || null,
      fldStandards: [],
      fldStandardType: 'TAS',
      fldStandardVersion: '2012',
      fldFindingLibraryType: 'ras_plan_review',
      fldReviewStatus: row.reviewStatus.trim(),
      fldFindingType: row.findingType.trim() || null,
      fldApplicabilityTags: tags,
      fldIsCompound: isCompound ?? false,
      fldOrder: sortOrder === 'invalid' || sortOrder === null ? null : sortOrder,
      fldIsDeleted: active === false,
      _previewNote:
        'Offline dry-run preview only. Item and standard resolution deferred; not written to Firestore.',
      _unresolvedTasRefTokens: tokens,
      _itemResolutionDeferred: true,
      _standardResolutionDeferred: tokens.length > 0,
    },
  };
}

export function validateRow(
  row: ParsedRow,
  duplicateFirstRowByKey: Map<string, number>
): RowValidationResult {
  const importKey = row.importKey.trim() || undefined;
  const importAction = parseImportAction(row.importAction);
  const reviewStatus = norm(row.reviewStatus);
  const approved = reviewStatus === 'approved';

  if (importAction === 'skip') {
    return {
      skipped: {
        rowNumber: row.rowNumber,
        importKey,
        reasonCodes: ['import_action_skip'],
      },
      blocked: null,
      missingRequired: null,
      duplicateWarning: null,
      structurallyValid: false,
      approved: false,
      unresolvedItem: null,
      unresolvedStandards: [],
      proposedCreate: null,
    };
  }

  if (importAction === 'update') {
    return {
      skipped: {
        rowNumber: row.rowNumber,
        importKey,
        reasonCodes: ['import_action_update_not_supported_v1'],
      },
      blocked: null,
      missingRequired: null,
      duplicateWarning: null,
      structurallyValid: false,
      approved: false,
      unresolvedItem: null,
      unresolvedStandards: [],
      proposedCreate: null,
    };
  }

  if (!approved) {
    return {
      skipped: {
        rowNumber: row.rowNumber,
        importKey,
        reasonCodes: ['review_status_not_approved'],
      },
      blocked: null,
      missingRequired: null,
      duplicateWarning: null,
      structurallyValid: false,
      approved: false,
      unresolvedItem: null,
      unresolvedStandards: [],
      proposedCreate: null,
    };
  }

  const missing = missingRequiredFields(row);
  if (missing.length > 0) {
    return {
      skipped: null,
      blocked: {
        rowNumber: row.rowNumber,
        importKey,
        reasonCodes: ['missing_required_fields'],
      },
      missingRequired: { rowNumber: row.rowNumber, fields: missing },
      duplicateWarning: null,
      structurallyValid: false,
      approved: true,
      unresolvedItem: null,
      unresolvedStandards: [],
      proposedCreate: null,
    };
  }

  const blockReasons: BlockedRowEntry['reasonCodes'] = [];

  if (row.findingType.trim()) {
    if (!(FINDING_TYPES as readonly string[]).includes(norm(row.findingType))) {
      blockReasons.push('invalid_finding_type');
    }
  }

  if (row.isCompound.trim() && parseBoolean(row.isCompound) === null) {
    blockReasons.push('invalid_boolean_value');
  }

  if (row.active.trim() && parseBoolean(row.active) === null) {
    blockReasons.push('invalid_boolean_value');
  }

  if (parseSortOrder(row.sortOrder) === 'invalid') {
    blockReasons.push('invalid_sort_order');
  }

  const tokens = splitSemicolonList(row.tasRefs);
  if (tokens.length === 0) {
    blockReasons.push('empty_tas_ref_token');
  }

  const dupKey = duplicateKey(row);
  const firstDupRow = duplicateFirstRowByKey.get(dupKey);
  let duplicateWarning: DuplicateWarningEntry | null = null;
  if (firstDupRow != null) {
    blockReasons.push('duplicate_in_batch');
    duplicateWarning = {
      rowNumber: row.rowNumber,
      duplicateOfRow: firstDupRow,
      key: dupKey,
    };
  } else {
    duplicateFirstRowByKey.set(dupKey, row.rowNumber);
  }

  if (blockReasons.length > 0) {
    return {
      skipped: null,
      blocked: { rowNumber: row.rowNumber, importKey, reasonCodes: blockReasons },
      missingRequired: null,
      duplicateWarning,
      structurallyValid: false,
      approved: true,
      unresolvedItem: null,
      unresolvedStandards: [],
      proposedCreate: null,
    };
  }

  const unresolvedItem = buildUnresolvedItem(row);
  const unresolvedStandards = buildUnresolvedStandards(row);
  const proposedCreate = buildProposedCreate(row);

  return {
    skipped: null,
    blocked: null,
    missingRequired: null,
    duplicateWarning: null,
    structurallyValid: true,
    approved: true,
    unresolvedItem,
    unresolvedStandards,
    proposedCreate,
  };
}

export function validateAllRows(rows: ParsedRow[]): RowValidationResult[] {
  const duplicateFirstRowByKey = new Map<string, number>();
  return rows.map((row) => validateRow(row, duplicateFirstRowByKey));
}

/** Scan row values for forbidden column names appearing as keys (paranoia for extended parsers). */
export function findForbiddenPopulatedInRow(
  row: ParsedRow
): ForbiddenColumnsEntry | null {
  const columns: string[] = [];
  for (const name of FORBIDDEN_COLUMN_NAMES) {
    const val = (row as Record<string, string>)[name];
    if (val != null && String(val).trim() !== '') columns.push(name);
  }
  return columns.length ? { rowNumber: row.rowNumber, columns } : null;
}

export { BOOLEAN_VALUES, FINDING_TYPES, FORBIDDEN_COLUMN_NAMES };
