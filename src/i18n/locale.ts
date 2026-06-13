"use server";

import { cookies } from "next/headers";
import { defaultLocale, hasLocale, LOCALE_COOKIE, type Locale } from "./config";

/**
 * Read/write the active locale from a cookie. Used by the request config
 * (reads) and the navbar language toggle (writes). A missing or tampered
 * cookie falls back to the default locale.
 */
// oxlint-disable-next-line react-doctor/server-auth-actions -- public locale-cookie read; language preference only, no auth or sensitive data
export async function getUserLocale(): Promise<Locale> {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return hasLocale(value) ? value : defaultLocale;
}

// oxlint-disable-next-line react-doctor/server-auth-actions -- public locale-cookie write; language preference only, no auth or sensitive data
export async function setUserLocale(locale: Locale) {
  (await cookies()).set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: "lax",
  });
}
