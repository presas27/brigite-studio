import { getTranslations } from "next-intl/server";
import { createWorkoutAction } from "@/app/app/coach/treinos/actions";
import { AddModal } from "@/components/studio/AddModal";
import { Field } from "@/components/studio/Field";
import { SubmitButton } from "@/components/studio/SubmitButton";
import { field } from "@/components/studio/theme";

/**
 * New workout. Three fields and then you are in the builder: the action
 * redirects into the new workout, so there is nothing to confirm and no
 * dialog left behind to close.
 */
export async function AddWorkoutModal({ compact = false }: { compact?: boolean }) {
  const [t, common] = await Promise.all([
    getTranslations("Studio.workouts"),
    getTranslations("Studio.common"),
  ]);

  return (
    <AddModal label={t("add")} title={t("addTitle")} compact={compact} iconOnlyOnPhone={compact}>
      <form action={createWorkoutAction} className="space-y-4">
        <Field label={t("nameLabel")} htmlFor="new-workout-name" required>
          <input
            id="new-workout-name"
            name="name"
            required
            placeholder={t("namePlaceholder")}
            className={field}
          />
        </Field>
        <Field label={t("focusLabel")} htmlFor="new-workout-focus">
          <input
            id="new-workout-focus"
            name="focus"
            placeholder={t("focusPlaceholder")}
            className={field}
          />
        </Field>
        <Field label={t("notesLabel")} htmlFor="new-workout-notes">
          <textarea
            id="new-workout-notes"
            name="notes"
            rows={2}
            placeholder={t("notesPlaceholder")}
            className={field}
          />
        </Field>
        <div className="flex justify-end">
          <SubmitButton pendingLabel={common("creating")}>{common("create")}</SubmitButton>
        </div>
      </form>
    </AddModal>
  );
}
