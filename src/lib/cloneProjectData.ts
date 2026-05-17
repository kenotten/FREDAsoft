/**
 * Pure helpers to build an in-memory "clone seed" for Data Entry from an existing projectData row.
 * No I/O. Used by Data Explorer and ProjectData Entry so both paths share identical field logic.
 */

import type { Glossary } from '../types';

/** Glossary row fields used for clone lookup (canonical shape + legacy rec id alias on stored rows). */
type GlossaryCloneLookup = Glossary & { fldRecID?: string };

export type ProjectDataCloneSeed = {
  selections: {
    dataEntryMode: 'glossary' | 'custom';
    categoryId: string;
    itemId: string;
    findId: string;
    recId: string;
    glosId: string;
    /** Always empty — user must pick a location before save */
    locationId: string;
  };
  customMasterFindId: string;
  customMasterRecId: string;
  form: {
    fldFindShort: string;
    fldFindLong: string;
    fldRecShort: string;
    fldRecLong: string;
    fldUnitCost: number;
    fldUnitType: string;
    fldStandards: string[];
  };
  /** Values needed on first save when activeRecord is null */
  saveContext: {
    fldPDataProject: string;
    fldFacility: string;
    fldData: string;
    fldRecordSource: 'glossary' | 'custom';
    fldPDataCategoryID: string;
    fldPDataItemID: string;
    fldPDataMasterFindID: string;
    fldPDataMasterRecID: string;
  };
  /** Lineage-only fields merged into payload on first save */
  provenance: Record<string, unknown>;
};

function safeString(v: unknown): string {
  return String(v ?? '').trim();
}

function safeArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

/**
 * Build a clone seed from a source projectData document (shape may include extra Firestore fields).
 * @param glossary Optional glossary rows for resolving glossary-mode selections (same as Data Entry).
 */
export function buildProjectDataCloneSeed(
  source: Record<string, unknown>,
  glossary?: GlossaryCloneLookup[]
): ProjectDataCloneSeed {
  const fldDataStr = safeString(source.fldData);
  const fldDataBlank = !fldDataStr;
  const hasPDataCatItem =
    !!safeString(source.fldPDataCategoryID) && !!safeString(source.fldPDataItemID);
  const isCustom =
    source.fldRecordSource === 'custom' || (fldDataBlank && hasPDataCatItem);

  let selections: ProjectDataCloneSeed['selections'];
  if (isCustom) {
    selections = {
      dataEntryMode: 'custom',
      categoryId: safeString(source.fldPDataCategoryID),
      itemId: safeString(source.fldPDataItemID),
      findId: '',
      recId: '',
      glosId: '',
      locationId: '',
    };
  } else {
    const targetLower = fldDataStr.toLowerCase();
    const glos = (glossary || []).find((g) => {
      const gid = safeString(g.fldGlosId).toLowerCase();
      const id = safeString(g.id).toLowerCase();
      return gid === targetLower || id === targetLower;
    });
    selections = {
      dataEntryMode: 'glossary',
      categoryId: safeString(glos?.fldCat),
      itemId: safeString(glos?.fldItem),
      findId: safeString(glos?.fldFind),
      recId: safeString(glos?.fldRec || glos?.fldRecID),
      glosId: safeString(glos?.fldGlosId || glos?.id),
      locationId: '',
    };
  }

  const now = new Date().toISOString();
  const srcLoc = safeString(source.fldLocation);
  const srcPDataId = safeString(source.fldPDataID);

  const provenance: Record<string, unknown> = {
    fldSourcePDataID: srcPDataId || undefined,
    fldSourceClonedAt: now,
    fldSourceClonedFromLocationId: srcLoc || undefined,
    fldSourceGlossaryId: fldDataStr || undefined,
    fldSourceFindingId: safeString(source.fldPDataMasterFindID) || undefined,
    fldSourceRecommendationId: safeString(source.fldPDataMasterRecID) || undefined,
  };
  Object.keys(provenance).forEach((k) => {
    const v = provenance[k];
    if (v === undefined || v === '') delete provenance[k];
  });

  return {
    selections,
    customMasterFindId: isCustom ? safeString(source.fldPDataMasterFindID) : '',
    customMasterRecId: isCustom ? safeString(source.fldPDataMasterRecID) : '',
    form: {
      fldFindShort: safeString(source.fldFindShort),
      fldFindLong: safeString(source.fldFindLong),
      fldRecShort: safeString(source.fldRecShort),
      fldRecLong: safeString(source.fldRecLong),
      fldUnitCost: Number(source.fldUnitCost) || 0,
      fldUnitType: safeString(source.fldUnitType) || 'Decimal',
      fldStandards: safeArray<string>(source.fldStandards),
    },
    saveContext: {
      fldPDataProject: safeString(source.fldPDataProject),
      fldFacility: safeString(source.fldFacility),
      fldData: fldDataStr,
      fldRecordSource: isCustom ? 'custom' : 'glossary',
      fldPDataCategoryID: safeString(source.fldPDataCategoryID),
      fldPDataItemID: safeString(source.fldPDataItemID),
      fldPDataMasterFindID: safeString(source.fldPDataMasterFindID),
      fldPDataMasterRecID: safeString(source.fldPDataMasterRecID),
    },
    provenance,
  };
}
