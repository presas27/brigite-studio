import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { sq, sm } from "@/lib/studio/convexServer";
import type { Lead, LeadSource, LeadStatus, PlanId } from "./types";

/**
 * Leads — people who asked about training and are not clients yet.
 *
 * Real enquiries fill this now: the contact form on brigitestudio.com writes a
 * lead alongside the mail it sends (`src/app/actions/contact.ts`), which is why
 * the stand-in enquiries this module used to seed are gone. What the coach reads
 * on the pipeline screen is what people actually wrote.
 *
 * Nothing here holds logic — the queries and the authorization live in
 * `convex/leads.ts`. This file exists so the pages keep importing the names they
 * always imported; the only difference is the `Promise`. The one function worth
 * knowing about is `createLead`, which reaches the deliberately unauthenticated
 * `leads:capture` mutation; the long comment explaining why that one is open is
 * on the Convex side, with the code it guards.
 *
 * Ids are `string` up here and branded `Id<"…">` down there, so the mutation
 * wrappers cast at the boundary; `v.id(…)` in their `args` is what actually
 * checks them. The read of a single lead is the exception, for the reason given
 * on `findLead`.
 */

/** Newest first, optionally narrowed to one column of the pipeline. */
export async function listLeads(status?: LeadStatus): Promise<Lead[]> {
  return sq(api.leads.list, { status });
}

/**
 * A lead by id, or `undefined`.
 *
 * `undefined` covers both "no such lead" and "that is not a lead id at all" —
 * the id reaches this from a form field, so a stale or tampered value has to
 * read as a miss rather than as a crash, the way the `WHERE id = ?` this
 * replaces did. The query normalizes the id instead of validating it for that
 * reason, so nothing has to be caught here.
 */
export async function findLead(leadId: string): Promise<Lead | undefined> {
  return (await sq(api.leads.find, { leadId })) ?? undefined;
}

/** One count per status, zeros included, for the filter row. */
export async function leadCounts(): Promise<Record<LeadStatus, number>> {
  return sq(api.leads.counts, {});
}

/** The door the website will knock on. Everything else here is the coach side. */
export async function createLead(input: {
  name: string;
  email: string;
  phone?: string;
  message?: string;
  interest?: PlanId | null;
  source?: LeadSource;
}): Promise<string> {
  return sm(api.leads.capture, {
    name: input.name,
    email: input.email,
    phone: input.phone,
    message: input.message,
    interest: input.interest ?? null,
    source: input.source,
  });
}

export async function setLeadStatus(leadId: string, status: LeadStatus): Promise<void> {
  await sm(api.leads.setStatus, { leadId: leadId as Id<"leads">, status });
}

export async function setLeadNotes(leadId: string, notes: string): Promise<void> {
  await sm(api.leads.setNotes, { leadId: leadId as Id<"leads">, notes });
}

/** Mark a lead as converted and remember which account it became. */
export async function linkLeadToClient(leadId: string, clientId: string): Promise<void> {
  await sm(api.leads.linkToClient, {
    leadId: leadId as Id<"leads">,
    clientId: clientId as Id<"users">,
  });
}
