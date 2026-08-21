const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 60 * 60 * 1000],
  ["month", 30 * 24 * 60 * 60 * 1000],
  ["week", 7 * 24 * 60 * 60 * 1000],
  ["day", 24 * 60 * 60 * 1000],
  ["hour", 60 * 60 * 1000],
  ["minute", 60 * 1000],
];

/**
 * "3h ago" style label for a thread-list preview, in the active locale.
 *
 * The output is words, not digits — "ontem", "há 3 dias", "last week" — so it
 * sets in the body face like every other label in the app.
 *
 * Returned in sentence case ("Ontem", not "ontem"). Every place this is
 * rendered is a standalone caption rather than a fragment inside a sentence,
 * so the capital belongs to the label itself — leaving it to each call site
 * is how one of them ends up lowercase. English forms that open with a digit
 * ("3 days ago") are unaffected. `formatRelative` in `coach/format.ts` is
 * deliberately *not* capitalised: it gets interpolated mid-line on the leads
 * list, where a capital would land in the middle of a sentence.
 */
export function relativeTime(at: number, locale: string, now: number = Date.now()): string {
  const diff = at - now; // negative for the past
  const abs = Math.abs(diff);
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  for (const [unit, ms] of UNITS) {
    if (abs >= ms) return sentenceCase(formatter.format(Math.round(diff / ms), unit), locale);
  }
  return sentenceCase(formatter.format(Math.round(diff / 1000), "second"), locale);
}

/** Uppercase the first character under the active locale's casing rules. */
function sentenceCase(text: string, locale: string): string {
  return text.charAt(0).toLocaleUpperCase(locale) + text.slice(1);
}
