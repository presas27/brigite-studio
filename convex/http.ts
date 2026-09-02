import { httpRouter } from "convex/server";
import { authComponent, createAuth } from "./auth";

/**
 * Better Auth's endpoints, served by the deployment. The Next app proxies
 * `/api/auth/*` here (`src/app/api/auth/[...all]/route.ts`), so the browser
 * only ever talks to its own origin and the session cookie stays first-party.
 */
const http = httpRouter();

authComponent.registerRoutes(http, createAuth);

export default http;
