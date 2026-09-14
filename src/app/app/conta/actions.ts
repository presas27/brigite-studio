"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { hasLocale } from "@/i18n/config";
import { setUserLocale } from "@/i18n/locale";
import { currentUser, requireCoach } from "@/lib/studio/auth";
import { startCheckout, startPortal } from "@/lib/studio/billing";
import {
  changePassword,
  leaveCoach,
  setUserLocalePreference,
  setUserName,
} from "@/lib/studio/users";

export type SaveAccountState = { ok: boolean };

/**
 * Save the signed-in user's own details. Scoped to the session and nothing else
 * — there is no id in the form and none in the Convex mutation either, so this
 * action cannot be pointed at somebody else's account.
 *
 * The locale is written twice on purpose: to the user row, which is what the
 * emailed invite reads, and to the cookie, which is what the next page render
 * reads.
 *
 * Returns state instead of redirecting to `?guardado=1`: the page reads the
 * result to leave edit mode and show the confirmation, and a settings screen
 * that rewrites its own URL on every save is a screen you cannot reload.
 */
export async function saveAccount(
  _prev: SaveAccountState,
  formData: FormData,
): Promise<SaveAccountState> {
  const user = await currentUser();
  if (!user) redirect("/app/entrar");

  const name = String(formData.get("name") ?? "").trim();
  if (name && name.length <= 200 && name !== user.name) await setUserName(name);

  const locale = String(formData.get("locale") ?? "");
  if (hasLocale(locale) && locale !== user.locale) {
    await setUserLocalePreference(locale);
    await setUserLocale(locale);
  }

  refresh();
  return { ok: true };
}

export type PasswordState = { status: "idle" | "ok" | "tooShort" | "failed" };

/** Change your own password. Better Auth checks the current one on the deployment. */
export async function changePasswordAction(
  _prev: PasswordState,
  formData: FormData,
): Promise<PasswordState> {
  const user = await currentUser();
  if (!user) redirect("/app/entrar");

  const current = String(formData.get("currentPassword") ?? "");
  const next = String(formData.get("newPassword") ?? "");
  if (next.length < 8 || next.length > 200) return { status: "tooShort" };

  const changed = await changePassword(current, next)
    .then(() => true)
    .catch(() => false);
  return { status: changed ? "ok" : "failed" };
}

/** A client leaves their coach and trains alone. The history stays. */
export async function leaveCoachAction(): Promise<void> {
  const user = await currentUser();
  if (!user) redirect("/app/entrar");
  if (user.role === "client") await leaveCoach();
  refresh();
}

/** Stripe Checkout for the first extra seat. Redirects off-site. */
export async function startBillingCheckout(): Promise<void> {
  await requireCoach();
  const url = await startCheckout();
  redirect(url);
}

/** Stripe Customer Portal for card and invoices. */
export async function startBillingPortal(): Promise<void> {
  await requireCoach();
  const url = await startPortal();
  redirect(url);
}
