import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { DemoSignIn } from "@/components/studio/DemoSignIn";
import { SignInForm } from "@/components/studio/SignInForm";
import { heading, muted } from "@/components/studio/theme";
import { SolMark } from "@/components/ui/SolMark";
import { currentUser } from "@/lib/studio/auth";

export const metadata: Metadata = {
  title: "Entrar",
  robots: { index: false, follow: false },
};

/**
 * Sign-in screen. The only publicly reachable page under `/app`, and the only
 * one with a link back to the marketing site.
 *
 * This is the app's one full-bleed gold moment — same layered hero gradient as
 * the site's opening screen, with the content on an ink card floating over it.
 * Inside the app itself the gradient is rationed to a single surface per screen.
 */
export default async function SignInPage() {
  const user = await currentUser();
  if (user) redirect(user.role === "coach" ? "/app/coach" : "/app/aluno");

  const t = await getTranslations("Studio.signIn");

  return (
    <div className="gradient-hero grain relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-12">
      <div className="relative w-full max-w-md rounded-[1.5rem] bg-ink p-8 shadow-[0_40px_80px_-32px_rgba(18,17,20,0.65)] ring-1 ring-cream/10 sm:p-10">
        <p className="mb-6 flex items-center gap-2 font-display text-sm uppercase tracking-[0.1em] text-accent-ink">
          <SolMark className="h-4 w-4" />
          Brigite&rsquo;s Studio
        </p>

        <h1 className={`${heading} text-[2rem] text-cream`}>{t("title")}</h1>
        <p className={`mt-2 ${muted}`}>{t("lead")}</p>


        <div className="mt-6">
          <SignInForm />
        </div>

        {process.env.STUDIO_DEMO === "1" && <DemoSignIn />}

        <Link
          href="/"
          className="link-grow mt-6 inline-block font-sans text-xs text-cream/50 transition-colors hover:text-cream"
        >
          {t("backToSite")}
        </Link>
      </div>
    </div>
  );
}
