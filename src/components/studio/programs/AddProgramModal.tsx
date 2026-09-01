import { getTranslations } from "next-intl/server";
import { createProgramAction } from "@/app/app/coach/programas/actions";
import { AddModal } from "@/components/studio/AddModal";
import { Field } from "@/components/studio/Field";
import { SubmitButton } from "@/components/studio/SubmitButton";
import { field } from "@/components/studio/theme";

/**
 * New program. Three fields and then you are on its page adding the first
 * phase, because a program with no phases is not yet a program — the action
 * redirects into it, so there is nothing to confirm here.
 *
 * No shelf field: a program nobody has been given is a draft, and the shelf
 * moves itself when it stops being one.
 */
export async function AddProgramModal({ compact = false }: { compact?: boolean }) {
  const [t, common] = await Promise.all([
    getTranslations("Studio.programs"),
    getTranslations("Studio.common"),
  ]);

  return (
    <AddModal label={t("add")} title={t("addTitle")} compact={compact} iconOnlyOnPhone={compact}>
      <form action={createProgramAction} className="space-y-4">
        <Field label={t("nameLabel")} htmlFor="new-program-name" required>
          <input
            id="new-program-name"
            name="name"
            required
            placeholder={t("namePlaceholder")}
            className={field}
          />
        </Field>
        <Field label={t("focusLabel")} htmlFor="new-program-focus">
          <input
            id="new-program-focus"
            name="focus"
            placeholder={t("focusPlaceholder")}
            className={field}
          />
        </Field>
        <Field label={t("notesLabel")} htmlFor="new-program-notes">
          <textarea
            id="new-program-notes"
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
