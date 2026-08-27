"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { updateWorkoutAction } from "@/app/app/coach/treinos/actions";
import { Icon } from "@/components/studio/coach/icons";
import { Field } from "@/components/studio/Field";
import { Modal } from "@/components/studio/Modal";
import { SubmitButton } from "@/components/studio/SubmitButton";
import { field } from "@/components/studio/theme";
import type { Workout } from "@/lib/studio/types";
import { EstimatedDurationField } from "./EstimatedDurationField";

/**
 * Name, focus and notes for the workout itself. A dialog rather than a panel on
 * the page: it is filled in once and read never — the builder below is what
 * Sara actually works in.
 */
export function WorkoutSettings({
  workout,
}: {
  workout: Pick<Workout, "id" | "name" | "focus" | "notes" | "estimatedMinutes">;
}) {
  const t = useTranslations("Studio.workouts");
  const common = useTranslations("Studio.common");
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 font-sans text-xs font-semibold text-cream/70 ring-1 ring-cream/15 transition-colors hover:bg-cream/5 hover:text-cream hover:ring-cream/30"
      >
        <Icon name="settings" className="h-4 w-4" />
        <span className="hidden sm:inline">{common("edit")}</span>
      </button>

      <Modal open={open} onCloseAction={() => setOpen(false)} title={common("edit")}>
        <form
          action={async (formData) => {
            await updateWorkoutAction(formData);
            setOpen(false);
          }}
          className="space-y-4"
        >
          <input type="hidden" name="workoutId" value={workout.id} />
          <Field label={t("nameLabel")} htmlFor="workout-name" required>
            <input
              id="workout-name"
              name="name"
              required
              defaultValue={workout.name}
              className={field}
            />
          </Field>
          <Field label={t("focusLabel")} htmlFor="workout-focus">
            <input
              id="workout-focus"
              name="focus"
              defaultValue={workout.focus}
              placeholder={t("focusPlaceholder")}
              className={field}
            />
          </Field>
          <Field label={t("notesLabel")} htmlFor="workout-notes">
            <textarea
              id="workout-notes"
              name="notes"
              rows={3}
              defaultValue={workout.notes}
              placeholder={t("notesPlaceholder")}
              className={field}
            />
          </Field>
          <EstimatedDurationField id="workout-duration" defaultMinutes={workout.estimatedMinutes} />
          <div className="flex justify-end">
            <SubmitButton pendingLabel={common("saving")}>{common("save")}</SubmitButton>
          </div>
        </form>
      </Modal>
    </>
  );
}
