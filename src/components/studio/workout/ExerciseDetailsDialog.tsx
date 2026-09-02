import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { removeItemAction, updateItemAction } from "@/app/app/coach/treinos/actions";
import { Field } from "@/components/studio/Field";
import { Modal } from "@/components/studio/Modal";
import { SubmitButton } from "@/components/studio/SubmitButton";
import { buttonDanger } from "@/components/studio/theme";
import { formatRestDuration } from "@/lib/studio/duration";
import { trackingFor, type WorkoutItem } from "@/lib/studio/types";
import { cn } from "@/lib/utils";
import { smallField } from "./parts";

export function ExerciseDetailsDialog({
  workoutId,
  item,
  circuit,
  open,
  onCloseAction,
}: {
  workoutId: string;
  item: WorkoutItem;
  /** Inside a circuit the set count is the block's round count, not the item's. */
  circuit: boolean;
  open: boolean;
  onCloseAction: () => void;
}) {
  const t = useTranslations("Studio.workouts");
  const common = useTranslations("Studio.common");
  const library = useTranslations("Studio.library");

  const removeForm = useRef<HTMLFormElement>(null);
  // The switch opens on whatever the item is actually prescribed as, which is
  // the prescription's own answer and not the library's — see `trackingFor`.
  const tracking = trackingFor(item);
  const [mode, setMode] = useState<"reps" | "duration">(
    tracking === "time" || tracking === "hold" ? "duration" : "reps",
  );

  return (
    <Modal
      open={open}
      onCloseAction={onCloseAction}
      title={item.exerciseName}
      lead={library(`tracking.${tracking}`)}
    >
      <form
        action={async (formData) => {
          await updateItemAction(formData);
          onCloseAction();
        }}
        className="space-y-4"
      >
        <input type="hidden" name="workoutId" value={workoutId} />
        <input type="hidden" name="itemId" value={item.id} />
        <input type="hidden" name="measureMode" value={mode} />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {!circuit && (
            <Field label={common("sets")} htmlFor={`item-${item.id}-sets`}>
              <input
                id={`item-${item.id}-sets`}
                name="sets"
                type="number"
                min={1}
                defaultValue={item.sets}
                className={smallField}
              />
            </Field>
          )}
          <Field label={t("repsDurationLabel")} htmlFor={`item-${item.id}-measure`}>
            {mode === "duration" ? (
              <input
                key="duration"
                id={`item-${item.id}-measure`}
                name="durationText"
                defaultValue={item.seconds != null ? formatRestDuration(item.seconds) : ""}
                placeholder="30s"
                className={smallField}
              />
            ) : (
              <input
                key="reps"
                id={`item-${item.id}-measure`}
                name="reps"
                defaultValue={item.reps}
                placeholder="8-10"
                className={smallField}
              />
            )}
            <div className="mt-2 grid grid-cols-2 gap-1 rounded-[0.75rem] bg-cream/5 p-1 ring-1 ring-cream/10">
              <button
                type="button"
                onClick={() => setMode("reps")}
                className={cn(
                  "rounded-[0.55rem] px-2 py-1.5 font-sans text-xs font-semibold transition-colors",
                  mode === "reps" ? "bg-accent-ink text-ink" : "text-cream/55 hover:text-cream",
                )}
              >
                {common("reps")}
              </button>
              <button
                type="button"
                onClick={() => setMode("duration")}
                className={cn(
                  "rounded-[0.55rem] px-2 py-1.5 font-sans text-xs font-semibold transition-colors",
                  mode === "duration" ? "bg-accent-ink text-ink" : "text-cream/55 hover:text-cream",
                )}
              >
                {t("measureDuration")}
              </button>
            </div>
          </Field>
          <Field label={common("rest")} htmlFor={`item-${item.id}-rest`}>
            <input
              id={`item-${item.id}-rest`}
              name="restSeconds"
              type="number"
              min={0}
              defaultValue={item.restSeconds}
              className={smallField}
            />
          </Field>
          <Field label={common("tempo")} htmlFor={`item-${item.id}-tempo`}>
            <input
              id={`item-${item.id}-tempo`}
              name="tempo"
              defaultValue={item.tempo}
              placeholder="3-1-1"
              className={smallField}
            />
          </Field>
          <Field label={common("rpe")} htmlFor={`item-${item.id}-rpe`}>
            <input
              id={`item-${item.id}-rpe`}
              name="rpe"
              defaultValue={item.rpe}
              placeholder="7"
              className={smallField}
            />
          </Field>
        </div>

        <Field label={common("notes")} htmlFor={`item-${item.id}-notes`}>
          <textarea
            id={`item-${item.id}-notes`}
            name="notes"
            rows={2}
            defaultValue={item.notes}
            className={smallField}
          />
        </Field>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-cream/10 pt-4">
          <button
            type="button"
            onClick={() => removeForm.current?.requestSubmit()}
            className={cn(buttonDanger, "text-xs")}
          >
            {t("removeItem")}
          </button>
          <SubmitButton pendingLabel={common("saving")}>{common("save")}</SubmitButton>
        </div>
      </form>

      <form
        ref={removeForm}
        action={async (formData) => {
          await removeItemAction(formData);
          onCloseAction();
        }}
        className="hidden"
      >
        <input type="hidden" name="workoutId" value={workoutId} />
        <input type="hidden" name="itemId" value={item.id} />
      </form>
    </Modal>
  );
}
