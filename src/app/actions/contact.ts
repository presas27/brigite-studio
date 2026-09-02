"use server";

import { headers } from "next/headers";
import { Resend } from "resend";
import { getUserLocale } from "@/i18n/locale";
import { autoReplyEmail, notificationEmail } from "@/lib/emails";
import { verifyFormToken } from "@/lib/form-token";
import { screen } from "@/lib/moderation";
import { rateLimit } from "@/lib/rate-limit";
import { site } from "@/lib/site";
import { createLead } from "@/lib/studio/leads";

/**
 * Sender for both emails — the domain must be verified in Resend. Same default
 * as the deployment's `EMAIL_FROM` (`convex/email.ts`), so one verified
 * address covers the site and the app.
 */
const FROM = process.env.EMAIL_FROM ?? "Brigite's Studio <ola@brigitestudio.com>";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Per-IP submission budget. Generous enough that no real visitor hits it. */
const RATE = { limit: 5, windowMs: 10 * 60 * 1_000 };

export type ContactFormState = { status: "idle" | "success" | "error" };

/** Best-effort caller IP from the proxy headers, for rate limiting. */
async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return h.get("x-real-ip") ?? "unknown";
}

/**
 * Handle a contact form submission. Layered abuse defense runs first — bots
 * and trolls get a silent "success" (no feedback to tune around); genuine
 * input mistakes get a visible error. A clean message emails Sara and sends
 * the visitor a localized confirmation. Borderline content (`flag`) still
 * reaches Sara, but marked ⚠️ and without an auto-reply to the sender.
 */
// oxlint-disable-next-line react-doctor/server-auth-actions -- public contact form; the site has no authentication. Abuse is handled by the honeypot, timing token, per-IP rate limit, input validation, and content moderation below.
export async function sendContactEmail(
  _prev: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  // Honeypot: bots fill every field; claim success and drop the message.
  if (formData.get("company")) return { status: "success" };

  // Timing trap: reject bot-speed or replayed submissions, silently.
  if (!verifyFormToken(formData.get("_t")).ok) return { status: "success" };

  // Rate limit per IP: drop bursts silently once over budget.
  if (!rateLimit(await clientIp(), RATE)) return { status: "success" };

  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!name || message.length < 2 || !EMAIL_RE.test(email)) return { status: "error" };
  if (name.length > 200 || email.length > 320 || phone.length > 30 || message.length > 5000) {
    return { status: "error" };
  }

  // Content moderation (anti-troll): silently drop hate speech / heavy spam.
  const moderation = screen({ name, message });
  if (moderation.verdict === "reject") return { status: "success" };

  /**
   * Record the enquiry before mailing it. The email is a notification, not a
   * record: it lands in one inbox and is as durable as that inbox's habits.
   * The lead is what the coach's pipeline screen reads, and it survives.
   *
   * A failure here must not lose the message, so it is caught and logged and
   * the mail goes out regardless — the reverse (no mail because the write
   * failed) would be the worse trade.
   */
  await createLead({ name, email, phone, message, source: "site" }).catch((err: unknown) => {
    console.error("[contact] lead not recorded", err);
  });

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // oxlint-disable-next-line react-doctor/server-after-nonblocking -- diagnostic log on the missing-config path; the action returns an error immediately after, so there is no response to defer
    console.warn("RESEND_API_KEY is not set — contact email not sent.");
    return { status: "error" };
  }

  const resend = new Resend(apiKey);
  const payload = { name, phone, email, message };

  try {
    const notification = notificationEmail(payload, moderation);
    const { error } = await resend.emails.send({
      from: FROM,
      to: site.email,
      replyTo: email,
      ...notification,
    });
    if (error) {
      console.error("Resend notification failed:", error);
      return { status: "error" };
    }
  } catch (err) {
    console.error("Resend notification failed:", err);
    return { status: "error" };
  }

  // Auto-reply only for clean messages — never confirm to a flagged sender.
  if (moderation.verdict === "accept") {
    try {
      const reply = autoReplyEmail(payload, await getUserLocale());
      await resend.emails.send({
        from: FROM,
        to: email,
        replyTo: site.email,
        ...reply,
      });
    } catch (err) {
      console.error("Resend auto-reply failed:", err);
    }
  }

  return { status: "success" };
}
