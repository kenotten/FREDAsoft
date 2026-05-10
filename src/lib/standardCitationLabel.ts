import type { MasterStandard } from '../types';

export type StandardCitationLabelInput = Pick<
  MasterStandard,
  'fldStandardType' | 'citation_num' | 'relation_type' | 'id'
>;

export interface FormatStandardCitationLabelOptions {
  // Reserved for future options (e.g. compact, includeName).
}

const RELATION_ALIASES: Record<string, MasterStandard['relation_type'] | 'Standard'> = {
  standard: 'Standard',
  advisory: 'Advisory',
  exception: 'Exception',
  figure: 'Figure',
  table: 'Table',
  'exception advisory': 'Exception Advisory'
};

const RELATION_DISPLAY: Partial<Record<MasterStandard['relation_type'], string>> = {
  Standard: '',
  Advisory: 'Advisory',
  Exception: 'Exception',
  Figure: 'Figure',
  Table: 'Table',
  'Exception Advisory': 'Exception Advisory'
};

function canonicalRelationType(raw: string | undefined | null): string {
  const t = String(raw ?? '').trim();
  if (!t) return '';
  const lower = t.toLowerCase();
  return RELATION_ALIASES[lower] ?? t;
}

function humanizedRelationLabel(canonical: string): string {
  if (!canonical || canonical === 'Standard') return '';
  const mapped = RELATION_DISPLAY[canonical as MasterStandard['relation_type']];
  if (mapped !== undefined) return mapped;
  return canonical
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function buildBaseLabel(standard: Pick<MasterStandard, 'fldStandardType' | 'citation_num' | 'id'>): string | undefined {
  const t = String(standard.fldStandardType ?? '').trim();
  const n = String(standard.citation_num ?? '').trim();
  if (t !== '' && n !== '') return `${t} ${n}`;
  if (n !== '') return n;
  const sid = String(standard.id ?? '').trim();
  if (sid !== '') return sid;
  return undefined;
}

function shouldAppendSuffix(base: string, humanized: string): boolean {
  if (!humanized) return false;
  const lowerBase = base.toLowerCase();
  const lowerHum = humanized.toLowerCase();
  return !lowerBase.includes(lowerHum);
}

function appendRelationSuffix(base: string, relationType: string | undefined | null): string {
  const canonical = canonicalRelationType(relationType);
  if (!canonical || canonical === 'Standard') return base;
  const humanized = humanizedRelationLabel(canonical);
  if (!humanized) return base;
  if (!shouldAppendSuffix(base, humanized)) return base;
  return `${base} (${humanized})`;
}

/**
 * Returns the display label for a resolved standards row, or `undefined` if the row is missing
 * or no base label can be built (callers keep their existing id / “unknown” fallbacks).
 */
export function formatStandardCitationLabel(
  standard: StandardCitationLabelInput | null | undefined,
  _options?: FormatStandardCitationLabelOptions
): string | undefined {
  if (!standard) return undefined;
  const base = buildBaseLabel(standard);
  if (base === undefined) return undefined;
  return appendRelationSuffix(base, standard.relation_type);
}

function normId(value: string): string {
  return String(value ?? '')
    .trim()
    .toLowerCase();
}

export function formatStandardCitationLabelById(
  standardId: string,
  standards: MasterStandard[],
  options?: FormatStandardCitationLabelOptions
): string | undefined {
  const id = String(standardId ?? '').trim();
  if (!id) return undefined;
  const s = standards.find((st) => normId(st.id) === normId(id));
  return formatStandardCitationLabel(s, options);
}

/** Inputs needed for ordering citations (snapshots may omit fields; compare treats missing like NaN / empty). */
export type StandardCitationSortInput = {
  order?: number;
  fldStandardType?: string;
  citation_num?: string;
  relation_type?: MasterStandard['relation_type'];
  sub_sequence?: number;
  id?: string;
};

function relationSortRank(canon: string): number {
  switch (canon) {
    case '':
    case 'Standard':
      return 0;
    case 'Advisory':
      return 1;
    case 'Exception':
      return 2;
    case 'Exception Advisory':
      return 3;
    case 'Figure':
      return 4;
    case 'Table':
      return 5;
    default:
      return 100;
  }
}

/**
 * Sort key for standards rows: `order` (when present), then type, citation number,
 * then relation (Standard/blank before Advisory → Exception → Exception Advisory → Figure → Table → unknown),
 * then `sub_sequence`, then `id`.
 */
export function compareStandardCitations(
  a: StandardCitationSortInput | null | undefined,
  b: StandardCitationSortInput | null | undefined
): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;

  const aOrder = Number(a.order);
  const bOrder = Number(b.order);
  const aHasO = Number.isFinite(aOrder);
  const bHasO = Number.isFinite(bOrder);
  if (aHasO && bHasO && aOrder !== bOrder) return aOrder - bOrder;
  if (aHasO !== bHasO) return aHasO ? -1 : 1;

  const tA = String(a.fldStandardType ?? '').trim();
  const tB = String(b.fldStandardType ?? '').trim();
  if (tA || tB) {
    const tc = tA.localeCompare(tB, undefined, { sensitivity: 'base' });
    if (tc !== 0) return tc;
  }

  const nA = String(a.citation_num ?? '').trim();
  const nB = String(b.citation_num ?? '').trim();
  if (nA || nB) {
    const nc = nA.localeCompare(nB, undefined, { numeric: true, sensitivity: 'base' });
    if (nc !== 0) return nc;
  }

  const canonA = canonicalRelationType(a.relation_type);
  const canonB = canonicalRelationType(b.relation_type);
  const rA = relationSortRank(canonA);
  const rB = relationSortRank(canonB);
  if (rA !== rB) {
    if (rA >= 100 && rB >= 100) {
      const rc = canonA.localeCompare(canonB, undefined, { sensitivity: 'base' });
      if (rc !== 0) return rc;
    } else {
      return rA - rB;
    }
  } else if (rA >= 100) {
    const rc = canonA.localeCompare(canonB, undefined, { sensitivity: 'base' });
    if (rc !== 0) return rc;
  }

  const subA = Number(a.sub_sequence);
  const subB = Number(b.sub_sequence);
  const subAOk = Number.isFinite(subA);
  const subBOk = Number.isFinite(subB);
  if (subAOk && subBOk && subA !== subB) return subA - subB;
  if (subAOk !== subBOk) return subAOk ? -1 : 1;

  const idA = String(a.id ?? '').trim();
  const idB = String(b.id ?? '').trim();
  return idA.localeCompare(idB, undefined, { sensitivity: 'base' });
}
