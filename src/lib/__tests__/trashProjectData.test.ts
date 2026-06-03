import { describe, expect, it } from 'vitest';
import {
  filterDeletedInspectionRecords,
  filterValidProjectDataRows,
  isLegacyCitationProjectDataRow,
  isSoftDeletedProjectDataRow
} from '../trashProjectData';

describe('trashProjectData', () => {
  it('detects legacy citation rows', () => {
    expect(isLegacyCitationProjectDataRow({ citation_num: '1' })).toBe(true);
    expect(isLegacyCitationProjectDataRow({})).toBe(false);
  });

  it('filters valid projectData rows', () => {
    const rows = [{ fldPDataID: 'a' }, { citation_num: 'x', fldPDataID: 'b' }];
    expect(filterValidProjectDataRows(rows)).toEqual([{ fldPDataID: 'a' }]);
  });

  it('detects soft-deleted rows', () => {
    expect(isSoftDeletedProjectDataRow({ fldIsDeleted: true })).toBe(true);
    expect(isSoftDeletedProjectDataRow({ fldDeleted: true })).toBe(true);
    expect(isSoftDeletedProjectDataRow({ fldIsDeleted: false })).toBe(false);
  });

  it('returns deleted inspection records only', () => {
    const rows = [
      { fldPDataID: 'active', fldIsDeleted: false },
      { fldPDataID: 'deleted', fldDeleted: true },
      { citation_num: '1', fldDeleted: true },
      { fldPDataID: 'gone', fldIsDeleted: true }
    ];
    expect(filterDeletedInspectionRecords(rows).map((r) => r.fldPDataID)).toEqual([
      'deleted',
      'gone'
    ]);
  });
});
