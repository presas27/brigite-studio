"use server";

import { ConvexError } from "convex/values";
import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { requireCoach } from "@/lib/studio/auth";
import { findLead, linkLeadToClient, setLeadNotes, setLeadStatus } from "@/lib/studio/leads";
import { createClient } from "@/lib/studio/users";
import type { LeadStatus } from "@/lib/studio/types";

/**
 * Coach-side actions for the leads pipeline. Every export starts with
 * `requireCoach()` — a lead's email address is the sort of thing that must
 * never be readable or writable from a client session.
 */

const STATUSES: LeadStatus[] = ["new", "talking", "won", "lost"];

export async function setLeadStatusAction(leadId: string, status: LeadStatus): Promise<void> {
  await requireCoach();
  if (!leadId || !STATUSES.includes(status)) return;
  await setLeadStatus(leadId, status);
  refresh();
}

export async function saveLeadNotesAction(formData: FormData): Promise<void> {
  await requireCoach();
  const leadId = String(formData.get("leadId") ?? "").trim();
  if (!leadId) return;
  await setLeadNotes(leadId, String(formData.get("notes") ?? ""));
  refresh();
}

/**
 * Turn a lead into a client: add them to the roster (the deployment mails the
 * invite), and land on the new client's page — the enquiry and the roster
 * entry are the same person, so this is one step, not four.
 *
 * Their own words become the goals note; nobody describes what they want better
 * than the person who wrote in. An address that already trains alone gets an
 * invite instead of an account, and the lead is linked once they accept.
 */
export async function convertLeadAction(formData: FormData): Promise<void> {
  await requireCoach();
  const leadId = String(formData.get("leadId") ?? "").trim();
  const lead = leadId ? await findLead(leadId) : undefined;
  if (!lead) return;

  let outcome;
  try {
    outcome = await createClient({
      email: lead.email,
      name: lead.name,
      plan: lead.interest ?? "online",
      goals: lead.message,
    });
  } catch (error) {
    // Already a coach, or already somebody's client: nothing to convert.
    if (error instanceof ConvexError) return;
    throw error;
  }

  if (outcome.kind === "created") {
    await linkLeadToClient(lead.id, outcome.clientId);
    refresh();
    redirect(`/app/coach/alunos/${outcome.clientId}`);
  }

  await setLeadStatus(lead.id, "talking");
  refresh();
  redirect("/app/coach/alunos");
}
