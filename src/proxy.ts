import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

/**
 * One optimistic redirect for `/app`.
 *
 * The redirect here is a courtesy, not the gate. It saves a signed-out visitor
 * from rendering a page that would only bounce them, and it only looks at
 * whether a session cookie *exists* — the thing that actually protects the
 * data is `convex/model/authz.ts` on every function, plus the `require*` gates
 * in `src/lib/studio/auth.ts` on every page, both of which verify the session.
 */

/** Reachable without a session: sign-in, sign-up, an invite link, a password reset. */
const PUBLIC = [/^\/app\/entrar$/, /^\/app\/convite\/[^/]+$/, /^\/app\/repor$/];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC.some((route) => route.test(pathname));

  // One direction only. A cookie can outlive its session (revoked, or the
  // account removed), so "cookie present" must never bounce someone *away*
  // from the sign-in page — that is a loop. The page itself sends a verified
  // session to its home.
  if (!isPublic && !getSessionCookie(request)) {
    const to = request.nextUrl.clone();
    to.pathname = "/app/entrar";
    to.search = "";
    return NextResponse.redirect(to);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/app", "/app/:path*"],
};
