/**
 * i18n configuration — cookie-based locale, no URL routing.
 * Portuguese is the default; English is offered via the navbar toggle.
 */
export const locales = ["pt", "en"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "pt";

/** Cookie that persists the visitor's chosen language. */
export const LOCALE_COOKIE = "NEXT_LOCALE";

/** Narrows an arbitrary string to a supported Locale. */
export function hasLocale(value: string | undefined): value is Locale {
  return value != null && (locales as readonly string[]).includes(value);
}
