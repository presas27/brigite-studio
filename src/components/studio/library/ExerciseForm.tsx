"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import type { ExerciseFormState } from "@/app/app/coach/exercicios/actions";
import type { Exercise, Tracking } from "@/lib/studio/types";
import { useModalClose } from "../AddModal";
import { Field } from "../Field";
import { SubmitButton } from "../SubmitButton";
import { field } from "../theme";

const TRACKING: Tracking[] = ["reps", "time", "hold", "distance"];

const initial: ExerciseFormState = { status: "idle" };

/**
 * Create/edit exercise form. Same fields either way — editing just seeds
 * `defaultValue`s from the existing row. `idPrefix` keeps input ids unique
 * when several instances of this form sit on the page at once (one create
 * panel plus one inline edit per card).
 */
export function ExerciseForm({
  action,
  exercise,
  idPrefix,
}: {
  action: (state: ExerciseFormState, formData: FormData) => Promise<ExerciseFormState>;
  exercise?: Exercise;
  idPrefix: string;
}) {
  const t = useTranslations("Studio.library");
  const common = useTranslations("Studio.common");
  const errors = useTranslations("Studio.errors");
  const close = useModalClose();
  // Wrapping the action instead of watching the result in an effect: the
  // dialog closes on the same tick the server says yes, and the form works
  // unchanged outside a dialog, where `close` is a no-op.
  const [state, formAction] = useActionState(async (prev: ExerciseFormState, formData: FormData) => {
    const next = await action(prev, formData);
    if (next.status === "ok") close();
    return next;
  }, initial);

  const nameError = state.status === "error" && state.reason === "required" ? errors("required") : undefined;

  return (
    <form action={formAction} className="space-y-4">
      <Field label={t("nameLabel")} htmlFor={`${idPrefix}-name`} required error={nameError}>
        <input
          id={`${idPrefix}-name`}
          name="name"
          required
          defaultValue={exercise?.name}
          placeholder={t("namePlaceholder")}
          className={field}
        />
      </Field>

      <Field label={t("cuesLabel")} htmlFor={`${idPrefix}-cues`} hint={t("cuesHint")}>
        <textarea id={`${idPrefix}-cues`} name="cues" rows={3} defaultValue={exercise?.cues} className={field} />
      </Field>

      <Field label={t("tagsLabel")} htmlFor={`${idPrefix}-tags`} hint={t("tagsHint")}>
        <input
          id={`${idPrefix}-tags`}
          name="tags"
          defaultValue={exercise?.tags.join(", ")}
          className={field}
        />
      </Field>

      <Field label={t("trackingLabel")} htmlFor={`${idPrefix}-tracking`}>
        <select
          id={`${idPrefix}-tracking`}
          name="tracking"
          defaultValue={exercise?.tracking ?? "reps"}
          className={field}
        >
          {TRACKING.map((value) => (
            <option key={value} value={value}>
              {t(`tracking.${value}`)}
            </option>
          ))}
        </select>
      </Field>

      <Field label={t("videoLabel")} htmlFor={`${idPrefix}-video`} hint={t("videoHintYoutube")}>
        <input
          id={`${idPrefix}-video`}
          name="videoUrl"
          type="url"
          defaultValue={exercise?.videoUrl ?? ""}
          className={field}
        />
      </Field>

      <SubmitButton pendingLabel={exercise ? common("saving") : common("adding")} className="w-full">
        {exercise ? common("save") : common("add")}
      </SubmitButton>
    </form>
  );
}
