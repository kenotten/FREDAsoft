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

