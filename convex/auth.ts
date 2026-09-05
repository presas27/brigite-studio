import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { requireActionCtx } from "@convex-dev/better-auth/utils";
import { betterAuth } from "better-auth/minimal";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import authConfig from "./auth.config";
import { deliverPasswordReset } from "./email";

/**
 * Sign-in for the studio: Better Auth, email and password.
 *
 * The component owns credentials, sessions and rate limits in its own tables.
 * The studio's `users` table is separate and linked by `authId` — see
 * `convex/schema.ts` — which is what lets a coach prepare a client's account
 * before that person has ever chosen a password.
 *
 * Two things worth knowing:
 *
 * - Sign-up is open. Anyone may create a coach or a client account
 *   (`users.completeSignup` is where the role is chosen). What stays closed is
 *   the *data*: a coach sees only the clients who accepted their invite, and a
 *   client only themselves (`convex/model/authz.ts`).
 * - Registration is two steps, because the component's user table cannot carry
 *   the studio's fields. Better Auth creates its user; the app then calls
 *   `users.completeSignup` with the role (and the invite token, if any). A
 *   session whose second step never ran is sent to `/app/comecar` to finish.
 */

const siteUrl = process.env.SITE_URL;

/** Thirty days, refreshed daily while in use. */
const SESSION_SECONDS = 30 * 24 * 60 * 60;
const SESSION_REFRESH_SECONDS = 24 * 60 * 60;

export const authComponent = createClient<DataModel>(components.betterAuth);

export const createAuth = (ctx: GenericCtx<DataModel>) =>
  betterAuth({
    baseURL: siteUrl,
    // Local, production, and the Vercel preview of `test` all talk to this
    // same Convex. Better Auth refuses a sign-in whose Origin is not here.
    trustedOrigins: [
      "http://localhost:3000",
      "https://brigitestudio.com",
      "https://www.brigitestudio.com",
      "https://test.brigitestudio.com",
      "https://*.brigitestudio.com",
      "https://brigite-studio-test.vercel.app",
      "https://brigite-studio-test-git-test-guilherme-presas-projects.vercel.app",
      "https://*.vercel.app",
    ],
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      // Verification would need working mail; until the deployment has a
      // Resend key, the invite token is what proves ownership of an address.
      requireEmailVerification: false,
      sendResetPassword: async ({ user, url }) => {
        await deliverPasswordReset(requireActionCtx(ctx), {
          to: user.email,
          name: user.name,
          url,
        });
      },
    },
    session: {
      expiresIn: SESSION_SECONDS,
      updateAge: SESSION_REFRESH_SECONDS,
    },
    plugins: [convex({ authConfig })],
  });
