import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { authComponent, createAuth } from "./auth";

/**
 * Better Auth's endpoints, served by the deployment. The Next app proxies
 * `/api/auth/*` here (`src/app/api/auth/[...all]/route.ts`), so the browser
 * only ever talks to its own origin and the session cookie stays first-party.
 *
 * Stripe posts to `/stripe/webhook` on the same Convex site URL. The signature
 * is checked in a Node action — httpActions themselves have no Stripe SDK.
 */
const http = httpRouter();

authComponent.registerRoutes(http, createAuth);

http.route({
  path: "/stripe/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const signature = request.headers.get("stripe-signature");
    if (!signature) return new Response("Missing signature", { status: 400 });
    const body = await request.text();
    try {
      await ctx.runAction(internal.payments.processWebhook, { body, signature });
      return new Response("ok", { status: 200 });
    } catch (error) {
      console.error("stripe webhook", error);
      return new Response("Webhook error", { status: 400 });
    }
  }),
});

export default http;
