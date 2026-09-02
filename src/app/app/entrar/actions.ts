"use server";

import { ConvexError } from "convex/values";
import { api } from "@convex/_generated/api";
import { sm } from "@/lib/studio/convexServer";
import type { Role } from "@/lib/studio/types";

/**
 * The second half of signing up, and the invite flows. Each of these runs
 * *after* Better Auth has set the session cookie in the browser, so the
 * Convex call carries a session — which is how `users.completeSignup` knows
 * which login to attach the account to.
 *
 * Refusals come back as codes, not thrown: the form decides what to say.
 */

export type AuthFailure =
  | "EMAIL_TAKEN"
  | "INVITE_PENDING"
  | "INVITE_INVALID"
  | "INVITE_EMAIL_MISMATCH"
  | "INVITE_ALREADY_CLAIMED"
  | "ALREADY_COACHED"
  | "COACH_CANNOT_ACCEPT"
  | "UNKNOWN";

export type RegisterResult = { ok: true; role: Role } | { ok: false; code: AuthFailure };

function failureCode(error: unknown): AuthFailure {
  if (error instanceof ConvexError && error.data && typeof error.data === "object" && "code" in error.data) {
    const code = error.data.code;
    if (typeof code === "string") return code as AuthFailure;
  }
  return "UNKNOWN";
}

/** Write the studio account for the session that just signed up. */
export async function registerAccount(input: {
  role: Role;
  inviteToken?: string;
}): Promise<RegisterResult> {
  try {
    const user = await sm(api.users.completeSignup, {
      role: input.role,
      inviteToken: input.inviteToken,
    });
    return { ok: true, role: user.role };
  } catch (error) {
    return { ok: false, code: failureCode(error) };
  }
}

/** A signed-in client attaches the coach who invited them. */
export async function acceptInvite(token: string): Promise<{ ok: true } | { ok: false; code: AuthFailure }> {
  try {
    await sm(api.users.acceptInvite, { token });
    return { ok: true };
  } catch (error) {
    return { ok: false, code: failureCode(error) };
  }
}

/** Mail the pending invite for an address again. Always answers the same. */
export async function resendPendingInvite(email: string): Promise<void> {
  await sm(api.users.resendPendingInvite, { email }).catch(() => undefined);
}
