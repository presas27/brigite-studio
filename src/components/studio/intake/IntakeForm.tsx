"use client";

import { useMemo, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { submitIntakeAndAccept } from "@/app/app/entrar/actions";
import { Field } from "@/components/studio/Field";
import { Icon } from "@/components/studio/coach/icons";
import { buttonGhost, buttonPrimary, field, heading, muted } from "@/components/studio/theme";
import { cn } from "@/lib/utils";

export type IntakeFieldView = {
  id: string;
  type:
    | "text"
    | "textarea"
    | "number"
    | "date"
    | "yesno"
    | "select"
    | "multiselect"
    | "checkbox";
  label: string;
  hint: string;
  required: boolean;
  options: string[];
  section?: string;
  sensitive?: boolean;
  showIf?: { fieldId: string; equals: string };
};

/**
 * Multi-step onboarding and intake form.
 * Divided into sections with a progress bar so new clients are not overwhelmed
 * on their first experience. Completing and consenting is the sole gateway into
 * the app's main dashboard.
 */
export function IntakeForm({
  token,
  title,
  intro,
  fields,
  defaultEmail = "",
  defaultName = "",
}: {
  token: string;
  title: string;
  intro: string;
  fields: IntakeFieldView[];
  defaultEmail?: string;
  defaultName?: string;
}) {
  const t = useTranslations("Studio.intake");
  const errors = useTranslations("Studio.errors");
  const common = useTranslations("Studio.common");

  // Initial values with pre-filled email and name if provided
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    if (defaultEmail) initial.email = defaultEmail;
    if (defaultName) initial.name = defaultName;
    return initial;
  });

  const [currentStep, setCurrentStep] = useState(0);
  const [stepErrors, setStepErrors] = useState<Record<string, boolean>>({});
  const [failed, setFailed] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Group fields into ordered sections
  const sections = useMemo(() => {
    const map = new Map<string, IntakeFieldView[]>();
    for (const item of fields) {
      const sec = item.section?.trim() || "Geral";
      if (!map.has(sec)) map.set(sec, []);
      map.get(sec)!.push(item);
    }
    return Array.from(map.entries()).map(([title, items]) => ({
      title,
      items,
    }));
  }, [fields]);

  const totalSteps = Math.max(1, sections.length);
  const activeSection = sections[currentStep] ?? { title: "", items: fields };

  function setValue(id: string, value: string) {
    setValues((current) => ({ ...current, [id]: value }));
    setStepErrors((current) => {
      if (!current[id]) return current;
      const next = { ...current };
      delete next[id];
      return next;
    });
    setFailed(null);
  }

  function isFieldVisible(item: IntakeFieldView): boolean {
    if (!item.showIf) return true;
    return values[item.showIf.fieldId] === item.showIf.equals;
  }

  function validateCurrentSection(): boolean {
    const newErrors: Record<string, boolean> = {};
    for (const item of activeSection.items) {
      if (!isFieldVisible(item)) continue;
      if (!item.required) continue;

      const val = (values[item.id] ?? "").trim();
      if (!val) {
        newErrors[item.id] = true;
        continue;
      }
      if (item.type === "yesno" && val !== "yes" && val !== "no") {
        newErrors[item.id] = true;
      }
      if (item.type === "checkbox" && val !== "true" && val !== "yes") {
        newErrors[item.id] = true;
      }
    }

    setStepErrors(newErrors);
    const hasErrors = Object.keys(newErrors).length > 0;
    if (hasErrors) {
      setFailed("incomplete");
    } else {
      setFailed(null);
    }
    return !hasErrors;
  }

  function handleNext() {
    if (!validateCurrentSection()) return;
    if (currentStep < totalSteps - 1) {
      setCurrentStep((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function handlePrevious() {
    setFailed(null);
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function handleSubmit() {
    if (!validateCurrentSection()) return;

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
  }

  const progressPct = Math.round(((currentStep + 1) / totalSteps) * 100);

  return (
    <div className="space-y-6">
      {currentStep === 0 && (title || intro) && (
        <div className="space-y-1.5 pb-1">
          {title && <h1 className={cn(heading, "text-xl text-cream")}>{title}</h1>}
          {intro && <p className={cn(muted, "text-xs sm:text-sm")}>{intro}</p>}
        </div>
      )}

      {/* Step Header & Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-medium text-cream/55">
          <span>
            {t("stepProgress", { current: currentStep + 1, total: totalSteps })}
          </span>
          <span>{progressPct}%</span>
        </div>
        <div
          aria-hidden
          className="h-1.5 w-full overflow-hidden rounded-full bg-cream/10"
        >
          <div
            className="h-full rounded-full bg-accent-ink transition-all duration-300 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <h2 className={cn(heading, "text-lg text-cream pt-1")}>
          {activeSection.title}
        </h2>
      </div>

      {/* Form Fields for Active Section */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (currentStep < totalSteps - 1) {
            handleNext();
          } else {
            handleSubmit();
          }
        }}
        className="space-y-4"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="space-y-4"
          >
            {activeSection.items.map((item) => {
              if (!isFieldVisible(item)) return null;
              const hasError = Boolean(stepErrors[item.id]);

              if (item.type === "checkbox") {
                const isChecked =
                  values[item.id] === "true" || values[item.id] === "yes";
                return (
                  <div
                    key={item.id}
                    className={cn(
                      "rounded-[1rem] p-4 ring-1 transition-colors",
                      hasError
                        ? "bg-silk/5 ring-silk/40"
                        : "bg-cream/[0.04] ring-cream/10 hover:bg-cream/[0.07]",
                    )}
                  >
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(event) =>
                          setValue(item.id, event.target.checked ? "true" : "")
                        }
                        className="mt-0.5 h-4 w-4 shrink-0 rounded accent-[var(--accent-ink,#c4a484)]"
                      />
                      <span className="font-sans text-xs leading-relaxed text-cream/85 select-none sm:text-sm">
                        {item.label}
                        {item.required && (
                          <span className="text-accent-ink ml-1">*</span>
                        )}
                      </span>
                    </label>
                    {item.hint && (
                      <p className="mt-1 pl-7 text-xs text-cream/45">{item.hint}</p>
                    )}
                  </div>
                );
              }

              return (
                <Field
                  key={item.id}
                  label={item.label}
                  htmlFor={item.id}
                  hint={item.hint || undefined}
                  required={item.required}
                  className={cn(hasError && "text-silk")}
                >
                  {item.type === "textarea" ? (
                    <textarea
                      id={item.id}
                      rows={3}
                      value={values[item.id] ?? ""}
                      onChange={(event) => setValue(item.id, event.target.value)}
                      className={cn(
                        field,
                        "resize-y",
                        hasError && "ring-silk/60 focus:ring-silk",
                      )}
                    />
                  ) : item.type === "yesno" ? (
                    <div className="flex gap-2">
                      {(["yes", "no"] as const).map((option) => (
                        <label
                          key={option}
                          className={cn(
                            "flex-1 cursor-pointer rounded-[0.9rem] px-3 py-2.5 text-center font-sans text-sm ring-1 transition-colors select-none",
                            values[item.id] === option
                              ? "bg-cream/15 ring-accent-ink text-cream font-semibold"
                              : hasError
                                ? "bg-cream/5 ring-silk/35 text-cream/70"
                                : "bg-cream/5 ring-cream/15 text-cream/70 hover:bg-cream/10",
                          )}
                        >
                          <input
                            type="radio"
                            name={item.id}
                            value={option}
                            checked={values[item.id] === option}
                            onChange={() => setValue(item.id, option)}
                            className="sr-only"
                          />
                          {t(option)}
                        </label>
                      ))}
                    </div>
                  ) : item.type === "select" ? (
                    <select
                      id={item.id}
                      value={values[item.id] ?? ""}
                      onChange={(event) => setValue(item.id, event.target.value)}
                      className={cn(
                        field,
                        hasError && "ring-silk/60 focus:ring-silk",
                      )}
                    >
                      <option value="">{t("choose")}</option>
                      {item.options.map((option) => (
                        <option key={option} value={option} className="bg-ink text-cream">
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : item.type === "multiselect" ? (
                    <div className="space-y-1.5 rounded-[1rem] bg-cream/[0.02] p-2.5 ring-1 ring-cream/10">
                      {item.options.map((option) => {
                        const selected = (values[item.id] ?? "")
                          .split("\n")
                          .filter(Boolean);
                        const on = selected.includes(option);
                        return (
                          <label
                            key={option}
                            className={cn(
                              "flex items-center gap-2.5 rounded-[0.75rem] px-3 py-2 font-sans text-xs cursor-pointer select-none transition-colors sm:text-sm",
                              on
                                ? "bg-caramel/15 text-cream font-medium ring-1 ring-caramel/30"
                                : "text-cream/70 hover:bg-cream/5 hover:text-cream",
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={on}
                              onChange={() => {
                                const next = on
                                  ? selected.filter((entry) => entry !== option)
                                  : [...selected, option];
                                setValue(item.id, next.join("\n"));
                              }}
                              className="h-3.5 w-3.5 rounded accent-[var(--accent-ink,#c4a484)]"
                            />
                            {option}
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <input
                      id={item.id}
                      type={
                        item.type === "number"
                          ? "number"
                          : item.type === "date"
                            ? "date"
                            : "text"
                      }
                      value={values[item.id] ?? ""}
                      onChange={(event) => setValue(item.id, event.target.value)}
                      className={cn(
                        field,
                        hasError && "ring-silk/60 focus:ring-silk",
                      )}
                    />
                  )}
                </Field>
              );
            })}
          </motion.div>
        </AnimatePresence>

        {failed && (
          <p role="alert" className="font-sans text-sm text-silk pt-2">
            {failed === "incomplete" ? t("incomplete") : errors("generic")}
          </p>
        )}

        {/* Action Controls */}
        <div className="flex items-center justify-between gap-3 pt-4 border-t border-cream/10">
          {currentStep > 0 ? (
            <button
              type="button"
              onClick={handlePrevious}
              disabled={pending}
              className={cn(buttonGhost, "px-5 py-3 text-sm")}
            >
              <Icon name="chevron" className="h-4 w-4 rotate-180" />
              {common("back")}
            </button>
          ) : (
            <div />
          )}

          {currentStep < totalSteps - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              className={cn(buttonPrimary, "px-6 py-3 text-sm")}
            >
              {common("continue")}
              <Icon name="chevron" className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={pending}
              className={cn(buttonPrimary, "px-8 py-3.5 text-base")}
            >
              {pending ? t("submitting") : t("finish")}
              <Icon name="check" className="h-4 w-4" />
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
