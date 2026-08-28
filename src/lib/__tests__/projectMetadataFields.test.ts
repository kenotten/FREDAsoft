import { describe, expect, it } from 'vitest';
import {
  buildInspectorSavePayload,
  buildProjectSavePayload,
  normalizeRasNumber,
  parseOptionalString,
  parseTenantFunded,
  tenantFundedSelectValue,
} from '../projectMetadataFields';

describe('parseTenantFunded', () => {
  it('maps Yes/true to true', () => {
    expect(parseTenantFunded('true')).toBe(true);
    expect(parseTenantFunded('Yes')).toBe(true);
  });

  it('maps No/false to false (distinct from unanswered)', () => {
    expect(parseTenantFunded('false')).toBe(false);
    expect(parseTenantFunded('No')).toBe(false);
  });

  it('maps blank to null (unanswered)', () => {
    expect(parseTenantFunded('')).toBeNull();
    expect(parseTenantFunded('  ')).toBeNull();
    expect(parseTenantFunded(null)).toBeNull();
  });
});

describe('tenantFundedSelectValue', () => {
  it('hydrates three states for the Project form', () => {
    expect(tenantFundedSelectValue(true)).toBe('true');
    expect(tenantFundedSelectValue(false)).toBe('false');
    expect(tenantFundedSelectValue(null)).toBe('');
    expect(tenantFundedSelectValue(undefined)).toBe('');
  });
});

describe('normalizeRasNumber', () => {
  it('stores the number only', () => {
    expect(normalizeRasNumber('149')).toBe('149');
    expect(normalizeRasNumber('RAS 149')).toBe('149');
    expect(normalizeRasNumber('ras-149')).toBe('149');
  });

  it('allows blank on legacy inspectors', () => {
    expect(normalizeRasNumber('')).toBe('');
    expect(normalizeRasNumber(null)).toBe('');
  });
});

describe('parseOptionalString', () => {
  it('trims TABS / optional strings and treats missing as empty', () => {
    expect(parseOptionalString('  TABS20XX004853  ')).toBe('TABS20XX004853');
    expect(parseOptionalString('')).toBe('');
    expect(parseOptionalString(null)).toBe('');
  });
});

describe('buildProjectSavePayload', () => {
  const base = {
    fldProjID: 'proj-1',
    fldProjName: 'Site A',
    fldProjNumber: '26-08-00001',
    fldExternalRef: 'ARCH-99',
    fldTabsProjectNumber: 'TABS123',
    fldPDDate: '2026-08-28',
    fldInspector: 'insp-1',
    fldProjType: 'TAS/RAS',
    fldProjDescription: 'Alter restrooms.',
    fldTenantFunded: '' as FormDataEntryValue | null,
    fldClient: 'client-1',
    fldFacilities: ['fac-1'],
  };

  it('persists TABS, architect job #, description, and unanswered Tenant Funded as null', () => {
    const payload = buildProjectSavePayload(base);
    expect(payload.fldTabsProjectNumber).toBe('TABS123');
    expect(payload.fldExternalRef).toBe('ARCH-99');
    expect(payload.fldProjDescription).toBe('Alter restrooms.');
    expect(payload.fldTenantFunded).toBeNull();
    expect(payload.fldProjNumber).toBe('26-08-00001');
  });

  it('persists Tenant Funded Yes and No without collapsing them', () => {
    expect(buildProjectSavePayload({ ...base, fldTenantFunded: 'true' }).fldTenantFunded).toBe(true);
    expect(buildProjectSavePayload({ ...base, fldTenantFunded: 'false' }).fldTenantFunded).toBe(false);
  });

  it('allows blank TABS number', () => {
    expect(buildProjectSavePayload({ ...base, fldTabsProjectNumber: '' }).fldTabsProjectNumber).toBe('');
  });

  it('does not rewrite architect job number storage key', () => {
    const payload = buildProjectSavePayload({ ...base, fldExternalRef: 'keep-me' });
    expect(payload).toHaveProperty('fldExternalRef', 'keep-me');
    expect(payload).not.toHaveProperty('fldArchitectProjectNumber');
  });
});

describe('buildInspectorSavePayload', () => {
  it('saves RAS number separately from credentials', () => {
    const payload = buildInspectorSavePayload({
      fldInspID: 'insp-1',
      fldInspName: 'Kenneth Otten',
      fldTitle: 'RAS',
      fldCredentials: 'AIA',
      fldRasNumber: 'RAS 149',
    });
    expect(payload.fldRasNumber).toBe('149');
    expect(payload.fldCredentials).toBe('AIA');
  });

  it('rehydrates blank RAS number on legacy inspectors', () => {
    const payload = buildInspectorSavePayload({
      fldInspID: 'insp-2',
      fldInspName: 'Legacy',
      fldTitle: '',
      fldCredentials: '',
      fldRasNumber: '',
    });
    expect(payload.fldRasNumber).toBe('');
  });
});
