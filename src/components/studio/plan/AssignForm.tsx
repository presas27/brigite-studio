"use client";

import { useTranslations } from "next-intl";
import { useModalClose } from "../AddModal";
import { Field } from "../Field";
import { SubmitButton } from "../SubmitButton";
import { field } from "../theme";

type WorkoutOption = { id: string; name: string };

/**
 * The assign form itself, rendered inside `AssignWorkoutModal`'s dialog. A
 * client component only because it needs `useModalClose` — the dialog closes
 * itself once the server has the assignment, same as every other add flow.
 *
 * The day is deliberately optional: leaving it blank puts the workout in the
 * "sem dia" bucket instead of on a date, for a session Sara wants queued but
 * not yet scheduled.
 */
export function AssignForm({
  workouts,
  defaultDate,
  assignAction,
}: {
  workouts: WorkoutOption[];
  defaultDate: string;
  assignAction: (formData: FormData) => void | Promise<void>;
}) {
  const t = useTranslations("Studio.plan");
  const close = useModalClose();

  async function action(formData: FormData) {
    await assignAction(formData);
    close();
  }

  return (
    <form action={action} className="space-y-4">
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
      <Field label={t("dateLabel")} htmlFor="assign-date" hint={t("dateHint")}>
        <input id="assign-date" name="date" type="date" defaultValue={defaultDate} className={field} />
      </Field>
      <Field label={t("noteLabel")} htmlFor="assign-note">
        <input id="assign-note" name="note" type="text" className={field} />
      </Field>
      <div className="flex justify-end">
        <SubmitButton pendingLabel={t("assign")}>{t("assign")}</SubmitButton>
      </div>
    </form>
  );
}
