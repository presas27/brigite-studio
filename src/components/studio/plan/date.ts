/**
 * Parse a `YYYY-MM-DD` key as a UTC calendar date. Format the result with
 * `timeZone: "UTC"` so the displayed day never shifts against the server's
 * or visitor's local timezone.
 */
export function parseDayKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/**
 * Monday of the week containing a `YYYY-MM-DD` key.
 *
 * The client-safe twin of `weekKey` in `lib/studio/db`: that module opens the
 * SQLite connection, so nothing rendered in the browser can import it.
 */
export function mondayOf(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d));
  utc.setUTCDate(utc.getUTCDate() - ((utc.getUTCDay() + 6) % 7));
  return utc.toISOString().slice(0, 10);
}

/**
 * Short weekday name for a day key.
 *
 * Portuguese abbreviations come back from `Intl` with a trailing period
 * ("seg."); seven of those across a calendar header is seven full stops of
 * noise, so the period goes.
 */
export function shortWeekday(key: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" })
    .format(parseDayKey(key))
    .replace(/\.$/, "");
}
