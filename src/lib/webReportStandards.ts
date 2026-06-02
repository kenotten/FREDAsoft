import type { Glossary, MasterStandard, ProjectData } from '../types';
import { formatStandardCitationLabel } from './standardCitationLabel';
import {
  buildReferencedAddendumEntries,
  splitStandardTextParagraphs,
  type StandardSnapshot
} from './reportPreviewShared';

export type WebReportStandardCitationView = {
  standardId: string;
  citeLabel: string;
  citeTitle: string;
  citationName: string;
  paragraphs: string[];
  imageUrl: string | null;
};

export type WebReportStandardTypeGroup = {
  standardType: string;
  key: string;
  citations: WebReportStandardCitationView[];
};

export type WebReportReferencedStandardsView = {
  typeGroups: WebReportStandardTypeGroup[];
  citationCount: number;
  hasReferencedStandards: boolean;
};

function snapshotToCitationView(s: StandardSnapshot): WebReportStandardCitationView {
  const prefix = s.fldStandardType || 'Unknown';
  const citeLabel =
    formatStandardCitationLabel({
      id: s.fldStandardId,
      fldStandardType: s.fldStandardType,
      citation_num: s.fldCitationNum,
      relation_type: s.fldRelationType
    }) ?? `${prefix} ${String(s.fldCitationNum || '').trim()}`.trim();
  const citationName = String(s.fldCitationName || '').trim();
  const citeTitle = `${citeLabel}${citationName ? ` ${citationName}` : ''}`.trim();
  const rawImage = s.fldImageUrl;
  const imageUrl =
    rawImage !== undefined && rawImage !== null && String(rawImage).trim()
      ? String(rawImage).trim()
      : null;

  return {
    standardId: s.fldStandardId,
    citeLabel,
    citeTitle,
    citationName,
    paragraphs: splitStandardTextParagraphs(s.fldContentText),
    imageUrl
  };
}

/** Read-only referenced standards for currently included Web Report records. */
export function buildWebReportReferencedStandardsView(
  includedRecords: ProjectData[],
  glossary: Glossary[],
  standards: MasterStandard[]
): WebReportReferencedStandardsView {
  const entries = buildReferencedAddendumEntries(includedRecords, glossary, standards);
  const typeGroups: WebReportStandardTypeGroup[] = [];
  let currentType: WebReportStandardTypeGroup | null = null;
  let citationCount = 0;

  for (const entry of entries) {
    if (entry.kind === 'header') {
      currentType = {
        standardType: entry.standardType,
        key: entry.key,
        citations: []
      };
      typeGroups.push(currentType);
    } else if (entry.kind === 'standard') {
      if (!currentType) {
        currentType = {
          standardType: entry.standard.fldStandardType || 'Unknown',
          key: `__orphan_type__${entry.standard.fldStandardId}`,
          citations: []
        };
        typeGroups.push(currentType);
      }
      currentType.citations.push(snapshotToCitationView(entry.standard));
      citationCount += 1;
    }
  }

  return {
    typeGroups,
    citationCount,
    hasReferencedStandards: citationCount > 0
  };
}
