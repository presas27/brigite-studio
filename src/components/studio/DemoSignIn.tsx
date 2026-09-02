"use client";

import { useTranslations } from "next-intl";
import { authClient } from "@/lib/auth-client";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/lib/studio/pilot";
import { buttonGhost, buttonPrimary, eyebrow, muted } from "./theme";

/**
 * Quick sign-in for a demo deployment: one button per provisioned account.
 *
 * Nothing here bypasses anything — each button signs in with the account's
 * real (shared, published) password, so the deployment sees an ordinary
 * sign-in. The page only renders this when the deployment runs with
 * `STUDIO_DEMO=1`; on a real deployment the accounts change their passwords
 * and the buttons are gone.
 */
export function DemoSignIn() {
  const t = useTranslations("Studio.signIn");

  async function enter(email: string) {
    const result = await authClient.signIn.email({ email, password: DEMO_PASSWORD });
    if (result.error) return;
    window.location.assign("/app");
  }

  return (
    <div className="mt-6 border-t border-cream/10 pt-6">
      <p className={eyebrow}>{t("demoTitle")}</p>
      <p className={`mt-2 ${muted}`}>{t("demoLead")}</p>
      <div className="mt-4 space-y-2">
        {DEMO_ACCOUNTS.map((account, index) => {
          const chair =
            account.role === "coach" ? "coach" : account.coachEmail ? "coached" : "solo";
          return (
            <button
              key={account.email}
              type="button"
              onClick={() => void enter(account.email)}
              className={`${index === 0 ? buttonPrimary : buttonGhost} w-full`}
            >
              {t("demoAs", { name: account.name.split(" ")[0] })} · {t(`demoRole.${chair}`)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
