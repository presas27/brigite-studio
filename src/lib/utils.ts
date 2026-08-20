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

/** Display form for a raw tag: first letter capitalized, rest untouched. */
export function capitalize(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}
