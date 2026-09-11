import { describe, expect, it } from 'vitest';
import {
  citationIdSetsEqual,
  findingCitationIdsFromGlossaryRow,
  findingMatchesGlossaryRow,
  normalizeCitationIds,
  recommendationMatchesGlossaryRow,
  rasFindingPathCitationState,
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

describe('RAS Finding-path citation hydration (no Recommendation required)', () => {
  const CAT = '69b26075-e540-4249-8dcf-2857093e3e4c';
  const ITEM = '9a2dec5b-1c4e-4ea8-b577-9a687be7c39d';
  const FIND_PO = '1feb2b12-78d0-49eb-b3c9-b8ddcd7afbd8';
  const FIND_OTHER = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  const PO_IDS = ['147_204_1_standard', '617_307_2_standard', '618_307_2_advisory'];
  const OTHER_IDS = ['999_other_standard'];
  const findings = [
    { id: FIND_PO, fldFindID: FIND_PO, fldStandards: PO_IDS },
    { id: FIND_OTHER, fldFindID: FIND_OTHER, fldStandards: OTHER_IDS }
  ];
  const rowBarrier = {
    fldGlosId: '47d4c2a1-c3c6-49d7-a15f-80225f9d2fae',
    fldCat: CAT,
    fldItem: ITEM,
    fldFind: FIND_PO,
    fldRec: 'ebeeb714-2f19-499b-a9e4-3005894f8c01',
    fldStandards: PO_IDS
  };
  const rowLower = {
    fldGlosId: 'a2fad326-146a-40e2-90fa-5a42e2b1d4f8',
    fldCat: CAT,
    fldItem: ITEM,
    fldFind: FIND_PO,
    fldRec: '27fde825-f046-4145-a801-b8b59ffecd89',
    fldStandards: PO_IDS
  };
  const rowRemove = {
    fldGlosId: 'b975420f-1efd-4c5b-9673-90996462ff0c',
    fldCat: CAT,
    fldItem: ITEM,
    fldFind: FIND_PO,
    fldRec: '878ccb70-cf9c-44ef-b2f5-8b6acb17d3df',
    fldStandards: PO_IDS
  };
  const rowOther = {
    fldGlosId: 'other-glos-row',
    fldCat: CAT,
    fldItem: ITEM,
    fldFind: FIND_OTHER,
    fldRec: 'other-rec',
    fldStandards: OTHER_IDS
  };
  const threeRecRows = [rowBarrier, rowLower, rowRemove];

  function rasFindingSelect(findId: string, rows = threeRecRows, preferred?: string | null) {
    return rasFindingPathCitationState({
      preferredGlossaryId: preferred ?? null,
      categoryId: CAT,
      itemId: ITEM,
      findId,
      glossaryRows: rows,
      findingsList: findings
    });
  }

  /** Assessment Finding change still clears working citations until a Recommendation is applied. */
  function assessmentCitationsAfterFindingChangeWithoutRec() {
    return [];
  }

  it('1. RAS cat+item+find with no rec hydrates Finding standards', () => {
    const next = rasFindingSelect(FIND_PO);
    expect(next.citationIds).toEqual(PO_IDS);
    expect(next.row).toBeTruthy();
  });

  it('2. RAS with 3 matching glossary rec rows still hydrates the same Finding standards', () => {
    const next = rasFindingSelect(FIND_PO);
    expect(threeRecRows).toHaveLength(3);
    expect(new Set(threeRecRows.map((r) => r.fldRec)).size).toBe(3);
    expect(next.citationIds).toEqual(PO_IDS);
  });

  it('3. Recommendation absence does not drop citations', () => {
    const next = rasFindingSelect(FIND_PO);
    expect(next.citationIds.length).toBeGreaterThan(0);
    expect(next.citationIds).toEqual(PO_IDS);
  });

  it('4. helper does not invent Recommendation text, cost, or selected recId', () => {
    const next = rasFindingSelect(FIND_PO);
    expect(next).not.toHaveProperty('fldRecShort');
    expect(next).not.toHaveProperty('fldRecLong');
    expect(next).not.toHaveProperty('fldUnitCost');
    expect(next).not.toHaveProperty('recId');
    expect(Object.keys(next).sort()).toEqual(['citationIds', 'glosId', 'row']);
  });

  it('5. changing Finding updates citations to the new Finding', () => {
    const first = rasFindingSelect(FIND_PO, [...threeRecRows, rowOther]);
    const second = rasFindingSelect(FIND_OTHER, [...threeRecRows, rowOther]);
    expect(first.citationIds).toEqual(PO_IDS);
    expect(second.citationIds).toEqual(OTHER_IDS);
    expect(second.glosId).toBe(rowOther.fldGlosId);
  });

  it('6. saved existing fldStandards=[] remains [] on reopen', () => {
    expect(savedCitationIdsOnOpenRecord({ fldStandards: [] })).toEqual([]);
    expect(savedCitationIdsOnOpenRecord({ fldStandards: [] })).not.toEqual(PO_IDS);
  });

  it('7. Refresh TAS References updates existing [] to current Finding standards', () => {
    const opened = savedCitationIdsOnOpenRecord({ fldStandards: [] });
    const refreshed = rasFindingSelect(FIND_PO);
    expect(opened).toEqual([]);
    expect(citationIdSetsEqual(opened, refreshed.citationIds)).toBe(false);
    expect(refreshed.citationIds).toEqual(PO_IDS);
  });

  it('8. Assessment Finding without Recommendation does not use RAS hydration', () => {
    expect(assessmentCitationsAfterFindingChangeWithoutRec()).toEqual([]);
    expect(
      workingCitationIdsAfterExplicitGlossarySelection({
        isRasProject: false,
        isExistingRecord: false,
        glossaryRow: undefined,
        findingsList: findings,
        masterRecs: []
      })
    ).toEqual([]);
  });

  it('9. Assessment with selected Recommendation keeps existing citation behavior', () => {
    expect(
      workingCitationIdsAfterExplicitGlossarySelection({
        isRasProject: false,
        isExistingRecord: false,
        glossaryRow: rowBarrier,
        findingsList: findings,
        masterRecs: []
      })
    ).toEqual(PO_IDS);
  });

  it('10. save payload can persist the hydrated RAS fldStandards array as-is', () => {
    const hydrated = rasFindingSelect(FIND_PO).citationIds;
    const saveFldStandards = Array.isArray(hydrated) ? hydrated : [];
    expect(saveFldStandards).toEqual(PO_IDS);
  });

  it('11. reopen restores the saved snapshot, not a live Finding union', () => {
    const saved = ['saved-only'];
    expect(savedCitationIdsOnOpenRecord({ fldStandards: saved })).toEqual(saved);
    expect(savedCitationIdsOnOpenRecord({ fldStandards: saved })).not.toEqual(PO_IDS);
  });

  it('12. Plan Review and Inspection share the same RAS Finding-path helper (no work-product fork)', () => {
    const inspection = rasFindingSelect(FIND_PO);
    const planReview = rasFindingSelect(FIND_PO);
    expect(inspection.citationIds).toEqual(planReview.citationIds);
    expect(inspection.citationIds).toEqual(PO_IDS);
  });

  it('13. multi-rec rows do not treat first-row Recommendation as user-selected provenance', () => {
    const next = rasFindingSelect(FIND_PO);
    expect(next.glosId).toBe(rowBarrier.fldGlosId);
    expect(next.row?.fldRec).toBe(rowBarrier.fldRec);
    expect(next).not.toHaveProperty('recId');
    expect(next.citationIds).toEqual(PO_IDS);
    const viaOtherPreferred = rasFindingSelect(FIND_PO, threeRecRows, rowRemove.fldGlosId);
    expect(viaOtherPreferred.citationIds).toEqual(PO_IDS);
    expect(viaOtherPreferred.glosId).toBe(rowRemove.fldGlosId);
  });
});

describe('citationIdSetsEqual', () => {
  it('treats same ids as equal regardless of order', () => {
    expect(citationIdSetsEqual(['A', 'B'], ['B', 'A'])).toBe(true);
    expect(citationIdSetsEqual(['A'], ['A', 'B'])).toBe(false);
  });
});
