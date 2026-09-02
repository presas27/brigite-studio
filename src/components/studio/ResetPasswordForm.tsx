"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { authClient } from "@/lib/auth-client";
import { Field } from "./Field";
import { SubmitButton } from "./SubmitButton";
import { buttonPrimary, field, muted } from "./theme";

const MIN_PASSWORD = 8;

/** The form behind the link a password-reset email carries. */
export function ResetPasswordForm({ token }: { token: string }) {
  const t = useTranslations("Studio.signIn");
  const tSignUp = useTranslations("Studio.signUp");
  const [state, setState] = useState<"idle" | "weak" | "invalid" | "done">("idle");

  if (state === "done") {
    return (
      <div className="space-y-4">
        <p className={muted}>{t("resetDone")}</p>
        <Link href="/app/entrar" className={buttonPrimary}>
          {t("submit")}
        </Link>
      </div>
    );
  }

  return (
    <form
      className="space-y-4"
      action={async (formData) => {
        const newPassword = String(formData.get("password") ?? "");
        if (newPassword.length < MIN_PASSWORD) {
          setState("weak");
          return;
        }
        const result = await authClient.resetPassword({ newPassword, token });
        setState(result.error ? "invalid" : "done");
      }}
    >
      <Field
        label={t("passwordLabel")}
        htmlFor="reset-password"
        hint={tSignUp("passwordHint")}
        error={
          state === "weak" ? tSignUp("weakPassword") : state === "invalid" ? t("resetInvalid") : undefined
        }
      >
        <input
          id="reset-password"
          name="password"
          type="password"
          required
          minLength={MIN_PASSWORD}
          autoComplete="new-password"
          className={field}
        />
      </Field>
      <SubmitButton pendingLabel={t("sending")} className="w-full">
        {t("resetSubmit")}
      </SubmitButton>
    </form>
  );
}
