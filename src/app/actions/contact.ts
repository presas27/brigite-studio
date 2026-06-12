"use server";

import { Resend } from "resend";
import { getUserLocale } from "@/i18n/locale";
import { autoReplyEmail, notificationEmail } from "@/lib/emails";
import { site } from "@/lib/site";

/** Sender for both emails — the domain must be verified in Resend. */
const FROM = "Brigite's Studio <site@brigites.studio>";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ContactFormState = { status: "idle" | "success" | "error" };

/**
 * Handle a contact form submission: email the form data to Sara
 * (reply-to set to the visitor, so a plain "Reply" answers them) and
 * send the visitor a localized confirmation. The confirmation is
 * best-effort — the lead is already in Sara's inbox if it fails.
 */
export async function sendContactEmail(
  _prev: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  // Honeypot: bots fill every field; claim success and drop the message.
  if (formData.get("company")) return { status: "success" };

  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!name || !message || !EMAIL_RE.test(email)) return { status: "error" };
  if (name.length > 200 || email.length > 320 || phone.length > 30 || message.length > 5000) {
    return { status: "error" };
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY is not set — contact email not sent.");
    return { status: "error" };
  }

  const resend = new Resend(apiKey);
  const payload = { name, phone, email, message };

  try {
    const notification = notificationEmail(payload);
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

  return { status: "success" };
}
