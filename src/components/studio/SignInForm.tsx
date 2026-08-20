"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { requestSignInLink, type SignInState } from "@/app/app/actions";
import { Field } from "./Field";
import { SubmitButton } from "./SubmitButton";
import { field, muted } from "./theme";

const initial: SignInState = { status: "idle" };

/**
 * Sign-in form. One field, one button.
 *
 * `devUrl` only ever arrives when the server could not send mail (no
 * `RESEND_API_KEY`), and is rendered so the flow stays walkable in development
 * without silently pretending an email went out.
 */
export function SignInForm() {
  const t = useTranslations("Studio.signIn");
  const errors = useTranslations("Studio.errors");
  const [state, formAction] = useActionState(requestSignInLink, initial);

  // No card of its own — the page already puts this on an ink card floating over
  // the hero gradient, and a card inside a card reads as a mistake.
  if (state.status === "sent") {
    return (
      <div className="rounded-[1rem] bg-cream/5 p-5 ring-1 ring-cream/10">
        <p className="font-sans text-base font-semibold text-cream">{t("sentTitle")}</p>
        <p className={`mt-2 ${muted}`}>{t("sentLead")}</p>
        {state.devUrl && (
          <p className="mt-4 border-t border-cream/10 pt-4 font-mono text-xs break-all text-accent-ink">
            <span className="mb-1 block text-cream/45">{t("devLink")}</span>
            <a className="underline" href={state.devUrl}>
              {state.devUrl}
            </a>
          </p>
        )}
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <Field
        label={t("emailLabel")}
        htmlFor="studio-email"
        error={state.status === "invalid" ? errors("badEmail") : undefined}
      >
        <input
          id="studio-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          placeholder={t("emailPlaceholder")}
          className={field}
        />
      </Field>
      <SubmitButton pendingLabel={t("sending")} className="w-full">
        {t("submit")}
      </SubmitButton>
    </form>
  );
}
