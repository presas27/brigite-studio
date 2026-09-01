"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Modal } from "@/components/studio/Modal";
import { Icon } from "@/components/studio/coach/icons";
import {
  buttonDanger,
  buttonGhost,
  buttonQuiet,
  chip,
  eyebrow,
  field,
  muted,
  surface,
} from "@/components/studio/theme";
import type { ProgramPhaseDetail, WorkoutSummary } from "@/lib/studio/types";
import { capitalize, cn } from "@/lib/utils";

/**
 * The phases of one program, each with the sessions inside it.
 *
 * A phase is a block of weeks, so the header carries its length and nothing
 * else; there are no dates to show, and that absence is the point — a template
 * has a duration, and the calendar only exists once a client is running it.
 *
 * Adding a workout picks from the library and copies it, which is why the picker
 * says so: a coach who thinks she is linking the template will be surprised the
 * first time she edits one.
 */
export function ProgramPhaseList({
  phases,
  libraryWorkouts,
  addWorkoutAction,
  removeWorkoutAction,
  removePhaseAction,
  updatePhaseAction,
}: {
  phases: ProgramPhaseDetail[];
  /** The library the picker offers, already filtered to live templates. */
  libraryWorkouts: WorkoutSummary[];
  addWorkoutAction: (formData: FormData) => void | Promise<void>;
  removeWorkoutAction: (formData: FormData) => void | Promise<void>;
  removePhaseAction: (formData: FormData) => void | Promise<void>;
  updatePhaseAction: (formData: FormData) => void | Promise<void>;
}) {
  const t = useTranslations("Studio.programs");
  const tWorkouts = useTranslations("Studio.workouts");
  const common = useTranslations("Studio.common");
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [confirmPhase, setConfirmPhase] = useState<ProgramPhaseDetail | null>(null);
  const [editing, setEditing] = useState<ProgramPhaseDetail | null>(null);

  return (
    <div className="space-y-4">
      {phases.map((phase, index) => (
        <section key={phase.id} className={cn(surface, "p-5")}>
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className={eyebrow}>{index + 1}</p>
              <h2 className="font-sans text-base font-bold text-cream">{phase.name}</h2>
              <p className={cn(muted, "mt-0.5")}>
                {phase.weeks ? t("weekCount", { count: phase.weeks }) : common("none")}
                {" · "}
                {t("workoutCount", { count: phase.workouts.length })}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setEditing(phase)}
                className={buttonQuiet}
              >
                {common("edit")}
              </button>
              <button
                type="button"
                onClick={() => setPickerFor(phase.id)}
                className={cn(buttonGhost, "px-4 py-2 text-xs")}
              >
                <Icon name="plus" className="h-3.5 w-3.5" />
                {t("addWorkout")}
              </button>
              <button
                type="button"
                aria-label={t("removePhase")}
                title={t("removePhase")}
                onClick={() => setConfirmPhase(phase)}
                className={cn(buttonQuiet, "text-silk/70 hover:text-silk")}
              >
                <Icon name="trash" className="h-4 w-4" />
              </button>
            </div>
          </header>

          {phase.workouts.length === 0 ? (
            <p className={cn(muted, "mt-4")}>{t("workoutsEmpty")}</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {phase.workouts.map((workout) => (
                <li
                  key={workout.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-[1rem] bg-cream/5 px-4 py-3"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-sans text-sm font-semibold text-cream">
                      {workout.name}
                    </span>
                    <span className={cn(muted, "block text-xs")}>
                      {tWorkouts(`type.${workout.workoutType}`)}
                      {" · "}
                      {tWorkouts("items", { count: workout.itemCount })}
                      {workout.estimatedMinutes
                        ? ` · ${tWorkouts("durationMinutes", { count: workout.estimatedMinutes })}`
                        : ""}
                      {workout.focus ? ` · ${capitalize(workout.focus)}` : ""}
                    </span>
                  </span>
                  <form action={removeWorkoutAction} className="shrink-0">
                    <input type="hidden" name="phaseId" value={phase.id} />
                    <input type="hidden" name="workoutId" value={workout.id} />
                    <button
                      type="submit"
                      aria-label={t("removeWorkout")}
                      title={t("removeWorkout")}
                      className={buttonQuiet}
                    >
                      <Icon name="trash" className="h-4 w-4" />
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}

      <Modal
        open={pickerFor !== null}
        onCloseAction={() => setPickerFor(null)}
        title={t("addWorkoutTitle")}
        lead={t("addWorkoutHint")}
        width="34rem"
      >
        {libraryWorkouts.length === 0 ? (
          <p className={muted}>{t("libraryEmpty")}</p>
        ) : (
          <ul className="max-h-[50vh] space-y-2 overflow-y-auto">
            {libraryWorkouts.map((workout) => (
              <li key={workout.id}>
                <form
                  action={async (formData) => {
                    await addWorkoutAction(formData);
                    setPickerFor(null);
                  }}
                >
                  <input type="hidden" name="phaseId" value={pickerFor ?? ""} />
                  <input type="hidden" name="workoutId" value={workout.id} />
                  <button
                    type="submit"
                    className="flex w-full items-center justify-between gap-3 rounded-[1rem] bg-cream/5 px-4 py-3 text-left transition-colors hover:bg-cream/10"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-sans text-sm font-semibold text-cream">
                        {workout.name}
                      </span>
                      <span className={cn(muted, "block text-xs")}>
                        {tWorkouts("items", { count: workout.itemCount })}
                        {workout.focus ? ` · ${capitalize(workout.focus)}` : ""}
                      </span>
                    </span>
                    {workout.libraryCategory === "shared" && (
                      <span className={cn(chip, "shrink-0")}>
                        <Icon name="clients" className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Modal>

      <Modal
        open={editing !== null}
        onCloseAction={() => setEditing(null)}
        title={editing?.name ?? ""}
        width="26rem"
      >
        <form
          action={async (formData) => {
            await updatePhaseAction(formData);
            setEditing(null);
          }}
          className="space-y-4"
        >
          <input type="hidden" name="phaseId" value={editing?.id ?? ""} />
          <div className="space-y-1.5">
            <label htmlFor="phase-name" className={eyebrow}>
              {t("phaseNameLabel")}
            </label>
            <input
              id="phase-name"
              name="name"
              required
              defaultValue={editing?.name ?? ""}
              className={field}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="phase-weeks" className={eyebrow}>
              {t("weeksLabel")}
            </label>
            <input
              id="phase-weeks"
              name="weeks"
              type="number"
              min={1}
              inputMode="numeric"
              defaultValue={editing?.weeks ?? ""}
              className={field}
            />
            <p className="font-sans text-xs text-cream/45">{t("weeksHint")}</p>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditing(null)}
              className={cn(buttonGhost, "px-4 py-2 text-sm")}
            >
              {common("cancel")}
            </button>
            <button type="submit" className={cn(buttonGhost, "px-4 py-2 text-sm")}>
              {common("save")}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={confirmPhase !== null}
        onCloseAction={() => setConfirmPhase(null)}
        title={t("removePhase")}
        lead={confirmPhase?.name}
        width="24rem"
      >
        <form
          action={async (formData) => {
            await removePhaseAction(formData);
            setConfirmPhase(null);
          }}
          className="flex justify-end gap-2"
        >
          <input type="hidden" name="phaseId" value={confirmPhase?.id ?? ""} />
          <button
            type="button"
            onClick={() => setConfirmPhase(null)}
            className={cn(buttonGhost, "px-4 py-2 text-sm")}
          >
            {common("cancel")}
          </button>
          <button type="submit" className={cn(buttonDanger, "px-4 py-2 text-sm")}>
            {t("removePhase")}
          </button>
        </form>
      </Modal>
    </div>
  );
}
