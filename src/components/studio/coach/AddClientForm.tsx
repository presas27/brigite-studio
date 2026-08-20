"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { addClient, type AddClientState } from "@/app/app/coach/actions";
import { useModalClose } from "@/components/studio/AddModal";
import { Field } from "@/components/studio/Field";
import { SubmitButton } from "@/components/studio/SubmitButton";
import { field } from "@/components/studio/theme";

const initial: AddClientState = { status: "idle" };

/** Default plan for a quick add — the coach adjusts it later from the client's profile. */
const DEFAULT_PLAN = "online";

/**
 * Invite form for the client roster. Just a name and an email: the
 * health/goals/limitations questions belong to the client, so they arrive
 * later via a detailed intake form sent through the same sign-in link, not
 * something the coach fills in on someone's behalf.
 *
 * On success the dialog closes and the roster behind it already shows the new
 * name marked "Convidado" — that is the confirmation the invite went out.
 */
export function AddClientForm() {
  const t = useTranslations("Studio.clients");
  const common = useTranslations("Studio.common");
  const errors = useTranslations("Studio.errors");
  const close = useModalClose();

  const [state, formAction] = useActionState(async (prev: AddClientState, formData: FormData) => {
    const next = await addClient(prev, formData);
    if (next.status === "created") close();
    return next;
  }, initial);

  return (
    <form action={formAction} className="space-y-4">
      {state.status === "invalid" && (
        <p className="font-sans text-xs text-silk" role="alert">
          {errors("generic")}
        </p>
      )}
      <input type="hidden" name="plan" value={DEFAULT_PLAN} />
      <Field label={t("nameLabel")} htmlFor="client-name" required>
        <input
          id="client-name"
          name="name"
          required
          placeholder={t("namePlaceholder")}
          className={field}
        />
      </Field>
      <Field
        label={t("emailLabel")}
        htmlFor="client-email"
        required
        error={state.status === "duplicate" ? t("duplicateEmail") : undefined}
      >
        <input
          id="client-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className={field}
        />
      </Field>
      <div className="flex justify-end">
        <SubmitButton pendingLabel={common("adding")}>{common("add")}</SubmitButton>
      </div>
    </form>
  );
}
