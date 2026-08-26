"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireCoach } from "@/lib/studio/auth";
import { sendInvite } from "@/lib/studio/email";
import { findLead, linkLeadToClient, setLeadNotes, setLeadStatus } from "@/lib/studio/leads";
import { requestOrigin } from "@/lib/studio/origin";
import { createClient, findUserByEmail } from "@/lib/studio/users";
import type { LeadStatus } from "@/lib/studio/types";

/**
 * Coach-side actions for the leads pipeline. Every export starts with
 * `requireCoach()` — a lead's email address is the sort of thing that must
 * never be readable or writable from a client session.
 */

const LEADS_PATH = "/app/coach/leads";

const STATUSES: LeadStatus[] = ["new", "talking", "won", "lost"];

export async function setLeadStatusAction(leadId: string, status: LeadStatus): Promise<void> {
  await requireCoach();
  if (!leadId || !STATUSES.includes(status)) return;
  await setLeadStatus(leadId, status);
  revalidatePath(LEADS_PATH);
}

export async function saveLeadNotesAction(formData: FormData): Promise<void> {
  await requireCoach();
  const leadId = String(formData.get("leadId") ?? "").trim();
  if (!leadId) return;
  await setLeadNotes(leadId, String(formData.get("notes") ?? ""));
  revalidatePath(LEADS_PATH);
}

/**
 * Turn a lead into a client: create the account, mail the invite, mark the lead
 * won, and land on the new client's page — the enquiry and the roster entry are
 * the same person, so this is one step, not four.
 *
 * Their own words become the goals note; nobody describes what they want better
 * than the person who wrote in.
 */
export async function convertLeadAction(formData: FormData): Promise<void> {
  await requireCoach();
  const leadId = String(formData.get("leadId") ?? "").trim();
  const lead = leadId ? await findLead(leadId) : undefined;
  if (!lead) return;

  const existing = await findUserByEmail(lead.email);
  if (existing) {
    await linkLeadToClient(lead.id, existing.id);
    revalidatePath(LEADS_PATH);
    redirect(`/app/coach/alunos/${existing.id}`);
  }

  const client = await createClient({
    email: lead.email,
    name: lead.name,
    plan: lead.interest ?? "online",
    goals: lead.message,
  });

  await sendInvite({
    to: client.email,
    name: client.name.split(" ")[0] || client.name,
    locale: client.locale,
    origin: await requestOrigin(),
  });

  await linkLeadToClient(lead.id, client.id);
  revalidatePath(LEADS_PATH);
  revalidatePath("/app/coach/alunos");
  redirect(`/app/coach/alunos/${client.id}`);
}
