import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

/**
 * Who is asking, and what they are allowed to see.
 *
 * Every public function in `convex/` starts with one of these. The rule the app
 * is built on: **nothing trusts an actor id passed in from outside.** The
 * identity comes from the token Convex verified — its `subject` is the Better
 * Auth user id, and `users.authId` is how that becomes one of ours — so a
 * client that calls a function directly, with the deployment URL, which is
 * public, gets the same answer the UI would have given them and no more.
 *
 * There is more than one coach. A coach is nobody's superuser: they reach the
 * clients whose profile names them (`clientProfiles.coachId`) and their own
 * library, and nothing else. A client without a coach trains alone, and for
 * their own workouts they are their own builder (`requireBuilder`).
 *
 * The Next side has its own gates in `src/lib/studio/auth.ts`, but those exist
 * to *redirect* nicely. These are the ones that actually protect the data.
 */

export type Ctx = QueryCtx | MutationCtx;

/** The signed-in account, or `null`. Archived accounts count as signed out. */
export async function viewer(ctx: Ctx): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  const user = await ctx.db
    .query("users")
    .withIndex("by_auth_id", (q) => q.eq("authId", identity.subject))
    .unique();
  return user && user.status !== "archived" ? user : null;
}

/** The signed-in account. Throws when there is none. */
export async function requireViewer(ctx: Ctx): Promise<Doc<"users">> {
  const user = await viewer(ctx);
  if (!user) throw new Error("Not signed in");
  return user;
}

/** A coach. Throws for clients and for signed-out callers. */
export async function requireCoach(ctx: Ctx): Promise<Doc<"users">> {
  const user = await requireViewer(ctx);
  if (user.role !== "coach") throw new Error("Coach only");
  return user;
}

/** The coaching profile of a client account, or `null` for anything else. */
export async function profileOf(
  ctx: Ctx,
  clientId: Id<"users">,
): Promise<Doc<"clientProfiles"> | null> {
  return ctx.db
    .query("clientProfiles")
    .withIndex("by_user", (q) => q.eq("userId", clientId))
    .unique();
}

/**
 * A gate for anything scoped to one client: that client's own coach, or the
 * client themselves. Returns all three rows because callers routinely need to
 * know which side is looking (coach-only notes, unread counts) and who the
 * other side is (the thread's coach).
 */
export async function requireClientAccess(
  ctx: Ctx,
  clientId: Id<"users">,
): Promise<{ viewer: Doc<"users">; client: Doc<"users">; profile: Doc<"clientProfiles"> }> {
  const looker = await requireViewer(ctx);

  const client = await ctx.db.get("users", clientId);
  if (!client || client.role !== "client") throw new Error("No such client");
  const profile = await profileOf(ctx, clientId);
  if (!profile) throw new Error("No such client");

  const own = looker._id === clientId;
  const theirCoach = looker.role === "coach" && profile.coachId === looker._id;
  if (!own && !theirCoach) throw new Error("Not your data");

  return { viewer: looker, client, profile };
}

/** The coach of this client, and only them. */
export async function requireCoachOf(
  ctx: Ctx,
  clientId: Id<"users">,
): Promise<{ coach: Doc<"users">; client: Doc<"users">; profile: Doc<"clientProfiles"> }> {
  const access = await requireClientAccess(ctx, clientId);
  if (access.viewer.role !== "coach") throw new Error("Coach only");
  return { coach: access.viewer, client: access.client, profile: access.profile };
}

/**
 * Whoever may build workouts: any coach, or a client with no coach — someone
 * training alone writes their own sessions. A client who *has* a coach does
 * not: their plan is the coach's, and letting them edit it from the other side
 * would be a conversation the app has no way to show.
 *
 * Templates built by a builder carry their id as `coachId`, whichever role they
 * have, so ownership reads the same for both.
 */
export async function requireBuilder(ctx: Ctx): Promise<Doc<"users">> {
  const user = await requireViewer(ctx);
  if (user.role === "coach") return user;
  const profile = await profileOf(ctx, user._id);
  if (profile && profile.coachId === null) return user;
  throw new Error("Your coach builds your plan");
}
