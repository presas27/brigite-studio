/**
 * Parse a `YYYY-MM-DD` key as a UTC calendar date. Format the result with
 * `timeZone: "UTC"` so the displayed day never shifts against the server's
 * or visitor's local timezone.
 */
export function parseDayKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

