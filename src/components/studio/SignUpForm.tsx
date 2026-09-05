"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { registerAccount, resendPendingInvite, type AuthFailure } from "@/app/app/entrar/actions";
import { authClient } from "@/lib/auth-client";
import type { Role } from "@/lib/studio/types";
import { cn } from "@/lib/utils";
import { Field } from "./Field";
import { SubmitButton } from "./SubmitButton";
import { buttonQuiet, field, muted } from "./theme";

/**
 * Create an account: who you are, which chair you sit in, a password.
 *
 * Two steps behind one button. Better Auth creates the login from the browser
 * (it is the browser's cookie that changes), then `registerAccount` — a Server
 * Action carrying that fresh session — writes the studio account with the
 * role. If the second step is refused the login still exists, and the next
 * page load sends the person to `/app/comecar` to finish; nothing is lost.
 *
 * From an invite link the email is fixed and the role is "client": the invite
 * says who this is for.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;

export function SignUpForm({
  inviteToken,
  lockedEmail,
  defaultName = "",
  next,
}: {
  inviteToken?: string;
  lockedEmail?: string;
  defaultName?: string;
  /** Where to go once the account exists. Defaults to the role's home. */
  next?: string;
}) {
  const t = useTranslations("Studio.signUp");
  const tSignIn = useTranslations("Studio.signIn");
  const tInvite = useTranslations("Studio.invite");
  const errors = useTranslations("Studio.errors");
  const [role, setRole] = useState<Role>("client");
  const [failure, setFailure] = useState<AuthFailure | "BAD_EMAIL" | "WEAK_PASSWORD" | null>(null);
  const [resent, setResent] = useState(false);
  const [email, setEmail] = useState(lockedEmail ?? "");

  const fromInvite = Boolean(inviteToken);

  return (
    <form
      className="space-y-4"
      action={async (formData) => {
        const name = String(formData.get("name") ?? "").trim();
        const address = (lockedEmail ?? String(formData.get("email") ?? "")).trim().toLowerCase();
        const password = String(formData.get("password") ?? "");
        setEmail(address);
        if (!name) return;
        if (!EMAIL_RE.test(address) || address.length > 320) {
          setFailure("BAD_EMAIL");
          return;
        }
        if (password.length < MIN_PASSWORD) {
          setFailure("WEAK_PASSWORD");
          return;
        }
        setFailure(null);

        const signedUp = await authClient.signUp.email({ email: address, password, name });
        if (signedUp.error) {
          // Better Auth refuses a duplicate address; anything else is a network
          // problem and reads the same to the person typing.
          setFailure(signedUp.error.code === "USER_ALREADY_EXISTS" ? "EMAIL_TAKEN" : "UNKNOWN");
          return;
        }

        const chosen: Role = fromInvite ? "client" : role;
        const result = await registerAccount({ role: chosen, inviteToken });
        if (!result.ok) {
          setFailure(result.code);
          return;
        }
        window.location.assign(
          inviteToken ? `/app/convite/${inviteToken}` : (next ?? (result.role === "coach" ? "/app/coach" : "/app/aluno")),
        );
      }}
    >
      {!fromInvite && (
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

      <Field label={t("nameLabel")} htmlFor="signup-name">
        <input
          id="signup-name"
          name="name"
          type="text"
          required
          maxLength={200}
          autoComplete="name"
          placeholder={t("namePlaceholder")}
          defaultValue={defaultName}
          className={field}
        />
      </Field>

      <Field
        label={tSignIn("emailLabel")}
        htmlFor="signup-email"
        hint={lockedEmail ? tInvite("emailLocked") : undefined}
        error={failure === "BAD_EMAIL" ? errors("badEmail") : undefined}
      >
        <input
          id="signup-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          placeholder={tSignIn("emailPlaceholder")}
          defaultValue={lockedEmail ?? ""}
          readOnly={Boolean(lockedEmail)}
          className={field}
        />
      </Field>

      <Field
        label={tSignIn("passwordLabel")}
        htmlFor="signup-password"
        hint={t("passwordHint")}
        error={failure === "WEAK_PASSWORD" ? t("weakPassword") : undefined}
      >
        <input
          id="signup-password"
          name="password"
          type="password"
          required
          minLength={MIN_PASSWORD}
          autoComplete="new-password"
          className={field}
        />
      </Field>

      {failure === "EMAIL_TAKEN" && (
        <p className="font-sans text-sm text-silk" role="alert">
          {t("emailTaken")}{" "}
          <Link href={`/app/entrar?email=${encodeURIComponent(email)}`} className="link-grow text-cream">
            {tSignIn("submit")}
          </Link>
        </p>
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

      {failure && !["EMAIL_TAKEN", "INVITE_PENDING", "BAD_EMAIL", "WEAK_PASSWORD"].includes(failure) && (
        <p className="font-sans text-sm text-silk" role="alert">
          {errors("generic")}
        </p>
      )}

      <SubmitButton pendingLabel={t("creating")} className="w-full">
        {t("submit")}
      </SubmitButton>
    </form>
  );
}
