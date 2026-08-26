import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

/**
 * How often one address may ask for a sign-in link.
 *
 * Generous for a household sharing a laptop, hostile to a script: eight links
 * per ten minutes. The old per-IP limit lived in the Next process, which meant
 * it reset every time the platform moved the request to another machine; this
 * one is in the database that now outlives the request.
 */
const LIMIT = 8;
const WINDOW_MS = 10 * 60 * 1_000;

/**
 * Record an attempt and say whether it may proceed. Sweeps its own expired rows
 * on the way through, so the table stays the size of one window.
 */
export const take = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const key = email.trim().toLowerCase();
    const cutoff = Date.now() - WINDOW_MS;

    const attempts = await ctx.db
      .query("signInAttempts")
      .withIndex("by_email", (q) => q.eq("email", key))
      .collect();

    let recent = 0;
    for (const attempt of attempts) {
      if (attempt.at < cutoff) await ctx.db.delete("signInAttempts", attempt._id);
      else recent += 1;
    }

    if (recent >= LIMIT) return false;
    await ctx.db.insert("signInAttempts", { email: key, at: Date.now() });
    return true;
  },
});
