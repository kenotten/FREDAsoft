/**
 * Shared cover City/State/ZIP display. Used by RAS and Assessment covers.
 * Trims parts and omits missing values — no dangling commas or doubled spaces.
 */

function textPart(value: unknown): string {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

/** Canonical cover format: `City, ST ZIP` with missing parts omitted. */
export function formatCityStateZip(
  city?: unknown,
  state?: unknown,
  zip?: unknown
): string {
  const c = textPart(city);
  const s = textPart(state);
  const z = textPart(zip);
  const left = [c, s].filter(Boolean).join(', ');
  return [left, z].filter(Boolean).join(' ');
}

export function formatCityStateZipOrFallback(
  city: unknown,
  state: unknown,
  zip: unknown,
  fallback: string
): string {
  return formatCityStateZip(city, state, zip) || fallback;
}

/** One paired cover row: Address left, concatenated City/State/ZIP right. */
export function coverAddressPairRow(
  addressLabel: string,
  addressValue: string,
  cityStateZip: string
): {
  kind: 'pair';
  left: { label: string; value: string };
  right: { label: string; value: string };
} {
  return {
    kind: 'pair',
    left: { label: addressLabel, value: addressValue },
    right: { label: 'City/State/ZIP:', value: cityStateZip },
  };
}
