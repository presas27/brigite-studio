import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { DemoSignIn } from "@/components/studio/DemoSignIn";
import { InstallApp } from "@/components/studio/InstallApp";
import { SignInForm } from "@/components/studio/SignInForm";
import { SignUpForm } from "@/components/studio/SignUpForm";
import { heading, muted } from "@/components/studio/theme";
import { SolMark } from "@/components/ui/SolMark";
import { session } from "@/lib/studio/auth";

export const metadata: Metadata = {
  title: "Entrar",
  robots: { index: false, follow: false },
};

/**
 * Sign-in and sign-up, one screen with two faces (`?criar=1` shows the second).
 * The only publicly reachable page under `/app` besides an invite link, and
 * the only one with a link back to the marketing site.
 *
 * This is the app's one full-bleed gold moment — same layered hero gradient as
 * the site's opening screen, with the content on an ink card floating over it.
 * Inside the app itself the gradient is rationed to a single surface per screen.
 */
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ criar?: string; next?: string; email?: string }>;
}) {
  const current = await session();
  if (current.state === "ready") {
    redirect(current.user.role === "coach" ? "/app/coach" : "/app/aluno");
  }
  if (current.state === "new") redirect("/app/comecar");

  const { criar, next, email } = await searchParams;
  const creating = criar === "1";
  // Only ever send people somewhere inside the app after signing in.
  const safeNext = next && next.startsWith("/app/") ? next : "/app";

  const [t, tSignUp] = await Promise.all([
    getTranslations("Studio.signIn"),
    getTranslations("Studio.signUp"),
  ]);

  return (
    <div className="gradient-hero grain relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-12">
      <div className="relative w-full max-w-md rounded-[1.5rem] bg-ink p-8 shadow-[0_40px_80px_-32px_rgba(18,17,20,0.65)] ring-1 ring-cream/10 sm:p-10">
        <p className="mb-6 flex items-center gap-2 font-display text-sm uppercase tracking-[0.1em] text-accent-ink">
          <SolMark className="h-4 w-4" />
          Brigite&rsquo;s Studio
        </p>

        {creating ? (
          <>
            <h1 className={`${heading} text-[2rem] text-cream`}>{tSignUp("title")}</h1>
            <p className={`mt-2 ${muted}`}>{tSignUp("lead")}</p>
            <div className="mt-6">
              <SignUpForm next={safeNext === "/app" ? undefined : safeNext} />
            </div>
            <p className="mt-6 font-sans text-xs text-cream/50">
              {t("haveAccount")}{" "}
              <Link href="/app/entrar" className="link-grow text-cream">
                {t("submit")}
              </Link>
            </p>
          </>
        ) : (
          <>
            <h1 className={`${heading} text-[2rem] text-cream`}>{t("title")}</h1>
            <p className={`mt-2 ${muted}`}>{t("lead")}</p>
            <div className="mt-6">
              <SignInForm next={safeNext} email={email} />
            </div>
            {process.env.STUDIO_DEMO === "1" && <DemoSignIn />}
            <InstallApp className="mt-6 border-t border-cream/10 pt-6" />
          </>
        )}

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
