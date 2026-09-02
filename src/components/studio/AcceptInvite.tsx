"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { acceptInvite, type AuthFailure } from "@/app/app/entrar/actions";
import { authClient } from "@/lib/auth-client";
import { SubmitButton } from "./SubmitButton";
import { buttonQuiet } from "./theme";

/**
 * The one button a signed-in client sees on an invite link. Accepting is a
 * change of who may see this person's data, so the app is reloaded from the
 * server afterwards rather than patched in place.
 */
export function AcceptInvite({ token }: { token: string }) {
  const t = useTranslations("Studio.invite");
  const errors = useTranslations("Studio.errors");
  const [state, setState] = useState<"idle" | AuthFailure>("idle");

  return (
    <form
      className="space-y-4"
      action={async () => {
        const result = await acceptInvite(token);
        if (!result.ok) {
          setState(result.code);
          return;
        }
        window.location.assign("/app/aluno");
      }}
    >
      {state !== "idle" && (
        <p className="font-sans text-sm text-silk" role="alert">
          {state === "INVITE_INVALID" ? t("expired") : errors("generic")}
        </p>
      )}
      <SubmitButton pendingLabel={t("accepting")} className="w-full">
        {t("accept")}
      </SubmitButton>
    </form>
  );
}

/** Sign out from an invite page opened with the wrong account. */
export function SwitchAccount({ next }: { next: string }) {
  const t = useTranslations("Studio.onboarding");
  return (
    <button
      type="button"
      className={buttonQuiet}
      onClick={async () => {
        await authClient.signOut();
        window.location.assign(`/app/entrar?next=${encodeURIComponent(next)}`);
      }}
    >
      {t("switchAccount")}
    </button>
  );
}
