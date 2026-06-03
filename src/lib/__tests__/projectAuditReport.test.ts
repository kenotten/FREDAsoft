import { describe, expect, it } from 'vitest';
import {
  ALL_AUDIT_WARNING_CODES,
  countVisibleAuditWarnings,
  createDefaultWarningVisibility,
  hasMultipleUnitCostsForSameRecommendation,
  isCustomRecordMetadataNoiseWarning,
  isExpectedCustomUnassignedNoiseWarning,
  isUnassignedAuditGroup,
  isWarningCodeFilterAtDefault,
  isWarningFilterActive,
  isWarningTypeRecordFilterActive,
  recommendationCostBucketKey,
  type AuditWarning,
  type AuditWarningCode,
  type ProjectAuditGroup,
  type ProjectAuditRecordView,
  type ProjectAuditWarningVisibility,
} from '../projectAuditReport';

function makeRecord(partial: Partial<ProjectAuditRecordView> = {}): ProjectAuditRecordView {
  return {
    recordId: 'rec-1',
    facilityId: 'fac-1',
    facilityLabel: 'Facility',
    locationId: 'loc-1',
    locationLabel: 'Location',
    categoryId: 'cat-1',
    categoryLabel: 'Category',
    itemId: 'item-1',
    itemLabel: 'Item',
    recordSource: 'glossary',
    findingId: 'find-1',
    recommendationId: 'rec-master-1',
    findShort: 'Finding short',
    findLong: '',
    recShort: 'Rec short',
    recLong: '',
    unitCost: 100,
    qty: 1,
    totalCost: 100,
    citationIds: [],
    citationLabels: '',
    warnings: [],
    ...partial,
  };
}

function makeGroup(partial: Partial<ProjectAuditGroup> = {}): ProjectAuditGroup {
  return {
    groupKey: 'group-1',
    mode: 'finding',
    masterId: 'find-1',
    masterShort: null,
    masterLong: null,
    masterArchived: false,
    masterMissing: false,
    records: [],
    recordCount: 0,
    facilityIds: [],
    facilityLabels: [],
    distinctTotalCosts: [],
    costMin: null,
    costMax: null,
    pairedIds: [],
    citationSets: [],
    warnings: [],
    ...partial,
  };
}

function visibilityWithCodes(codes: AuditWarningCode[]): ProjectAuditWarningVisibility {
  return {
    enabledCodes: new Set(codes),
    hideCustomLinkageNoise: false,
  };
}

describe('projectAuditReport warning visibility', () => {
  it('default (all codes enabled) does not activate warning-type record filter', () => {
    const visibility = createDefaultWarningVisibility();
    expect(isWarningCodeFilterAtDefault(visibility)).toBe(true);
    expect(isWarningTypeRecordFilterActive(visibility)).toBe(false);
    expect(isWarningFilterActive(visibility)).toBe(false);
  });

  it('zero warning codes enabled hides badges but does not activate record filter', () => {
    const visibility = visibilityWithCodes([]);
    expect(visibility.enabledCodes.size).toBe(0);
    expect(isWarningTypeRecordFilterActive(visibility)).toBe(false);
    expect(isWarningFilterActive(visibility)).toBe(true);
    expect(isWarningCodeFilterAtDefault(visibility)).toBe(false);

    const group = makeGroup({
      records: [
        makeRecord({
          warnings: [{ code: 'multiple_costs', message: 'test' }],
        }),
      ],
    });
    expect(countVisibleAuditWarnings([group], visibility)).toBe(0);
  });

  it('partial warning code selection activates warning-type record filter', () => {
    const visibility = visibilityWithCodes(['multiple_costs']);
    expect(ALL_AUDIT_WARNING_CODES.length).toBeGreaterThan(1);
    expect(isWarningCodeFilterAtDefault(visibility)).toBe(false);
    expect(isWarningTypeRecordFilterActive(visibility)).toBe(true);
    expect(isWarningFilterActive(visibility)).toBe(true);
  });

  it('hide custom/unassigned noise is active filter state but not record filter', () => {
    const visibility = createDefaultWarningVisibility();
    visibility.hideCustomLinkageNoise = true;
    expect(isWarningTypeRecordFilterActive(visibility)).toBe(false);
    expect(isWarningFilterActive(visibility)).toBe(true);
  });
});

describe('projectAuditReport custom/unassigned noise helpers', () => {
  it('suppresses custom metadata noise when snapshots exist and toggle is on', () => {
    const record = makeRecord({
      recordSource: 'custom',
      findingId: null,
      findShort: 'Custom finding',
    });
    expect(
      isCustomRecordMetadataNoiseWarning('missing_finding_id', record, true)
    ).toBe(true);
    expect(
      isCustomRecordMetadataNoiseWarning('missing_finding_short', record, true)
    ).toBe(false);
  });

  it('suppresses unassigned group consistency noise when toggle is on', () => {
    const group = makeGroup({ masterId: null });
    expect(isUnassignedAuditGroup(group)).toBe(true);
    expect(
      isExpectedCustomUnassignedNoiseWarning('multiple_costs', 'group', null, group, true)
    ).toBe(true);
  });
});

describe('projectAuditReport multiple unit cost helpers', () => {
  it('detects multiple unit costs in recommendation mode for same master', () => {
    const records = [
      makeRecord({ unitCost: 10 }),
      makeRecord({ unitCost: 20, recordId: 'rec-2' }),
    ];
    expect(
      hasMultipleUnitCostsForSameRecommendation(records, 'recommendation', 'rec-master-1')
    ).toBe(true);
  });

  it('does not emit multiple_costs for unassigned groups (null masterId)', () => {
    const records = [makeRecord({ unitCost: 10 }), makeRecord({ unitCost: 20, recordId: 'rec-2' })];
    expect(hasMultipleUnitCostsForSameRecommendation(records, 'finding', null)).toBe(false);
  });

  it('uses distinct recommendation bucket keys for different recommendations', () => {
    const a = makeRecord({
      recordId: 'a',
      recommendationId: 'rec-a',
      recShort: 'Recommendation A',
      unitCost: 50,
    });
    const b = makeRecord({
      recordId: 'b',
      recommendationId: 'rec-b',
      recShort: 'Recommendation B',
      unitCost: 75,
    });
    expect(recommendationCostBucketKey(a)).not.toBe(recommendationCostBucketKey(b));
  });

  it('flags multiple unit costs within the same recommendation bucket in finding mode', () => {
    const records = [
      makeRecord({ recordId: 'a', recommendationId: 'rec-a', recShort: 'Same rec', unitCost: 50 }),
      makeRecord({ recordId: 'b', recommendationId: 'rec-a', recShort: 'Same rec', unitCost: 75 }),
    ];
    expect(hasMultipleUnitCostsForSameRecommendation(records, 'finding', 'find-1')).toBe(true);
  });

  it('does not flag multiple costs when unit costs match within a bucket', () => {
    const records = [
      makeRecord({ recommendationId: 'rec-a', recShort: 'Same', unitCost: 10 }),
      makeRecord({
        recordId: 'rec-2',
        recommendationId: 'rec-a',
        recShort: 'Same',
        unitCost: 10,
      }),
    ];
    expect(hasMultipleUnitCostsForSameRecommendation(records, 'finding', 'find-1')).toBe(
      false
    );
  });
});
