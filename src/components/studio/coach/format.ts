/**
 * Date and relative-time formatting for the coach console.
 *
 * These are locale-aware via `Intl` directly rather than i18n message keys —
 * relative time ("há 3 dias" / "3 days ago") is inherently numeric/grammatical
 * and `Intl.RelativeTimeFormat` already gets the pt/en grammar right.
 */

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

/** `YYYY-MM-DD` -> a short localized date, e.g. "18 ago" (pt) or "Aug 18" (en). */
export function formatDayKey(key: string, locale: string): string {
  const date = new Date(`${key}T12:00:00Z`);
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    timeZone: "Europe/Lisbon",
  }).format(date);
}

/** Epoch ms -> "há 3 dias" / "3 days ago", bucketed by the largest sensible unit. */
export function formatRelative(atMs: number, locale: string): string {
  const diffMs = atMs - Date.now();
  const abs = Math.abs(diffMs);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (abs < HOUR_MS) return rtf.format(Math.round(diffMs / 60_000), "minute");
  if (abs < DAY_MS) return rtf.format(Math.round(diffMs / HOUR_MS), "hour");
  return rtf.format(Math.round(diffMs / DAY_MS), "day");
}
