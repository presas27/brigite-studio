import { convexClient } from "@convex-dev/better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

/**
 * The browser's side of Better Auth. Talks to `/api/auth/*` on this origin,
 * which the route handler forwards to the Convex deployment — the cookie stays
 * first-party and no deployment URL is baked into the client.
 */
export const authClient = createAuthClient({
  plugins: [convexClient()],
});
