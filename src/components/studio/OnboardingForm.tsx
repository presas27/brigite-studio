"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { registerAccount, resendPendingInvite, type AuthFailure } from "@/app/app/entrar/actions";
import { authClient } from "@/lib/auth-client";
import type { Role } from "@/lib/studio/types";
import { cn } from "@/lib/utils";
import { SubmitButton } from "./SubmitButton";
import { buttonQuiet, muted } from "./theme";

/**
 * Finish a sign-up whose second step never ran: the login exists, the studio
 * account does not. Same choice the sign-up form offers, nothing else to type.
 */
export function OnboardingForm({ email, inviteToken }: { email: string; inviteToken?: string }) {
  const t = useTranslations("Studio.signUp");
  const tOnboarding = useTranslations("Studio.onboarding");
  const errors = useTranslations("Studio.errors");
  const [role, setRole] = useState<Role>("client");
  const [failure, setFailure] = useState<AuthFailure | null>(null);
  const [resent, setResent] = useState(false);

  return (
    <form
      className="space-y-4"
      action={async () => {
        const result = await registerAccount({ role: inviteToken ? "client" : role, inviteToken });
        if (!result.ok) {
          setFailure(result.code);
          return;
        }
        window.location.assign(result.role === "coach" ? "/app/coach" : "/app/aluno");
      }}
    >
      <p className={muted}>{tOnboarding("signedInAs", { email })}</p>

      {!inviteToken && (
        <fieldset className="space-y-2">
          <legend className="font-sans text-xs font-medium text-cream/55">{t("roleLabel")}</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {(["client", "coach"] as const).map((option) => (
              <label
                key={option}
                className={cn(
                  "cursor-pointer rounded-[1rem] p-4 ring-1 transition-colors",
                  role === option
                    ? "bg-cream/10 ring-accent-ink/70"
                    : "bg-cream/5 ring-cream/15 hover:ring-cream/30",
                )}
              >
                <input
                  type="radio"
                  name="role"
                  value={option}
                  checked={role === option}
                  onChange={() => setRole(option)}
                  className="sr-only"
                />
                <span className="block font-sans text-sm font-semibold text-cream">
                  {t(`role.${option}`)}
                </span>
                <span className="mt-1 block font-sans text-xs leading-relaxed text-cream/55">
                  {t(`role.${option}Hint`)}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {failure === "INVITE_PENDING" && (
        <div className="space-y-2 rounded-[1rem] bg-cream/5 p-4 ring-1 ring-cream/10" role="alert">
          <p className={muted}>{t("invitePending")}</p>
          {resent ? (
            <p className="font-sans text-xs text-cream/55">{t("inviteResent")}</p>
          ) : (
            <button
              type="button"
              className={buttonQuiet}
              onClick={async () => {
                await resendPendingInvite(email);
                setResent(true);
              }}
            >
              {t("resendInvite")}
            </button>
          )}
        </div>
      )}
      {failure && failure !== "INVITE_PENDING" && (
        <p className="font-sans text-sm text-silk" role="alert">
          {errors("generic")}
        </p>
      )}

      <SubmitButton pendingLabel={t("creating")} className="w-full">
        {t("submit")}
      </SubmitButton>

      <button
        type="button"
        className={buttonQuiet}
        onClick={async () => {
          await authClient.signOut();
          window.location.assign("/app/entrar");
        }}
      >
        {tOnboarding("switchAccount")}
      </button>
    </form>
  );
}
