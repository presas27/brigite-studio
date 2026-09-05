"use client";

import { useState } from "react";
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
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  async function enter(email: string) {
    setError(null);
    setPending(email);
    const result = await authClient.signIn.email({ email, password: DEMO_PASSWORD });
    if (result.error) {
      setPending(null);
      setError(t("wrongCredentials"));
      return;
    }
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
              disabled={pending !== null}
              onClick={() => void enter(account.email)}
              className={`${index === 0 ? buttonPrimary : buttonGhost} w-full`}
            >
              {pending === account.email
                ? t("sending")
                : `${t("demoAs", { name: account.name.split(" ")[0] })} · ${t(`demoRole.${chair}`)}`}
            </button>
          );
        })}
      </div>
      {error ? (
        <p className="mt-3 font-sans text-xs text-silk" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
