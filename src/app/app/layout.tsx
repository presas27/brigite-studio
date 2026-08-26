import type { Metadata } from "next";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { StudioConvexProvider } from "@/components/studio/ConvexProvider";

/**
 * Root of the studio app.
 *
 * `robots: noindex` plus the deliberate absence of any inbound link from the
 * marketing site keeps `/app` unlisted — clients arrive through the emailed
 * sign-in link, never by browsing.
 *
 * The two providers are what make the session real on both sides of the render:
 * the server one reads the auth cookies so Server Components can pass a token
 * to Convex, the client one gives the browser `signIn`/`signOut`. Neither wraps
 * the marketing site, which has no session and no need of a socket.
 *
 * Nothing seeds here any more. The database is durable now, so the coach
 * account and the library are provisioned once (`convex/seed.ts`) instead of
 * being rebuilt by whichever request happened to land on a cold machine.
 */
export const metadata: Metadata = {
  title: "Studio",
  robots: { index: false, follow: false, nocache: true },
};

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <ConvexAuthNextjsServerProvider>
      <StudioConvexProvider>{children}</StudioConvexProvider>
    </ConvexAuthNextjsServerProvider>
  );
}
