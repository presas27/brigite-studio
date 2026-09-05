import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalAction, internalQuery, type ActionCtx } from "./_generated/server";

/**
 * Every email the app sends, sent from the deployment.
 *
 * One key, `RESEND_API_KEY`, set on the Convex deployment — not on Vercel —
 * because the two things that send mail (an invite, a password reset) are both
 * decided here: the invite is minted by a mutation and the reset link by Better
 * Auth, and neither should hand a secret URL back to a browser to be mailed
 * from somewhere else.
 *
 * Without the key the message is written to the deployment's logs instead.
 * That is how the flows stay walkable on a dev deployment, and the log is the
 * right place for it: a link printed into an HTTP response would be a link
 * anyone watching the wire could use.
 *
 * Resend over plain HTTP rather than its SDK: this runs in the Convex runtime,
 * and one POST does not justify pulling a package into the bundle.
 */

const FROM_FALLBACK = "Brigite's Studio <ola@brigitestudio.com>";

const copy = {
  pt: {
    invite: {
      subject: (coach: string) => `${coach} convidou-te para o Brigite's Studio`,
      lead: (coach: string) =>
        `${coach} quer treinar-te no Brigite's Studio. Abre o link para criares a tua conta e responderes ao formulário — só depois ficas associado.`,
      cta: "Aceitar o convite",
      note: (days: number) => `O link é válido durante ${days} dias.`,
    },
    reset: {
      subject: "Repor a palavra-passe",
      lead: "Pediste para repor a tua palavra-passe. Abre o link para escolheres uma nova.",
      cta: "Escolher nova palavra-passe",
      note: "O link é válido durante uma hora e só funciona uma vez.",
    },
    ignore: "Se não esperavas este email, ignora-o.",
  },
  en: {
    invite: {
      subject: (coach: string) => `${coach} invited you to Brigite's Studio`,
      lead: (coach: string) =>
        `${coach} wants to train you on Brigite's Studio. Open the link to create your account and fill in the form — you only join after that.`,
      cta: "Accept the invite",
      note: (days: number) => `The link is valid for ${days} days.`,
    },
    reset: {
      subject: "Reset your password",
      lead: "You asked to reset your password. Open the link to choose a new one.",
      cta: "Choose a new password",
      note: "The link is valid for one hour and works once.",
    },
    ignore: "If you were not expecting this email, ignore it.",
  },
} as const;

type Locale = keyof typeof copy;

function layout(input: { name: string; lead: string; url: string; cta: string; note: string; ignore: string }) {
  return `<div style="margin:0;padding:32px 16px;background:#121114;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
  <div style="max-width:480px;margin:0 auto;background:#1c1a1e;border-radius:20px;padding:32px;color:#efe3d8">
    <p style="margin:0 0 24px;font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:#9e8375">Brigite's Studio</p>
    <p style="margin:0 0 8px;font-size:20px;line-height:1.3">Olá, ${escapeHtml(input.name)}.</p>
    <p style="margin:0 0 28px;font-size:15px;line-height:1.6;color:rgba(239,227,216,.75)">${escapeHtml(input.lead)}</p>
    <a href="${input.url}" style="display:inline-block;background:#efe3d8;color:#121114;text-decoration:none;font-weight:600;font-size:15px;padding:14px 28px;border-radius:999px">${escapeHtml(input.cta)}</a>
    <p style="margin:20px 0 0;font-size:12px;line-height:1.6;color:rgba(239,227,216,.6)">${escapeHtml(input.note)}</p>
    <p style="margin:12px 0 0;font-size:12px;line-height:1.6;color:rgba(239,227,216,.45)">${escapeHtml(input.ignore)}</p>
  </div>
</div>`;
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

/** Send one message, or log it when the deployment has no key. */
async function send(message: {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Lets a retried delivery not send twice. */
  idempotencyKey: string;
}): Promise<{ sent: boolean }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.info(`[studio] email to ${message.to} (no RESEND_API_KEY):\n${message.text}`);
    return { sent: false };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "Idempotency-Key": message.idempotencyKey,
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? FROM_FALLBACK,
      to: [message.to],
      subject: message.subject,
      html: message.html,
      text: message.text,
    }),
  });

  if (!response.ok) {
    // The body carries Resend's reason; without it a failure to send is
    // indistinguishable from a wrong address.
    throw new Error(`Resend refused the email: ${response.status} ${await response.text()}`);
  }
  return { sent: true };
}

/* ------------------------------------------------------------------ resets */

/** Called by Better Auth from the HTTP action that handles the reset request. */
export async function deliverPasswordReset(
  _ctx: ActionCtx,
  input: { to: string; name: string; url: string },
): Promise<void> {
  const words = copy.pt;
  await send({
    to: input.to,
    subject: words.reset.subject,
    html: layout({
      name: input.name,
      lead: words.reset.lead,
      url: input.url,
      cta: words.reset.cta,
      note: words.reset.note,
      ignore: words.ignore,
    }),
    text: `${words.reset.lead}\n\n${input.url}\n\n${words.reset.note}\n${words.ignore}`,
    idempotencyKey: `reset:${input.url.slice(-32)}`,
  });
}

/* ----------------------------------------------------------------- invites */

/** Everything the invite email needs, read in one query. */
export const inviteForEmail = internalQuery({
  args: { inviteId: v.id("invites") },
  handler: async (ctx, { inviteId }) => {
    const invite = await ctx.db.get("invites", inviteId);
    if (!invite || invite.status !== "pending") return null;
    const [coach, client] = await Promise.all([
      ctx.db.get("users", invite.coachId),
      ctx.db.get("users", invite.clientId),
    ]);
    if (!coach || !client) return null;
    return {
      email: invite.email,
      token: invite.token,
      expiresAt: invite.expiresAt,
      coachName: coach.name,
      clientName: client.name,
      locale: client.locale,
    };
  },
});

/**
 * Mail one invite. Scheduled by the mutation that minted it, so the mutation
 * stays a transaction and the network call happens after it committed.
 */
export const deliverInvite = internalAction({
  args: { inviteId: v.id("invites") },
  handler: async (ctx, { inviteId }): Promise<null> => {
    const invite = await ctx.runQuery(internal.email.inviteForEmail, { inviteId });
    if (!invite) return null;

    const base = process.env.SITE_URL ?? "https://brigitestudio.com";
    const url = `${base}/app/convite/${invite.token}`;
    const days = Math.max(1, Math.round((invite.expiresAt - Date.now()) / 86_400_000));
    const words = copy[invite.locale as Locale] ?? copy.pt;

    await send({
      to: invite.email,
      subject: words.invite.subject(invite.coachName),
      html: layout({
        name: invite.clientName,
        lead: words.invite.lead(invite.coachName),
        url,
        cta: words.invite.cta,
        note: words.invite.note(days),
        ignore: words.ignore,
      }),
      text: `${words.invite.lead(invite.coachName)}\n\n${url}\n\n${words.invite.note(days)}\n${words.ignore}`,
      idempotencyKey: `invite:${inviteId as Id<"invites">}`,
    });
    return null;
  },
});
