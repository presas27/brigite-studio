import { getAuthUserId } from "@convex-dev/auth/server";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

/**
 * Who is asking, and what they are allowed to see.
 *
 * Every public function in `convex/` starts with one of these. The rule the app
 * is built on: **nothing trusts an actor id passed in from outside.** The
 * identity comes from the session token Convex verified, so a client that calls
 * a function directly — with the deployment URL, which is public — gets the same
 * answer the UI would have given them and no more.
 *
 * The Next side has its own gates in `src/lib/studio/auth.ts`, but those exist
 * to *redirect* nicely. These are the ones that actually protect the data.
 */

export type Ctx = QueryCtx | MutationCtx;

/** The signed-in account, or `null`. Archived accounts count as signed out. */
export async function viewer(ctx: Ctx): Promise<Doc<"users"> | null> {
  const userId = await getAuthUserId(ctx);
  if (!userId) return null;
  const user = await ctx.db.get("users", userId);
  return user && user.status !== "archived" ? user : null;
}

/** The signed-in account. Throws when there is none. */
export async function requireViewer(ctx: Ctx): Promise<Doc<"users">> {
  const user = await viewer(ctx);
  if (!user) throw new Error("Not signed in");
  return user;
}

/** The coach. Throws for clients and for signed-out callers. */
export async function requireCoach(ctx: Ctx): Promise<Doc<"users">> {
  const user = await requireViewer(ctx);
  if (user.role !== "coach") throw new Error("Coach only");
  return user;
}

/**
 * A gate for anything scoped to one client: the coach reaches any of hers, a
 * client only themselves. Returns both sides because callers routinely need to
 * know which one is looking (coach-only notes, unread counts).
 */
export async function requireClientAccess(
  ctx: Ctx,
  clientId: Id<"users">,
): Promise<{ viewer: Doc<"users">; client: Doc<"users"> }> {
  const looker = await requireViewer(ctx);
  if (looker.role !== "coach" && looker._id !== clientId) throw new Error("Not your data");

  const client = await ctx.db.get("users", clientId);
  if (!client || client.role !== "client") throw new Error("No such client");
  return { viewer: looker, client };
}
