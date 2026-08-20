"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { addClient, type AddClientState } from "@/app/app/coach/actions";
import { Field } from "@/components/studio/Field";
import { SubmitButton } from "@/components/studio/SubmitButton";
import { field, muted } from "@/components/studio/theme";

const initial: AddClientState = { status: "idle" };

const PLANS = ["personal", "online", "specialty"] as const;

/**
 * Inline invite form for the client roster. Lives inside a native `<details>`
 * disclosure at the call site — no modal library, and the browser opens it
 * for free when the header "Novo aluno" link targets its id.
 */
export function AddClientForm() {
  const t = useTranslations("Studio.clients");
  const common = useTranslations("Studio.common");
  const errors = useTranslations("Studio.errors");
  const [state, formAction] = useActionState(addClient, initial);

  if (state.status === "created") {
    return <p className={muted}>{t("invited", { name: state.name })}</p>;
  }

  return (
    <form action={formAction} className="space-y-4">
      <p className={muted}>{t("addLead")}</p>
      {state.status === "invalid" && (
        <p className="font-sans text-xs text-silk" role="alert">
          {errors("generic")}
        </p>
      )}
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
      <Field label={t("planLabel")} htmlFor="client-plan" required>
        <select id="client-plan" name="plan" defaultValue="online" className={field}>
          {PLANS.map((plan) => (
            <option key={plan} value={plan}>
              {t(`plan.${plan}`)}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t("goalsLabel")} htmlFor="client-goals" hint={common("optional")}>
        <textarea
          id="client-goals"
          name="goals"
          rows={2}
          placeholder={t("goalsPlaceholder")}
          className={field}
        />
      </Field>
      <Field label={t("injuriesLabel")} htmlFor="client-injuries" hint={common("optional")}>
        <textarea
          id="client-injuries"
          name="injuries"
          rows={2}
          placeholder={t("injuriesPlaceholder")}
          className={field}
        />
      </Field>
      <SubmitButton pendingLabel={common("adding")}>{common("add")}</SubmitButton>
    </form>
  );
}
