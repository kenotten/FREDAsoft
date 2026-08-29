import { describe, expect, it } from 'vitest';
import { coverAddressPairRow, formatCityStateZip, formatCityStateZipOrFallback } from '../coverAddressDisplay';

describe('formatCityStateZip', () => {
  it('formats city + state + zip as City, ST ZIP', () => {
    expect(formatCityStateZip('Austin', 'TX', '78701')).toBe('Austin, TX 78701');
    expect(formatCityStateZip('Washington', 'DC', '20001')).toBe('Washington, DC 20001');
    expect(formatCityStateZip('Vancouver', 'WA', '98660')).toBe('Vancouver, WA 98660');
  });

  it('omits missing ZIP without dangling punctuation', () => {
    expect(formatCityStateZip('Austin', 'TX', '')).toBe('Austin, TX');
    expect(formatCityStateZip('Austin', 'TX', null)).toBe('Austin, TX');
  });

  it('omits missing city without a leading comma', () => {
    expect(formatCityStateZip('', 'TX', '78701')).toBe('TX 78701');
    expect(formatCityStateZip(undefined, 'TX', '78701')).toBe('TX 78701');
  });

  it('renders city only, zip only, and empty safely', () => {
    expect(formatCityStateZip('Austin', '', '')).toBe('Austin');
    expect(formatCityStateZip('', '', '78701')).toBe('78701');
    expect(formatCityStateZip('', '', '')).toBe('');
    expect(formatCityStateZip(null, undefined, null)).toBe('');
  });

  it('trims whitespace and does not emit undefined/null text', () => {
    expect(formatCityStateZip('  Austin  ', ' TX ', ' 78701 ')).toBe('Austin, TX 78701');
    expect(formatCityStateZip(undefined, undefined, undefined)).toBe('');
    expect(formatCityStateZip(undefined, undefined, undefined)).not.toContain('undefined');
    expect(formatCityStateZip(null, null, null)).not.toContain('null');
  });
});

describe('formatCityStateZipOrFallback (Assessment empty-state)', () => {
  it('uses TBD only when every part is missing', () => {
    expect(formatCityStateZipOrFallback('Austin', 'TX', '78701', 'TBD')).toBe('Austin, TX 78701');
    expect(formatCityStateZipOrFallback('', '', '', 'TBD')).toBe('TBD');
  });

  it('Assessment Project Information composes facility city/state/zip as one value', () => {
    const facility = { fldFacCity: 'Houston', fldFacState: 'TX', fldFacZip: '77095' };
    expect(
      formatCityStateZipOrFallback(facility.fldFacCity, facility.fldFacState, facility.fldFacZip, 'TBD')
    ).toBe('Houston, TX 77095');
  });

  it('Assessment Owner Information composes client city/state/zip as one value', () => {
    const client = { fldClientCity: 'Austin', fldClientState: 'TX', fldClientZIP: '78701' };
    expect(
      formatCityStateZipOrFallback(client.fldClientCity, client.fldClientState, client.fldClientZIP, 'TBD')
    ).toBe('Austin, TX 78701');
  });

  it('places Address and concatenated City/State/ZIP on one paired row', () => {
    const projectPair = coverAddressPairRow('Project Address:', '123 Main Street', 'Austin, TX 78701');
    expect(projectPair).toEqual({
      kind: 'pair',
      left: { label: 'Project Address:', value: '123 Main Street' },
      right: { label: 'City/State/ZIP:', value: 'Austin, TX 78701' },
    });
    const ownerPair = coverAddressPairRow(
      'Address:',
      '200 Owner St',
      formatCityStateZipOrFallback('Austin', 'TX', '78701', 'TBD')
    );
    expect(ownerPair.kind).toBe('pair');
    expect(ownerPair.right).toEqual({ label: 'City/State/ZIP:', value: 'Austin, TX 78701' });
  });
});
