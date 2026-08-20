"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { submitVideo, type SubmitVideoState } from "@/app/app/aluno/videos/actions";
import { cn } from "@/lib/utils";
import { Field } from "../Field";
import { SubmitButton } from "../SubmitButton";
import { field, heading, muted, surface } from "../theme";
import type { Exercise } from "@/lib/studio/types";

const initial: SubmitVideoState = { status: "idle" };

/**
 * The client's upload form: a file or a link, which exercise it belongs to,
 * and what to look at. `formKey` remounts the form on success — the file
 * input is uncontrolled, so a fresh mount is the only reliable way to clear it.
 */
export function VideoSubmitForm({
  exercises,
  initialExerciseId,
  assignmentId,
}: {
  exercises: Exercise[];
  initialExerciseId?: string;
  assignmentId?: string;
}) {
  const t = useTranslations("Studio.videos");
  const errors = useTranslations("Studio.errors");
  const [state, formAction] = useActionState(submitVideo, initial);

  // Adjust state during render (React-documented pattern) instead of an
  // effect: remount the form once per successful submit.
  // oxlint-disable-next-line react-doctor/rerender-state-only-in-handlers -- prevStatus is read during render for this comparison, not handler-only state
  const [prevStatus, setPrevStatus] = useState(state.status);
  const [formKey, setFormKey] = useState(0);
  if (state.status !== prevStatus) {
    setPrevStatus(state.status);
    if (state.status === "success") setFormKey((key) => key + 1);
  }

  return (
    <form key={formKey} action={formAction} className={cn(surface, "space-y-4 p-6")}>
      <div>
        <h2 className={cn(heading, "text-xl")}>{t("submitTitle")}</h2>
        <p className={cn(muted, "mt-1")}>{t("submitLead")}</p>
      </div>

      {assignmentId && <input type="hidden" name="assignmentId" value={assignmentId} />}

      <Field label={t("chooseExercise")} htmlFor="video-exercise">
        <select
          id="video-exercise"
          name="exerciseId"
          defaultValue={initialExerciseId ?? ""}
          className={field}
        >
          <option value="">—</option>
          {exercises.map((exercise) => (
            <option key={exercise.id} value={exercise.id}>
              {exercise.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label={t("fileLabel")} htmlFor="video-file" hint={t("fileHint")}>
        <input
          id="video-file"
          name="file"
          type="file"
          accept="video/*"
          capture="environment"
          className={field}
        />
      </Field>

      <Field label={t("urlLabel")} htmlFor="video-url" hint={t("urlHint")}>
        <input id="video-url" name="videoUrl" type="url" placeholder="https://…" className={field} />
      </Field>

      <Field label={t("noteLabel")} htmlFor="video-note">
        <textarea
          id="video-note"
          name="note"
          rows={2}
          placeholder={t("notePlaceholder")}
          className={field}
        />
      </Field>

      {state.status === "error" && (
        <p className="font-sans text-xs text-silk" role="alert">
          {errors(state.code)}
        </p>
      )}
      {state.status === "success" && (
        <p className="font-sans text-xs text-accent-ink">{t("submitted")}</p>
      )}

      <SubmitButton pendingLabel={t("submit")}>{t("submit")}</SubmitButton>
    </form>
  );
}
