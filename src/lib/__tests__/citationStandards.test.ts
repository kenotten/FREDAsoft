import { describe, expect, it } from 'vitest';
import {
  findingCitationIdsFromGlossaryRow,
  findingMatchesGlossaryRow,
  normalizeCitationIds,
  recommendationMatchesGlossaryRow,
  standardsIdsFromGlossaryRow,
  unionFindingAndRecommendationCitationIds,
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
