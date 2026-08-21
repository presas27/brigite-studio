/**
 * Date and label formatting for the studio app — both consoles.
 *
 * These are locale-aware via `Intl` directly rather than i18n message keys —
 * relative time ("há 3 dias" / "3 days ago") is inherently numeric/grammatical
 * and `Intl.RelativeTimeFormat` already gets the pt/en grammar right.
 *
 * Casing is the other job here. Portuguese `Intl` output is lowercase and full
 * of connectives and abbreviation dots ("segunda-feira", "17 de ago."), which
 * reads like raw data next to the app's labels. Every display helper below
 * returns something already fit to render, so no call site needs
 * `text-transform: capitalize` — a transform that would also break
 * "segunda-feira" into "Segunda-Feira".
 */

import { capitalize } from "@/lib/utils";
import { parseDayKey } from "./plan/date";

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

/** Portuguese abbreviates with a trailing period ("ago.", "seg."). Labels don't. */
function trimAbbreviationDot(value: string): string {
  return value.replace(/\.$/, "");
}

/**
 * `YYYY-MM-DD` -> a short localized date, e.g. "17 Ago" (pt) or "Aug 17" (en).
 *
 * Built from parts rather than formatted whole: pt-PT writes "17 de ago.", and
 * the connective plus the dot is noise in a date chip. Part order comes from
 * the locale, so English still leads with the month.
 */
export function formatDayKey(key: string, locale: string): string {
  const date = new Date(`${key}T12:00:00Z`);
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    timeZone: "Europe/Lisbon",
  })
    .formatToParts(date)
    .filter((part) => part.type === "day" || part.type === "month")
    .map((part) =>
      part.type === "month" ? capitalize(trimAbbreviationDot(part.value), locale) : part.value,
    )
    .join(" ");
}

/** `YYYY-MM-DD` -> the full weekday name, e.g. "Segunda-feira" or "Monday". */
export function formatWeekday(key: string, locale: string): string {
  const value = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    timeZone: "UTC",
  }).format(parseDayKey(key));
  return capitalize(value, locale);
}

/**
 * `YYYY-MM-DD` -> the short weekday name, e.g. "Seg" or "Mon".
 *
 * Seven abbreviation dots across a calendar header is seven full stops of
 * noise, so the period goes.
 */
export function shortWeekday(key: string, locale: string): string {
  const value = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    timeZone: "UTC",
  }).format(parseDayKey(key));
  return capitalize(trimAbbreviationDot(value), locale);
}

/** `YYYY-MM` (or any day key) -> the month name alone, e.g. "Agosto" / "August". */
export function formatMonth(key: string, locale: string): string {
  const value = new Intl.DateTimeFormat(locale, {
    month: "long",
    timeZone: "UTC",
  }).format(parseDayKey(key.length === 7 ? `${key}-01` : key));
  return capitalize(value, locale);
}

/** Epoch ms -> a short localized month/year, e.g. "Ago de 2026" (pt) or "Aug 2026" (en). */
export function formatMonthYear(atMs: number, locale: string): string {
  const formatted = new Intl.DateTimeFormat(locale, {
    month: "short",
    year: "numeric",
    timeZone: "Europe/Lisbon",
  }).format(new Date(atMs));
  return capitalize(formatted.replace(/\.(?=\s|$)/g, ""), locale);
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
