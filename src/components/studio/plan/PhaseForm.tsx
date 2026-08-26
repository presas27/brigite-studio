"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useModalClose } from "../AddModal";
import { Field } from "../Field";
import { SubmitButton } from "../SubmitButton";
import { eyebrow, field } from "../theme";
import type { PhaseDurationType, TrainingPhase } from "@/lib/studio/types";
import { cn } from "@/lib/utils";

/**
 * Create/edit form for a training phase, rendered inside `AssignPhaseModal`
 * or an edit dialog. The duration type is a segmented pill rather than a
 * select — same visual pattern as the format switch on `BlockCard`, but
 * simplified: it only ever toggles local state, never calls the server until
 * the whole form submits.
 *
 * Both duration shapes are always in the DOM; only the selected one is
 * rendered, so the form only ever posts the fields for the type it carries.
 */
export function PhaseForm({
  action,
  phase,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  /** Present in edit mode; prefills every field including the pill. */
  phase?: TrainingPhase;
  submitLabel: string;
}) {
  const t = useTranslations("Studio.plan.phases");
  const close = useModalClose();
  const [durationType, setDurationType] = useState<PhaseDurationType>(
    phase?.durationType ?? "calendar",
  );

  async function submit(formData: FormData) {
    await action(formData);
    close();
  }

  return (
    <form action={submit} className="space-y-4">
      {/* `updatePhaseAction` reads `phaseId` off the form data — carrying it
          here means the caller only has to bind `clientId`, same as every
          other action in this tab. */}
      {phase && <input type="hidden" name="phaseId" value={phase.id} />}
      <Field label={t("nameLabel")} htmlFor="phase-name" required>
        <input
          id="phase-name"
          name="name"
          required
          defaultValue={phase?.name}
          placeholder={t("namePlaceholder")}
          className={field}
        />
      </Field>

      <div className="space-y-1.5">
        <span className={eyebrow}>{t("durationTypeLabel")}</span>
        <input type="hidden" name="durationType" value={durationType} />
        <div
          role="group"
          aria-label={t("durationTypeLabel")}
          className="relative flex w-fit rounded-full bg-cream/[0.07] p-0.5 ring-1 ring-cream/10"
        >
          {/* The lit half slides between the two words, same choreography as
              the block format switch. */}
          <span
            aria-hidden
            className={cn(
              "absolute inset-y-0.5 left-0.5 w-24 rounded-full bg-accent-ink transition-transform duration-300 ease-out motion-reduce:transition-none",
              durationType === "weeks" ? "translate-x-full" : "translate-x-0",
            )}
          />
          {(["calendar", "weeks"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setDurationType(option)}
              aria-pressed={durationType === option}
              className={cn(
                "relative w-24 rounded-full py-1.5 font-sans text-xs font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-caramel/70",
                durationType === option ? "text-ink" : "text-cream/60 hover:text-cream",
              )}
            >
              {t(`durationType.${option}`)}
            </button>
          ))}
        </div>
      </div>

      {durationType === "calendar" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("startLabel")} htmlFor="phase-start">
            <input
              id="phase-start"
              name="startDate"
              type="date"
              defaultValue={phase?.startDate ?? undefined}
              className={field}
            />
          </Field>
          <Field label={t("endLabel")} htmlFor="phase-end">
            <input
              id="phase-end"
              name="endDate"
              type="date"
              defaultValue={phase?.endDate ?? undefined}
              className={field}
            />
          </Field>
        </div>
      ) : (
        <Field label={t("weeksLabel")} htmlFor="phase-weeks" hint={t("weeksHint")}>
          <input
            id="phase-weeks"
            name="weeks"
            type="number"
            min={1}
            defaultValue={phase?.weeks ?? undefined}
            className={field}
          />
        </Field>
      )}

      <div className="flex justify-end">
        <SubmitButton>{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
