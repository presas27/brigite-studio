import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ResetPasswordForm } from "@/components/studio/ResetPasswordForm";
import { heading, muted } from "@/components/studio/theme";
import { SolMark } from "@/components/ui/SolMark";

export const metadata: Metadata = {
  title: "Nova palavra-passe",
  robots: { index: false, follow: false },
};

/** Where the password-reset email sends people. Public: the token is the proof. */
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;
  const t = await getTranslations("Studio.signIn");

  return (
    <div className="gradient-hero grain relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-[max(1rem,env(safe-area-inset-left))] pt-[calc(3rem+env(safe-area-inset-top))] pb-[calc(3rem+env(safe-area-inset-bottom))]">
      <div className="relative w-full max-w-md rounded-[1.5rem] bg-ink p-8 shadow-[0_40px_80px_-32px_rgba(18,17,20,0.65)] ring-1 ring-cream/10 sm:p-10">
        <p className="mb-6 flex items-center gap-2 font-display text-sm uppercase tracking-[0.1em] text-accent-ink">
          <SolMark className="h-4 w-4" />
          Brigite&rsquo;s Studio
        </p>
        <h1 className={`${heading} text-[2rem] text-cream`}>{t("resetTitle")}</h1>
        <p className={`mt-2 ${muted}`}>{t("resetLead")}</p>
        <div className="mt-6">
          {token && !error ? (
            <ResetPasswordForm token={token} />
          ) : (
            <p className={muted}>{t("resetInvalid")}</p>
          )}
        </div>
      </div>
    </div>
  );
}
