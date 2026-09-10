import { describe, expect, it } from 'vitest';
import { buildProjectDataCloneSeed } from '../cloneProjectData';
import { glossaryPathCompleteForSave } from '../workProduct';
import {
  categoryItemIdsFromProjectDataRecord,
  isCustomProjectDataRecord,
  resolveProjectDataSaveIdentity
} from '../projectDataRecordSource';

const CAT = '2b83d253-9c45-4089-ad42-ab4d6f0f2346';
const ITEM = '88220fcc-97a2-4400-8164-a6a8790fa2ab';
const GLOS = '9413f6cf-50f1-4672-99cb-59db06a69344';

describe('isCustomProjectDataRecord', () => {
  it('explicit custom remains custom', () => {
    expect(
      isCustomProjectDataRecord({
        fldRecordSource: 'custom',
        fldData: '',
        fldPDataCategoryID: CAT,
        fldPDataItemID: ITEM
      })
    ).toBe(true);
  });

  it('legacy: no source, blank fldData, both PData IDs remains custom', () => {
    expect(
      isCustomProjectDataRecord({
        fldData: '',
        fldPDataCategoryID: CAT,
        fldPDataItemID: ITEM
      })
    ).toBe(true);
  });

  it('explicit glossary with blank fldData and both PData IDs remains glossary', () => {
    expect(
      isCustomProjectDataRecord({
        fldRecordSource: 'glossary',
        fldData: '',
        fldPDataCategoryID: CAT,
        fldPDataItemID: ITEM
      })
    ).toBe(false);
  });

  it('healthy glossary with fldData is not custom even if PData IDs are also present', () => {
    expect(
      isCustomProjectDataRecord({
        fldRecordSource: 'glossary',
        fldData: GLOS,
        fldPDataCategoryID: CAT,
        fldPDataItemID: ITEM
      })
    ).toBe(false);
  });
});

describe('resolveProjectDataSaveIdentity', () => {
  it('Assessment glossary freehand rec: persists PData IDs, glossary source, blank fldData', () => {
    expect(
      resolveProjectDataSaveIdentity({
        isCustomMode: false,
        categoryId: CAT,
        itemId: ITEM,
        fldDataResolved: ''
      })
    ).toEqual({
      fldData: '',
      fldRecordSource: 'glossary',
      fldPDataCategoryID: CAT,
      fldPDataItemID: ITEM
    });
  });

  it('complete Assessment glossary row still stamps fldData exactly as resolved', () => {
    expect(
      resolveProjectDataSaveIdentity({
        isCustomMode: false,
        categoryId: CAT,
        itemId: ITEM,
        fldDataResolved: GLOS
      })
    ).toEqual({
      fldData: GLOS,
      fldRecordSource: 'glossary',
      fldPDataCategoryID: CAT,
      fldPDataItemID: ITEM
    });
  });

  it('custom mode forces blank fldData and custom source', () => {
    expect(
      resolveProjectDataSaveIdentity({
        isCustomMode: true,
        categoryId: CAT,
        itemId: ITEM,
        fldDataResolved: GLOS
      })
    ).toEqual({
      fldData: '',
      fldRecordSource: 'custom',
      fldPDataCategoryID: CAT,
      fldPDataItemID: ITEM
    });
  });

  it('RAS completeness without recId is unchanged; resolved fldData still stamps', () => {
    expect(
      glossaryPathCompleteForSave(true, { categoryId: CAT, itemId: ITEM, findId: 'find-1', recId: '' })
    ).toBe(true);
    expect(
      resolveProjectDataSaveIdentity({
        isCustomMode: false,
        categoryId: CAT,
        itemId: ITEM,
        fldDataResolved: 'ras-glos-row'
      }).fldData
    ).toBe('ras-glos-row');
  });
});

describe('categoryItemIdsFromProjectDataRecord', () => {
  it('reopening incomplete glossary identity restores Category + Item', () => {
    expect(
      categoryItemIdsFromProjectDataRecord({
        fldRecordSource: 'glossary',
        fldData: '',
        fldPDataCategoryID: CAT,
        fldPDataItemID: ITEM
      })
    ).toEqual({ categoryId: CAT, itemId: ITEM });
  });

  it('healthy glossary hydrates from glossary row; PData IDs do not override', () => {
    expect(
      categoryItemIdsFromProjectDataRecord(
        {
          fldRecordSource: 'glossary',
          fldData: GLOS,
          fldPDataCategoryID: 'other-cat',
          fldPDataItemID: 'other-item'
        },
        { fldCat: CAT, fldItem: ITEM }
      )
    ).toEqual({ categoryId: CAT, itemId: ITEM });
  });

  it('explicit custom hydrates from PData IDs', () => {
    expect(
      categoryItemIdsFromProjectDataRecord({
        fldRecordSource: 'custom',
        fldData: '',
        fldPDataCategoryID: CAT,
        fldPDataItemID: ITEM
      })
    ).toEqual({ categoryId: CAT, itemId: ITEM });
  });
});

describe('buildProjectDataCloneSeed source classification', () => {
  it('explicit glossary + blank fldData + PData IDs clones as glossary with fallback Category/Item', () => {
    const seed = buildProjectDataCloneSeed({
      fldPDataID: 'pd-1',
      fldData: '',
      fldRecordSource: 'glossary',
      fldPDataCategoryID: CAT,
      fldPDataItemID: ITEM,
      fldFindShort: 'Man. Clear. Pull Forward',
      fldRecShort: 'Replace lavatory counter'
    });
    expect(seed.selections.dataEntryMode).toBe('glossary');
    expect(seed.selections.categoryId).toBe(CAT);
    expect(seed.selections.itemId).toBe(ITEM);
    expect(seed.selections.glosId).toBe('');
    expect(seed.saveContext.fldRecordSource).toBe('glossary');
    expect(seed.saveContext.fldData).toBe('');
  });

  it('legacy custom (no source, blank fldData, both PData IDs) clones as custom', () => {
    const seed = buildProjectDataCloneSeed({
      fldPDataID: 'pd-2',
      fldData: '',
      fldPDataCategoryID: CAT,
      fldPDataItemID: ITEM
    });
    expect(seed.selections.dataEntryMode).toBe('custom');
    expect(seed.saveContext.fldRecordSource).toBe('custom');
  });

  it('healthy glossary clones path from glossary row, not conflicting PData IDs', () => {
    const seed = buildProjectDataCloneSeed(
      {
        fldPDataID: 'pd-3',
        fldData: GLOS,
        fldRecordSource: 'glossary',
        fldPDataCategoryID: 'other-cat',
        fldPDataItemID: 'other-item'
      },
      [
        {
          fldGlosId: GLOS,
          fldCat: CAT,
          fldItem: ITEM,
          fldFind: 'find-1',
          fldRec: 'rec-1'
        }
      ]
    );
    expect(seed.selections.dataEntryMode).toBe('glossary');
    expect(seed.selections.categoryId).toBe(CAT);
    expect(seed.selections.itemId).toBe(ITEM);
    expect(seed.selections.glosId).toBe(GLOS);
  });
});
