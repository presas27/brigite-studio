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

const dateFormatters = new Map<string, Intl.DateTimeFormat>();
const relativeFormatters = new Map<string, Intl.RelativeTimeFormat>();

function dateFormatter(locale: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${locale}:${JSON.stringify(options)}`;
  const cached = dateFormatters.get(key);
  if (cached) return cached;
  const created = new Intl.DateTimeFormat(locale, options);
  dateFormatters.set(key, created);
  return created;
}

function relativeFormatter(locale: string): Intl.RelativeTimeFormat {
  const cached = relativeFormatters.get(locale);
  if (cached) return cached;
  const created = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  relativeFormatters.set(locale, created);
  return created;
}

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
  const out: string[] = [];
  for (const part of dateFormatter(locale, {
    day: "numeric",
    month: "short",
    timeZone: "Europe/Lisbon",
  }).formatToParts(date)) {
    if (part.type === "month") out.push(capitalize(trimAbbreviationDot(part.value), locale));
    else if (part.type === "day") out.push(part.value);
  }
  return out.join(" ");
}

/** `YYYY-MM-DD` -> the full weekday name, e.g. "Segunda-feira" or "Monday". */
export function formatWeekday(key: string, locale: string): string {
  const value = dateFormatter(locale, {
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
  const value = dateFormatter(locale, {
    weekday: "short",
    timeZone: "UTC",
  }).format(parseDayKey(key));
  return capitalize(trimAbbreviationDot(value), locale);
}

/** `YYYY-MM-DD` -> the day number alone, e.g. "17". */
export function formatDayNumber(key: string, locale: string): string {
  return dateFormatter(locale, { day: "numeric", timeZone: "UTC" }).format(parseDayKey(key));
}

/** `YYYY-MM-DD` -> "segunda-feira, 17 de agosto" / "Monday, August 17". */
export function formatLongDate(key: string, locale: string): string {
  return dateFormatter(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(parseDayKey(key));
}

/** `YYYY-MM` (or any day key) -> the year, e.g. "2026". */
export function formatYear(key: string, locale: string): string {
  return dateFormatter(locale, { year: "numeric", timeZone: "UTC" }).format(
    parseDayKey(key.length === 7 ? `${key}-01` : key),
  );
}

/** `YYYY-MM-DD` -> a week-range stamp, e.g. "17 – 23" or "31 Ago – 6 Set". */
export function formatDayRange(from: string, to: string, locale: string): string {
  const month = from.slice(0, 7) === to.slice(0, 7) ? undefined : "short";
  return dateFormatter(locale, {
    day: "numeric",
    month,
    timeZone: "UTC",
  }).formatRange(parseDayKey(from), parseDayKey(to));
}

/** `YYYY-MM-DD` -> "17/08". Fixed digits, not locale prose. */
export function formatDdMm(key: string): string {
  return `${key.slice(8, 10)}/${key.slice(5, 7)}`;
}

/** Epoch ms -> short date for "edited on" chips. */
export function formatEditedOn(atMs: number, locale: string): string {
  return dateFormatter(locale, {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  }).format(new Date(atMs));
}

/** Epoch ms or Date -> chat day heading, Lisbon. */
export function formatChatDay(date: Date, locale: string): string {
  return dateFormatter(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Lisbon",
  }).format(date);
}

/** Epoch ms or Date -> chat timestamp, Lisbon. */
export function formatChatTime(date: Date, locale: string): string {
  return dateFormatter(locale, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Lisbon",
  }).format(date);
}

/** `YYYY-MM` (or any day key) -> the month name alone, e.g. "Agosto" / "August". */
export function formatMonth(key: string, locale: string): string {
  const value = dateFormatter(locale, {
    month: "long",
    timeZone: "UTC",
  }).format(parseDayKey(key.length === 7 ? `${key}-01` : key));
  return capitalize(value, locale);
}

/** Epoch ms -> a short localized month/year, e.g. "Ago de 2026" (pt) or "Aug 2026" (en). */
export function formatMonthYear(atMs: number, locale: string): string {
  const formatted = dateFormatter(locale, {
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
  const formatter = relativeFormatter(locale);
  if (abs < HOUR_MS) return formatter.format(Math.round(diffMs / 60_000), "minute");
  if (abs < DAY_MS) return formatter.format(Math.round(diffMs / HOUR_MS), "hour");
  return formatter.format(Math.round(diffMs / DAY_MS), "day");
}
