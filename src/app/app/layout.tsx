import type { Metadata, Viewport } from "next";
import { StudioConvexProvider } from "@/components/studio/ConvexProvider";
import { getToken } from "@/lib/studio/auth-server";

/**
 * Root of the studio app.
 *
 * `robots: noindex` plus the deliberate absence of any inbound link from the
 * marketing site keeps `/app` unlisted — people arrive by signing up or through
 * an invite link, never by browsing.
 *
 * The provider is what makes the session real in the browser: it hands the
 * Convex client the session's token (read here, on the server, from the
 * cookie) and refreshes it as Better Auth rotates it. Server Components read
 * through `src/lib/studio/convexServer.ts` and never touch the socket. Neither
 * wraps the marketing site, which has no session and no need of one.
 *
 * Nothing seeds here. The database is durable, so the accounts and the library
 * are provisioned once (`convex/seed.ts`) instead of being rebuilt by whichever
 * request happened to land on a cold machine.
 */
export const metadata: Metadata = {
  title: "Studio",
  robots: { index: false, follow: false, nocache: true },
  // iOS reads these when the page is added to the home screen: no Safari
  // chrome, a translucent status bar over the ink, and the short name under
  // the icon. Android reads the manifest (`src/app/manifest.ts`) instead.
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Brigite's" },
  // Next emits the standard `mobile-web-app-capable`; older iOS only reads
  // the Apple-prefixed one, and it costs nothing to say both.
  other: { "apple-mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  themeColor: "#121114",
  // Paint under the notch and the home indicator; the chrome pads itself.
  viewportFit: "cover",
};

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const token = await getToken();
  return <StudioConvexProvider initialToken={token ?? null}>{children}</StudioConvexProvider>;
}
