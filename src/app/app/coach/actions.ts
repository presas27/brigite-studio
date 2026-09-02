"use server";

import { ConvexError } from "convex/values";
import { refresh } from "next/cache";
import { requireCoach } from "@/lib/studio/auth";
import {
  createClient,
  findClient,
  resendInvite as resendInviteMutation,
  setClientStatus,
  updateClient,
} from "@/lib/studio/users";
import type { PlanId, UserStatus } from "@/lib/studio/types";

/**
 * Server actions for the coach's client roster and detail screen. Every
 * export starts with `requireCoach()` — there is no coach-scoped mutation a
 * client should ever be able to reach.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PLAN_IDS: Record<PlanId, true> = { personal: true, online: true, specialty: true };

function isPlanId(value: string): value is PlanId {
  return value in PLAN_IDS;
}

export type AddClientState =
  | { status: "idle" }
  | { status: "created"; name: string }
  | { status: "invited"; name: string }
  | { status: "duplicate" }
  | { status: "invalid" };

/**
 * Add a client and immediately send the invite — a roster entry nobody has been
 * told about is useless, so the two happen as one step.
 *
 * The invite no longer carries a way in. It says an account exists; the client
 * then asks for their own single-use link on `/app/entrar`, which is the only
 * shape of this that does not have the coach minting somebody else's session.
 */
export async function addClient(
  _prev: AddClientState,
  formData: FormData,
): Promise<AddClientState> {
  await requireCoach();

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const plan = String(formData.get("plan") ?? "");
  const goals = String(formData.get("goals") ?? "").trim();
  const injuries = String(formData.get("injuries") ?? "").trim();

  if (!name || name.length > 200 || !EMAIL_RE.test(email) || email.length > 320 || !isPlanId(plan)) {
    return { status: "invalid" };
  }

  try {
    // The deployment mints the invite and mails it: the token never passes
    // through here.
    const outcome = await createClient({ email, name, plan, goals, injuries });
    refresh();
    return outcome.kind === "created"
      ? { status: "created", name: outcome.name }
      : { status: "invited", name: outcome.name };
  } catch (error) {
    // An address that is a coach's, or already trains with somebody: the
    // roster says "already has an account" for both, which is all the coach
    // needs to know.
    if (error instanceof ConvexError) return { status: "duplicate" };
    throw error;
  }
}

/** Profile fields the coach can edit in one form. Empty required fields are ignored, not blanked. */
export async function saveClient(formData: FormData): Promise<void> {
  await requireCoach();

  const clientId = String(formData.get("clientId") ?? "");
  if (!clientId) return;

  const name = String(formData.get("name") ?? "").trim();
  const plan = String(formData.get("plan") ?? "");
  const sessionsLeft = Number(formData.get("sessionsLeft") ?? 0);

  await updateClient(clientId, {
    ...(name ? { name } : {}),
    ...(isPlanId(plan) ? { plan } : {}),
    goals: String(formData.get("goals") ?? ""),
    injuries: String(formData.get("injuries") ?? ""),
    sessionsLeft: Number.isFinite(sessionsLeft) ? sessionsLeft : 0,
  });

  refresh();
}

/** Private notes save independently of the profile form — one field, one action. */
export async function saveNotes(formData: FormData): Promise<void> {
  await requireCoach();

  const clientId = String(formData.get("clientId") ?? "");
  if (!clientId) return;

  await updateClient(clientId, { notes: String(formData.get("notes") ?? "") });
  refresh();
}

/** Archive or reactivate a client account. */
export async function setStatus(formData: FormData): Promise<void> {
  await requireCoach();

  const clientId = String(formData.get("clientId") ?? "");
  const status = String(formData.get("status") ?? "") as UserStatus;
  if (!clientId || (status !== "active" && status !== "archived")) return;

  await setClientStatus(clientId, status);
  refresh();
}

/** Send the invite again, with a fresh link. Only for a client who has not claimed theirs. */
export async function resendInvite(formData: FormData): Promise<void> {
  await requireCoach();

  const clientId = String(formData.get("clientId") ?? "");
  const client = clientId ? await findClient(clientId) : undefined;
  if (!client) return;

  await resendInviteMutation(client.id);
  refresh();
}
