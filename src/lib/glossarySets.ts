export type GlossarySetDef = {
  id: string;
  name: string;
  standardType: string;
  standardVersion: string;
};

export const GLOSSARY_SET_DEFS: GlossarySetDef[] = [
  {
    id: 'UFAS',
    name: 'UFAS',
    standardType: 'UFAS',
    standardVersion: '1984',
  },
  {
    id: 'ADA_2010',
    name: 'ADA 2010',
    standardType: 'ADA',
    standardVersion: '2010',
  },
  {
    id: 'TAS_2012',
    name: 'TAS 2012',
    standardType: 'TAS',
    standardVersion: '2012',
  },
  {
    id: 'TAS_1994',
    name: 'TAS 1994',
    standardType: 'TAS',
    standardVersion: '1994',
  },
  {
    id: 'FHA_GUIDELINES',
    name: 'FHA Guidelines',
    standardType: 'FHA',
    standardVersion: 'Guidelines',
  },
  {
    id: 'ANSI_A117_1_2009',
    name: 'ANSI A117.1 2009',
    standardType: 'ANSI',
    standardVersion: '2009',
  },
  {
    id: 'IBC_2020',
    name: 'IBC 2020',
    standardType: 'IBC',
    standardVersion: '2020',
  },
];

export function glossarySetById(id: string | undefined | null): GlossarySetDef | undefined {
  const key = String(id || '').trim().toUpperCase();
  if (!key) return undefined;
  return GLOSSARY_SET_DEFS.find((s) => s.id.toUpperCase() === key);
}

export function glossarySetMetadataForId(id: string) {
  const setDef = glossarySetById(id);

  return {
    fldGlossarySetId: setDef?.id || null,
    fldGlossarySetName: setDef?.name || null,
    fldGlossaryStandardType: setDef?.standardType || null,
    fldGlossaryStandardVersion: setDef?.standardVersion || null,
  };
}

/** Glossary row Firestore fields — omits keys when set id is unknown (avoids merge:null clearing). */
export type GlossaryRowSetMetadataFields = {
  fldGlossarySetId: string;
  fldGlossarySetName: string;
  fldGlossaryStandardType: string;
  fldGlossaryStandardVersion: string;
};

export function glossaryRowSetMetadataPayload(
  setId: string | undefined | null
): Partial<GlossaryRowSetMetadataFields> {
  const def = glossarySetById(setId);
  if (!def) return {};
  return {
    fldGlossarySetId: def.id,
    fldGlossarySetName: def.name,
    fldGlossaryStandardType: def.standardType,
    fldGlossaryStandardVersion: def.standardVersion,
  };
}

/** Canonical set id for a new glossary row save (dropdown must be a known set). */
export function canonicalGlossarySetIdForSave(setId: string | undefined | null): string {
  return glossarySetById(setId)?.id ?? '';
}

/**
 * Set id to persist on glossary row update: selected dropdown first, else derive from existing row.
 */
export function effectiveGlossarySetIdForGlossaryRowSave(
  selectedSetId: string | undefined | null,
  existingRow?: GlossarySetResolvable | null
): string {
  const fromSelected = canonicalGlossarySetIdForSave(selectedSetId);
  if (fromSelected) return fromSelected;
  return resolveGlossarySetForRecord(existingRow).setKey;
}

/** Fields used to derive canonical glossary set (read-only reporting / display). */
export type GlossarySetResolvable = {
  fldGlossarySetId?: string | null;
  fldGlossarySetName?: string | null;
  fldGlossaryStandardType?: string | null;
  fldGlossaryStandardVersion?: string | null;
  /** Master finding/recommendation library context */
  fldStandardType?: string | null;
  fldStandardVersion?: string | null;
};

export type GlossarySetResolveSource = 'id' | 'name' | 'type_version' | 'none';

export type ResolvedGlossarySet = {
  /** Canonical set id (e.g. TAS_2012) or '' for Unassigned / Legacy */
  setKey: string;
  setLabel: string;
  source: GlossarySetResolveSource;
  /** True when fldGlossarySetId was non-empty on the source record */
  rawIdPresent: boolean;
};

export const GLOSSARY_SET_UNASSIGNED_LABEL = 'Unassigned / Legacy';

function normalizeSetLookupText(value: string | undefined | null): string {
  return String(value ?? '').trim().toLowerCase();
}

/** Match by display name or id string (e.g. "TAS 2012" or "TAS_2012"). */
export function glossarySetByName(name: string | undefined | null): GlossarySetDef | undefined {
  const n = normalizeSetLookupText(name);
  if (!n) return undefined;
  return GLOSSARY_SET_DEFS.find(
    (s) => normalizeSetLookupText(s.name) === n || normalizeSetLookupText(s.id) === n
  );
}

/** Match a single known set from standard type + version (master or glossary fields). */
export function glossarySetByTypeVersion(
  type: string | undefined | null,
  version: string | undefined | null
): GlossarySetDef | undefined {
  const t = normalizeSetLookupText(type);
  const v = normalizeSetLookupText(version);
  if (!t) return undefined;
  const matches = GLOSSARY_SET_DEFS.filter(
    (s) => normalizeSetLookupText(s.standardType) === t && normalizeSetLookupText(s.standardVersion) === v
  );
  if (matches.length === 1) return matches[0];
  if (!v) {
    const byType = GLOSSARY_SET_DEFS.filter((s) => normalizeSetLookupText(s.standardType) === t);
    if (byType.length === 1) return byType[0];
  }
  return undefined;
}

/**
 * Canonical read-only glossary set resolution (id → name → type/version).
 * Aligns with how legacy rows often store fldGlossarySetName / type+version without fldGlossarySetId.
 */
export function resolveGlossarySetForRecord(
  row: GlossarySetResolvable | null | undefined
): ResolvedGlossarySet {
  const rawId = String(row?.fldGlossarySetId ?? '').trim();
  if (rawId) {
    const def = glossarySetById(rawId);
    const setKey = def ? def.id : rawId;
    return {
      setKey,
      setLabel: (def?.name ?? String(row?.fldGlossarySetName ?? '').trim()) || setKey,
      source: 'id',
      rawIdPresent: true,
    };
  }

  const name = String(row?.fldGlossarySetName ?? '').trim();
  if (name) {
    const byName = glossarySetByName(name);
    if (byName) {
      return {
        setKey: byName.id,
        setLabel: byName.name,
        source: 'name',
        rawIdPresent: false,
      };
    }
  }

  const type = String(row?.fldGlossaryStandardType ?? row?.fldStandardType ?? '').trim();
  const version = String(row?.fldGlossaryStandardVersion ?? row?.fldStandardVersion ?? '').trim();
  if (type) {
    const byTv = glossarySetByTypeVersion(type, version);
    if (byTv) {
      return {
        setKey: byTv.id,
        setLabel: byTv.name,
        source: 'type_version',
        rawIdPresent: false,
      };
    }
  }

  return {
    setKey: '',
    setLabel: GLOSSARY_SET_UNASSIGNED_LABEL,
    source: 'none',
    rawIdPresent: false,
  };
}

export function resolveGlossarySetLabelForKey(setKey: string): string {
  if (!setKey) return GLOSSARY_SET_UNASSIGNED_LABEL;
  return glossarySetById(setKey)?.name ?? setKey;
}

