/**
 * Deterministic text normalization for conservative equality checks.
 * This intentionally avoids fuzzy/semantic matching.
 */
export function normalizeForDeterministicMatch(input: unknown): string {
  let s = String(input ?? '');
  s = s.normalize('NFKC');

  // Normalize common quote variants
  s = s
    .replace(/[\u2018\u2019\u201A\u201B\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F\u2033]/g, '"');

  // Normalize common dash variants
  s = s.replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212]/g, '-');

  // Normalize NBSP and collapse all whitespace
  s = s.replace(/\u00A0/g, ' ');
  s = s.toLowerCase().trim().replace(/\s+/g, ' ');

  return s;
}

