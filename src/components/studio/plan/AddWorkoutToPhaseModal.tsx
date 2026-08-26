"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/studio/coach/icons";
import { Field } from "@/components/studio/Field";
import { Modal } from "@/components/studio/Modal";
import { SubmitButton } from "@/components/studio/SubmitButton";
import { buttonPrimary, buttonQuiet, field, muted, surfaceLink } from "@/components/studio/theme";
import type { WorkoutType } from "@/lib/studio/types";
import { cn } from "@/lib/utils";

type LibraryWorkout = { id: string; name: string; focus: string };

/** The dialog's three screens: pick a source, browse the library, or fill in a fresh workout. */
type Step = "choose" | "library" | "build";

const WORKOUT_TYPES: readonly WorkoutType[] = ["regular", "circuit", "interval"];

/** Round icon badge for the two "choose" options. */
const optionBadge =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-caramel/15 text-accent-ink";

/**
 * "Add workout" for one training phase. Two ways in — from the library, or
 * built here from scratch — and both post straight to a server action that
 * redirects into the resulting workout, so this dialog never has to close
 * itself on success. It only resets its own step when the coach dismisses it
 * (ESC, backdrop, or the close button), so reopening it always starts over.
 */
export function AddWorkoutToPhaseModal({
  phaseTitle,
  workouts,
  fromLibraryAction,
  buildAction,
}: {
  phaseTitle: string;
  workouts: LibraryWorkout[];
  fromLibraryAction: (formData: FormData) => void | Promise<void>;
  buildAction: (formData: FormData) => void | Promise<void>;
}) {
  const t = useTranslations("Studio.plan.phases");
  const tWorkouts = useTranslations("Studio.workouts");
  const common = useTranslations("Studio.common");
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("choose");
  const [search, setSearch] = useState("");

  function close() {
    setOpen(false);
    setStep("choose");
    setSearch("");
  }

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return workouts;
    return workouts.filter(
      (workout) =>
        workout.name.toLowerCase().includes(needle) || workout.focus.toLowerCase().includes(needle),
    );
  }, [search, workouts]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(buttonPrimary, "whitespace-nowrap px-5 py-2.5")}
      >
        <Icon name="plus" className="h-4 w-4" />
        <span>{t("addWorkout")}</span>
      </button>

      <Modal open={open} onCloseAction={close} title={t("addWorkoutTitle")} lead={phaseTitle}>
        {step === "choose" && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setStep("library")}
              className={cn(surfaceLink, "flex w-full items-center gap-4 p-4 text-left")}
            >
              <span className={optionBadge}>
                <Icon name="library" className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block font-sans text-sm font-semibold text-cream">
                  {t("fromLibrary")}
                </span>
                <span className={cn(muted, "mt-0.5 block")}>{t("fromLibraryHint")}</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => setStep("build")}
              className={cn(surfaceLink, "flex w-full items-center gap-4 p-4 text-left")}
            >
              <span className={optionBadge}>
                <Icon name="plus" className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block font-sans text-sm font-semibold text-cream">
                  {t("buildWorkout")}
                </span>
                <span className={cn(muted, "mt-0.5 block")}>{t("buildWorkoutHint")}</span>
              </span>
            </button>
          </div>
        )}

        {step === "library" && (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setStep("choose")}
              className={cn(buttonQuiet, "-ml-2.5")}
            >
              <Icon name="chevron" className="h-3.5 w-3.5 rotate-180" />
              {common("back")}
            </button>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={common("searchPlaceholder")}
              aria-label={common("search")}
              className={field}
            />
            {workouts.length === 0 ? (
              <p className={muted}>{t("libraryEmpty")}</p>
            ) : filtered.length === 0 ? (
              <p className={muted}>{tWorkouts("noResults")}</p>
            ) : (
              <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
                {filtered.map((workout) => (
                  <li key={workout.id}>
                    <form action={fromLibraryAction}>
                      <input type="hidden" name="workoutId" value={workout.id} />
                      <button
                        type="submit"
                        className={cn(
                          surfaceLink,
                          "flex w-full flex-col items-start gap-0.5 p-3 text-left",
                        )}
                      >
                        <span className="font-sans text-sm font-semibold text-cream">
                          {workout.name}
                        </span>
                        {workout.focus && <span className={muted}>{workout.focus}</span>}
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {step === "build" && (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setStep("choose")}
              className={cn(buttonQuiet, "-ml-2.5")}
            >
              <Icon name="chevron" className="h-3.5 w-3.5 rotate-180" />
              {common("back")}
            </button>
            <form action={buildAction} className="space-y-4">
              <Field label={tWorkouts("nameLabel")} htmlFor="phase-workout-name" required>
                <input
                  id="phase-workout-name"
                  name="name"
                  required
                  placeholder={tWorkouts("namePlaceholder")}
                  className={field}
                />
              </Field>
              <Field label={tWorkouts("focusLabel")} htmlFor="phase-workout-focus">
                <input
                  id="phase-workout-focus"
                  name="focus"
                  placeholder={tWorkouts("focusPlaceholder")}
                  className={field}
                />
              </Field>
              <Field label={tWorkouts("notesLabel")} htmlFor="phase-workout-notes">
                <textarea
                  id="phase-workout-notes"
                  name="notes"
                  rows={2}
                  placeholder={tWorkouts("notesPlaceholder")}
                  className={field}
                />
              </Field>
              <Field label={tWorkouts("typeLabel")} htmlFor="phase-workout-type">
                <select id="phase-workout-type" name="workoutType" defaultValue="regular" className={field}>
                  {WORKOUT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {tWorkouts(`type.${type}`)}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="flex justify-end">
                <SubmitButton>{common("continue")}</SubmitButton>
              </div>
            </form>
          </div>
        )}
      </Modal>
    </>
  );
}
