import { describe, expect, it } from 'vitest';
import type { ProjectData } from '../../types';
import {
  applyWebReportRecordInclusion,
  createDefaultWebReportRecordInclusion,
  deriveWebReportFilterOptions,
  isWebReportRecordInclusionAllSelected,
} from '../webReportFilters';
import type { WebReportEnrichedRecord } from '../webReportTree';

function makeRecord(partial: Partial<ProjectData> = {}): WebReportEnrichedRecord {
  return {
    fldPDataID: partial.fldPDataID ?? 'pd-1',
    fldPDataProject: 'proj-1',
    fldFacility: 'fac-1',
    fldData: '',
    fldLocation: partial.fldLocation ?? 'loc-a',
    fldFindShort: '',
    fldFindLong: '',
    fldRecShort: '',
    fldRecLong: '',
    fldQTY: 1,
    fldImages: [],
    fldInspID: 'insp-1',
    fldTimestamp: '',
    fldRecordSource: 'custom',
    fldPDataCategoryID: partial.fldPDataCategoryID ?? 'cat-a',
    fldPDataItemID: partial.fldPDataItemID ?? 'item-a',
    ...partial,
  } as WebReportEnrichedRecord;
}

describe('webReportFilters', () => {
  const glossary: never[] = [];
  const categories = [{ fldCategoryID: 'cat-a', fldCategoryName: 'Category A', fldOrder: 1 }];
  const items = [{ fldItemID: 'item-a', fldItemName: 'Item A', fldCatID: 'cat-a', fldOrder: 1 }];
  const locations = [{ fldLocID: 'loc-a', fldLocName: 'Location A', fldFacID: 'fac-1', fldProjectID: 'proj-1' }];

  it('derives filter options from facility records', () => {
    const records = [
      makeRecord(),
      makeRecord({
        fldPDataID: 'pd-2',
        fldPDataCategoryID: 'cat-b',
        fldPDataItemID: 'item-b',
        fldLocation: 'loc-b',
      }),
    ];
    const options = deriveWebReportFilterOptions(records, glossary, categories, items, locations);
    expect(options.categories.map((o) => o.id).sort()).toEqual(['cat-a', 'cat-b'].sort());
    expect(options.locations.map((o) => o.id).sort()).toEqual(['loc-a', 'loc-b'].sort());
  });

  it('applyWebReportRecordInclusion keeps only selected dimensions', () => {
    const records = [
      makeRecord({ fldPDataID: 'pd-1' }),
      makeRecord({
        fldPDataID: 'pd-2',
        fldPDataCategoryID: 'cat-b',
        fldPDataItemID: 'item-b',
        fldLocation: 'loc-b',
      }),
    ];
    const options = deriveWebReportFilterOptions(records, glossary, categories, items, locations);
    const inclusion = createDefaultWebReportRecordInclusion(options);
    inclusion.categoryIds = new Set(['cat-a']);
    inclusion.locationIds = new Set(['loc-a']);
    inclusion.itemIds = new Set(['item-a']);

    const included = applyWebReportRecordInclusion(records, inclusion, glossary);
    expect(included.map((r) => r.fldPDataID)).toEqual(['pd-1']);
    expect(isWebReportRecordInclusionAllSelected(inclusion, options)).toBe(false);
  });

  it('default inclusion selects all derived options', () => {
    const records = [makeRecord(), makeRecord({ fldPDataID: 'pd-2', fldLocation: 'loc-b' })];
    const options = deriveWebReportFilterOptions(records, glossary, categories, items, locations);
    const inclusion = createDefaultWebReportRecordInclusion(options);
    expect(applyWebReportRecordInclusion(records, inclusion, glossary)).toHaveLength(2);
    expect(isWebReportRecordInclusionAllSelected(inclusion, options)).toBe(true);
  });
});
