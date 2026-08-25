import { useState } from "react";
import { useTranslations } from "next-intl";
import { removeItemAction, updateItemAction } from "@/app/app/coach/treinos/actions";
import { Icon } from "@/components/studio/coach/icons";
import { Field } from "@/components/studio/Field";
import { ExerciseThumb } from "@/components/studio/library/ExerciseThumb";
import { Modal } from "@/components/studio/Modal";
import { SubmitButton } from "@/components/studio/SubmitButton";
import { buttonDanger } from "@/components/studio/theme";
import type { WorkoutItem } from "@/lib/studio/types";
import { cn } from "@/lib/utils";
import { prescription, smallField } from "./parts";

type Props = {
  workoutId: string;
  item: WorkoutItem;
  /** Running order inside the block, 1-based. In a circuit this is the sequence. */
  position: number;
  circuit: boolean;
  dragging: boolean;
  over: boolean;
  onDragStartAction: () => void;
  onDragEndAction: () => void;
  onDropOnAction: () => void;
  onDragOverAction: () => void;
  onNudgeAction: (delta: -1 | 1) => void;
};

/**
 * One exercise in the block grid: picture, name, prescription. Everything else
 * — sets, tempo, RPE, notes, removing it — is one click away in a dialog, so a
 * twelve-exercise workout stays a page you can read rather than a wall of
 * inputs.
 *
 * The whole card is the drag surface. The grip is an affordance and a keyboard
 * control: arrow keys move the card without a pointer.
 */
export function ExerciseCard({
  workoutId,
  item,
  position,
  circuit,
  dragging,
  over,
  onDragStartAction,
  onDragEndAction,
  onDropOnAction,
  onDragOverAction,
  onNudgeAction,
}: Props) {
  const t = useTranslations("Studio.workouts");
  const common = useTranslations("Studio.common");
  const library = useTranslations("Studio.library");
  const [open, setOpen] = useState(false);

  const timed = item.tracking === "time" || item.tracking === "hold";

  return (
    <>
      <div
        draggable
        onDragStart={(event) => {
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("text/plain", item.id);
          onDragStartAction();
        }}
        onDragEnd={onDragEndAction}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
          onDragOverAction();
        }}
        onDrop={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onDropOnAction();
        }}
        className={cn(
          "group relative rounded-[1rem] bg-cream/[0.04] p-2 ring-1 transition",
          dragging ? "opacity-40" : "opacity-100",
          over ? "ring-2 ring-accent-ink" : "ring-cream/10 hover:ring-cream/25",
        )}
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="block w-full cursor-grab text-left active:cursor-grabbing"
        >
          <ExerciseThumb videoUrl={item.videoUrl} className="aspect-[3/2] w-full" />
          <span className="mt-2.5 flex items-start gap-2 px-1">
            <span className="mt-px font-sans tabular-nums text-[0.7rem] text-cream/35">{position}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-sans text-sm font-semibold text-cream">
                {item.exerciseName}
              </span>
              <span className="mt-0.5 block truncate font-sans text-xs text-cream/55">
                {prescription(item, circuit)}
              </span>
            </span>
          </span>
        </button>

        <button
          type="button"
          aria-label={t("reorder")}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
              event.preventDefault();
              onNudgeAction(-1);
            }
            if (event.key === "ArrowRight" || event.key === "ArrowDown") {
              event.preventDefault();
              onNudgeAction(1);
            }
          }}
          className="absolute top-3 right-3 rounded-full bg-ink/60 p-1 text-cream/60 opacity-0 backdrop-blur-sm transition group-hover:opacity-100 hover:text-cream focus-visible:opacity-100"
        >
          <Icon name="grip" className="h-4 w-4" />
        </button>
      </div>

      <Modal
        open={open}
        onCloseAction={() => setOpen(false)}
        title={item.exerciseName}
        lead={library(`tracking.${item.tracking}`)}
      >
        <form
          action={async (formData) => {
            await updateItemAction(formData);
            setOpen(false);
          }}
          className="space-y-4"
        >
          <input type="hidden" name="workoutId" value={workoutId} />
          <input type="hidden" name="itemId" value={item.id} />
          {timed && <input type="hidden" name="reps" value={item.reps} />}

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
            {timed ? (
              <Field label={common("seconds")} htmlFor={`item-${item.id}-seconds`}>
                <input
                  id={`item-${item.id}-seconds`}
                  name="seconds"
                  type="number"
                  min={0}
                  defaultValue={item.seconds ?? ""}
                  className={smallField}
                />
              </Field>
            ) : (
              <Field label={common("reps")} htmlFor={`item-${item.id}-reps`}>
                <input
                  id={`item-${item.id}-reps`}
                  name="reps"
                  defaultValue={item.reps}
                  placeholder="8-10"
                  className={smallField}
                />
              </Field>
            )}
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
              type="submit"
              formAction={async (formData) => {
                await removeItemAction(formData);
                setOpen(false);
              }}
              className={cn(buttonDanger, "text-xs")}
            >
              {t("removeItem")}
            </button>
            <SubmitButton pendingLabel={common("saving")}>{common("save")}</SubmitButton>
          </div>
        </form>
      </Modal>
    </>
  );
}
