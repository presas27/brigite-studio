import "server-only";

import { convexBetterAuthNextJs } from "@convex-dev/better-auth/nextjs";

/**
 * Server-side auth utilities: the route handler that proxies `/api/auth`, the
 * token for the current request's session, and authenticated Convex calls
 * from Server Components, Server Actions and Route Handlers.
 */
export const { handler, getToken, isAuthenticated, fetchAuthQuery, fetchAuthMutation, fetchAuthAction } =
  convexBetterAuthNextJs({
    convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL!,
    convexSiteUrl: process.env.NEXT_PUBLIC_CONVEX_SITE_URL!,
  });
