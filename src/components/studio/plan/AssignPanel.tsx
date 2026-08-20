"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Field } from "../Field";
import { SubmitButton } from "../SubmitButton";
import { buttonPrimary, field, heading, surface } from "../theme";
import { cn } from "@/lib/utils";

type WorkoutOption = { id: string; name: string };

/**
 * Collapsed to a single button by default so the week grid stays the focus on
 * a phone; opens into the assign form inline, no modal/portal needed.
 */
export function AssignPanel({
  workouts,
  defaultDate,
  assignAction,
}: {
  workouts: WorkoutOption[];
  defaultDate: string;
  assignAction: (formData: FormData) => void | Promise<void>;
}) {
  const t = useTranslations("Studio.plan");
  const tc = useTranslations("Studio.common");
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={buttonPrimary}>
        {t("assign")}
      </button>
    );
  }

  return (
    <div className={cn(surface, "w-full space-y-4 p-5 sm:max-w-md")}>
      <div className="flex items-center justify-between gap-2">
        <p className={cn(heading, "text-lg")}>{t("assignTitle")}</p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="font-sans text-xs text-cream/55 transition-colors hover:text-cream"
        >
          {tc("cancel")}
        </button>
      </div>
      <form action={assignAction} className="space-y-4">
        <Field label={t("chooseWorkout")} htmlFor="assign-workout" required>
          <select id="assign-workout" name="workoutId" required defaultValue="" className={field}>
            <option value="" disabled>
              {t("chooseWorkout")}
            </option>
            {workouts.map((workout) => (
              <option key={workout.id} value={workout.id}>
                {workout.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("dateLabel")} htmlFor="assign-date" required>
          <input
            id="assign-date"
            name="date"
            type="date"
            required
            defaultValue={defaultDate}
            className={field}
          />
        </Field>
        <Field label={t("noteLabel")} htmlFor="assign-note">
          <input id="assign-note" name="note" type="text" className={field} />
        </Field>
        <SubmitButton pendingLabel={t("assign")}>{t("assign")}</SubmitButton>
      </form>
    </div>
  );
}
