import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import {
  assertCanAddClient,
  billingRow,
  countBillableClients,
  DEFAULT_INCLUDED,
  DEFAULT_PRICE_CENTS,
  ensureBillingRow,
  extraSeats,
  monthlyCents,
  requireAdmin,
  snapshot,
  viewerIsAdmin,
} from "./model/billing";
import { requireCoach, requireViewer } from "./model/authz";
import { mapUser } from "./model/shape";

const billingStatus = v.union(
  v.literal("none"),
  v.literal("incomplete"),
  v.literal("active"),
  v.literal("past_due"),
  v.literal("canceled"),
);

const snapshotValidator = v.object({
  coachId: v.string(),
  exempt: v.boolean(),
  includedClients: v.number(),
  pricePerClientCents: v.number(),
  status: billingStatus,
  currentPeriodEnd: v.union(v.null(), v.number()),
  activeCount: v.number(),
  extraSeats: v.number(),
  monthlyCents: v.number(),
  hasStripe: v.boolean(),
});

const userShape = v.object({
  id: v.string(),
  email: v.string(),
  name: v.string(),
  role: v.union(v.literal("coach"), v.literal("client")),
  locale: v.union(v.literal("pt"), v.literal("en")),
  status: v.union(v.literal("invited"), v.literal("active"), v.literal("archived")),
  createdAt: v.number(),
});

export { assertCanAddClient };

export const isAdmin = query({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => viewerIsAdmin(ctx),
});

/** This coach's bill: seats, included, next invoice estimate. */
export const mine = query({
  args: {},
  returns: v.union(snapshotValidator, v.null()),
  handler: async (ctx) => {
    const user = await requireViewer(ctx);
    if (user.role !== "coach") return null;
    const row = await billingRow(ctx, user._id);
    const activeCount = await countBillableClients(ctx, user._id);
    if (row) return snapshot(row, activeCount);
    return {
      coachId: user._id as string,
      exempt: false,
      includedClients: DEFAULT_INCLUDED,
      pricePerClientCents: DEFAULT_PRICE_CENTS,
      status: "none" as const,
      currentPeriodEnd: null,
      activeCount,
      extraSeats: extraSeats(activeCount, DEFAULT_INCLUDED),
      monthlyCents: monthlyCents(extraSeats(activeCount, DEFAULT_INCLUDED), DEFAULT_PRICE_CENTS),
      hasStripe: false,
    };
  },
});

export const overview = query({
  args: {},
  returns: v.object({
    coaches: v.number(),
    clients: v.number(),
    clientsActive: v.number(),
    payingCoaches: v.number(),
    mrrCents: v.number(),
  }),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const coaches = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "coach"))
      .collect();
    const clients = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "client"))
      .collect();
    let mrr = 0;
    let paying = 0;
    for (const coach of coaches) {
      const row = await billingRow(ctx, coach._id);
      const activeCount = await countBillableClients(ctx, coach._id);
      const included = row?.includedClients ?? DEFAULT_INCLUDED;
      const price = row?.pricePerClientCents ?? DEFAULT_PRICE_CENTS;
      const exempt = row?.exempt ?? false;
      const extra = exempt ? 0 : extraSeats(activeCount, included);
      const cents = monthlyCents(extra, price);
      mrr += cents;
      if (cents > 0) paying += 1;
    }
    return {
      coaches: coaches.length,
      clients: clients.length,
      clientsActive: clients.filter((client) => client.status !== "archived").length,
      payingCoaches: paying,
      mrrCents: mrr,
    };
  },
});

export const listCoaches = query({
  args: {},
  returns: v.array(
    v.object({
      id: v.string(),
      email: v.string(),
      name: v.string(),
      role: v.union(v.literal("coach"), v.literal("client")),
      locale: v.union(v.literal("pt"), v.literal("en")),
      status: v.union(v.literal("invited"), v.literal("active"), v.literal("archived")),
      createdAt: v.number(),
      activeCount: v.number(),
      exempt: v.boolean(),
      includedClients: v.number(),
      pricePerClientCents: v.number(),
      extraSeats: v.number(),
      monthlyCents: v.number(),
      billingStatus: billingStatus,
    }),
  ),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const coaches = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "coach"))
      .collect();
    const rows = [];
    for (const coach of coaches) {
      const row = await billingRow(ctx, coach._id);
      const activeCount = await countBillableClients(ctx, coach._id);
      const included = row?.includedClients ?? DEFAULT_INCLUDED;
      const price = row?.pricePerClientCents ?? DEFAULT_PRICE_CENTS;
      const exempt = row?.exempt ?? false;
      const extra = exempt ? 0 : extraSeats(activeCount, included);
      rows.push({
        ...mapUser(coach),
        activeCount,
        exempt,
        includedClients: included,
        pricePerClientCents: price,
        extraSeats: extra,
        monthlyCents: monthlyCents(extra, price),
        billingStatus: row?.status ?? "none",
      });
    }
    rows.sort((a, b) => a.name.localeCompare(b.name, "pt", { sensitivity: "base" }));
    return rows;
  },
});

export const coachDetail = query({
  args: { coachId: v.id("users") },
  returns: v.union(
    v.null(),
    v.object({
      coach: userShape,
      clients: v.array(userShape),
      activeCount: v.number(),
      exempt: v.boolean(),
      includedClients: v.number(),
      pricePerClientCents: v.number(),
      extraSeats: v.number(),
      monthlyCents: v.number(),
      billingStatus: billingStatus,
      currentPeriodEnd: v.union(v.null(), v.number()),
      hasStripe: v.boolean(),
    }),
  ),
  handler: async (ctx, { coachId }) => {
    await requireAdmin(ctx);
    const coach = await ctx.db.get("users", coachId);
    if (!coach || coach.role !== "coach") return null;
    const row = await billingRow(ctx, coachId);
    const activeCount = await countBillableClients(ctx, coachId);
    const included = row?.includedClients ?? DEFAULT_INCLUDED;
    const price = row?.pricePerClientCents ?? DEFAULT_PRICE_CENTS;
    const exempt = row?.exempt ?? false;
    const extra = exempt ? 0 : extraSeats(activeCount, included);
    const profiles = await ctx.db
      .query("clientProfiles")
      .withIndex("by_coach", (q) => q.eq("coachId", coachId))
      .collect();
    const clients = [];
    for (const profile of profiles) {
      const user = await ctx.db.get("users", profile.userId);
      if (user) clients.push(mapUser(user));
    }
    clients.sort((a, b) => a.name.localeCompare(b.name, "pt", { sensitivity: "base" }));
    return {
      coach: mapUser(coach),
      clients,
      activeCount,
      exempt,
      includedClients: included,
      pricePerClientCents: price,
      extraSeats: extra,
      monthlyCents: monthlyCents(extra, price),
      billingStatus: row?.status ?? "none",
      currentPeriodEnd: row?.currentPeriodEnd ?? null,
      hasStripe: row?.stripeSubscriptionId != null,
    };
  },
});

export const listClients = query({
  args: {},
  returns: v.array(
    v.object({
      id: v.string(),
      email: v.string(),
      name: v.string(),
      role: v.union(v.literal("coach"), v.literal("client")),
      locale: v.union(v.literal("pt"), v.literal("en")),
      status: v.union(v.literal("invited"), v.literal("active"), v.literal("archived")),
      createdAt: v.number(),
      coachId: v.union(v.null(), v.string()),
      coachName: v.union(v.null(), v.string()),
      plan: v.union(v.null(), v.literal("personal"), v.literal("online"), v.literal("specialty")),
    }),
  ),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const clients = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "client"))
      .collect();
    const rows = [];
    for (const client of clients) {
      const profile = await ctx.db
        .query("clientProfiles")
        .withIndex("by_user", (q) => q.eq("userId", client._id))
        .unique();
      let coachName: string | null = null;
      let coachId: string | null = null;
      if (profile?.coachId) {
        const coach = await ctx.db.get("users", profile.coachId);
        coachName = coach?.name ?? null;
        coachId = profile.coachId;
      }
      rows.push({
        ...mapUser(client),
        coachId,
        coachName,
        plan: profile?.plan ?? null,
      });
    }
    rows.sort((a, b) => a.name.localeCompare(b.name, "pt", { sensitivity: "base" }));
    return rows;
  },
});

export const updateCoachBilling = mutation({
  args: {
    coachId: v.id("users"),
    exempt: v.boolean(),
    includedClients: v.number(),
    pricePerClientCents: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const coach = await ctx.db.get("users", args.coachId);
    if (!coach || coach.role !== "coach") throw new ConvexError({ code: "NOT_FOUND" });
    const included = Math.max(0, Math.trunc(args.includedClients));
    const price = Math.max(0, Math.trunc(args.pricePerClientCents));
    const row = await ensureBillingRow(ctx, coach);
    await ctx.db.patch("coachBilling", row._id, {
      exempt: args.exempt,
      includedClients: included,
      pricePerClientCents: price,
    });
    await ctx.scheduler.runAfter(0, internal.payments.syncCoachSeats, { coachId: args.coachId });
    return null;
  },
});

export const scheduleSeatSync = internalMutation({
  args: { coachId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, { coachId }) => {
    await ctx.scheduler.runAfter(0, internal.payments.syncCoachSeats, { coachId });
    return null;
  },
});

export const getBillingInternal = internalQuery({
  args: { coachId: v.id("users") },
  handler: async (ctx, { coachId }) => {
    const coach = await ctx.db.get("users", coachId);
    if (!coach) return null;
    const row = await billingRow(ctx, coachId);
    const activeCount = await countBillableClients(ctx, coachId);
    return {
      coach: { id: coach._id as string, email: coach.email, name: coach.name },
      row,
      activeCount,
    };
  },
});

export const applyStripeCustomer = internalMutation({
  args: {
    coachId: v.id("users"),
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.union(v.null(), v.string()),
    stripeSubscriptionItemId: v.union(v.null(), v.string()),
    stripePriceId: v.union(v.null(), v.string()),
    status: billingStatus,
    currentPeriodEnd: v.union(v.null(), v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const coach = await ctx.db.get("users", args.coachId);
    if (!coach) return null;
    const row = await ensureBillingRow(ctx, coach);
    await ctx.db.patch("coachBilling", row._id, {
      stripeCustomerId: args.stripeCustomerId,
      stripeSubscriptionId: args.stripeSubscriptionId,
      stripeSubscriptionItemId: args.stripeSubscriptionItemId,
      stripePriceId: args.stripePriceId,
      status: args.status,
      currentPeriodEnd: args.currentPeriodEnd,
    });
    return null;
  },
});

export const applyStripeByCustomer = internalMutation({
  args: {
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.union(v.null(), v.string()),
    stripeSubscriptionItemId: v.union(v.null(), v.string()),
    stripePriceId: v.union(v.null(), v.string()),
    status: billingStatus,
    currentPeriodEnd: v.union(v.null(), v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("coachBilling")
      .withIndex("by_stripe_customer", (q) => q.eq("stripeCustomerId", args.stripeCustomerId))
      .unique();
    if (!row) return null;
    await ctx.db.patch("coachBilling", row._id, {
      stripeSubscriptionId: args.stripeSubscriptionId,
      stripeSubscriptionItemId: args.stripeSubscriptionItemId,
      stripePriceId: args.stripePriceId,
      status: args.status,
      currentPeriodEnd: args.currentPeriodEnd,
    });
    return null;
  },
});

export const claimStripeEvent = internalMutation({
  args: { eventId: v.string() },
  returns: v.boolean(),
  handler: async (ctx, { eventId }) => {
    const existing = await ctx.db
      .query("stripeEvents")
      .withIndex("by_event", (q) => q.eq("eventId", eventId))
      .unique();
    if (existing) return false;
    await ctx.db.insert("stripeEvents", { eventId });
    return true;
  },
});

export const billingBySubscription = internalQuery({
  args: { stripeSubscriptionId: v.string() },
  handler: async (ctx, { stripeSubscriptionId }) => {
    return await ctx.db
      .query("coachBilling")
      .withIndex("by_stripe_subscription", (q) =>
        q.eq("stripeSubscriptionId", stripeSubscriptionId),
      )
      .unique();
  },
});
