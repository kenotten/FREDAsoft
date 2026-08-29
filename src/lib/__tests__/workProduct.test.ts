import { describe, expect, it } from 'vitest';
import {
  parseWorkProduct,
  rasNewRecordConsumptionFields,
  recordMatchesRasWorkMode,
  resolveRecordWorkProduct,
  sheetValueForSave,
  imagesValueForSave,
  rasWorkModeSwitchClearsImages,
  workProductForNewRecord,
  workProductStampForSave,
  glossaryPathCompleteForSave,
} from '../workProduct';

describe('work product resolution', () => {
  it('explicit assessment wins', () => {
    expect(parseWorkProduct('assessment')).toBe('assessment');
    expect(resolveRecordWorkProduct({ fldWorkProduct: 'assessment' }, 'TAS/RAS')).toBe('assessment');
  });

  it('explicit plan_review wins', () => {
    expect(resolveRecordWorkProduct({ fldWorkProduct: 'plan_review' }, 'Assessment')).toBe('plan_review');
  });

  it('explicit inspection wins', () => {
    expect(resolveRecordWorkProduct({ fldWorkProduct: 'inspection' }, 'Assessment')).toBe('inspection');
  });

  it('missing + Assessment → assessment', () => {
    expect(resolveRecordWorkProduct({}, 'Assessment')).toBe('assessment');
    expect(resolveRecordWorkProduct({ fldWorkProduct: '  ' }, 'Assessment')).toBe('assessment');
  });

  it('missing + TAS/RAS → inspection', () => {
    expect(resolveRecordWorkProduct({}, 'TAS/RAS')).toBe('inspection');
    expect(resolveRecordWorkProduct({}, undefined)).toBe('inspection');
  });

  it('does not infer from Sheet', () => {
    expect(resolveRecordWorkProduct({ fldWorkProduct: undefined } as any, 'TAS/RAS')).toBe('inspection');
  });
});

describe('new-record stamp', () => {
  it('new Assessment row stamps assessment', () => {
    expect(workProductForNewRecord('Assessment', 'inspection')).toBe('assessment');
    expect(
      workProductStampForSave({ isNew: true, projectType: 'Assessment', rasWorkMode: 'plan_review' })
    ).toBe('assessment');
  });

  it('new Review row stamps plan_review', () => {
    expect(workProductForNewRecord('TAS/RAS', 'plan_review')).toBe('plan_review');
    expect(
      workProductStampForSave({ isNew: true, projectType: 'TAS/RAS', rasWorkMode: 'plan_review' })
    ).toBe('plan_review');
  });

  it('new Inspection row stamps inspection', () => {
    expect(workProductForNewRecord('TAS/RAS', 'inspection')).toBe('inspection');
    expect(workProductForNewRecord('TAS/RAS', null)).toBe('inspection');
  });

  it('existing explicit work product is not reclassified', () => {
    expect(
      workProductStampForSave({
        isNew: false,
        existingWorkProduct: 'inspection',
        projectType: 'TAS/RAS',
        rasWorkMode: 'plan_review',
      })
    ).toBe('inspection');
  });

  it('legacy TAS/RAS row remains unstamped so fallback stays inspection', () => {
    expect(
      workProductStampForSave({
        isNew: false,
        existingWorkProduct: '',
        projectType: 'TAS/RAS',
        rasWorkMode: 'plan_review',
      })
    ).toBeUndefined();
    expect(resolveRecordWorkProduct({ fldWorkProduct: undefined }, 'TAS/RAS')).toBe('inspection');
  });
});

describe('Sheet save', () => {
  it('new Review row persists fldSheet', () => {
    expect(
      sheetValueForSave({
        isNew: true,
        workProduct: 'plan_review',
        formSheet: '  3/A2.1  ',
      })
    ).toBe('3/A2.1');
  });

  it('new Inspection row does not acquire stale fldSheet', () => {
    expect(
      sheetValueForSave({
        isNew: true,
        workProduct: 'inspection',
        formSheet: 'A2.1',
      })
    ).toBeUndefined();
  });

  it('existing Review row persists hydrated fldSheet on save', () => {
    expect(
      sheetValueForSave({
        isNew: false,
        workProduct: 'plan_review',
        existingWorkProduct: 'plan_review',
        formSheet: 'A5.03',
      })
    ).toBe('A5.03');
  });

  it('existing Inspection row does not persist stale fldSheet', () => {
    expect(
      sheetValueForSave({
        isNew: false,
        workProduct: 'inspection',
        existingWorkProduct: 'inspection',
        formSheet: 'A2.1',
      })
    ).toBeUndefined();
  });

  it('Assessment does not persist fldSheet', () => {
    expect(
      sheetValueForSave({
        isNew: true,
        workProduct: 'assessment',
        formSheet: 'A2.1',
      })
    ).toBeUndefined();
  });
});

describe('images', () => {
  it('Review mode supports image data on a new row', () => {
    expect(
      imagesValueForSave({ isNew: true, workProduct: 'plan_review', formImages: ['http://x'] })
    ).toEqual(['http://x']);
  });

  it('new Review record does not forcibly save fldImages as []', () => {
    expect(
      imagesValueForSave({ isNew: true, workProduct: 'plan_review', formImages: ['http://plan'] })
    ).not.toEqual([]);
  });

  it('existing Review images survive edit/save', () => {
    expect(
      imagesValueForSave({
        isNew: false,
        workProduct: 'plan_review',
        formImages: ['http://kept'],
      })
    ).toEqual(['http://kept']);
  });

  it('switching Review/Inspection does not erase image state', () => {
    expect(rasWorkModeSwitchClearsImages()).toBe(false);
  });

  it('Inspection image behavior remains intact', () => {
    expect(
      imagesValueForSave({ isNew: true, workProduct: 'inspection', formImages: ['http://x'] })
    ).toEqual(['http://x']);
  });

  it('Assessment image behavior remains intact', () => {
    expect(
      imagesValueForSave({ isNew: true, workProduct: 'assessment', formImages: ['http://a'] })
    ).toEqual(['http://a']);
  });

  it('fldWorkProduct remains independent of image presence', () => {
    expect(
      resolveRecordWorkProduct({ fldWorkProduct: 'plan_review' }, 'TAS/RAS')
    ).toBe('plan_review');
    expect(resolveRecordWorkProduct({ fldImages: ['plan.png'] } as any, 'TAS/RAS')).toBe(
      'inspection'
    );
    expect(
      resolveRecordWorkProduct(
        { fldWorkProduct: 'inspection', fldImages: ['photo.jpg'] } as any,
        'TAS/RAS'
      )
    ).toBe('inspection');
  });
});

describe('navigation match', () => {
  it('Review matches explicit plan_review only', () => {
    expect(recordMatchesRasWorkMode({ fldWorkProduct: 'plan_review' }, 'TAS/RAS', 'plan_review')).toBe(
      true
    );
    expect(recordMatchesRasWorkMode({}, 'TAS/RAS', 'plan_review')).toBe(false);
  });

  it('Inspection matches explicit inspection plus legacy missing', () => {
    expect(recordMatchesRasWorkMode({ fldWorkProduct: 'inspection' }, 'TAS/RAS', 'inspection')).toBe(
      true
    );
    expect(recordMatchesRasWorkMode({}, 'TAS/RAS', 'inspection')).toBe(true);
    expect(recordMatchesRasWorkMode({ fldWorkProduct: 'plan_review' }, 'TAS/RAS', 'inspection')).toBe(
      false
    );
  });
});

describe('RAS consumption', () => {
  it('RAS does not require recId for glossary path completeness', () => {
    expect(
      glossaryPathCompleteForSave(true, { categoryId: 'c', itemId: 'i', findId: 'f', recId: '' })
    ).toBe(true);
    expect(
      glossaryPathCompleteForSave(false, { categoryId: 'c', itemId: 'i', findId: 'f', recId: '' })
    ).toBe(false);
    expect(
      glossaryPathCompleteForSave(false, { categoryId: 'c', itemId: 'i', findId: 'f', recId: 'r' })
    ).toBe(true);
  });

  it('RAS new row does not auto-populate Recommendation or cost', () => {
    expect(rasNewRecordConsumptionFields()).toEqual({
      fldRecShort: '',
      fldRecLong: '',
      fldUnitCost: 0,
      fldTotalCost: 0,
      fldQTY: 0,
    });
  });
});
