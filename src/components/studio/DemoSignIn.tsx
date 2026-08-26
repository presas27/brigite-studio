"use client";

import { useRouter } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { useTranslations } from "next-intl";
import { COACH_EMAIL, PILOT_CLIENTS } from "@/lib/studio/pilot";
import { buttonGhost, buttonPrimary, eyebrow, muted } from "./theme";

/**
 * Quick sign-in for the pilot: one button per seeded account, no mailbox.
 *
 * Sara needs to land in either chair while she is being shown the app, and so
 * does whoever is watching. The button is inert unless the *deployment* sets
 * `STUDIO_DEMO=1` — the check that matters is in `convex/auth.ts`, which only
 * hands a session to an address on this roster. Hiding the buttons here is
 * cosmetic; refusing the session there is the rule.
 */
export function DemoSignIn() {
  const t = useTranslations("Studio.signIn");
  const { signIn } = useAuthActions();
  const router = useRouter();

  async function enter(email: string) {
    await signIn("demo", { email });
    router.push("/app");
  }

  return (
    <div className="mt-6 border-t border-cream/10 pt-6">
      <p className={eyebrow}>{t("demoTitle")}</p>
      <p className={`mt-2 ${muted}`}>{t("demoLead")}</p>
      <div className="mt-4 space-y-2">
        <button
          type="button"
          onClick={() => void enter(COACH_EMAIL)}
          className={`${buttonPrimary} w-full`}
        >
          {t("demoAsCoach")}
        </button>
        {PILOT_CLIENTS.map((client) => (
          <button
            key={client.email}
            type="button"
            onClick={() => void enter(client.email)}
            className={`${buttonGhost} w-full`}
          >
            {t("demoAsClient", { name: client.name.split(" ")[0] })}
          </button>
        ))}
      </div>
    </div>
  );
}
