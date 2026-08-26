import { Resend } from "resend";
import type { Locale } from "@/i18n/config";
import { site } from "@/lib/site";

/**
 * Transactional email for the studio app. One message: the invite Sara sends
 * when she adds someone, in plain inline-styled HTML to match
 * `src/lib/emails.ts`.
 *
 * The sign-in link is not here any more, and cannot be: Convex Auth mints it
 * and mails it from the deployment (`convex/auth.ts`), which is the only place
 * that can hold a single-use token honestly. So an invite no longer carries a
 * link to a session — it tells a new client that an account exists and where to
 * ask for their own link. Nobody, not even the coach, can mint a way into
 * somebody else's account.
 *
 * Without `RESEND_API_KEY` the invite is logged to the server console instead of
 * being sent. That is deliberate: the app stays fully usable in development and
 * the failure mode is visible rather than silent.
 */

const FROM = "Brigite's Studio <site@brigitestudio.com>";

const copy = {
  pt: {
    subject: "A Sara convidou-te para o Brigite's Studio",
    lead: "A Sara criou-te acesso à área de treino. Entra com este email — recebes um link de acesso válido durante 20 minutos.",
    cta: "Entrar",
    ignore: "Se não esperavas isto, ignora este email.",
  },
  en: {
    subject: "Sara invited you to Brigite's Studio",
    lead: "Sara set up your training area. Sign in with this address — you will get an access link valid for 20 minutes.",
    cta: "Sign in",
    ignore: "If you were not expecting this, ignore this email.",
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
 * Tell someone their account exists. Returns the URL so the caller can surface
 * it in development.
 *
 * `origin` should be the origin of the request that asked for it. Using it
 * rather than the canonical site URL means the invite works from a dev server on
 * any port and from a preview deployment, instead of always pointing the new
 * client at production.
 */
export async function sendInvite(input: {
  to: string;
  name: string;
  locale: Locale;
  origin?: string;
}): Promise<{ sent: boolean; url: string }> {
  const base = input.origin ?? process.env.NEXT_PUBLIC_SITE_URL ?? site.url;
  const url = `${base}/app/entrar`;
  const words = copy[input.locale] ?? copy.pt;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.info(`[studio] invite for ${input.to}: ${url}`);
    return { sent: false, url };
  }

  try {
    await new Resend(apiKey).emails.send({
      from: FROM,
      to: input.to,
      subject: words.subject,
      html: layout(input.name, words.lead, url, words.cta, words.ignore),
      text: `${words.lead}\n\n${url}\n\n${words.ignore}`,
    });
    return { sent: true, url };
  } catch (err) {
    console.error("[studio] invite email failed", err);
    return { sent: false, url };
  }
}
