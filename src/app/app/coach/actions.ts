"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createSignInToken, requireCoach } from "@/lib/studio/auth";
import { sendSignInLink } from "@/lib/studio/email";
import {
  createClient,
  findClient,
  findUserByEmail,
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

/**
 * Origin of the current request, so an invite link points at the host Sara is
 * actually using (dev server, preview deployment or production) rather than the
 * hardcoded canonical URL.
 */
async function requestOrigin(): Promise<string | undefined> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host");
  if (!host) return undefined;
  return `${requestHeaders.get("x-forwarded-proto") ?? "http"}://${host}`;
}

function isPlanId(value: string): value is PlanId {
  return value in PLAN_IDS;
}

export type AddClientState =
  | { status: "idle" }
  | { status: "created"; name: string }
  | { status: "duplicate" }
  | { status: "invalid" };

/**
 * Add a client and immediately send her the sign-in invite — a roster entry
 * with no way in is useless, so the two happen as one step.
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
  if (findUserByEmail(email)) return { status: "duplicate" };

  const client = createClient({ email, name, plan, goals, injuries });

  const token = createSignInToken(client.id);
  await sendSignInLink({
    to: client.email,
    name: client.name.split(" ")[0] || client.name,
    token,
    locale: client.locale,
    invite: true,
    origin: await requestOrigin(),
  });

  revalidatePath("/app/coach/alunos");
  return { status: "created", name: client.name };
}

/** Profile fields the coach can edit in one form. Empty required fields are ignored, not blanked. */
export async function saveClient(formData: FormData): Promise<void> {
  await requireCoach();

  const clientId = String(formData.get("clientId") ?? "");
  if (!clientId) return;

  const name = String(formData.get("name") ?? "").trim();
  const plan = String(formData.get("plan") ?? "");
  const sessionsLeft = Number(formData.get("sessionsLeft") ?? 0);

  updateClient(clientId, {
    ...(name ? { name } : {}),
    ...(isPlanId(plan) ? { plan } : {}),
    goals: String(formData.get("goals") ?? ""),
    injuries: String(formData.get("injuries") ?? ""),
    sessionsLeft: Number.isFinite(sessionsLeft) ? sessionsLeft : 0,
  });

  revalidatePath(`/app/coach/alunos/${clientId}`);
  revalidatePath("/app/coach/alunos");
}

/** Private notes save independently of the profile form — one field, one action. */
export async function saveNotes(formData: FormData): Promise<void> {
  await requireCoach();

  const clientId = String(formData.get("clientId") ?? "");
  if (!clientId) return;

  updateClient(clientId, { notes: String(formData.get("notes") ?? "") });
  revalidatePath(`/app/coach/alunos/${clientId}`);
}

/** Archive or reactivate a client account. */
export async function setStatus(formData: FormData): Promise<void> {
  await requireCoach();

  const clientId = String(formData.get("clientId") ?? "");
  const status = String(formData.get("status") ?? "") as UserStatus;
  if (!clientId || (status !== "active" && status !== "archived")) return;

  setClientStatus(clientId, status);
  revalidatePath(`/app/coach/alunos/${clientId}`);
  revalidatePath("/app/coach/alunos");
}

/** Mint a fresh sign-in token and resend the invite email. */
export async function resendInvite(formData: FormData): Promise<void> {
  await requireCoach();

  const clientId = String(formData.get("clientId") ?? "");
  const client = clientId ? findClient(clientId) : undefined;
  if (!client) return;

  const token = createSignInToken(client.id);
  await sendSignInLink({
    to: client.email,
    name: client.name.split(" ")[0] || client.name,
    token,
    locale: client.locale,
    invite: true,
    origin: await requestOrigin(),
  });

  revalidatePath(`/app/coach/alunos/${clientId}`);
}
