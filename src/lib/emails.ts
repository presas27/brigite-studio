import type { Locale } from "@/i18n/config";
import type { ModerationResult } from "./moderation";
import { site } from "./site";

/**
 * Email templates for the contact form — a notification to Sara and a
 * confirmation auto-reply to the visitor. Plain inline-styled HTML plus a
 * text fallback; no email framework, in keeping with the editorial site.
 */

export type ContactPayload = {
  name: string;
  phone: string;
  email: string;
  message: string;
};

export type EmailContent = {
  subject: string;
  html: string;
  text: string;
};

/** Escape user input before interpolating it into email HTML. */
function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function layout(body: string) {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:32px 16px;background:#ffffff;">
    <div style="max-width:560px;margin:0 auto;color:#111111;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;">
      ${body}
      <p style="margin:40px 0 0;font-size:13px;color:#888888;">Brigite&#39;s Studio &middot; <a href="${site.url}" style="color:#888888;">brigitestudio.com</a></p>
    </div>
  </body>
</html>`;
}

/**
 * Notification to Sara with the form data. Always in Portuguese. When
 * `moderation` flags the message, the subject is prefixed with ⚠️ and a banner
 * lists the reasons — the message still comes through so nothing is lost.
 */
export function notificationEmail(
  data: ContactPayload,
  moderation?: ModerationResult,
): EmailContent {
  const name = escapeHtml(data.name);
  const phone = data.phone
    ? `<a href="tel:${escapeHtml(data.phone)}" style="color:#111111;">${escapeHtml(data.phone)}</a>`
    : "—";
  const email = escapeHtml(data.email);
  const message = escapeHtml(data.message).replaceAll("\n", "<br />");

  const flagged = moderation?.verdict === "flag";
  const reasons = moderation?.reasons.map(escapeHtml).join(", ") ?? "";
  const banner = flagged
    ? `<div style="margin:0 0 24px;padding:12px 16px;border:1px solid #e0a23d;background:#fff7e6;border-radius:10px;font-size:14px;color:#8a5a00;line-height:1.5;">
        <strong>⚠️ Mensagem marcada automaticamente</strong><br />
        Motivos: ${reasons}. Pode ser spam ou conteúdo abusivo — confirma antes de responder.
      </div>`
    : "";

  return {
    subject: `${flagged ? "⚠️ [Verificar] " : ""}Nova mensagem de ${data.name}`,
    html: layout(`
      ${banner}
      <h1 style="margin:0 0 24px;font-size:22px;">Nova mensagem pelo site</h1>
      <p style="margin:0 0 4px;"><strong>Nome:</strong> ${name}</p>
      <p style="margin:0 0 4px;"><strong>Telemóvel:</strong> ${phone}</p>
      <p style="margin:0 0 4px;"><strong>Email:</strong> <a href="mailto:${email}" style="color:#111111;">${email}</a></p>
      <p style="margin:16px 0 4px;"><strong>Mensagem:</strong></p>
      <p style="margin:0;">${message}</p>
      <p style="margin:32px 0 0;font-size:14px;color:#555555;"><em>Responde a este email para falar diretamente com ${name}.</em></p>`),
    text: [
      ...(flagged ? [`⚠️ MARCADA AUTOMATICAMENTE — motivos: ${reasons}`, ""] : []),
      "Nova mensagem pelo site",
      "",
      `Nome: ${data.name}`,
      `Telemóvel: ${data.phone || "—"}`,
      `Email: ${data.email}`,
      "Mensagem:",
      data.message,
      "",
      `Responde a este email para falar diretamente com ${data.name}.`,
    ].join("\n"),
  };
}

const autoReplyCopy = {
  pt: {
    subject: "Recebemos a tua mensagem — Brigite's Studio",
    greeting: (name: string) => `Olá ${name},`,
    body: "A tua mensagem chegou. A Sara vai ler e entra em contacto contigo em breve.",
    instagram: "Entretanto, podes também falar com ela no Instagram:",
  },
  en: {
    subject: "We got your message — Brigite's Studio",
    greeting: (name: string) => `Hi ${name},`,
    body: "Your message is in. Sara will read it and get back to you shortly.",
    instagram: "In the meantime, you can also reach her on Instagram:",
  },
} as const;

/** Confirmation to the visitor, in the locale the site was being read in. */
export function autoReplyEmail(data: ContactPayload, locale: Locale): EmailContent {
  const copy = autoReplyCopy[locale];
  const name = escapeHtml(data.name);

  return {
    subject: copy.subject,
    html: layout(`
      <p style="margin:0 0 16px;">${copy.greeting(name)}</p>
      <p style="margin:0 0 16px;">${copy.body}</p>
      <p style="margin:0 0 16px;">${copy.instagram} <a href="${site.social.instagram}" style="color:#111111;">@brigitecircus</a></p>
      <p style="margin:0;">— Brigite&#39;s Studio</p>`),
    text: [
      copy.greeting(data.name),
      "",
      copy.body,
      `${copy.instagram} ${site.social.instagram}`,
      "",
      "— Brigite's Studio",
    ].join("\n"),
  };
}
