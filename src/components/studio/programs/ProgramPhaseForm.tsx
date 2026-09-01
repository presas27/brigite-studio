"use client";

import { useTranslations } from "next-intl";
import { useModalClose } from "@/components/studio/AddModal";
import { Field } from "@/components/studio/Field";
import { SubmitButton } from "@/components/studio/SubmitButton";
import { field } from "@/components/studio/theme";

/**
 * Add a phase to a program, inside the masthead's dialog.
 *
 * A client component for one reason, the same one `PhaseForm` has: the dialog is
 * closed by `useModalClose`, and only a client component can call it. Adding a
 * phase does not navigate anywhere — unlike creating the program, which opens
 * it — so nothing else would take the dialog away.
 */
export function ProgramPhaseForm({
  action,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  submitLabel: string;
}) {
  const t = useTranslations("Studio.programs");
  const close = useModalClose();

  return (
    <form
      action={async (formData) => {
        await action(formData);
        close();
      }}
      className="space-y-4"
    >
      <Field label={t("phaseNameLabel")} htmlFor="new-phase-name" required>
        <input
          id="new-phase-name"
          name="name"
          required
          placeholder={t("phaseNamePlaceholder")}
          className={field}
        />
      </Field>
      <Field label={t("weeksLabel")} htmlFor="new-phase-weeks" hint={t("weeksHint")}>
        <input
          id="new-phase-weeks"
          name="weeks"
          type="number"
          min={1}
          inputMode="numeric"
          className={field}
        />
      </Field>
      <div className="flex justify-end">
        <SubmitButton>{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
