"use server";

import { cookies } from "next/headers";

/**
 * Theme preference for the app, persisted in a cookie so the server can render
 * the right palette on the first paint — same approach as the locale cookie in
 * `src/i18n/locale.ts`, and the reason there is no flash of the wrong theme.
 *
 * The toggle flips the class on `document.documentElement` itself so the
 * animation runs in the same frame as the click; this write only records the
 * choice for the next request.
 */

export type ThemeMode = "dark" | "light";

const THEME_COOKIE = "studio_theme";

export async function getThemeMode(): Promise<ThemeMode> {
  return (await cookies()).get(THEME_COOKIE)?.value === "light" ? "light" : "dark";
}

// oxlint-disable-next-line react-doctor/server-auth-actions -- records a display preference in the caller's own cookie; no data access, nothing to authorise.
export async function setThemeMode(mode: ThemeMode): Promise<void> {
  (await cookies()).set(THEME_COOKIE, mode, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}
