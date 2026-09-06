import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { IntakeForm } from "@/components/studio/intake/IntakeForm";
import { SolMark } from "@/components/ui/SolMark";
import { session } from "@/lib/studio/auth";
import { myPendingIntake } from "@/lib/studio/intake";

export const metadata: Metadata = {
  title: "Inscrição",
  robots: { index: false, follow: false },
};

/**
 * The client onboarding screen.
 * Appears automatically after account creation and before granting access to
 * the app's main dashboard. Filling and consenting to this form is mandatory.
 */
export default async function OnboardingPage() {
  const current = await session();
  if (current.state === "anonymous") redirect("/app/entrar");
  if (current.state === "new") redirect("/app/comecar");
  if (current.user.role === "coach") redirect("/app/coach");

  const pending = await myPendingIntake().catch(() => null);
  if (!pending) {
    redirect("/app/aluno");
  }
  return (
    <div className="gradient-hero grain relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-[max(1rem,env(safe-area-inset-left))] pt-[calc(3rem+env(safe-area-inset-top))] pb-[calc(3rem+env(safe-area-inset-bottom))]">
      <div className="relative w-full max-w-xl rounded-[1.5rem] bg-ink p-6 shadow-[0_40px_80px_-32px_rgba(18,17,20,0.65)] ring-1 ring-cream/10 sm:p-10">
        <p className="mb-6 flex items-center gap-2 font-display text-sm uppercase tracking-[0.1em] text-accent-ink">
          <SolMark className="h-4 w-4" />
          Brigite&rsquo;s Studio
        </p>

        <IntakeForm
          token={pending.token}
          title={pending.form.title}
          intro={pending.form.intro}
          fields={pending.form.fields}
          defaultEmail={current.user.email}
          defaultName={current.user.name}
        />
      </div>
    </div>
  );
}
