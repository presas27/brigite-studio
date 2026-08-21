import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind class names safely, resolving conflicts.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Combining Diacritical Marks block (U+0300–U+036F) — what NFD splits accents into. */
const COMBINING_MARK_RANGE = { start: 0x0300, end: 0x036f };

/** Case- and accent-insensitive key for free-text matching ("força" ~ "forca" ~ "FORÇA"). */
export function searchKey(value: string): string {
  return Array.from(value.normalize("NFD"))
    .filter((char) => {
      const code = char.codePointAt(0) ?? 0;
      return code < COMBINING_MARK_RANGE.start || code > COMBINING_MARK_RANGE.end;
    })
    .join("")
    .toLowerCase();
}

/**
 * Display form for a label: the first *letter* uppercased, everything else
 * untouched.
 *
 * Not `text-transform: capitalize` — CSS treats every hyphen as a word break
 * and turns "segunda-feira" into "Segunda-Feira", which is wrong in Portuguese.
 * Skipping non-letters is what makes counted labels work too: "5 exercícios"
 * becomes "5 Exercícios" and not "5 exercícios".
 */
export function capitalize(value: string, locale?: string): string {
  for (let i = 0; i < value.length; i += 1) {
    const char = value[i];
    const upper = char.toLocaleUpperCase(locale);
    // A character has case when its upper and lower forms differ — true for
    // letters, false for digits, spaces and punctuation.
    if (upper !== char.toLocaleLowerCase(locale)) {
      return value.slice(0, i) + upper + value.slice(i + 1);
    }
  }
  return value;
}
