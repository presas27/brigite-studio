"use client";

import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useTranslations } from "next-intl";
import { Field } from "./Field";
import { SubmitButton } from "./SubmitButton";
import { field, muted } from "./theme";

/**
 * Sign-in form. One field, one button.
 *
 * Signing in happens from the browser rather than from a Server Action: the
 * thing that changes is the browser's own auth cookies, and Convex Auth's
 * `signIn` is what sets them.
 *
 * The answer is always the same once the address parses — "if this address has
 * access, the link is on its way". The deployment decides whether to send
 * anything (`convex/auth.ts`), and it never tells the page, because that would
 * make this form a way to ask the studio who its clients are.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type State = "idle" | "sent" | "invalid";

export function SignInForm() {
  const t = useTranslations("Studio.signIn");
  const errors = useTranslations("Studio.errors");
  const { signIn } = useAuthActions();
  const [state, setState] = useState<State>("idle");

  if (state === "sent") {
    // No card of its own — the page already puts this on an ink card floating
    // over the hero gradient, and a card inside a card reads as a mistake.
    return (
      <div className="rounded-[1rem] bg-cream/5 p-5 ring-1 ring-cream/10">
        <p className="font-sans text-base font-semibold text-cream">{t("sentTitle")}</p>
        <p className={`mt-2 ${muted}`}>{t("sentLead")}</p>
      </div>
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
        if (!EMAIL_RE.test(email) || email.length > 320) {
          setState("invalid");
          return;
        }
        // A refusal on the deployment side is silent by design, so the only way
        // this rejects is the network. Same message either way.
        await signIn("resend-magic-link", { email, redirectTo: "/app" }).catch(() => {});
        setState("sent");
      }}
    >
      <Field
        label={t("emailLabel")}
        htmlFor="studio-email"
        error={state === "invalid" ? errors("badEmail") : undefined}
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
