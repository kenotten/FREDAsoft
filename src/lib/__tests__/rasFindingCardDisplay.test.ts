import { describe, expect, it } from 'vitest';
import type { Location, ProjectData } from '../../types';
import { buildRasFindingCardDisplay, buildRasFindingCardMetadataRows } from '../rasFindingCardDisplay';

function row(partial: Partial<ProjectData> & { fldPDataID: string }): ProjectData {
  return {
    fldPDataProject: 'proj-1',
    fldFacility: 'fac-1',
    fldData: '',
    fldLocation: 'loc-1',
    fldFindShort: 'Short finding',
    fldFindLong: 'PRIMARY FINDING BODY',
    fldRecShort: 'Rec short',
    fldRecLong: 'RECOMMENDATION BODY MUST NOT APPEAR',
    fldQTY: 1,
    fldUnitCost: 1234,
    fldTotalCost: 1234,
    fldImages: ['a.jpg', 'b.jpg'],
    fldInspID: 'insp-1',
    fldTimestamp: '',
    ...partial,
  };
}

const locations: Location[] = [
  { fldLocID: 'loc-1', fldLocName: "Men's Restroom", fldFacID: 'fac-1', fldProjectID: 'proj-1' },
];

describe('buildRasFindingCardDisplay', () => {
  it('Plan Review uses Finding text, Location, and Sheet; not Recommendation or cost', () => {
    const display = buildRasFindingCardDisplay(
      row({ fldPDataID: 'pr', fldWorkProduct: 'plan_review', fldSheet: 'A2.1' }),
      'plan_review',
      [],
      [],
      locations,
      [],
      []
    );
    expect(display.findingText).toBe('PRIMARY FINDING BODY');
    expect(display.findingText).not.toContain('RECOMMENDATION');
    expect(display.locationLabel).toBe("Men's Restroom");
    expect(display.sheet).toBe('A2.1');
    expect(display.imageSingular).toBe('Image');
    expect(display.imagePlural).toBe('Images');
    expect(display.imageAlts).toEqual(['Image 1', 'Image 2']);
    expect(display).not.toHaveProperty('recommendation');
    expect(display).not.toHaveProperty('cost');
    expect(JSON.stringify(display)).not.toContain('RECOMMENDATION BODY MUST NOT APPEAR');
    expect(JSON.stringify(display)).not.toContain('1234');
  });

  it('Plan Review with Sheet uses the same four-column pair as Category/Item', () => {
    const display = buildRasFindingCardDisplay(
      row({ fldPDataID: 'pr', fldWorkProduct: 'plan_review', fldSheet: 'A2.1' }),
      'plan_review',
      [],
      [],
      locations,
      [],
      []
    );
    const rows = buildRasFindingCardMetadataRows(display);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      kind: 'pair',
      left: { label: 'Category', value: 'N/A' },
      right: { label: 'Item', value: 'N/A' },
    });
    expect(rows[1]).toEqual({
      kind: 'pair',
      left: { label: 'Location', value: "Men's Restroom" },
      right: { label: 'Sheet', value: 'A2.1' },
    });
    expect(rows[1].kind).toBe(rows[0].kind);
    if (rows[0].kind !== 'pair' || rows[1].kind !== 'pair') throw new Error('expected pair rows');
    expect(rows[1].left.label).toBe('Location');
    expect(rows[0].left.label).toBe('Category');
    expect(rows[1].right.label).toBe('Sheet');
    expect(rows[0].right.label).toBe('Item');
    expect(rows.some((r) => r.kind === 'locationSpan')).toBe(false);
  });

  it('Plan Review with blank Sheet does not render a Sheet label', () => {
    const display = buildRasFindingCardDisplay(
      row({ fldPDataID: 'pr-blank', fldWorkProduct: 'plan_review', fldSheet: '  ' }),
      'plan_review',
      [],
      [],
      locations,
      [],
      []
    );
    const rows = buildRasFindingCardMetadataRows(display);
    expect(display.sheet).toBeUndefined();
    expect(rows).toHaveLength(2);
    expect(rows[1]).toEqual({
      kind: 'locationSpan',
      label: 'Location',
      value: "Men's Restroom",
    });
    expect(JSON.stringify(rows)).not.toContain('"Sheet"');
  });

  it('Inspection keeps Location and omits Sheet even when fldSheet is populated', () => {
    const display = buildRasFindingCardDisplay(
      row({ fldPDataID: 'ins', fldWorkProduct: 'inspection', fldSheet: 'A2.1' }),
      'inspection',
      [],
      [],
      locations,
      [],
      []
    );
    expect(display.locationLabel).toBe("Men's Restroom");
    expect(display.sheet).toBeUndefined();
    expect(display.imageSingular).toBe('Photo');
    expect(display.imagePlural).toBe('Photos');
    expect(display.imageAlts).toEqual(['Photo 1', 'Photo 2']);
    const rows = buildRasFindingCardMetadataRows(display);
    expect(JSON.stringify(rows)).not.toContain('"Sheet"');
    expect(rows[1]?.kind).toBe('locationSpan');
  });

  it('does not throw on empty records, missing sheet, empty images, unresolved location', () => {
    expect(() =>
      buildRasFindingCardDisplay(
        row({
          fldPDataID: 'empty',
          fldFindLong: '',
          fldFindShort: '',
          fldLocation: 'missing-loc',
          fldSheet: '',
          fldImages: [],
          fldStandards: [],
        }),
        'plan_review',
        [],
        [],
        [],
        [],
        []
      )
    ).not.toThrow();
    const display = buildRasFindingCardDisplay(
      row({
        fldPDataID: 'empty',
        fldFindLong: '',
        fldFindShort: '',
        fldLocation: 'missing-loc',
        fldImages: [],
      }),
      'inspection',
      [],
      [],
      [],
      [],
      []
    );
    expect(display.findingText).toBe('');
    expect(display.sheet).toBeUndefined();
    expect(display.imageUrls).toEqual([]);
    expect(display.locationLabel).toBe('missing-loc');
  });
});
