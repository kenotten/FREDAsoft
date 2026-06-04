import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseCsvContent } from './parseInput.ts';
import { validateAllRows } from './validateRows.ts';
import { buildDryRunReport } from './buildReport.ts';
import { FIRESTORE_RESOLUTION_DEFERRED } from './constants.ts';

const fixturesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');

function loadRows(fixture: string) {
  const content = fs.readFileSync(path.join(fixturesDir, fixture), 'utf-8');
  const parsed = parseCsvContent(content);
  if (parsed.ok === false) throw new Error(parsed.fatalError);
  return parsed.rows;
}

describe('validateAllRows', () => {
  it('produces preview for approved structurally valid row', () => {
    const rows = loadRows('findings-valid-minimal.csv');
    const results = validateAllRows(rows);
    expect(results).toHaveLength(1);
    expect(results[0]?.structurallyValid).toBe(true);
    expect(results[0]?.proposedCreate).not.toBeNull();
    expect(results[0]?.unresolvedItem?.reason).toBe(FIRESTORE_RESOLUTION_DEFERRED);
    expect(results[0]?.unresolvedStandards[0]?.reason).toBe(FIRESTORE_RESOLUTION_DEFERRED);
  });

  it('skips importAction=skip and non-approved rows', () => {
    const rows = loadRows('findings-with-skips.csv');
    const results = validateAllRows(rows);
    expect(results.filter((r) => r.skipped)).toHaveLength(2);
    expect(results.filter((r) => r.structurallyValid)).toHaveLength(1);
  });

  it('blocks duplicate rasFindShort within batch', () => {
    const rows = loadRows('findings-duplicate.csv');
    const results = validateAllRows(rows);
    expect(results[0]?.structurallyValid).toBe(true);
    expect(results[1]?.blocked?.reasonCodes).toContain('duplicate_in_batch');
    expect(results[1]?.duplicateWarning?.duplicateOfRow).toBe(2);
  });

  it('blocks missing required fields', () => {
    const rows = loadRows('findings-valid-minimal.csv');
    rows[0]!.tasRefs = '';
    const results = validateAllRows(rows);
    expect(results[0]?.blocked?.reasonCodes).toContain('missing_required_fields');
  });

  it('blocks invalid findingType', () => {
    const rows = loadRows('findings-valid-minimal.csv');
    rows[0]!.findingType = 'not_a_type';
    const results = validateAllRows(rows);
    expect(results[0]?.blocked?.reasonCodes).toContain('invalid_finding_type');
  });
});

describe('buildDryRunReport counts', () => {
  it('uses offline count terminology without importableRows', () => {
    const rows = loadRows('findings-with-skips.csv');
    const results = validateAllRows(rows);
    const report = buildDryRunReport('test.csv', 'csv', results);
    expect(report.summary.totalRows).toBe(3);
    expect(report.summary.approvedRows).toBe(1);
    expect(report.summary.structurallyValidRows).toBe(1);
    expect(report.summary.skippedRows).toBe(2);
    expect(report.summary.proposedCreatePreviews).toBe(1);
    expect(report.summary.blockedPendingFirestoreResolution).toBe(1);
    expect(report).not.toHaveProperty('summary.importableRows');
  });
});
