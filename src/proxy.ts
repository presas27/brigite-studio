import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Two things for `/app`: one optimistic redirect, and the Content Security
 * Policy.
 *
 * The redirect is a courtesy, not the gate. It saves a signed-out visitor from
 * rendering a page that would only bounce them, and it only looks at whether a
 * session cookie *exists* — the thing that actually protects the data is
 * `convex/model/authz.ts` on every function, plus the `require*` gates in
 * `src/lib/studio/auth.ts` on every page, both of which verify the session.
 *
 * The CSP is nonce-based, which is why it lives here and not in
 * `next.config.ts`: a nonce is minted per request, Next reads it off the
 * `Content-Security-Policy` request header and stamps it onto every script it
 * emits, and `'strict-dynamic'` lets those scripts load their chunks. Nothing
 * else runs. It covers `/app` only — every route there is rendered per request,
 * which a nonce requires; the marketing site is static and gets the plain
 * headers from `next.config.ts` instead.
 */

/** Reachable without a session: sign-in, sign-up, an invite link, a password reset. */
const PUBLIC = [/^\/app\/entrar$/, /^\/app\/convite\/[^/]+$/, /^\/app\/repor$/];

const CONVEX_CLOUD = "https://*.convex.cloud";
const CONVEX_SOCKET = "wss://*.convex.cloud";

/**
 * What the app talks to, and nothing more:
 *
 * - scripts: only what Next emits (nonce + strict-dynamic); `'unsafe-eval'` in
 *   development because React rebuilds server error stacks with it.
 * - styles: `'unsafe-inline'`, because React renders `style=` attributes and
 *   GSAP / motion write them at runtime; neither can carry a nonce. Style
 *   injection is not a code-execution vector, and this is the trade every
 *   React + CSP deployment makes.
 * - connect: the Convex deployment (queries over WebSocket, uploads over HTTPS);
 *   auth goes through `/api/auth` on this origin.
 * - images: YouTube poster frames, `blob:` for photo previews before upload;
 *   body photos are served by `/app/api/foto`, i.e. `'self'`.
 * - frames: the YouTube player, no-cookie host only.
 */
function policy(nonce: string): string {
  const dev = process.env.NODE_ENV === "development";
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    `connect-src 'self' ${CONVEX_CLOUD} ${CONVEX_SOCKET}`,
    "img-src 'self' blob: data: https://i.ytimg.com",
    "media-src 'self' blob:",
    "font-src 'self' data:",
    "frame-src https://www.youtube-nocookie.com",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(dev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

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

  const nonce = btoa(crypto.randomUUID());
  const csp = policy(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      source: "/app/:path*",
      // Prefetches carry no document to secure, and their nonce would be wasted.
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
