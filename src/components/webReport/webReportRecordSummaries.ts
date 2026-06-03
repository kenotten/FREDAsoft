import type { WebReportRecordView } from '../../lib/webReportTree';

function toSingleLineSnippet(value: string | undefined, maxLen: number): string {
  const normalized = String(value || '').replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  if (normalized.length <= maxLen) return normalized;
  return `${normalized.slice(0, Math.max(1, maxLen - 3)).trimEnd()}...`;
}

export function resolveFindingSummary(view: WebReportRecordView): string {
  const shortFinding = toSingleLineSnippet(view.findingShort, 90);
  if (shortFinding) return shortFinding;
  const longFinding = toSingleLineSnippet(view.record.fldFindLong, 90);
  if (longFinding) return longFinding;
  return 'Finding not specified';
}

export function resolveRecommendationSummary(view: WebReportRecordView): string {
  const shortRec = toSingleLineSnippet(view.record.fldRecShort, 90);
  if (shortRec) return shortRec;
  const longRec = toSingleLineSnippet(view.record.fldRecLong, 90);
  if (longRec) return longRec;
  return 'Recommendation not specified';
}
