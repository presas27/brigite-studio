import { Email } from "@convex-dev/auth/providers/Email";
import { convexAuth } from "@convex-dev/auth/server";
import type { MutationCtx } from "./_generated/server";

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
  async sendVerificationRequest({ identifier: email, url, expires }) {
    const key = process.env.AUTH_RESEND_KEY;
    if (!key) throw new Error("AUTH_RESEND_KEY is not set on the deployment");

    const minutes = Math.max(1, Math.round((expires.getTime() - Date.now()) / 60_000));

    // Resend over HTTP rather than its SDK: this runs in the Convex runtime,
    // and one POST does not justify pulling a package into the bundle.
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
      throw new Error(`Resend refused the sign-in email: ${response.status} ${await response.text()}`);
    }
  },
});

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [magicLink],
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
     */
    async beforeSessionCreation(ctx, { userId }) {
      const db = ctx.db as unknown as MutationCtx["db"];
      const user = await db.get("users", userId);
      if (!user || user.status === "archived") throw new Error("Account is not active");
    },
  },
});
