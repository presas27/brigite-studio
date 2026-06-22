import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Timing trap for the contact form. A short HMAC-signed token is rendered
 * server-side with the page; on submit we re-verify it and measure how long
 * the form sat on screen. Real people take seconds; bots post in milliseconds
 * or replay a stale token. Both fail here.
 *
 * The token is just a render timestamp plus a signature, so it leaks nothing
 * and needs no storage. The signing key is server-only — never shipped to the
 * client — and falls back to RESEND_API_KEY so no extra env var is required.
 */

const MIN_FILL_MS = 2_000; // faster than a human could read + type → bot
const MAX_AGE_MS = 2 * 60 * 60 * 1_000; // 2h: stale token / replay

function secret(): string {
  return (
    process.env.CONTACT_FORM_SECRET ??
    process.env.RESEND_API_KEY ??
    "brigite-studio-dev-fallback-secret"
  );
}

function sign(issuedAt: string): string {
  return createHmac("sha256", secret()).update(issuedAt).digest("hex");
}

/** Issue a fresh token. Call at render time, server-side only. */
export function createFormToken(now: number = Date.now()): string {
  const issuedAt = String(now);
  return `${issuedAt}.${sign(issuedAt)}`;
}

/**
 * Verify a token: signature must match and the form must have been on screen
 * for a believable amount of time. Returns `ok: false` for anything off.
 */
export function verifyFormToken(
  token: unknown,
  now: number = Date.now(),
): { ok: boolean; ageMs: number } {
  if (typeof token !== "string") return { ok: false, ageMs: 0 };

  const dot = token.indexOf(".");
  if (dot <= 0) return { ok: false, ageMs: 0 };

  const issuedAt = token.slice(0, dot);
  const provided = token.slice(dot + 1);
  if (!/^\d+$/.test(issuedAt)) return { ok: false, ageMs: 0 };

  const expected = sign(issuedAt);
  const a = Buffer.from(provided, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, ageMs: 0 };
  }

  const ageMs = now - Number(issuedAt);
  const ok = ageMs >= MIN_FILL_MS && ageMs <= MAX_AGE_MS;
  return { ok, ageMs };
}
