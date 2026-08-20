"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getUserLocale } from "@/i18n/locale";
import { rateLimit } from "@/lib/rate-limit";
import { createSignInToken, endSession } from "@/lib/studio/auth";
import { sendSignInLink } from "@/lib/studio/email";
import { seedStudio } from "@/lib/studio/seed";
import { findUserByEmail } from "@/lib/studio/users";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Per-IP budget on sign-in requests. Generous for a household, hostile to a script. */
const RATE = { limit: 8, windowMs: 10 * 60 * 1_000 };

export type SignInState =
  | { status: "idle" }
  | { status: "sent"; devUrl?: string }
  | { status: "invalid" };

/**
 * Request a sign-in link.
 *
 * Always reports "sent" for a syntactically valid address, whether or not the
 * account exists — an unauthenticated caller must not be able to use this to
 * enumerate Sara's client list. Only a malformed address gets a visible error.
 *
 * In development, when `RESEND_API_KEY` is unset, the link comes back in the
 * state so the flow is testable without a mail provider.
 */
// oxlint-disable-next-line react-doctor/server-auth-actions -- this IS the unauthenticated entry point; abuse is bounded by the per-IP rate limit, the enumeration-safe response, and the 20-minute single-use token.
export async function requestSignInLink(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  seedStudio();

  const email = String(formData.get("email") ?? "").trim();
  if (!EMAIL_RE.test(email) || email.length > 320) return { status: "invalid" };

  const requestHeaders = await headers();
  const forwarded = requestHeaders.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0].trim() ?? "unknown";
  if (!rateLimit(`studio:${ip}`, RATE)) return { status: "sent" };

  const user = findUserByEmail(email);
  if (!user) return { status: "sent" };

  // Build the link against the host that asked for it, so a dev server on any
  // port and a preview deployment both produce a link that actually works.
  const host = requestHeaders.get("host");
  const proto = requestHeaders.get("x-forwarded-proto") ?? "http";
  const origin = host ? `${proto}://${host}` : undefined;

  const token = createSignInToken(user.id);
  const { sent, url } = await sendSignInLink({
    to: user.email,
    name: user.name.split(" ")[0] || user.name,
    token,
    locale: user.locale ?? (await getUserLocale()),
    invite: user.status === "invited",
    origin,
  });

  return sent ? { status: "sent" } : { status: "sent", devUrl: url };
}

/** Drop the session cookie and return to the sign-in screen. */
// oxlint-disable-next-line react-doctor/server-auth-actions -- sign-out only clears the caller's own cookie; an unauthenticated call is a no-op.
export async function signOut(): Promise<void> {
  await endSession();
  redirect("/app/entrar");
}
