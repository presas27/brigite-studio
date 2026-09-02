import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { authComponent, createAuth } from "./auth";
import {
  profileOf,
  requireClientAccess,
  requireCoach,
  requireCoachOf,
  requireViewer,
  viewer,
} from "./model/authz";
import { mapClient, mapUser } from "./model/shape";

/**
 * Accounts, the coaching profile attached to a client, and invitations.
 *
 * Two roles. A coach trains the clients who accepted their invite; a client
 * either has a coach or trains alone. Accounts come into existence three ways:
 *
 * - **Self sign-up** (`completeSignup`): Better Auth created the login, and
 *   this is where the studio row with the role is written.
 * - **A coach adds a client** (`createClient`): the studio row exists at once,
 *   with no login behind it, so the plan can be built before the person ever
 *   signs in. The emailed invite token is what lets them claim it.
 * - **A coach invites someone who already trains alone**: same mutation, but
 *   the row already exists — the invite attaches the coach when accepted.
 *
 * `email` is unique. SQLite enforced it with a constraint; here every insert
 * checks the `email` index first.
 */

const locale = v.union(v.literal("pt"), v.literal("en"));
const plan = v.union(v.literal("personal"), v.literal("online"), v.literal("specialty"));
const status = v.union(v.literal("invited"), v.literal("active"), v.literal("archived"));
const role = v.union(v.literal("coach"), v.literal("client"));

/** Fourteen days: long enough to find the mail, short enough to matter. */
const INVITE_TTL_MS = 14 * 24 * 60 * 60 * 1000;

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/** 32 random bytes as base64url: the whole proof an invite link carries. */
function mintToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** A client and its profile, or nothing when either half is missing. */
async function clientWithProfile(ctx: QueryCtx, clientId: Id<"users">) {
  const user = await ctx.db.get("users", clientId);
  if (!user || user.role !== "client") return undefined;
  const profile = await profileOf(ctx, clientId);
  return profile ? mapClient(user, profile) : undefined;
}

async function userByEmail(ctx: QueryCtx, email: string): Promise<Doc<"users"> | null> {
  return ctx.db
    .query("users")
    .withIndex("email", (q) => q.eq("email", email))
    .unique();
}

/** Revoke every pending invite for this client and mint a fresh one. */
async function issueInvite(
  ctx: MutationCtx,
  input: { coachId: Id<"users">; clientId: Id<"users">; email: string },
): Promise<Id<"invites">> {
  const pending = await ctx.db
    .query("invites")
    .withIndex("by_client", (q) => q.eq("clientId", input.clientId))
    .collect();
  for (const invite of pending) {
    if (invite.status === "pending") await ctx.db.patch("invites", invite._id, { status: "revoked" });
  }

  const inviteId = await ctx.db.insert("invites", {
    coachId: input.coachId,
    clientId: input.clientId,
    email: input.email,
    token: mintToken(),
    status: "pending",
    expiresAt: Date.now() + INVITE_TTL_MS,
  });
  await ctx.scheduler.runAfter(0, internal.email.deliverInvite, { inviteId });
  return inviteId;
}

/* --------------------------------------------------------------------- reads */

/**
 * The session as the app sees it. Three answers, because a Better Auth login
 * can exist a moment before its studio row does (see `completeSignup`):
 *
 * - `anonymous`: no session.
 * - `new`: a login with no studio account yet — send them to finish signing up.
 * - `ready`: an account.
 *
 * The one query every page starts from.
 */
export const me = query({
  args: {},
  handler: async (ctx) => {
    const user = await viewer(ctx);
    if (user) return { state: "ready" as const, user: mapUser(user) };

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { state: "anonymous" as const };

    // A row with this login but archived reads as signed out, not as new.
    const archived = await ctx.db
      .query("users")
      .withIndex("by_auth_id", (q) => q.eq("authId", identity.subject))
      .unique();
    if (archived) return { state: "anonymous" as const };

    return {
      state: "new" as const,
      email: typeof identity.email === "string" ? identity.email : "",
      name: typeof identity.name === "string" ? identity.name : "",
    };
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

/** The coach of the signed-in client, for the account page. `null` when training alone. */
export const myCoach = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireViewer(ctx);
    if (user.role !== "client") return null;
    const profile = await profileOf(ctx, user._id);
    if (!profile?.coachId) return null;
    const coach = await ctx.db.get("users", profile.coachId);
    return coach ? mapUser(coach) : null;
  },
});

export const findClient = query({
  args: { clientId: v.id("users") },
  handler: async (ctx, { clientId }) => {
    await requireClientAccess(ctx, clientId);
    return (await clientWithProfile(ctx, clientId)) ?? null;
  },
});

/** This coach's clients, alphabetical. Archived are excluded unless asked for. */
export const listClients = query({
  args: { includeArchived: v.optional(v.boolean()) },
  handler: async (ctx, { includeArchived }) => {
    const coach = await requireCoach(ctx);

    const profiles = await ctx.db
      .query("clientProfiles")
      .withIndex("by_coach", (q) => q.eq("coachId", coach._id))
      .collect();

    const clients = [];
    for (const profile of profiles) {
      const user = await ctx.db.get("users", profile.userId);
      if (!user || user.role !== "client") continue;
      if (!includeArchived && user.status === "archived") continue;
      clients.push(mapClient(user, profile));
    }

    // `COLLATE NOCASE` in the SQL it replaces, and locale-aware on top: the
    // roster is Portuguese names, so "Ângela" belongs next to "Ana".
    return clients.sort((a, b) => a.name.localeCompare(b.name, "pt", { sensitivity: "base" }));
  },
});

/* ------------------------------------------------------------------ sign-up */

/**
 * Second half of signing up: Better Auth has the login, this writes the
 * account. Idempotent — a second call from the same session returns the row.
 *
 * With an invite token, the session claims the account the coach prepared (or
 * attaches the coach to an account that already exists) — the token is the
 * proof, and the login's address must match the invite's.
 *
 * Without one, an address a coach has already added is refused with
 * `INVITE_PENDING`: the studio row holds that coach's plan for this person,
 * and a password chosen by whoever typed the address first is not proof they
 * own it. The invite email is.
 */
export const completeSignup = mutation({
  args: {
    role,
    locale: v.optional(locale),
    inviteToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await viewer(ctx);
    if (existing) return mapUser(existing);

    const login = await authComponent.getAuthUser(ctx);
    const email = normalizeEmail(login.email);
    const name = login.name.trim() || email;

    if (args.inviteToken) {
      const invite = await ctx.db
        .query("invites")
        .withIndex("by_token", (q) => q.eq("token", args.inviteToken!))
        .unique();
      if (!invite || invite.status !== "pending" || invite.expiresAt < Date.now()) {
        throw new ConvexError({ code: "INVITE_INVALID" });
      }
      if (invite.email !== email) throw new ConvexError({ code: "INVITE_EMAIL_MISMATCH" });

      const invited = await ctx.db.get("users", invite.clientId);
      const profile = invited ? await profileOf(ctx, invited._id) : null;
      if (!invited || !profile) throw new ConvexError({ code: "INVITE_INVALID" });
      if (invited.authId) throw new ConvexError({ code: "INVITE_ALREADY_CLAIMED" });

      await ctx.db.patch("users", invited._id, { authId: login._id, name, status: "active" });
      await ctx.db.patch("clientProfiles", profile._id, { coachId: invite.coachId });
      await ctx.db.patch("invites", invite._id, { status: "accepted" });

      const user = await ctx.db.get("users", invited._id);
      return mapUser(user!);
    }

    const taken = await userByEmail(ctx, email);
    if (taken) {
      throw new ConvexError({ code: taken.authId ? "EMAIL_TAKEN" : "INVITE_PENDING" });
    }

    const userId = await ctx.db.insert("users", {
      authId: login._id,
      email,
      name,
      role: args.role,
      locale: args.locale ?? "pt",
      status: "active",
    });
    if (args.role === "client") {
      await ctx.db.insert("clientProfiles", {
        userId,
        coachId: null,
        plan: "online",
        goals: "",
        injuries: "",
        notes: "",
        tags: [],
        sessionsLeft: 0,
        startedAt: Date.now(),
      });
    }

    const user = await ctx.db.get("users", userId);
    return mapUser(user!);
  },
});

/**
 * Send the invite for an address whose sign-up was refused with
 * `INVITE_PENDING`. Public and unauthenticated by design: it mails the
 * address on file and nothing else, so the only person it can help is the
 * one who owns that mailbox. Answers the same whether or not the address is
 * known — the form must not be a way to ask who a coach's clients are.
 */
export const resendPendingInvite = mutation({
  args: { email: v.string() },
  handler: async (ctx, args): Promise<null> => {
    const email = normalizeEmail(args.email);
    const user = await userByEmail(ctx, email);
    if (!user || user.authId || user.role !== "client") return null;
    const profile = await profileOf(ctx, user._id);
    if (!profile?.coachId) return null;

    // Throttle: one fresh invite per hour per address, whoever asks.
    const latest = await ctx.db
      .query("invites")
      .withIndex("by_client", (q) => q.eq("clientId", user._id))
      .order("desc")
      .first();
    if (latest && latest._creationTime > Date.now() - 60 * 60 * 1000) return null;

    await issueInvite(ctx, { coachId: profile.coachId, clientId: user._id, email });
    return null;
  },
});

/* ------------------------------------------------------------------ invites */

/**
 * What an invite link shows before anyone signs in. Public: the token is the
 * secret, and a link that cannot say who sent it is a link nobody trusts.
 */
export const inviteByToken = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const invite = await ctx.db
      .query("invites")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (!invite) return null;

    const [coach, client] = await Promise.all([
      ctx.db.get("users", invite.coachId),
      ctx.db.get("users", invite.clientId),
    ]);
    if (!coach || !client) return null;

    const state =
      invite.status === "accepted"
        ? ("accepted" as const)
        : invite.status === "revoked" || invite.expiresAt < Date.now()
          ? ("expired" as const)
          : ("pending" as const);

    return {
      state,
      coachName: coach.name,
      email: invite.email,
      name: client.name,
      /** Whether the invitee already has a login (then they sign in and accept). */
      hasAccount: client.authId !== null,
    };
  },
});

/**
 * A signed-in client accepts an invite: their coach is set. Only the account
 * the invite was addressed to may accept it, and only while they train alone.
 */
export const acceptInvite = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }): Promise<null> => {
    const user = await requireViewer(ctx);
    if (user.role !== "client") throw new ConvexError({ code: "COACH_CANNOT_ACCEPT" });

    const invite = await ctx.db
      .query("invites")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (!invite || invite.status !== "pending" || invite.expiresAt < Date.now()) {
      throw new ConvexError({ code: "INVITE_INVALID" });
    }
    if (invite.clientId !== user._id && invite.email !== user.email) {
      throw new ConvexError({ code: "INVITE_EMAIL_MISMATCH" });
    }

    const profile = await profileOf(ctx, user._id);
    if (!profile) throw new Error("No profile");
    if (profile.coachId && profile.coachId !== invite.coachId) {
      throw new ConvexError({ code: "ALREADY_COACHED" });
    }

    await ctx.db.patch("clientProfiles", profile._id, { coachId: invite.coachId });
    await ctx.db.patch("invites", invite._id, { status: "accepted" });
    return null;
  },
});

/** A client leaves their coach and trains alone again. The history stays. */
export const leaveCoach = mutation({
  args: {},
  handler: async (ctx): Promise<null> => {
    const user = await requireViewer(ctx);
    const profile = await profileOf(ctx, user._id);
    if (!profile) throw new Error("No profile");
    await ctx.db.patch("clientProfiles", profile._id, { coachId: null });
    return null;
  },
});

/** Pending invites this coach has out, newest first — the roster's waiting room. */
export const pendingInvites = query({
  args: {},
  handler: async (ctx) => {
    const coach = await requireCoach(ctx);
    const invites = await ctx.db
      .query("invites")
      .withIndex("by_coach", (q) => q.eq("coachId", coach._id))
      .order("desc")
      .collect();
    return invites
      .filter((invite) => invite.status === "pending" && invite.expiresAt >= Date.now())
      .map((invite) => ({
        id: invite._id as string,
        clientId: invite.clientId as string,
        email: invite.email,
        expiresAt: invite.expiresAt,
        sentAt: invite._creationTime,
      }));
  },
});

/* -------------------------------------------------------------------- writes */

/**
 * Add a client to this coach's roster and send the invite.
 *
 * A new address gets a studio row at once — `invited`, no login — so the coach
 * can build the plan today. An address that already trains alone gets an
 * invite to attach this coach; the row is theirs and is not touched until they
 * accept. An address already coached, or a coach's, is refused.
 */
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
    const coach = await requireCoach(ctx);
    const email = normalizeEmail(args.email);

    const existing = await userByEmail(ctx, email);
    if (existing) {
      if (existing.role !== "client") throw new ConvexError({ code: "EMAIL_IS_COACH" });
      const profile = await profileOf(ctx, existing._id);
      if (!profile) throw new ConvexError({ code: "EMAIL_TAKEN" });
      if (profile.coachId === coach._id) throw new ConvexError({ code: "ALREADY_YOURS" });
      if (profile.coachId) throw new ConvexError({ code: "ALREADY_COACHED" });

      await issueInvite(ctx, { coachId: coach._id, clientId: existing._id, email });
      return { kind: "invited" as const, name: existing.name };
    }

    const userId = await ctx.db.insert("users", {
      authId: null,
      email,
      name: args.name.trim(),
      role: "client",
      locale: args.locale ?? "pt",
      status: "invited",
    });
    await ctx.db.insert("clientProfiles", {
      userId,
      coachId: coach._id,
      plan: args.plan,
      goals: args.goals ?? "",
      injuries: args.injuries ?? "",
      notes: "",
      tags: [],
      sessionsLeft: 0,
      startedAt: Date.now(),
    });
    await issueInvite(ctx, { coachId: coach._id, clientId: userId, email });

    const client = await clientWithProfile(ctx, userId);
    if (!client) throw new Error("Client was created but could not be read back");
    return { kind: "created" as const, name: client.name, clientId: client.id };
  },
});

/** Send the invite again, with a fresh token. Only for a client who has not claimed theirs. */
export const resendInvite = mutation({
  args: { clientId: v.id("users") },
  handler: async (ctx, { clientId }): Promise<null> => {
    const { coach, client } = await requireCoachOf(ctx, clientId);
    if (client.authId) return null;
    await issueInvite(ctx, { coachId: coach._id, clientId, email: client.email });
    return null;
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
    const { client, profile } = await requireCoachOf(ctx, clientId);

    // The name is the person's own once they have a login; before that it is
    // whatever the coach typed, and the coach may fix it.
    if (patch.name !== undefined && !client.authId) {
      await ctx.db.patch("users", clientId, { name: patch.name.trim() });
    }

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

/**
 * Archive or reactivate. Archiving a client who has their own login does not
 * touch the login: it ends the coaching (the coach is removed) and the person
 * keeps their account and their history. A client with no login yet is
 * archived outright.
 */
export const setClientStatus = mutation({
  args: { clientId: v.id("users"), status },
  handler: async (ctx, args) => {
    const { client, profile } = await requireCoachOf(ctx, args.clientId);
    if (args.status === "archived" && client.authId) {
      await ctx.db.patch("clientProfiles", profile._id, { coachId: null });
      return;
    }
    await ctx.db.patch("users", args.clientId, { status: args.status });
  },
});

/** Burn one in-person session credit. Returns the remaining balance. */
export const consumeSession = mutation({
  args: { clientId: v.id("users") },
  handler: async (ctx, { clientId }) => {
    const { profile } = await requireCoachOf(ctx, clientId);
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
 * Change your own password. Better Auth checks the current one; the session
 * headers it needs are rebuilt from the identity Convex verified.
 */
export const changePassword = mutation({
  args: { currentPassword: v.string(), newPassword: v.string() },
  handler: async (ctx, args): Promise<null> => {
    await requireViewer(ctx);
    const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
    await auth.api.changePassword({
      body: {
        currentPassword: args.currentPassword,
        newPassword: args.newPassword,
        revokeOtherSessions: true,
      },
      headers,
    });
    return null;
  },
});

/* ------------------------------------------------------------------ internal */

/**
 * Lookups provisioning needs before there is a session to authorize with.
 * Internal, so they are reachable from `convex/seed.ts` and from nowhere else.
 */
export const byEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, { email }) => userByEmail(ctx, normalizeEmail(email)),
});

/**
 * Attach a login to an account, creating the account when the address is new.
 * Provisioning only: the seed script creates the Better Auth users and then
 * calls this with their ids. Existing rows keep their id — and with it every
 * plan, message and session already written against them.
 */
export const linkLogin = internalMutation({
  args: {
    authId: v.string(),
    email: v.string(),
    name: v.string(),
    role,
    coachEmail: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"users">> => {
    const email = normalizeEmail(args.email);
    const coach = args.coachEmail ? await userByEmail(ctx, normalizeEmail(args.coachEmail)) : null;
    if (args.coachEmail && (!coach || coach.role !== "coach")) {
      throw new Error(`No coach with email ${args.coachEmail}`);
    }

    let userId: Id<"users">;
    const existing = await userByEmail(ctx, email);
    if (existing) {
      userId = existing._id;
      await ctx.db.patch("users", userId, { authId: args.authId, status: "active", role: args.role });
    } else {
      userId = await ctx.db.insert("users", {
        authId: args.authId,
        email,
        name: args.name,
        role: args.role,
        locale: "pt",
        status: "active",
      });
    }

    if (args.role === "client") {
      const profile = await profileOf(ctx, userId);
      if (profile) {
        await ctx.db.patch("clientProfiles", profile._id, { coachId: coach?._id ?? null });
      } else {
        await ctx.db.insert("clientProfiles", {
          userId,
          coachId: coach?._id ?? null,
          plan: "online",
          goals: "",
          injuries: "",
          notes: "",
          tags: [],
          sessionsLeft: 0,
          startedAt: Date.now(),
        });
      }
    }
    return userId;
  },
});

/** Provisioning only: drop the studio row, its profile and its invites. */
export const removeByEmail = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, args): Promise<boolean> => {
    const user = await userByEmail(ctx, normalizeEmail(args.email));
    if (!user) return false;
    const profile = await profileOf(ctx, user._id);
    if (profile) await ctx.db.delete("clientProfiles", profile._id);
    const invites = await ctx.db
      .query("invites")
      .withIndex("by_client", (q) => q.eq("clientId", user._id))
      .collect();
    for (const invite of invites) await ctx.db.delete("invites", invite._id);
    await ctx.db.delete("users", user._id);
    return true;
  },
});
