import type { Locale } from "@/i18n/config";

/**
 * Picking the cues a reader should see.
 *
 * Its own module, away from `library.ts`, because the session player is a
 * client component and needs this: anything it imports is bundled for the
 * browser, and `library.ts` is server-only — it carries the Convex session
 * token, which has no business in a bundle.
 */

/**
 * The cues in the reader's language, falling back to the other one rather than
 * to silence. An exercise carried over from Trainerize has only English until
 * Sara translates it, and an empty panel mid-set would read as "no
 * instructions" when instructions exist.
 *
 * The import also left its numbering jammed against the words ("1.Lie face
 * down"); every reader of a cue gets the space put back, so the fix lives here
 * and not in each screen that prints one.
 */
export function cuesFor(exercise: { cues: string; cuesEn: string }, locale: Locale): string {
  const own = locale === "en" ? exercise.cuesEn : exercise.cues;
  const other = locale === "en" ? exercise.cues : exercise.cuesEn;
  return (own.trim() ? own : other).replace(/^(\d+)[.)](?=\S)/gm, "$1. ");
}
