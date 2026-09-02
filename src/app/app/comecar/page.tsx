import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { OnboardingForm } from "@/components/studio/OnboardingForm";
import { heading, muted } from "@/components/studio/theme";
import { SolMark } from "@/components/ui/SolMark";
import { session } from "@/lib/studio/auth";

export const metadata: Metadata = {
  title: "Quase lá",
  robots: { index: false, follow: false },
};

/**
 * Where a login without a studio account lands. Reached when the second step
 * of signing up did not run (a closed tab, a lost connection) — every gate in
 * `src/lib/studio/auth.ts` sends such a session here rather than back to the
 * sign-in page it just came from.
 */
export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ convite?: string }>;
}) {
  const current = await session();
  if (current.state === "anonymous") redirect("/app/entrar");
  if (current.state === "ready") {
    redirect(current.user.role === "coach" ? "/app/coach" : "/app/aluno");
  }

  const { convite } = await searchParams;
  const t = await getTranslations("Studio.onboarding");

  return (
    <div className="gradient-hero grain relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-[max(1rem,env(safe-area-inset-left))] pt-[calc(3rem+env(safe-area-inset-top))] pb-[calc(3rem+env(safe-area-inset-bottom))]">
      <div className="relative w-full max-w-md rounded-[1.5rem] bg-ink p-8 shadow-[0_40px_80px_-32px_rgba(18,17,20,0.65)] ring-1 ring-cream/10 sm:p-10">
        <p className="mb-6 flex items-center gap-2 font-display text-sm uppercase tracking-[0.1em] text-accent-ink">
          <SolMark className="h-4 w-4" />
          Brigite&rsquo;s Studio
        </p>
        <h1 className={`${heading} text-[2rem] text-cream`}>{t("title")}</h1>
        <p className={`mt-2 ${muted}`}>{t("lead")}</p>
        <div className="mt-6">
          <OnboardingForm email={current.email} inviteToken={convite} />
        </div>
      </div>
    </div>
  );
}
