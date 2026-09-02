"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { authClient } from "@/lib/auth-client";
import { Field } from "./Field";
import { SubmitButton } from "./SubmitButton";
import { buttonQuiet, field, muted } from "./theme";

/**
 * Sign-in: email and password, and a way to reset the password.
 *
 * Signing in happens from the browser rather than from a Server Action: the
 * thing that changes is the browser's own session cookie, and Better Auth's
 * client is what sets it (through `/api/auth`, so it stays first-party).
 *
 * `next` is where to go afterwards — `/app` normally, an invite link when the
 * visitor arrived from one.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Mode = "signin" | "forgot" | "forgotSent";

export function SignInForm({ next = "/app", email: presetEmail = "" }: { next?: string; email?: string }) {
  const t = useTranslations("Studio.signIn");
  const errors = useTranslations("Studio.errors");
  const [mode, setMode] = useState<Mode>("signin");
  const [error, setError] = useState<string | null>(null);

  if (mode === "forgotSent") {
    return (
      <div className="rounded-[1rem] bg-cream/5 p-5 ring-1 ring-cream/10">
        <p className={muted}>{t("forgotSent")}</p>
      </div>
    );
  }

  if (mode === "forgot") {
    return (
      <form
        className="space-y-4"
        action={async (formData) => {
          const email = String(formData.get("email") ?? "").trim();
          if (!EMAIL_RE.test(email)) {
            setError(errors("badEmail"));
            return;
          }
          // Silent on the deployment side by design: the answer is the same
          // whether or not the address has an account.
          await authClient.requestPasswordReset({ email, redirectTo: "/app/repor" }).catch(() => {});
          setMode("forgotSent");
        }}
      >
        <p className={muted}>{t("forgotLead")}</p>
        <Field label={t("emailLabel")} htmlFor="studio-email" error={error ?? undefined}>
          <input
            id="studio-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            defaultValue={presetEmail}
            className={field}
          />
        </Field>
        <SubmitButton pendingLabel={t("sending")} className="w-full">
          {t("forgotSubmit")}
        </SubmitButton>
        <button type="button" onClick={() => setMode("signin")} className={buttonQuiet}>
          {t("submit")}
        </button>
      </form>
    );
  }

  return (
    <form
      className="space-y-4"
      // A function passed straight to `action` runs on the client and still
      // drives `useFormStatus`, which is what `SubmitButton` reads — so the
      // button behaves here exactly as it does in every server-action form.
      action={async (formData) => {
        const email = String(formData.get("email") ?? "").trim();
        const password = String(formData.get("password") ?? "");
        if (!EMAIL_RE.test(email) || email.length > 320) {
          setError(errors("badEmail"));
          return;
        }
        setError(null);
        const result = await authClient.signIn.email({ email, password });
        if (result.error) {
          setError(t("wrongCredentials"));
          return;
        }
        window.location.assign(next);
      }}
    >
      <Field label={t("emailLabel")} htmlFor="studio-email">
        <input
          id="studio-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          placeholder={t("emailPlaceholder")}
          defaultValue={presetEmail}
          readOnly={Boolean(presetEmail)}
          className={field}
        />
      </Field>
      <Field label={t("passwordLabel")} htmlFor="studio-password" error={error ?? undefined}>
        <input
          id="studio-password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className={field}
        />
      </Field>
      <SubmitButton pendingLabel={t("sending")} className="w-full">
        {t("submit")}
      </SubmitButton>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button type="button" onClick={() => setMode("forgot")} className={buttonQuiet}>
          {t("forgot")}
        </button>
        <p className="font-sans text-xs text-cream/50">
          {t("noAccount")}{" "}
          <Link href={`/app/entrar?criar=1${next !== "/app" ? `&next=${encodeURIComponent(next)}` : ""}`} className="link-grow text-cream">
            {t("createAccount")}
          </Link>
        </p>
      </div>
    </form>
  );
}
