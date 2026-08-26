import { ConvexCredentials } from "@convex-dev/auth/providers/ConvexCredentials";
import { Email } from "@convex-dev/auth/providers/Email";
import { convexAuth } from "@convex-dev/auth/server";
import { COACH_EMAIL, PILOT_CLIENTS } from "../src/lib/studio/pilot";
import { internal } from "./_generated/api";
import type { ActionCtx, MutationCtx } from "./_generated/server";

/**
 * Sign-in for the studio: an emailed link, and nothing else.
 *
 * Same shape as the flow it replaces — type your address, get a link, no
 * password — but the session is now Convex's, which is what lets every function
 * authorize itself with `ctx.auth.getUserIdentity()` instead of trusting an
 * actor id passed in from outside.
 *
 * The one property that must survive the change: **there is no
 * self-registration.** Convex Auth's email providers are "trusted" and create an
 * account for whatever address asks, which would turn a private coaching app
 * into an open sign-up. `createOrUpdateUser` below is what closes it again.
 */

/** Twenty minutes, as before: long enough to find the mail, short enough to matter. */
const LINK_TTL_SECONDS = 20 * 60;

type VerificationRequest = { identifier: string; url: string; expires: Date };

/**
 * Send one sign-in link, or decide not to.
 *
 * Split out of the provider config because it needs the action ctx to reach the
 * database, and `@auth/core` types this callback as taking only the request —
 * Convex Auth passes the ctx as a second argument regardless. The cast at the
 * assignment below is that discrepancy and nothing more.
 */
async function sendSignInLink(
  { identifier: email, url, expires }: VerificationRequest,
  ctx: ActionCtx,
): Promise<void> {
  const key = process.env.AUTH_RESEND_KEY;

  /**
   * Two checks before anything is sent, and both end in a silent return rather
   * than an error — the page must say the same "if this address has access, the
   * link is on its way" in every case, or the form becomes a way to ask the
   * studio who its clients are.
   *
   * The address check is not only about enumeration: the library creates the
   * account at verification time, so without it any address on the internet
   * could make this deployment send mail on Sara's domain.
   */
  const user = await ctx.runQuery(internal.users.byEmail, { email });
  if (!user || user.status === "archived") return;

  const allowed = await ctx.runMutation(internal.signInLimit.take, { email });
  if (!allowed) return;

  /**
   * No mail provider on this deployment: print the link into the deployment's
   * logs instead of sending it. That is how the flow stays walkable on a dev
   * deployment, and the log is the right place for it — a sign-in link handed
   * back through the HTTP response would be a link anyone watching the wire
   * could use.
   */
  if (!key) {
    console.info(`[studio] sign-in link for ${email}: ${url}`);
    return;
  }

  const minutes = Math.max(1, Math.round((expires.getTime() - Date.now()) / 60_000));

  // Resend over HTTP rather than its SDK: this runs in the Convex runtime, and
  // one POST does not justify pulling a package into the bundle.
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.AUTH_EMAIL_FROM ?? "Brigite's Studio <ola@brigitestudio.com>",
      to: [email],
      subject: "A tua entrada no Brigite's Studio",
      text: [
        "Olá.",
        "",
        `Entra aqui: ${url}`,
        "",
        `O link é válido durante ${minutes} minutos e só funciona uma vez.`,
        "Se não foste tu a pedir, ignora este email.",
      ].join("\n"),
    }),
  });

  if (!response.ok) {
    // The body carries Resend's reason; without it a failure to send is
    // indistinguishable from a wrong address.
    throw new Error(
      `Resend refused the sign-in email: ${response.status} ${await response.text()}`,
    );
  }
}

const magicLink = Email({
  id: "resend-magic-link",
  maxAge: LINK_TTL_SECONDS,
  /**
   * Magic-link behaviour rather than a typed code: the token in the URL is the
   * whole proof, so verification must not also demand the address that asked
   * for it. `Email()` hardcodes that check and merges this config over the top
   * — passing `undefined` is how the library documents switching it off.
   */
  authorize: undefined,
  sendVerificationRequest: sendSignInLink as unknown as (
    params: VerificationRequest,
  ) => Promise<void>,
});

/**
 * The pilot's way in: a button per seeded account, no mailbox involved.
 *
 * Only exists on a deployment that sets `STUDIO_DEMO=1`, and only ever hands a
 * session to an address on the pilot roster or to the coach — without that
 * check it would be a way into any account on the deployment by typing its
 * email, which is precisely the hole the magic link does not have.
 */
const demo = ConvexCredentials({
  id: "demo",
  async authorize(credentials, ctx) {
    if (process.env.STUDIO_DEMO !== "1") return null;

    const asked = typeof credentials.email === "string" ? credentials.email.trim().toLowerCase() : "";
    const roster = [COACH_EMAIL, ...PILOT_CLIENTS.map((client) => client.email)];
    if (!roster.includes(asked)) return null;

    const user = await ctx.runQuery(internal.users.byEmail, { email: asked });
    if (!user || user.status === "archived") return null;
    return { userId: user._id };
  },
});

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [magicLink, demo],
  callbacks: {
    /**
     * The gate. Taking over user creation means the library never inserts a row
     * on its own, so an address that is not already an account cannot become
     * one — Sara adds people, the sign-in form does not.
     *
     * Throwing here rejects the sign-in. What the visitor sees is decided by the
     * page: the same "if this address has access, the link is on its way" either
     * way, so the form never reveals who is a client.
     */
    async createOrUpdateUser(ctx, { existingUserId, profile }) {
      if (existingUserId) return existingUserId;

      const email = typeof profile.email === "string" ? profile.email.trim().toLowerCase() : "";
      if (!email) throw new Error("Sign-in requires an email address");

      // `ctx` arrives typed against `AnyDataModel` because the library cannot
      // know this project's schema. The tables are ours, so the cast is the
      // narrowest way to get them back without giving up type checking.
      const db = ctx.db as unknown as MutationCtx["db"];
      const user = await db
        .query("users")
        .withIndex("email", (q) => q.eq("email", email))
        .unique();
      if (!user) throw new Error("No account for that address");

      return user._id;
    },

    /**
     * Second gate, on every sign-in including ones by an existing account: an
     * archived person keeps their history and loses their way in.
     *
     * It is also where an invitation is spent. A client Sara added is `invited`
     * until the first link they follow actually works, and that moment is here
     * — the only place that knows a session is about to exist.
     */
    async beforeSessionCreation(ctx, { userId }) {
      const db = ctx.db as unknown as MutationCtx["db"];
      const user = await db.get("users", userId);
      if (!user || user.status === "archived") throw new Error("Account is not active");
      if (user.status === "invited") await db.patch("users", userId, { status: "active" });
    },
  },
});
