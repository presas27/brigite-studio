"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { submitIntakeAndAccept } from "@/app/app/entrar/actions";
import { Field } from "@/components/studio/Field";
import { SubmitButton } from "@/components/studio/SubmitButton";
import { field, muted } from "@/components/studio/theme";
import { cn } from "@/lib/utils";

export type IntakeFieldView = {
  id: string;
  type: "text" | "textarea" | "number" | "date" | "yesno" | "select" | "multiselect";
  label: string;
  hint: string;
  required: boolean;
  options: string[];
};

/**
 * The form a client fills on an invite link. Submitting is accepting: the
 * answers and the coaching relationship land in the same write, so there is
 * no "I filled it in but I am not hers yet" state.
 */
export function IntakeForm({
  token,
  title,
  intro,
  fields,
}: {
  token: string;
  title: string;
  intro: string;
  fields: IntakeFieldView[];
}) {
  const t = useTranslations("Studio.intake");
  const errors = useTranslations("Studio.errors");
  const [values, setValues] = useState<Record<string, string>>({});
  const [failed, setFailed] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function setValue(id: string, value: string) {
    setValues((current) => ({ ...current, [id]: value }));
  }

  return (
    <form
      className="space-y-4"
      action={() => {
        setFailed(null);
        startTransition(async () => {
          const answers = fields.map((field) => ({
            fieldId: field.id,
            value: values[field.id] ?? "",
          }));
          const result = await submitIntakeAndAccept(token, answers);
          if (!result.ok) {
            setFailed(result.code === "INTAKE_INCOMPLETE" ? "incomplete" : "generic");
            return;
          }
          window.location.assign("/app/aluno");
        });
      }}
    >
      {title && <p className="font-sans text-sm font-semibold text-cream">{title}</p>}
      {intro && <p className={muted}>{intro}</p>}

      {fields.map((item) => (
        <Field key={item.id} label={item.label} htmlFor={item.id} hint={item.hint || undefined} required={item.required}>
          {item.type === "textarea" ? (
            <textarea
              id={item.id}
              required={item.required}
              rows={3}
              value={values[item.id] ?? ""}
              onChange={(event) => setValue(item.id, event.target.value)}
              className={cn(field, "resize-y")}
            />
          ) : item.type === "yesno" ? (
            <div className="flex gap-2">
              {(["yes", "no"] as const).map((option) => (
                <label
                  key={option}
                  className={cn(
                    "flex-1 cursor-pointer rounded-[0.9rem] px-3 py-2 text-center font-sans text-sm ring-1 transition-colors",
                    values[item.id] === option
                      ? "bg-cream/10 ring-accent-ink/70 text-cream"
                      : "bg-cream/5 ring-cream/15 text-cream/70",
                  )}
                >
                  <input
                    type="radio"
                    name={item.id}
                    value={option}
                    checked={values[item.id] === option}
                    onChange={() => setValue(item.id, option)}
                    required={item.required}
                    className="sr-only"
                  />
                  {t(option)}
                </label>
              ))}
            </div>
          ) : item.type === "select" ? (
            <select
              id={item.id}
              required={item.required}
              value={values[item.id] ?? ""}
              onChange={(event) => setValue(item.id, event.target.value)}
              className={field}
            >
              <option value="">{t("choose")}</option>
              {item.options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          ) : item.type === "multiselect" ? (
            <div className="space-y-1.5">
              {item.options.map((option) => {
                const selected = (values[item.id] ?? "").split("\n").filter(Boolean);
                const on = selected.includes(option);
                return (
                  <label key={option} className="flex items-center gap-2 font-sans text-sm text-cream/80">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => {
                        const next = on ? selected.filter((entry) => entry !== option) : [...selected, option];
                        setValue(item.id, next.join("\n"));
                      }}
                    />
                    {option}
                  </label>
                );
              })}
            </div>
          ) : (
            <input
              id={item.id}
              type={item.type === "number" ? "number" : item.type === "date" ? "date" : "text"}
              required={item.required}
              value={values[item.id] ?? ""}
              onChange={(event) => setValue(item.id, event.target.value)}
              className={field}
            />
          )}
        </Field>
      ))}

      {failed && (
        <p role="alert" className="font-sans text-sm text-silk">
          {failed === "incomplete" ? t("incomplete") : errors("generic")}
        </p>
      )}

      <SubmitButton pendingLabel={t("submitting")} className="w-full">
        {t("submit")}
      </SubmitButton>
    </form>
  );
}
