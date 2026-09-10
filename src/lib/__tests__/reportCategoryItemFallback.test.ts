import { describe, expect, it } from 'vitest';
import type { Category, Glossary, Item, Location, ProjectData } from '../../types';
import {
  getRecordStandardIds,
  getReportRecordSortKeys
} from '../reportPreviewShared';
import { buildRasFindingCardDisplay } from '../rasFindingCardDisplay';
import {
  resolveWebReportRecordDimensionIds,
  resolveWebReportRecordView
} from '../webReportTree';

const CAT = '2b83d253-9c45-4089-ad42-ab4d6f0f2346';
const ITEM = '88220fcc-97a2-4400-8164-a6a8790fa2ab';
const GLOS = 'a98403a4-94c0-4647-8b78-6e1bc4c87407';
const OTHER_CAT = 'other-cat-id';
const OTHER_ITEM = 'other-item-id';

const categories: Category[] = [
  { fldCategoryID: CAT, fldCategoryName: 'Toilet & Bathing Rooms', fldOrder: 13 },
  { fldCategoryID: OTHER_CAT, fldCategoryName: 'Other Category', fldOrder: 1 }
];
const items: Item[] = [
  { fldItemID: ITEM, fldItemName: 'Entry Door', fldCatID: CAT, fldOrder: 3 },
  { fldItemID: OTHER_ITEM, fldItemName: 'Other Item', fldCatID: OTHER_CAT, fldOrder: 1 }
];
const locations: Location[] = [
  { fldLocID: 'loc-1', fldLocName: 'Womens Toilet Room', fldFacID: 'fac-1', fldProjectID: 'proj-1' }
];
const glossary: Glossary[] = [
  {
    fldGlosId: GLOS,
    fldCat: CAT,
    fldItem: ITEM,
    fldFind: 'find-1',
    fldRec: 'rec-1',
    fldStandards: ['glossary-only-standard']
  }
];

function pd(partial: Partial<ProjectData> = {}): ProjectData {
  return {
    fldPDataID: 'a23c5303-217c-46ed-82a4-c7abd728ba8f',
    fldPDataProject: 'proj-1',
    fldFacility: 'fac-1',
    fldData: '',
    fldLocation: 'loc-1',
    fldFindShort: 'Man. Clear. Pull Forward',
    fldFindLong: 'There is insufficient maneuvering clearance on the pull side of the latch for a forward approach.',
    fldRecShort: 'Replace the lavatory counter',
    fldRecLong: 'Replace the lavatory counter with one that does not encroach into the required maneuvering clearance for the entry door.',
    fldQTY: 1,
    fldImages: ['a.jpg'],
    fldInspID: 'insp-1',
    fldTimestamp: '',
    fldStandards: ['662_404_1_standard', '664_404_2_standard', '670_404_2_4_standard'],
    ...partial
  };
}

function sortKeys(record: ProjectData) {
  return getReportRecordSortKeys(record, glossary, categories, items, locations, []);
}

function webView(record: ProjectData) {
  return resolveWebReportRecordView(record, glossary, categories, items, locations, []);
}

function webDims(record: ProjectData) {
  return resolveWebReportRecordDimensionIds(record, glossary);
}

describe('report Category/Item fallback', () => {
  it('healthy glossary with valid fldData and no PData IDs uses glossary Category/Item', () => {
    const record = pd({ fldData: GLOS, fldRecordSource: 'glossary' });
    const keys = sortKeys(record);
    const view = webView(record);
    expect(keys.catOrder).toBe(13);
    expect(keys.itemOrder).toBe(3);
    expect(keys.itemName).toBe('Entry Door');
    expect(view.categoryName).toBe('Toilet & Bathing Rooms');
    expect(view.itemName).toBe('Entry Door');
    expect(record.fldData).toBe(GLOS);
  });

  it('healthy glossary with conflicting PData IDs still uses glossary path', () => {
    const record = pd({
      fldData: GLOS,
      fldRecordSource: 'glossary',
      fldPDataCategoryID: OTHER_CAT,
      fldPDataItemID: OTHER_ITEM
    });
    const keys = sortKeys(record);
    const view = webView(record);
    expect(keys.catOrder).toBe(13);
    expect(keys.itemName).toBe('Entry Door');
    expect(view.categoryName).toBe('Toilet & Bathing Rooms');
    expect(view.itemName).toBe('Entry Door');
  });

  it('explicit glossary + blank fldData + PData IDs resolves Category/Item and is not Uncategorized/N/A', () => {
    const record = pd({
      fldData: '',
      fldRecordSource: 'glossary',
      fldPDataCategoryID: CAT,
      fldPDataItemID: ITEM
    });
    const keys = sortKeys(record);
    const view = webView(record);
    const dims = webDims(record);
    expect(view.categoryName).toBe('Toilet & Bathing Rooms');
    expect(view.itemName).toBe('Entry Door');
    expect(view.categoryName).not.toBe('Uncategorized');
    expect(view.itemName).not.toBe('N/A');
    expect(keys.catOrder).toBe(13);
    expect(keys.itemOrder).toBe(3);
    expect(keys.itemName).toBe('Entry Door');
    expect(dims.catId).toBe(CAT);
    expect(dims.itemId).toBe(ITEM);
    expect(record.fldData).toBe('');
    expect(getRecordStandardIds(record, undefined)).toEqual([
      '662_404_1_standard',
      '664_404_2_standard',
      '670_404_2_4_standard'
    ]);
  });

  it('explicit custom + blank fldData + PData IDs still uses PData Category/Item', () => {
    const record = pd({
      fldData: '',
      fldRecordSource: 'custom',
      fldPDataCategoryID: CAT,
      fldPDataItemID: ITEM
    });
    const view = webView(record);
    expect(view.categoryName).toBe('Toilet & Bathing Rooms');
    expect(view.itemName).toBe('Entry Door');
  });

  it('legacy no source + blank fldData + PData IDs resolves Category/Item', () => {
    const record = pd({
      fldData: '',
      fldPDataCategoryID: CAT,
      fldPDataItemID: ITEM
    });
    const view = webView(record);
    expect(view.categoryName).toBe('Toilet & Bathing Rooms');
    expect(view.itemName).toBe('Entry Door');
    expect(sortKeys(record).catOrder).toBe(13);
  });

  it('blank/unresolvable record stays Uncategorized / N/A with order 999', () => {
    const record = pd({ fldData: '', fldRecordSource: 'glossary' });
    const keys = sortKeys(record);
    const view = webView(record);
    expect(view.categoryName).toBe('Uncategorized');
    expect(view.itemName).toBe('N/A');
    expect(keys.catOrder).toBe(999);
    expect(keys.itemOrder).toBe(999);
    expect(keys.itemName).toBe('');
    expect(webDims(record)).toEqual({ catId: '__none__', itemId: '__none__' });
  });

  it('RAS Plan Review and Inspection cards use fallback Category/Item', () => {
    const record = pd({
      fldData: '',
      fldRecordSource: 'glossary',
      fldPDataCategoryID: CAT,
      fldPDataItemID: ITEM,
      fldWorkProduct: 'plan_review',
      fldSheet: 'A2.1'
    });
    const plan = buildRasFindingCardDisplay(
      record,
      'plan_review',
      glossary,
      [],
      locations,
      categories,
      items
    );
    const inspection = buildRasFindingCardDisplay(
      { ...record, fldWorkProduct: 'inspection' },
      'inspection',
      glossary,
      [],
      locations,
      categories,
      items
    );
    expect(plan.categoryName).toBe('Toilet & Bathing Rooms');
    expect(plan.itemName).toBe('Entry Door');
    expect(plan.findingText).toContain('insufficient maneuvering clearance');
    expect(plan.findingText).not.toContain('Replace the lavatory counter');
    expect(inspection.categoryName).toBe('Toilet & Bathing Rooms');
    expect(inspection.itemName).toBe('Entry Door');
  });
});
