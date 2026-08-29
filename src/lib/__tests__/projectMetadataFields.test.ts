import { describe, expect, it } from 'vitest';
import {
  buildInspectorSavePayload,
  buildProjectSavePayload,
  buildTdlrRegisteredFromForm,
  emptyTdlrRegistered,
  isAssessmentProjectType,
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
  it('trims optional strings and treats missing as empty', () => {
    expect(parseOptionalString('  TABS20XX004853  ')).toBe('TABS20XX004853');
    expect(parseOptionalString('')).toBe('');
    expect(parseOptionalString(null)).toBe('');
  });
});

describe('isAssessmentProjectType', () => {
  it('detects Assessment vs TAS/RAS', () => {
    expect(isAssessmentProjectType('Assessment')).toBe(true);
    expect(isAssessmentProjectType('TAS/RAS')).toBe(false);
    expect(isAssessmentProjectType(null)).toBe(false);
  });
});

const assessmentBase = {
  fldProjID: 'proj-1',
  fldProjName: 'Site A',
  fldProjNumber: '26-08-00001',
  fldExternalRef: 'ARCH-99',
  fldPDDate: '2026-08-28',
  fldInspector: 'insp-1',
  fldProjType: 'Assessment' as const,
  fldProjDescription: 'Alter restrooms.',
  fldClient: 'client-1',
  fldFacilities: ['fac-1'],
};

const rasBase = {
  ...assessmentBase,
  fldProjType: 'TAS/RAS' as const,
  fldInspector: '',
  fldPlanReviewRas: '',
  fldInspectionRas: '',
};

describe('buildProjectSavePayload', () => {
  it('round-trips Assessment fldProjName', () => {
    const payload = buildProjectSavePayload({ ...assessmentBase, fldProjName: 'FREDA Site A' });
    expect(payload.fldProjName).toBe('FREDA Site A');
  });

  it('loads a legacy Assessment project without new fields', () => {
    const payload = buildProjectSavePayload(assessmentBase);
    expect(payload.fldInspector).toBe('insp-1');
    expect(payload.fldProjDescription).toBe('Alter restrooms.');
    expect(payload).not.toHaveProperty('tdlrRegistered');
    expect(payload).not.toHaveProperty('fldPlanReviewRas');
    expect(payload).not.toHaveProperty('fldInspectionRas');
    expect(payload).not.toHaveProperty('fldTabsProjectNumber');
    expect(payload).not.toHaveProperty('fldTenantFunded');
  });

  it('does not require tdlrRegistered on Assessment', () => {
    const payload = buildProjectSavePayload(assessmentBase);
    expect(payload.fldProjType).toBe('Assessment');
    expect('tdlrRegistered' in payload).toBe(false);
  });

  it('round-trips TAS/RAS fldProjName as the sole Project Name', () => {
    const payload = buildProjectSavePayload({
      ...rasBase,
      fldProjName: 'A.B.C. Tower Alterations',
      tdlrRegistered: emptyTdlrRegistered(),
    });
    expect(payload.fldProjName).toBe('A.B.C. Tower Alterations');
    expect(payload.tdlrRegistered).not.toHaveProperty('projectName');
  });

  it('round-trips Plan Review RAS and Inspection RAS independently', () => {
    const payload = buildProjectSavePayload({
      ...rasBase,
      fldPlanReviewRas: 'insp-review',
      fldInspectionRas: 'insp-inspect',
      tdlrRegistered: emptyTdlrRegistered(),
    });
    expect(payload.fldPlanReviewRas).toBe('insp-review');
    expect(payload.fldInspectionRas).toBe('insp-inspect');
  });

  it('round-trips Plan Review Date and Inspection Date on TAS/RAS', () => {
    const payload = buildProjectSavePayload({
      ...rasBase,
      fldPlanReviewDate: '2026-09-01',
      fldInspectionDate: '2026-09-15',
      tdlrRegistered: emptyTdlrRegistered(),
    });
    expect(payload.fldPlanReviewDate).toBe('2026-09-01');
    expect(payload.fldInspectionDate).toBe('2026-09-15');
  });

  it('does not write RAS dates on Assessment', () => {
    const payload = buildProjectSavePayload({
      ...assessmentBase,
      fldPlanReviewDate: '2026-09-01',
      fldInspectionDate: '2026-09-15',
    });
    expect(payload).not.toHaveProperty('fldPlanReviewDate');
    expect(payload).not.toHaveProperty('fldInspectionDate');
  });

  it('allows the same RAS in both assignment fields', () => {
    const payload = buildProjectSavePayload({
      ...rasBase,
      fldPlanReviewRas: 'insp-same',
      fldInspectionRas: 'insp-same',
      tdlrRegistered: emptyTdlrRegistered(),
    });
    expect(payload.fldPlanReviewRas).toBe('insp-same');
    expect(payload.fldInspectionRas).toBe('insp-same');
  });

  it('changing one RAS assignment does not change the other', () => {
    const first = buildProjectSavePayload({
      ...rasBase,
      fldPlanReviewRas: 'insp-review',
      fldInspectionRas: 'insp-inspect',
      tdlrRegistered: emptyTdlrRegistered(),
    });
    const second = buildProjectSavePayload({
      ...rasBase,
      fldPlanReviewRas: 'insp-review-updated',
      fldInspectionRas: first.fldInspectionRas,
      tdlrRegistered: emptyTdlrRegistered(),
    });
    expect(second.fldPlanReviewRas).toBe('insp-review-updated');
    expect(second.fldInspectionRas).toBe('insp-inspect');
  });

  it('keeps empty RAS assignments blank', () => {
    const payload = buildProjectSavePayload({
      ...rasBase,
      fldPlanReviewRas: '  ',
      fldInspectionRas: '',
      tdlrRegistered: emptyTdlrRegistered(),
    });
    expect(payload.fldPlanReviewRas).toBe('');
    expect(payload.fldInspectionRas).toBe('');
  });

  it('does not write fldTabsProjectNumber or fldTenantFunded', () => {
    const payload = buildProjectSavePayload({
      ...rasBase,
      tdlrRegistered: emptyTdlrRegistered(),
    });
    expect(payload).not.toHaveProperty('fldTabsProjectNumber');
    expect(payload).not.toHaveProperty('fldTenantFunded');
  });

  it('does not rewrite architect job number storage key', () => {
    const payload = buildProjectSavePayload({ ...assessmentBase, fldExternalRef: 'keep-me' });
    expect(payload).toHaveProperty('fldExternalRef', 'keep-me');
    expect(payload).not.toHaveProperty('fldArchitectProjectNumber');
  });

  it('does not derive Assessment fldProjDescription from TDLR data', () => {
    const registered = emptyTdlrRegistered();
    registered.scopeOfWork = 'TABS registered scope';
    const payload = buildProjectSavePayload({
      ...assessmentBase,
      fldProjDescription: 'FREDA Assessment description',
      tdlrRegistered: registered,
    });
    expect(payload.fldProjDescription).toBe('FREDA Assessment description');
    expect(payload).not.toHaveProperty('tdlrRegistered');
  });

  it('omits Assessment Inspector from TAS/RAS payload so legacy fldInspector is not cleared', () => {
    const payload = buildProjectSavePayload({
      ...rasBase,
      fldInspector: 'legacy-insp',
      tdlrRegistered: emptyTdlrRegistered(),
    });
    expect(payload).not.toHaveProperty('fldInspector');
  });
});

describe('tdlrRegistered payload', () => {
  it('round-trips nested registered data without projectName or tdlrRas', () => {
    const registered = emptyTdlrRegistered();
    registered.tabsProjectNumber = 'TABS20XX004853';
    registered.scopeOfWork = 'Alter restrooms.';
    registered.site.facilityName = 'Tower';
    registered.owner.name = 'A.B.C. Property Holdings, LLC';
    registered.designFirm.name = 'A.B.C. Architects, Inc.';

    const payload = buildProjectSavePayload({
      ...rasBase,
      fldProjName: 'A.B.C. Tower Alterations',
      fldPlanReviewRas: 'insp-1',
      tdlrRegistered: registered,
    });

    expect(payload.fldProjName).toBe('A.B.C. Tower Alterations');
    expect(payload.tdlrRegistered).not.toHaveProperty('projectName');
    expect(payload.tdlrRegistered).not.toHaveProperty('tdlrRas');
    expect(payload.tdlrRegistered.tabsProjectNumber).toBe('TABS20XX004853');
    expect(payload.tdlrRegistered.scopeOfWork).toBe('Alter restrooms.');
    expect(payload.tdlrRegistered.site.facilityName).toBe('Tower');
    expect(payload.tdlrRegistered.owner.name).toBe('A.B.C. Property Holdings, LLC');
    expect(payload.tdlrRegistered.designFirm.name).toBe('A.B.C. Architects, Inc.');
    expect(payload.fldPlanReviewRas).toBe('insp-1');
  });

  it('synchronizes fldProjDescription from TABS Scope of Work on TAS/RAS save', () => {
    const registered = emptyTdlrRegistered();
    registered.scopeOfWork = 'Renovation of existing office...';
    const payload = buildProjectSavePayload({
      ...rasBase,
      fldProjDescription: 'Internal FREDA description',
      tdlrRegistered: registered,
    });
    expect(payload.tdlrRegistered.scopeOfWork).toBe('Renovation of existing office...');
    expect(payload.fldProjDescription).toBe('Renovation of existing office...');
  });

  it('writes blank fldProjDescription when TAS/RAS Scope is blank', () => {
    const registered = emptyTdlrRegistered();
    registered.scopeOfWork = '';
    const payload = buildProjectSavePayload({
      ...rasBase,
      fldProjDescription: 'Stale leftover description',
      tdlrRegistered: registered,
    });
    expect(payload.tdlrRegistered.scopeOfWork).toBe('');
    expect(payload.fldProjDescription).toBe('');
    expect(payload).toHaveProperty('fldProjDescription');
  });

  it('does not reverse-copy fldProjDescription into TABS Scope of Work', () => {
    const registered = emptyTdlrRegistered();
    registered.scopeOfWork = '';
    const payload = buildProjectSavePayload({
      ...rasBase,
      fldProjDescription: 'Old FREDA description',
      tdlrRegistered: registered,
    });
    expect(payload.tdlrRegistered.scopeOfWork).toBe('');
    expect(payload.fldProjDescription).toBe('');
  });

  it('keeps typeOfWork independent of Scope and fldProjDescription', () => {
    const registered = emptyTdlrRegistered();
    registered.scopeOfWork = 'Alter restrooms.';
    registered.typeOfWork = 'Alterations';
    const payload = buildProjectSavePayload({
      ...rasBase,
      fldProjDescription: 'should be replaced',
      tdlrRegistered: registered,
    });
    expect(payload.tdlrRegistered.typeOfWork).toBe('Alterations');
    expect(payload.tdlrRegistered.scopeOfWork).toBe('Alter restrooms.');
    expect(payload.fldProjDescription).toBe('Alter restrooms.');
    expect(payload.fldProjDescription).not.toBe('Alterations');
  });

  it('preserves tenantFunded true, false, and null', () => {
    const yes = emptyTdlrRegistered();
    yes.tenantFunded = true;
    expect(buildProjectSavePayload({ ...rasBase, tdlrRegistered: yes }).tdlrRegistered.tenantFunded).toBe(true);

    const no = emptyTdlrRegistered();
    no.tenantFunded = false;
    expect(buildProjectSavePayload({ ...rasBase, tdlrRegistered: no }).tdlrRegistered.tenantFunded).toBe(false);

    const unanswered = emptyTdlrRegistered();
    unanswered.tenantFunded = null;
    expect(buildProjectSavePayload({ ...rasBase, tdlrRegistered: unanswered }).tdlrRegistered.tenantFunded).toBeNull();
  });

  it('does not copy registered site or owner onto Facility/Client fields', () => {
    const registered = emptyTdlrRegistered();
    registered.site.address = '100 Main';
    registered.owner.name = 'Registered Owner LLC';

    const payload = buildProjectSavePayload({
      ...rasBase,
      fldClient: 'client-1',
      fldFacilities: ['fac-1'],
      fldInspectionRas: 'insp-assigned',
      tdlrRegistered: registered,
    });

    expect(payload.fldClient).toBe('client-1');
    expect(payload.fldFacilities).toEqual(['fac-1']);
    expect(payload.tdlrRegistered.owner.name).not.toBe(payload.fldClient);
    expect(payload.tdlrRegistered.site.address).toBe('100 Main');
    expect(payload.fldInspectionRas).toBe('insp-assigned');
  });
});

describe('buildTdlrRegisteredFromForm', () => {
  it('builds a complete nested object from form names', () => {
    const form = new FormData();
    form.set('tdlrSource', 'manual');
    form.set('tdlrTabsProjectNumber', ' TABS1 ');
    form.set('tdlrScopeOfWork', 'Scope');
    form.set('tdlrTenantFunded', 'true');
    form.set('tdlrSiteFacilityName', 'Bldg');
    form.set('tdlrOwnerName', 'Owner LLC');
    form.set('tdlrDesignFirmName', 'Firm Inc');
    form.set('tdlrProjectName', 'Should be ignored');
    form.set('tdlrRasName', 'Should be ignored');
    form.set('tdlrRasNumber', 'RAS 149');

    const snap = buildTdlrRegisteredFromForm(form);
    expect(snap.tabsProjectNumber).toBe('TABS1');
    expect(snap.tenantFunded).toBe(true);
    expect(snap.owner.name).toBe('Owner LLC');
    expect(snap.site.facilityName).toBe('Bldg');
    expect(snap.source).toBe('manual');
    expect(snap).not.toHaveProperty('projectName');
    expect(snap).not.toHaveProperty('tdlrRas');
  });

  it('emptyTdlrRegistered has no projectName or tdlrRas', () => {
    const empty = emptyTdlrRegistered();
    expect(empty).not.toHaveProperty('projectName');
    expect(empty).not.toHaveProperty('tdlrRas');
  });

  it('preserves tenantFunded false and null from the form', () => {
    const no = new FormData();
    no.set('tdlrTenantFunded', 'false');
    expect(buildTdlrRegisteredFromForm(no).tenantFunded).toBe(false);

    const unanswered = new FormData();
    unanswered.set('tdlrTenantFunded', '');
    expect(buildTdlrRegisteredFromForm(unanswered).tenantFunded).toBeNull();
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
