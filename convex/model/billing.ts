import { ConvexError } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { requireViewer, viewer } from "./authz";

import { DEFAULT_INCLUDED, DEFAULT_PRICE_CENTS, extraSeats, monthlyCents } from "../lib/seats";

export { DEFAULT_INCLUDED, DEFAULT_PRICE_CENTS, extraSeats, monthlyCents };

type Ctx = QueryCtx | MutationCtx;

export const SARA_EXEMPT_EMAIL = "hello@brigitestudio.com";

export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string): boolean {
  return adminEmails().includes(email.trim().toLowerCase());
}

export async function requireAdmin(ctx: Ctx): Promise<Doc<"users">> {
  const user = await requireViewer(ctx);
  if (!isAdminEmail(user.email)) throw new ConvexError({ code: "FORBIDDEN" });
  return user;
}

export async function viewerIsAdmin(ctx: Ctx): Promise<boolean> {
  const user = await viewer(ctx);
  return user != null && isAdminEmail(user.email);
}

/** Non-archived clients whose profile names this coach. Invited still occupy a seat. */
export async function countBillableClients(ctx: Ctx, coachId: Id<"users">): Promise<number> {
  const profiles = await ctx.db
    .query("clientProfiles")
    .withIndex("by_coach", (q) => q.eq("coachId", coachId))
    .collect();
  const users = await Promise.all(profiles.map((profile) => ctx.db.get("users", profile.userId)));
  let count = 0;
  for (const user of users) {
    if (user && user.status !== "archived") count += 1;
  }
  return count;
}

export async function billingRow(
  ctx: Ctx,
  coachId: Id<"users">,
): Promise<Doc<"coachBilling"> | null> {
  return await ctx.db
    .query("coachBilling")
    .withIndex("by_coach", (q) => q.eq("coachId", coachId))
    .unique();
}

export async function ensureBillingRow(
  ctx: MutationCtx,
  coach: Doc<"users">,
): Promise<Doc<"coachBilling">> {
  const existing = await billingRow(ctx, coach._id);
  if (existing) return existing;
  const id = await ctx.db.insert("coachBilling", {
    coachId: coach._id,
    exempt: coach.email === SARA_EXEMPT_EMAIL,
    includedClients: DEFAULT_INCLUDED,
    pricePerClientCents: DEFAULT_PRICE_CENTS,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    stripeSubscriptionItemId: null,
    stripePriceId: null,
    status: "none",
    currentPeriodEnd: null,
  });
  const row = await ctx.db.get("coachBilling", id);
  if (!row) throw new Error("Billing row vanished after insert");
  return row;
}

export function snapshot(row: Doc<"coachBilling">, activeCount: number) {
  const extra = row.exempt ? 0 : extraSeats(activeCount, row.includedClients);
  return {
    coachId: row.coachId as string,
    exempt: row.exempt,
    includedClients: row.includedClients,
    pricePerClientCents: row.pricePerClientCents,
    status: row.status,
    currentPeriodEnd: row.currentPeriodEnd,
    activeCount,
    extraSeats: extra,
    monthlyCents: monthlyCents(extra, row.pricePerClientCents),
    hasStripe: row.stripeSubscriptionId != null && (row.status === "active" || row.status === "past_due"),
  };
}

/**
 * Adding one more student. Exempt coaches always pass. A coach already on an
 * active Stripe subscription passes — quantity is synced after the write.
 * Crossing included seats without a card throws `BILLING_REQUIRED`.
 */
export async function assertCanAddClient(ctx: MutationCtx, coach: Doc<"users">): Promise<void> {
  const row = await ensureBillingRow(ctx, coach);
  if (row.exempt) return;
  const active = await countBillableClients(ctx, coach._id);
  const extra = extraSeats(active + 1, row.includedClients);
  if (extra <= 0) return;
  if (row.status === "active") return;
  throw new ConvexError({ code: "BILLING_REQUIRED" });
}
