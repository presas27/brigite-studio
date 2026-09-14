"use node";

import Stripe from "stripe";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action, internalAction } from "./_generated/server";
import { extraSeats } from "./lib/seats";

function stripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return new Stripe(key);
}

function siteUrl(): string {
  const url = process.env.SITE_URL;
  if (!url) throw new Error("SITE_URL is not set");
  return url.replace(/\/$/, "");
}

function defaultPriceId(): string {
  const id = process.env.STRIPE_PRICE_ID;
  if (!id) throw new Error("STRIPE_PRICE_ID is not set");
  return id;
}

function mapStatus(status: Stripe.Subscription.Status): "incomplete" | "active" | "past_due" | "canceled" | "none" {
  if (status === "active" || status === "trialing") return "active";
  if (status === "past_due" || status === "unpaid") return "past_due";
  if (status === "incomplete" || status === "incomplete_expired") return "incomplete";
  if (status === "canceled" || status === "paused") return "canceled";
  return "none";
}

function periodEnd(sub: Stripe.Subscription): number | null {
  const end = sub.items.data[0]?.current_period_end;
  return typeof end === "number" ? end * 1000 : null;
}

function itemId(sub: Stripe.Subscription): string | null {
  return sub.items.data[0]?.id ?? null;
}

function priceIdOf(sub: Stripe.Subscription): string | null {
  const price = sub.items.data[0]?.price;
  return typeof price === "string" ? price : (price?.id ?? null);
}

async function ensureCustomer(
  stripe: Stripe,
  row: {
    stripeCustomerId: string | null;
    coach: { id: string; email: string; name: string };
  },
): Promise<string> {
  if (row.stripeCustomerId) return row.stripeCustomerId;
  const customer = await stripe.customers.create({
    email: row.coach.email,
    name: row.coach.name,
    metadata: { coachId: row.coach.id },
  });
  return customer.id;
}

export const startCheckout = action({
  args: {},
  returns: v.object({ url: v.string() }),
  handler: async (ctx): Promise<{ url: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not signed in");
    const coach = await ctx.runQuery(internal.users.byAuthId, { authId: identity.subject });
    if (!coach || coach.role !== "coach") throw new Error("Coach only");
    const data = await ctx.runQuery(internal.billing.getBillingInternal, { coachId: coach._id });
    if (!data) throw new Error("Coach missing");
    if (data.row?.exempt) throw new Error("This account is not billed");

    const stripe = stripeClient();
    const customerId = await ensureCustomer(stripe, {
      stripeCustomerId: data.row?.stripeCustomerId ?? null,
      coach: data.coach,
    });
    await ctx.runMutation(internal.billing.applyStripeCustomer, {
      coachId: coach._id,
      stripeCustomerId: customerId,
      stripeSubscriptionId: data.row?.stripeSubscriptionId ?? null,
      stripeSubscriptionItemId: data.row?.stripeSubscriptionItemId ?? null,
      stripePriceId: data.row?.stripePriceId ?? null,
      status: data.row?.status ?? "none",
      currentPeriodEnd: data.row?.currentPeriodEnd ?? null,
    });

    const included = data.row?.includedClients ?? 2;
    const extra = extraSeats(data.activeCount + 1, included);
    const quantity = Math.max(1, extra);
    const customCents = data.row?.pricePerClientCents ?? 249;
    const defaultPrice = defaultPriceId();

    const lineItem =
      data.row?.stripePriceId && data.row.pricePerClientCents !== 249
        ? { price: data.row.stripePriceId, quantity }
        : customCents === 249
          ? { price: defaultPrice, quantity }
          : {
              price_data: {
                currency: "eur" as const,
                product_data: { name: "Aluno activo" },
                unit_amount: customCents,
                recurring: { interval: "month" as const },
              },
              quantity,
            };

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [lineItem],
      success_url: `${siteUrl()}/app/conta?faturacao=ok`,
      cancel_url: `${siteUrl()}/app/conta?faturacao=cancelado`,
      metadata: { coachId: coach._id },
      subscription_data: {
        metadata: { coachId: coach._id },
      },
      allow_promotion_codes: true,
    });
    if (!session.url) throw new Error("Stripe Checkout did not return a URL");
    return { url: session.url };
  },
});

export const startPortal = action({
  args: {},
  returns: v.object({ url: v.string() }),
  handler: async (ctx): Promise<{ url: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not signed in");
    const coach = await ctx.runQuery(internal.users.byAuthId, { authId: identity.subject });
    if (!coach || coach.role !== "coach") throw new Error("Coach only");
    const data = await ctx.runQuery(internal.billing.getBillingInternal, { coachId: coach._id });
    const customerId = data?.row?.stripeCustomerId;
    if (!customerId) throw new Error("No Stripe customer");
    const session = await stripeClient().billingPortal.sessions.create({
      customer: customerId,
      return_url: `${siteUrl()}/app/conta`,
    });
    return { url: session.url };
  },
});

export const syncCoachSeats = internalAction({
  args: { coachId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, { coachId }) => {
    if (!process.env.STRIPE_SECRET_KEY) return null;
    const data = await ctx.runQuery(internal.billing.getBillingInternal, { coachId });
    if (!data) return null;
    const stripe = stripeClient();
    const included = data.row?.includedClients ?? 2;
    const extra = data.row?.exempt ? 0 : extraSeats(data.activeCount, included);
    const subId = data.row?.stripeSubscriptionId;
    const item = data.row?.stripeSubscriptionItemId;

    if (extra <= 0 || data.row?.exempt) {
      if (subId) {
        try {
          await stripe.subscriptions.cancel(subId);
        } catch (error) {
          console.error("stripe cancel failed", error);
        }
        if (data.row?.stripeCustomerId) {
          await ctx.runMutation(internal.billing.applyStripeCustomer, {
            coachId,
            stripeCustomerId: data.row.stripeCustomerId,
            stripeSubscriptionId: null,
            stripeSubscriptionItemId: null,
            stripePriceId: data.row.stripePriceId,
            status: "canceled",
            currentPeriodEnd: null,
          });
        }
      }
      return null;
    }

    if (!subId || !item) return null;

    try {
      const updated = await stripe.subscriptions.update(subId, {
        items: [{ id: item, quantity: extra }],
        proration_behavior: "create_prorations",
      });
      if (data.row?.stripeCustomerId) {
        await ctx.runMutation(internal.billing.applyStripeCustomer, {
          coachId,
          stripeCustomerId: data.row.stripeCustomerId,
          stripeSubscriptionId: updated.id,
          stripeSubscriptionItemId: itemId(updated),
          stripePriceId: priceIdOf(updated),
          status: mapStatus(updated.status),
          currentPeriodEnd: periodEnd(updated),
        });
      }
    } catch (error) {
      console.error("stripe quantity sync failed", error);
    }
    return null;
  },
});

export const processWebhook = internalAction({
  args: { body: v.string(), signature: v.string() },
  returns: v.null(),
  handler: async (ctx, { body, signature }) => {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");
    const event = stripeClient().webhooks.constructEvent(body, signature, secret);
    const fresh = await ctx.runMutation(internal.billing.claimStripeEvent, { eventId: event.id });
    if (!fresh) return null;

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
      const subscriptionId =
        typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
      const coachId = session.metadata?.coachId as IdFromString | undefined;
      if (!customerId || !subscriptionId || !coachId) return null;
      const sub = await stripeClient().subscriptions.retrieve(subscriptionId);
      await ctx.runMutation(internal.billing.applyStripeCustomer, {
        coachId: coachId as never,
        stripeCustomerId: customerId,
        stripeSubscriptionId: sub.id,
        stripeSubscriptionItemId: itemId(sub),
        stripePriceId: priceIdOf(sub),
        status: mapStatus(sub.status),
        currentPeriodEnd: periodEnd(sub),
      });
      await ctx.runAction(internal.payments.syncCoachSeats, { coachId: coachId as never });
      return null;
    }

    if (
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      await ctx.runMutation(internal.billing.applyStripeByCustomer, {
        stripeCustomerId: customerId,
        stripeSubscriptionId: event.type === "customer.subscription.deleted" ? null : sub.id,
        stripeSubscriptionItemId: event.type === "customer.subscription.deleted" ? null : itemId(sub),
        stripePriceId: priceIdOf(sub),
        status: event.type === "customer.subscription.deleted" ? "canceled" : mapStatus(sub.status),
        currentPeriodEnd: event.type === "customer.subscription.deleted" ? null : periodEnd(sub),
      });
      return null;
    }

    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice & {
        subscription?: string | { id: string } | null;
      };
      const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
      if (!customerId) return null;
      const subRef = invoice.subscription;
      const subId = typeof subRef === "string" ? subRef : subRef?.id;
      await ctx.runMutation(internal.billing.applyStripeByCustomer, {
        stripeCustomerId: customerId,
        stripeSubscriptionId: subId ?? null,
        stripeSubscriptionItemId: null,
        stripePriceId: null,
        status: "past_due",
        currentPeriodEnd: null,
      });
    }
    return null;
  },
});

type IdFromString = string;
