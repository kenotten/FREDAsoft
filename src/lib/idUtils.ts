export function normalizeId(value: unknown): string {
  return String(value || "").trim().toLowerCase();
}

export function idsEqual(a: unknown, b: unknown): boolean {
  return normalizeId(a) === normalizeId(b);
}
