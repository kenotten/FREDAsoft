import { describe, expect, it } from 'vitest';
import {
  citationIdSetsEqual,
  findingCitationIdsFromGlossaryRow,
  findingMatchesGlossaryRow,
  normalizeCitationIds,
  recommendationMatchesGlossaryRow,
  resolveGlossaryRowForRasCitationRefresh,
  savedCitationIdsOnOpenRecord,
  standardsIdsFromGlossaryRow,
  unionFindingAndRecommendationCitationIds,
  workingCitationIdsAfterExplicitGlossarySelection,
} from '../citationStandards';

describe('normalizeCitationIds', () => {
  it('returns [] for empty inputs', () => {
    expect(normalizeCitationIds(undefined)).toEqual([]);
    expect(normalizeCitationIds(null)).toEqual([]);
    expect(normalizeCitationIds('')).toEqual([]);
    expect(normalizeCitationIds([])).toEqual([]);
  });

  it('accepts arrays, object maps, and a single string', () => {
    expect(normalizeCitationIds(['A', 'B', 'A', ''])).toEqual(['A', 'B']);
    expect(normalizeCitationIds({ 0: 'A', 1: 'B' })).toEqual(['A', 'B']);
    expect(normalizeCitationIds('A')).toEqual(['A']);
  });
});

describe('master / glossary ID matching', () => {
  it('matches finding by id or fldFindID against glossary fldFind or fldFindID', () => {
    const finding = { id: 'doc-1', fldFindID: 'find-1' };
    expect(findingMatchesGlossaryRow(finding, { fldFind: 'find-1' })).toBe(true);
    expect(findingMatchesGlossaryRow(finding, { fldFind: 'doc-1' })).toBe(true);
    expect(findingMatchesGlossaryRow(finding, { fldFindID: 'FIND-1' })).toBe(true);
    expect(findingMatchesGlossaryRow(finding, { fldFind: 'other' })).toBe(false);
  });

  it('matches recommendation by id or fldRecID against glossary fldRec or fldRecID', () => {
    const rec = { id: 'doc-r', fldRecID: 'rec-1' };
    expect(recommendationMatchesGlossaryRow(rec, { fldRec: 'rec-1' })).toBe(true);
    expect(recommendationMatchesGlossaryRow(rec, { fldRecID: 'doc-r' })).toBe(true);
    expect(recommendationMatchesGlossaryRow(rec, { fldRec: 'nope' })).toBe(false);
  });
});

describe('unionFindingAndRecommendationCitationIds', () => {
  it('unions finding + rec and ignores empty rec', () => {
    expect(
      unionFindingAndRecommendationCitationIds(
        { fldStandards: ['A', 'B'] },
        { fldStandards: [] }
      )
    ).toEqual(['A', 'B']);
  });

  it('dedupes overlapping masters', () => {
    expect(
      unionFindingAndRecommendationCitationIds(
        { fldStandards: ['A'] },
        { fldStandards: ['A', 'B'] }
      )
    ).toEqual(['A', 'B']);
  });
});

describe('standardsIdsFromGlossaryRow', () => {
  const findings = [{ id: 'f1', fldFindID: 'find-1', fldStandards: ['A', 'B'] }];
  const recs = [{ id: 'r1', fldRecID: 'rec-1', fldStandards: [] }];

  it('uses glossary snapshot when present', () => {
    expect(
      standardsIdsFromGlossaryRow(
        { fldFind: 'find-1', fldRec: 'rec-1', fldStandards: ['G'] },
        findings,
        recs
      )
    ).toEqual(['G']);
  });

  it('falls back to finding when glossary is empty and rec has none', () => {
    expect(
      standardsIdsFromGlossaryRow(
        { fldFind: 'find-1', fldRec: 'rec-1', fldStandards: [] },
        findings,
        recs
      )
    ).toEqual(['A', 'B']);
  });

  it('unions finding and rec when glossary is empty', () => {
    expect(
      standardsIdsFromGlossaryRow(
        { fldFind: 'FIND-1', fldRec: 'rec-1', fldStandards: [] },
        findings,
        [{ id: 'r1', fldRecID: 'rec-1', fldStandards: ['B', 'C'] }]
      )
    ).toEqual(['A', 'B', 'C']);
  });

  it('returns [] when glossary and both masters are empty', () => {
    expect(
      standardsIdsFromGlossaryRow(
        { fldFind: 'find-1', fldRec: 'rec-1', fldStandards: [] },
        [{ id: 'f1', fldFindID: 'find-1', fldStandards: [] }],
        recs
      )
    ).toEqual([]);
  });
});

describe('findingCitationIdsFromGlossaryRow', () => {
  it('uses finding citations and ignores recommendation citations', () => {
    expect(
      findingCitationIdsFromGlossaryRow(
        { fldFind: 'find-1', fldRec: 'rec-1', fldStandards: [] },
        [{ id: 'f1', fldFindID: 'find-1', fldStandards: ['TAS-A'] }]
      )
    ).toEqual(['TAS-A']);
  });
});

describe('explicit glossary selection vs open-existing snapshot vs RAS refresh', () => {
  const FINDING_IDS = ['989_606_3_standard', '988_606_2_standard'];
  const CAT = '2b83d253-toilet-bathing';
  const ITEM = 'ba2ac84c-lavatories';
  const FIND = '84dfa4b3-708a-4f0f-bc73-e2b855b8accd';
  const findings = [
    { id: FIND, fldFindID: FIND, fldStandards: FINDING_IDS }
  ];
  const recs = [
    { id: '00e474aa-a0e6-4285-86e2-26505558a710', fldRecID: '00e474aa-a0e6-4285-86e2-26505558a710', fldStandards: FINDING_IDS }
  ];
  const sparseA = {
    fldGlosId: '39a49477-336a-4f5a-94f5-d22965795443',
    fldCat: CAT,
    fldItem: ITEM,
    fldFind: FIND,
    fldRec: '00e474aa-a0e6-4285-86e2-26505558a710'
  };
  const completeB = {
    fldGlosId: '88e98dae-d0ed-43eb-9af4-00ff6501c5b9',
    fldCat: CAT,
    fldItem: ITEM,
    fldFind: FIND,
    fldRec: '00e474aa-a0e6-4285-86e2-26505558a710',
    fldStandards: FINDING_IDS
  };
  const duplicateRows = [sparseA, completeB];

  function rasSelect(row: unknown, existing: boolean) {
    return workingCitationIdsAfterExplicitGlossarySelection({
      isRasProject: true,
      isExistingRecord: existing,
      glossaryRow: row,
      findingsList: findings,
      masterRecs: recs
    });
  }

  function applyRasRefresh(
    preferredGlossaryId: string | null | undefined,
    rows: unknown[],
    currentWorking: unknown,
    path = { categoryId: CAT, itemId: ITEM, findId: FIND }
  ) {
    const row = resolveGlossaryRowForRasCitationRefresh({
      preferredGlossaryId,
      categoryId: path.categoryId,
      itemId: path.itemId,
      findId: path.findId,
      glossaryRows: rows
    });
    if (!row) return { row: undefined, next: normalizeCitationIds(currentWorking), changed: false };
    const next = findingCitationIdsFromGlossaryRow(row, findings);
    if (citationIdSetsEqual(currentWorking, next)) {
      return { row, next: normalizeCitationIds(currentWorking), changed: false };
    }
    return { row, next, changed: true };
  }

  it('A: opening existing RAS record with fldStandards [] keeps []', () => {
    expect(savedCitationIdsOnOpenRecord({ fldStandards: [] })).toEqual([]);
  });

  it('B: opening existing RAS record preserves saved citations', () => {
    expect(savedCitationIdsOnOpenRecord({ fldStandards: ['saved-1'] })).toEqual(['saved-1']);
  });

  it('C: explicit RAS refresh on sparse glossary A uses finding citations', () => {
    const result = applyRasRefresh(sparseA.fldGlosId, duplicateRows, []);
    expect(result.row?.fldGlosId).toBe(sparseA.fldGlosId);
    expect(result.next).toEqual(FINDING_IDS);
    expect(result.changed).toBe(true);
  });

  it('D: explicit RAS refresh on complete glossary B uses the same finding citations', () => {
    const result = applyRasRefresh(completeB.fldGlosId, duplicateRows, []);
    expect(result.row?.fldGlosId).toBe(completeB.fldGlosId);
    expect(result.next).toEqual(FINDING_IDS);
  });

  it('E: duplicate A/B — refresh prefers fldData/glosId; user does not choose between rows', () => {
    const fromA = applyRasRefresh(sparseA.fldGlosId, duplicateRows, []);
    const fromB = applyRasRefresh(completeB.fldGlosId, duplicateRows, []);
    expect(fromA.row?.fldGlosId).toBe(sparseA.fldGlosId);
    expect(fromB.row?.fldGlosId).toBe(completeB.fldGlosId);
    expect(fromA.next).toEqual(FINDING_IDS);
    expect(fromB.next).toEqual(FINDING_IDS);
  });

  it('F: new RAS glossary path still initializes from finding citations', () => {
    expect(rasSelect(completeB, false)).toEqual(FINDING_IDS);
    expect(rasSelect(sparseA, false)).toEqual(FINDING_IDS);
  });

  it('G: Assessment Recommendation selection behavior unchanged', () => {
    expect(
      workingCitationIdsAfterExplicitGlossarySelection({
        isRasProject: false,
        isExistingRecord: true,
        glossaryRow: sparseA,
        findingsList: findings,
        masterRecs: recs
      })
    ).toEqual([]);
    expect(
      workingCitationIdsAfterExplicitGlossarySelection({
        isRasProject: false,
        isExistingRecord: true,
        glossaryRow: completeB,
        findingsList: findings,
        masterRecs: recs
      })
    ).toEqual(FINDING_IDS);
    expect(
      workingCitationIdsAfterExplicitGlossarySelection({
        isRasProject: false,
        isExistingRecord: false,
        glossaryRow: sparseA,
        findingsList: findings,
        masterRecs: recs
      })
    ).toEqual(FINDING_IDS);
  });

  it('H: library-shaped data does not change open-existing snapshot without explicit refresh', () => {
    const opened = savedCitationIdsOnOpenRecord({ fldStandards: [] });
    expect(opened).toEqual([]);
    expect(opened).not.toEqual(FINDING_IDS);
    expect(applyRasRefresh(sparseA.fldGlosId, duplicateRows, opened).next).toEqual(FINDING_IDS);
  });

  it('I: refresh with no resolvable glossary row is a safe no-op', () => {
    expect(
      applyRasRefresh(sparseA.fldGlosId, [], ['keep-me'])
    ).toEqual({ row: undefined, next: ['keep-me'], changed: false });
    expect(
      applyRasRefresh(null, duplicateRows, [], { categoryId: CAT, itemId: ITEM, findId: '' })
    ).toEqual({ row: undefined, next: [], changed: false });
  });

  it('skips dirty-equivalent refresh when working citations already match', () => {
    const result = applyRasRefresh(sparseA.fldGlosId, duplicateRows, FINDING_IDS);
    expect(result.changed).toBe(false);
    expect(result.next).toEqual(FINDING_IDS);
  });
});

describe('citationIdSetsEqual', () => {
  it('treats same ids as equal regardless of order', () => {
    expect(citationIdSetsEqual(['A', 'B'], ['B', 'A'])).toBe(true);
    expect(citationIdSetsEqual(['A'], ['A', 'B'])).toBe(false);
  });
});
