"use client";

import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { ConvexReactClient } from "convex/react";
import { authClient } from "@/lib/auth-client";

/**
 * The Convex client, mounted only under `/app`.
 *
 * The marketing site does not need it and should not pay for it: this opens a
 * WebSocket, and the landing page's job is to be fast for someone who has never
 * signed in. The studio, on the other side of the sign-in screen, is an app.
 *
 * Server Components read through `src/lib/studio/convexServer.ts` and never
 * touch this client; what it exists for is the browser-side auth flows (sign
 * in, sign up, sign out) and the few live queries the app makes. `initialToken`
 * is the session's token from the server render, so the first client query
 * does not have to wait for a round trip to learn who is signed in.
 */
const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function StudioConvexProvider({
  children,
  initialToken,
}: {
  children: React.ReactNode;
  initialToken?: string | null;
}) {
  return (
    <ConvexBetterAuthProvider client={convex} authClient={authClient} initialToken={initialToken}>
      {children}
    </ConvexBetterAuthProvider>
  );
}
