import { useTranslations } from "next-intl";
import { removeItemAction, updateItemAction } from "@/app/app/coach/treinos/actions";
import { Field } from "@/components/studio/Field";
import { Modal } from "@/components/studio/Modal";
import { SubmitButton } from "@/components/studio/SubmitButton";
import { buttonDanger } from "@/components/studio/theme";
import type { WorkoutItem } from "@/lib/studio/types";
import { cn } from "@/lib/utils";
import { smallField } from "./parts";

/**
 * Sets, reps, tempo, RPE and notes for one exercise — everything `ExerciseRow`
 * doesn't show inline. This is the same dialog the old card grid opened; only
 * its home moved, from a card's own `useState` to a prop the row controls.
 */
export function ExerciseDetailsDialog({
  workoutId,
  item,
  open,
  onCloseAction,
}: {
  workoutId: string;
  item: WorkoutItem;
  open: boolean;
  onCloseAction: () => void;
}) {
  const t = useTranslations("Studio.workouts");
  const common = useTranslations("Studio.common");
  const library = useTranslations("Studio.library");

  const timed = item.tracking === "time" || item.tracking === "hold";

  return (
    <Modal
      open={open}
      onCloseAction={onCloseAction}
      title={item.exerciseName}
      lead={library(`tracking.${item.tracking}`)}
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
        {timed && <input type="hidden" name="reps" value={item.reps} />}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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
              onCloseAction();
            }}
            className={cn(buttonDanger, "text-xs")}
          >
            {t("removeItem")}
          </button>
          <SubmitButton pendingLabel={common("saving")}>{common("save")}</SubmitButton>
        </div>
      </form>
    </Modal>
  );
}
