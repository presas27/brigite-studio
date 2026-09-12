"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { authClient } from "@/lib/auth-client";
import { Icon } from "@/components/studio/coach/icons";
import { buttonDanger } from "@/components/studio/theme";
import { cn } from "@/lib/utils";

/** Ends the Better Auth session and lands back on the sign-in screen. */
export async function signOut() {
  await authClient.signOut();
  window.location.assign("/app/entrar");
}

/**
 * Destructive account action. Lives on the profile because the phone dock
 * hides the topbar (and the account chip that already signs out on a laptop).
 */
export function SignOutButton({ className }: { className?: string }) {
  const t = useTranslations("Studio.account");
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        setPending(true);
        void signOut();
      }}
      className={cn(buttonDanger, className)}
    >
      <Icon name="logout" className="h-4 w-4 shrink-0" />
      {pending ? t("signingOut") : t("signOut")}
    </button>
  );
}
