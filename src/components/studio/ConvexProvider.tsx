"use client";

import { ConvexAuthNextjsProvider } from "@convex-dev/auth/nextjs";
import { ConvexReactClient } from "convex/react";

/**
 * The Convex client, mounted only under `/app`.
 *
 * The marketing site does not need it and should not pay for it: this opens a
 * WebSocket, and the landing page's job is to be fast for someone who has never
 * signed in. The studio, on the other side of the sign-in screen, is an app.
 *
 * Server Components read through `src/lib/studio/convexServer.ts` and never
 * touch this client; what it exists for is the auth actions (`useAuthActions`)
 * — signing in and out has to happen from the browser, because it is the
 * browser's cookies that change.
 */
const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function StudioConvexProvider({ children }: { children: React.ReactNode }) {
  return <ConvexAuthNextjsProvider client={convex}>{children}</ConvexAuthNextjsProvider>;
}
