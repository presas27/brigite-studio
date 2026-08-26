import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

/**
 * Session plumbing for `/app`, and one optimistic redirect.
 *
 * Convex Auth keeps its tokens in cookies, and they are short-lived: this is
 * what refreshes them before a Server Component tries to read one. Without it
 * the studio signs everybody out roughly every hour.
 *
 * The redirect here is a courtesy, not the gate. It saves a signed-out visitor
 * from rendering a page that would only bounce them, but the thing that
 * actually protects the data is `convex/model/authz.ts` on every function, plus
 * the `require*` gates in `src/lib/studio/auth.ts` on every page.
 */

/** `/app/entrar` is the only publicly reachable page under `/app`. */
const isSignIn = createRouteMatcher(["/app/entrar"]);
const isStudio = createRouteMatcher(["/app", "/app/(.*)"]);

export const proxy = convexAuthNextjsMiddleware(
  async (request, { convexAuth }) => {
    const signedIn = await convexAuth.isAuthenticated();
    if (isStudio(request) && !isSignIn(request) && !signedIn) {
      return nextjsMiddlewareRedirect(request, "/app/entrar");
    }
    if (isSignIn(request) && signedIn) {
      return nextjsMiddlewareRedirect(request, "/app");
    }
  },
  // Thirty days, matching the session the hand-rolled cookie used to grant.
  { cookieConfig: { maxAge: 30 * 24 * 60 * 60 } },
);

export const config = {
  matcher: ["/app", "/app/:path*", "/api/auth/:path*"],
};
