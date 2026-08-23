import { Resend } from "resend";
import type { Locale } from "@/i18n/config";
import { site } from "@/lib/site";

/**
 * Transactional email for the studio app. Only two messages exist: the sign-in
 * link and the invite (same link, different framing), both plain inline-styled
 * HTML to match `src/lib/emails.ts`.
 *
 * Without `RESEND_API_KEY` the link is logged to the server console instead of
 * being sent. That is deliberate: the app stays fully usable in development and
 * the failure mode is visible rather than silent.
 */

const FROM = "Brigite's Studio <site@brigitestudio.com>";

const copy = {
  pt: {
    signInSubject: "O teu acesso ao Brigite's Studio",
    inviteSubject: "A Sara convidou-te para o Brigite's Studio",
    signInLead: "Toca no botão para entrares. O link é válido durante 20 minutos.",
    inviteLead:
      "A Sara criou-te acesso à área de treino. Toca no botão para entrares — o link é válido durante 20 minutos.",
    cta: "Entrar",
    ignore: "Se não foste tu a pedir isto, ignora este email.",
  },
  en: {
    signInSubject: "Your Brigite's Studio sign-in link",
    inviteSubject: "Sara invited you to Brigite's Studio",
    signInLead: "Tap the button to sign in. The link is valid for 20 minutes.",
    inviteLead:
      "Sara set up your training area. Tap the button to sign in — the link is valid for 20 minutes.",
    cta: "Sign in",
    ignore: "If you did not request this, ignore this email.",
  },
} as const;

function layout(name: string, lead: string, url: string, cta: string, ignore: string): string {
  return `<div style="margin:0;padding:32px 16px;background:#121114;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
  <div style="max-width:480px;margin:0 auto;background:#1c1a1e;border-radius:20px;padding:32px;color:#efe3d8">
    <p style="margin:0 0 24px;font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:#9e8375">Brigite's Studio</p>
    <p style="margin:0 0 8px;font-size:20px;line-height:1.3">Olá, ${name}.</p>
    <p style="margin:0 0 28px;font-size:15px;line-height:1.6;color:rgba(239,227,216,.75)">${lead}</p>
    <a href="${url}" style="display:inline-block;background:#efe3d8;color:#121114;text-decoration:none;font-weight:600;font-size:15px;padding:14px 28px;border-radius:999px">${cta}</a>
    <p style="margin:28px 0 0;font-size:12px;line-height:1.6;color:rgba(239,227,216,.45)">${ignore}</p>
  </div>
</div>`;
}

/**
 * Send a sign-in link. `invite` only changes the wording. Returns the URL so
 * the caller can surface it in development.
 *
 * `origin` should be the origin of the request that asked for the link. Using
 * it rather than the canonical site URL means the link works from a dev server
 * on any port and from a Vercel preview deployment, instead of always bouncing
 * the visitor to production.
 */
export async function sendSignInLink(input: {
  to: string;
  name: string;
  token: string;
  locale: Locale;
  invite?: boolean;
  origin?: string;
}): Promise<{ sent: boolean; url: string }> {
  const base = input.origin ?? process.env.NEXT_PUBLIC_SITE_URL ?? site.url;
  const url = `${base}/app/entrar/verificar?token=${encodeURIComponent(input.token)}`;
  const words = copy[input.locale] ?? copy.pt;
  const subject = input.invite ? words.inviteSubject : words.signInSubject;
  const lead = input.invite ? words.inviteLead : words.signInLead;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.info(`[studio] sign-in link for ${input.to}: ${url}`);
    return { sent: false, url };
  }

  try {
    await new Resend(apiKey).emails.send({
      from: FROM,
      to: input.to,
      subject,
      html: layout(input.name, lead, url, words.cta, words.ignore),
      text: `${lead}\n\n${url}\n\n${words.ignore}`,
    });
    return { sent: true, url };
  } catch (err) {
    console.error("[studio] sign-in email failed", err);
    return { sent: false, url };
  }
}
