import { v } from "convex/values";
import { internalQuery, mutation, query, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { requireClientAccess, requireCoach, requireViewer, viewer } from "./model/authz";
import { mapClient, mapUser } from "./model/shape";

/**
 * Accounts and the coaching profile attached to a client.
 *
 * There is exactly one coach (Sara); everyone else is a client. The studio does
 * not have self-registration: `convex/auth.ts` refuses to create a user, so the
 * only way an account comes into existence is `createClient` below or the
 * one-time provisioning in `convex/seed.ts` — both of them coach-gated.
 *
 * `email` is unique. SQLite enforced it with a constraint; here the mutation
 * checks the `email` index first, which is the same index Convex Auth uses to
 * find an account when a sign-in link is requested.
 */

const locale = v.union(v.literal("pt"), v.literal("en"));
const plan = v.union(v.literal("personal"), v.literal("online"), v.literal("specialty"));
const status = v.union(v.literal("invited"), v.literal("active"), v.literal("archived"));

/** A client and its profile, or nothing when either half is missing. */
async function clientWithProfile(ctx: QueryCtx, clientId: Id<"users">) {
  const user = await ctx.db.get("users", clientId);
  if (!user || user.role !== "client") return undefined;
  const profile = await ctx.db
    .query("clientProfiles")
    .withIndex("by_user", (q) => q.eq("userId", clientId))
    .unique();
  return profile ? mapClient(user, profile) : undefined;
}

/* --------------------------------------------------------------------- reads */

/** The signed-in account, or `null`. The one query every page starts from. */
export const me = query({
  args: {},
  handler: async (ctx) => {
    const user = await viewer(ctx);
    return user ? mapUser(user) : null;
  },
});

/** The signed-in account as a client, profile included. */
export const meAsClient = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireViewer(ctx);
    if (user.role !== "client") return null;
    return (await clientWithProfile(ctx, user._id)) ?? null;
  },
});

export const findClient = query({
  args: { clientId: v.id("users") },
  handler: async (ctx, { clientId }) => {
    await requireClientAccess(ctx, clientId);
    return (await clientWithProfile(ctx, clientId)) ?? null;
  },
});

/** Clients, alphabetical. Archived are excluded unless asked for. */
export const listClients = query({
  args: { includeArchived: v.optional(v.boolean()) },
  handler: async (ctx, { includeArchived }) => {
    await requireCoach(ctx);

    const users = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "client"))
      .collect();

    const clients = [];
    for (const user of users) {
      if (!includeArchived && user.status === "archived") continue;
      const profile = await ctx.db
        .query("clientProfiles")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .unique();
      // A client without a profile is a half-written account, not a client.
      if (profile) clients.push(mapClient(user, profile));
    }

    // `COLLATE NOCASE` in the SQL it replaces, and locale-aware on top: the
    // roster is Portuguese names, so "Ângela" belongs next to "Ana".
    return clients.sort((a, b) => a.name.localeCompare(b.name, "pt", { sensitivity: "base" }));
  },
});

/* -------------------------------------------------------------------- writes */

/** Create a client account plus its profile. The invite email comes after. */
export const createClient = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    plan,
    goals: v.optional(v.string()),
    injuries: v.optional(v.string()),
    locale: v.optional(locale),
  },
  handler: async (ctx, args) => {
    await requireCoach(ctx);

    const email = args.email.trim().toLowerCase();
    const existing = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .unique();
    if (existing) throw new Error("Já existe uma conta com esse email");

    const userId = await ctx.db.insert("users", {
      email,
      name: args.name.trim(),
      role: "client",
      locale: args.locale ?? "pt",
      status: "invited",
    });
    await ctx.db.insert("clientProfiles", {
      userId,
      plan: args.plan,
      goals: args.goals ?? "",
      injuries: args.injuries ?? "",
      notes: "",
      tags: [],
      sessionsLeft: 0,
      startedAt: Date.now(),
    });

    const client = await clientWithProfile(ctx, userId);
    if (!client) throw new Error("Client was created but could not be read back");
    return client;
  },
});

export const updateClient = mutation({
  args: {
    clientId: v.id("users"),
    patch: v.object({
      name: v.optional(v.string()),
      plan: v.optional(plan),
      goals: v.optional(v.string()),
      injuries: v.optional(v.string()),
      notes: v.optional(v.string()),
      tags: v.optional(v.array(v.string())),
      sessionsLeft: v.optional(v.number()),
    }),
  },
  handler: async (ctx, { clientId, patch }) => {
    await requireCoach(ctx);

    if (patch.name !== undefined) await ctx.db.patch("users", clientId, { name: patch.name.trim() });

    const profile = await ctx.db
      .query("clientProfiles")
      .withIndex("by_user", (q) => q.eq("userId", clientId))
      .unique();
    if (!profile) throw new Error("No such client");

    const fields: Partial<Doc<"clientProfiles">> = {};
    if (patch.plan !== undefined) fields.plan = patch.plan;
    if (patch.goals !== undefined) fields.goals = patch.goals;
    if (patch.injuries !== undefined) fields.injuries = patch.injuries;
    if (patch.notes !== undefined) fields.notes = patch.notes;
    if (patch.tags !== undefined) fields.tags = patch.tags;
    if (patch.sessionsLeft !== undefined) {
      fields.sessionsLeft = Math.max(0, Math.trunc(patch.sessionsLeft));
    }
    if (Object.keys(fields).length > 0) await ctx.db.patch("clientProfiles", profile._id, fields);
  },
});

export const setClientStatus = mutation({
  args: { clientId: v.id("users"), status },
  handler: async (ctx, args) => {
    await requireCoach(ctx);
    const client = await ctx.db.get("users", args.clientId);
    if (!client || client.role !== "client") throw new Error("No such client");
    await ctx.db.patch("users", args.clientId, { status: args.status });
  },
});

/** Burn one in-person session credit. Returns the remaining balance. */
export const consumeSession = mutation({
  args: { clientId: v.id("users") },
  handler: async (ctx, { clientId }) => {
    await requireCoach(ctx);
    const profile = await ctx.db
      .query("clientProfiles")
      .withIndex("by_user", (q) => q.eq("userId", clientId))
      .unique();
    if (!profile) throw new Error("No such client");

    const sessionsLeft = Math.max(0, profile.sessionsLeft - 1);
    await ctx.db.patch("clientProfiles", profile._id, { sessionsLeft });
    return sessionsLeft;
  },
});

/**
 * Rename yourself, and set your own language. Both sides edit these from the
 * account page, and neither may edit anyone else's — hence the identity coming
 * from the session rather than an id in the arguments.
 */
export const renameSelf = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const user = await requireViewer(ctx);
    const trimmed = name.trim();
    if (!trimmed) throw new Error("O nome não pode ficar vazio");
    await ctx.db.patch("users", user._id, { name: trimmed });
  },
});

export const setOwnLocale = mutation({
  args: { locale },
  handler: async (ctx, args) => {
    const user = await requireViewer(ctx);
    await ctx.db.patch("users", user._id, { locale: args.locale });
  },
});

/**
 * Does an address already have an account? Only Sara asks, and only while
 * turning a lead into a client — converting twice would otherwise create a
 * second account for the same person.
 */
export const findByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    await requireCoach(ctx);
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email.trim().toLowerCase()))
      .unique();
    return user ? mapUser(user) : null;
  },
});

/* ------------------------------------------------------------------ internal */

/**
 * Lookups the sign-in flow needs before there is a session to authorize with.
 * Internal, so they are reachable from `convex/auth.ts` and the provisioning
 * script and from nowhere else — an open `byEmail` would be a way to ask the
 * deployment whether an address is one of Sara's clients.
 */
export const byEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    return ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email.trim().toLowerCase()))
      .unique();
  },
});

export const theCoach = internalQuery({
  args: {},
  handler: async (ctx) => {
    return ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "coach"))
      .first();
  },
});
