import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { api } from "@convex/_generated/api";
import { AcceptInvite, SwitchAccount } from "@/components/studio/AcceptInvite";
import { OnboardingForm } from "@/components/studio/OnboardingForm";
import { SignUpForm } from "@/components/studio/SignUpForm";
import { buttonGhost, buttonPrimary, heading, muted } from "@/components/studio/theme";
import { SolMark } from "@/components/ui/SolMark";
import { session } from "@/lib/studio/auth";
import { sq } from "@/lib/studio/convexServer";

export const metadata: Metadata = {
  title: "Convite",
  robots: { index: false, follow: false },
};

/**
 * An invite link. The token in the URL is the whole proof, so this page is
 * public — and what it shows depends on who, if anyone, is signed in:
 *
 * - nobody, and the invitee has no login yet: create one (email fixed).
 * - nobody, and they do: sign in, then come back here to accept.
 * - a login with no studio account: finish signing up, invite attached.
 * - the invited client: accept.
 * - anyone else: say so, and offer to switch.
 */
export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [invite, current, t] = await Promise.all([
    sq(api.users.inviteByToken, { token }),
    session(),
    getTranslations("Studio.invite"),
  ]);

  const here = `/app/convite/${token}`;

  let body: React.ReactNode;
  if (!invite) {
    body = <p className={muted}>{t("notFound")}</p>;
  } else if (invite.state === "expired") {
    body = <p className={muted}>{t("expired")}</p>;
  } else if (invite.state === "accepted") {
    body = (
      <div className="space-y-4">
        <p className={muted}>{t("alreadyAccepted")}</p>
        <Link href="/app" className={buttonGhost}>
          {t("goToApp")}
        </Link>
      </div>
    );
  } else if (current.state === "anonymous") {
    body = invite.hasAccount ? (
      <div className="space-y-4">
        <p className={muted}>{t("lead", { coach: invite.coachName })}</p>
        <Link
          href={`/app/entrar?next=${encodeURIComponent(here)}&email=${encodeURIComponent(invite.email)}`}
          className={`${buttonPrimary} w-full`}
        >
          {t("signInToAccept")}
        </Link>
      </div>
    ) : (
      <div className="space-y-6">
        <p className={muted}>{t("leadNew", { coach: invite.coachName })}</p>
        <SignUpForm inviteToken={token} lockedEmail={invite.email} defaultName={invite.name} />
        <p className="font-sans text-xs text-cream/50">
          {t("haveAccount")}{" "}
          <Link
            href={`/app/entrar?next=${encodeURIComponent(here)}&email=${encodeURIComponent(invite.email)}`}
            className="link-grow text-cream"
          >
            {t("signInToAccept")}
          </Link>
        </p>
      </div>
    );
  } else if (current.state === "new") {
    body =
      current.email.toLowerCase() === invite.email ? (
        <OnboardingForm email={current.email} inviteToken={token} />
      ) : (
        <div className="space-y-4">
          <p className={muted}>
            {t("wrongAccount", { email: current.email, invited: invite.email })}
          </p>
          <SwitchAccount next={here} />
        </div>
      );
  } else if (current.user.role === "coach") {
    body = (
      <div className="space-y-4">
        <p className={muted}>{t("coachAccount")}</p>
        <SwitchAccount next={here} />
      </div>
    );
  } else if (current.user.email.toLowerCase() !== invite.email) {
    body = (
      <div className="space-y-4">
        <p className={muted}>
          {t("wrongAccount", { email: current.user.email, invited: invite.email })}
        </p>
        <SwitchAccount next={here} />
      </div>
    );
  } else {
    body = (
      <div className="space-y-4">
        <p className={muted}>{t("lead", { coach: invite.coachName })}</p>
        <AcceptInvite token={token} />
      </div>
    );
  }

  return (
    <div className="gradient-hero grain relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-12">
      <div className="relative w-full max-w-md rounded-[1.5rem] bg-ink p-8 shadow-[0_40px_80px_-32px_rgba(18,17,20,0.65)] ring-1 ring-cream/10 sm:p-10">
        <p className="mb-6 flex items-center gap-2 font-display text-sm uppercase tracking-[0.1em] text-accent-ink">
          <SolMark className="h-4 w-4" />
          Brigite&rsquo;s Studio
        </p>
        <h1 className={`${heading} text-[2rem] text-cream`}>
          {invite ? t("title", { coach: invite.coachName }) : t("notFound")}
        </h1>
        <div className="mt-6">{body}</div>
      </div>
    </div>
  );
}
