import { SPEC_VERSION } from './constants.ts';
import type {
  DryRunReport,
  InputFormat,
  RowValidationResult,
} from './types.ts';

const SAMPLE_LIMIT = 50;

export function buildDryRunReport(
  inputPath: string,
  inputFormat: InputFormat,
  results: RowValidationResult[]
): DryRunReport {
  const skippedRows = results.filter((r) => r.skipped).map((r) => r.skipped!);
  const blockedRows = results.filter((r) => r.blocked).map((r) => r.blocked!);
  const missingRequired = results
    .filter((r) => r.missingRequired)
    .map((r) => r.missingRequired!);
  const duplicateWarnings = results
    .filter((r) => r.duplicateWarning)
    .map((r) => r.duplicateWarning!);
  const unresolvedItems = results
    .filter((r) => r.unresolvedItem)
    .map((r) => r.unresolvedItem!);
  const unresolvedStandards = results.flatMap((r) => r.unresolvedStandards);
  const proposedCreates = results
    .filter((r) => r.proposedCreate)
    .map((r) => r.proposedCreate!);

  const approvedRows = results.filter((r) => r.approved).length;
  const structurallyValidRows = results.filter((r) => r.structurallyValid).length;
  const blockedPendingFirestoreResolution = structurallyValidRows;

  return {
    mode: 'offline_dry_run_v1',
    inputPath,
    inputFormat,
    generatedAt: new Date().toISOString(),
    specVersion: SPEC_VERSION,
    summary: {
      totalRows: results.length,
      approvedRows,
      structurallyValidRows,
      blockedRows: blockedRows.length,
      blockedPendingFirestoreResolution,
      skippedRows: skippedRows.length,
      proposedCreatePreviews: proposedCreates.length,
    },
    skippedRows,
    blockedRows,
    missingRequired,
    forbiddenColumnsPopulated: [],
    unresolvedItems,
    unresolvedStandards,
    duplicateWarnings,
    proposedCreates,
    proposedUpdates: [],
    warnings: [
      'Offline dry-run v1: Firestore item and standard resolution not performed.',
      'Rows are not fully importable until a future resolution phase completes lookups.',
    ],
  };
}

export function buildFatalReport(
  inputPath: string,
  inputFormat: InputFormat | 'unknown',
  fatalError: string,
  forbiddenColumnsPopulated: DryRunReport['forbiddenColumnsPopulated'] = []
): DryRunReport {
  return {
    mode: 'offline_dry_run_v1',
    inputPath,
    inputFormat: inputFormat === 'unknown' ? 'csv' : inputFormat,
    generatedAt: new Date().toISOString(),
    specVersion: SPEC_VERSION,
    summary: {
      totalRows: 0,
      approvedRows: 0,
      structurallyValidRows: 0,
      blockedRows: 0,
      blockedPendingFirestoreResolution: 0,
      skippedRows: 0,
      proposedCreatePreviews: 0,
    },
    skippedRows: [],
    blockedRows: [],
    missingRequired: [],
    forbiddenColumnsPopulated,
    unresolvedItems: [],
    unresolvedStandards: [],
    duplicateWarnings: [],
    proposedCreates: [],
    proposedUpdates: [],
    warnings: [fatalError, 'No row validation performed due to fatal input error.'],
  };
}

function sampleLines<T>(items: T[], formatter: (item: T) => string): string {
  if (items.length === 0) return '- (none)\n';
  const slice = items.slice(0, SAMPLE_LIMIT);
  const lines = slice.map((item) => `- ${formatter(item)}`).join('\n');
  const more =
    items.length > SAMPLE_LIMIT
      ? `\n- … and ${items.length - SAMPLE_LIMIT} more (see JSON report)\n`
      : '\n';
  return `${lines}${more}`;
}

export function buildDryRunMarkdown(report: DryRunReport): string {
  const s = report.summary;
  return `# RAS Findings Import — Offline Dry Run

**Status:** DRY RUN ONLY — no Firestore reads or writes; no credentials used.

| Field | Value |
|-------|-------|
| Mode | \`${report.mode}\` |
| Input | \`${report.inputPath}\` |
| Format | \`${report.inputFormat}\` |
| Generated | ${report.generatedAt} |
| Spec | ${report.specVersion} |

## Summary counts

| Metric | Count |
|--------|------:|
| totalRows | ${s.totalRows} |
| approvedRows | ${s.approvedRows} |
| structurallyValidRows | ${s.structurallyValidRows} |
| blockedRows | ${s.blockedRows} |
| blockedPendingFirestoreResolution | ${s.blockedPendingFirestoreResolution} |
| skippedRows | ${s.skippedRows} |
| proposedCreatePreviews | ${s.proposedCreatePreviews} |

> **Note:** \`blockedPendingFirestoreResolution\` reflects offline v1 — item/standard lookups are deferred, not resolved.

## Warnings

${report.warnings.map((w) => `- ${w}`).join('\n')}

## Skipped rows

${sampleLines(report.skippedRows, (r) => `Row ${r.rowNumber}: ${r.reasonCodes.join(', ')}`)}

## Blocked rows

${sampleLines(report.blockedRows, (r) => `Row ${r.rowNumber}: ${r.reasonCodes.join(', ')}`)}

## Missing required fields

${sampleLines(report.missingRequired, (r) => `Row ${r.rowNumber}: ${r.fields.join(', ')}`)}

## Forbidden columns

${sampleLines(report.forbiddenColumnsPopulated, (r) =>
  r.rowNumber ? `Row ${r.rowNumber}: ${r.columns.join(', ')}` : r.columns.join(', ')
)}

## Unresolved items (deferred)

${sampleLines(report.unresolvedItems, (r) =>
  `Row ${r.rowNumber}: ${r.reason}${r.fldItem ? ` fldItem=${r.fldItem}` : ''}${r.categoryName ? ` category=${r.categoryName}` : ''}${r.itemName ? ` item=${r.itemName}` : ''}`
)}

## Unresolved standards (deferred)

${sampleLines(report.unresolvedStandards, (r) =>
  `Row ${r.rowNumber}: tokens=[${r.tokens.join('; ')}] (${r.reason})`
)}

## Duplicate warnings

${sampleLines(report.duplicateWarnings, (r) =>
  `Row ${r.rowNumber} duplicates row ${r.duplicateOfRow} (${r.key})`
)}

## Proposed create previews

${sampleLines(report.proposedCreates, (r) =>
  `Row ${r.rowNumber}: ${String(r.preview.fldFindShort)} → preview fldFindID ${String(r.preview.fldFindID)}`
)}
`;
}
