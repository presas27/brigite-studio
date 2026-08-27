/**
 * Day and week keys, in Lisbon time.
 *
 * Pure string arithmetic, no storage: these lived in `db.ts` while the studio
 * ran on SQLite, and both sides of the app need them now — pages render a
 * calendar out of them and Convex functions query by them, so the module has to
 * import cleanly into the Convex runtime too (no `node:` builtins, no `@/`
 * alias — `convex/` resolves this by relative path).
 *
 * A key is `YYYY-MM-DD` for a day and `YYYY-MM` for a month. Keys are compared
 * and shifted as strings; the only place a real `Date` appears is the boundary
 * where "now" is turned into a key.
 */

/** `YYYY-MM-DD` for a date (today by default), in Lisbon time. */
export function dayKey(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Lisbon",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Monday of the week containing `date`, as `YYYY-MM-DD`. */
export function weekKey(date: Date = new Date()): string {
  const key = dayKey(date);
  const [y, m, d] = key.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d));
  const shift = (utc.getUTCDay() + 6) % 7; // Monday = 0
  utc.setUTCDate(utc.getUTCDate() - shift);
  return utc.toISOString().slice(0, 10);
}

/** Shift a `YYYY-MM-DD` key by whole days. */
export function shiftDay(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d));
  utc.setUTCDate(utc.getUTCDate() + days);
  return utc.toISOString().slice(0, 10);
}

/** `YYYY-MM` for a date (today by default), in Lisbon time. */
export function monthKey(date: Date = new Date()): string {
  return dayKey(date).slice(0, 7);
}

/** Shift a `YYYY-MM` key by whole months. */
export function shiftMonth(key: string, months: number): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + months, 1)).toISOString().slice(0, 7);
}

/**
 * Every day key a Monday-first calendar page for `YYYY-MM` has to render —
 * the month plus the leading and trailing days that complete its first and
 * last weeks. Always a whole number of weeks, never a fixed six: padding a
 * 28-day February to six rows hangs two empty March weeks off the bottom.
 */
export function monthGrid(key: string): string[] {
  const [y, m] = key.split("-").map(Number);
  const offset = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7; // Monday = 0
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const start = shiftDay(`${key}-01`, -offset);
  const cells = Math.ceil((offset + daysInMonth) / 7) * 7;
  return Array.from({ length: cells }, (_, i) => shiftDay(start, i));
}

/**
 * Every `YYYY-MM-DD` from `start` to `end` (inclusive) that falls on
 * `weekday`, where Monday is 0 and Sunday is 6.
 */
export function datesOnWeekday(start: string, end: string, weekday: number): string[] {
  const [y, m, d] = start.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d));
  const current = (utc.getUTCDay() + 6) % 7;
  const delta = (weekday - current + 7) % 7;
  const first = shiftDay(start, delta);
  const dates: string[] = [];
  for (let key = first; key <= end; key = shiftDay(key, 7)) dates.push(key);
  return dates;
}
