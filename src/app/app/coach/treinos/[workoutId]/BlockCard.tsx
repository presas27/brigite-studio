import { getTranslations } from "next-intl/server";
import type { Exercise, WorkoutBlock, WorkoutItem } from "@/lib/studio/types";
import { Field } from "@/components/studio/Field";
import { SubmitButton } from "@/components/studio/SubmitButton";
import { chip, chipAccent, fieldCompact, muted, surface } from "@/components/studio/theme";
import { cn } from "@/lib/utils";
import {
  addItemAction,
  moveItemDownAction,
  moveItemUpAction,
  removeBlockAction,
  removeItemAction,
  updateBlockAction,
  updateItemAction,
} from "../actions";

export const BLOCK_KINDS = ["normal", "superset", "circuit", "interval"] as const;

/** One block: its own quick-edit disclosure, its items, and an "add exercise" row. */
export async function BlockCard({
  workoutId,
  block,
  exercises,
}: {
  workoutId: string;
  block: WorkoutBlock;
  exercises: Exercise[];
}) {
  const t = await getTranslations("Studio.workouts");
  const common = await getTranslations("Studio.common");

  return (
    <section className={cn(surface, "space-y-4 p-5")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={chipAccent}>{t(`blockKind.${block.kind}`)}</span>
            {block.label && <p className="font-sans text-sm font-semibold text-cream">{block.label}</p>}
          </div>
          <p className={muted}>
            {t("rounds", { count: block.rounds })} · {common("rest")}: {block.restSeconds}{" "}
            {common("seconds").toLowerCase()}
          </p>
        </div>

        <details>
          <summary className="cursor-pointer font-sans text-xs text-cream/60 transition-colors hover:text-cream">
            {t("details")}
          </summary>
          <form action={updateBlockAction} className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <input type="hidden" name="workoutId" value={workoutId} />
            <input type="hidden" name="blockId" value={block.id} />
            <Field label={t("blockKindLabel")} htmlFor={`block-${block.id}-kind`} className="col-span-2">
              <select
                id={`block-${block.id}-kind`}
                name="kind"
                defaultValue={block.kind}
                className={fieldCompact}
              >
                {BLOCK_KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {t(`blockKind.${kind}`)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("blockLabelLabel")} htmlFor={`block-${block.id}-label`} className="col-span-2">
              <input
                id={`block-${block.id}-label`}
                name="label"
                defaultValue={block.label}
                placeholder={t("blockLabelPlaceholder")}
                className={fieldCompact}
              />
            </Field>
            <Field label={t("roundsLabel")} htmlFor={`block-${block.id}-rounds`}>
              <input
                id={`block-${block.id}-rounds`}
                name="rounds"
                type="number"
                min={1}
                defaultValue={block.rounds}
                className={fieldCompact}
              />
            </Field>
            <Field label={common("rest")} htmlFor={`block-${block.id}-rest`}>
              <input
                id={`block-${block.id}-rest`}
                name="restSeconds"
                type="number"
                min={0}
                defaultValue={block.restSeconds}
                className={fieldCompact}
              />
            </Field>
            <div className="col-span-2 flex items-end gap-2 sm:col-span-4">
              <SubmitButton pendingLabel={common("saving")} className="px-4 py-2 text-xs">
                {common("save")}
              </SubmitButton>
              <SubmitButton formAction={removeBlockAction} variant="ghost" className="px-4 py-2 text-xs">
                {t("removeBlock")}
              </SubmitButton>
            </div>
          </form>
        </details>
      </div>

      {block.items.length === 0 ? (
        <p className={muted}>{t("blockEmpty")}</p>
      ) : (
        <ul className="space-y-3">
          {block.items.map((item) => (
            <ItemRow key={item.id} workoutId={workoutId} item={item} />
          ))}
        </ul>
      )}

      <form
        action={addItemAction}
        className="flex flex-wrap items-end gap-2 border-t border-cream/10 pt-4"
      >
        <input type="hidden" name="workoutId" value={workoutId} />
        <input type="hidden" name="blockId" value={block.id} />
        <Field label={t("addExercise")} htmlFor={`add-item-${block.id}`} className="min-w-48 grow">
          <select id={`add-item-${block.id}`} name="exerciseId" defaultValue="" required className={fieldCompact}>
            <option value="" disabled>
              {t("chooseExercise")}
            </option>
            {exercises.map((exercise) => (
              <option key={exercise.id} value={exercise.id}>
                {exercise.name}
              </option>
            ))}
          </select>
        </Field>
        <SubmitButton pendingLabel={common("adding")} className="px-4 py-2 text-xs">
          {t("addExercise")}
        </SubmitButton>
      </form>
    </section>
  );
}

/** One exercise row: name, the tight editable grid, and move/remove controls. */
async function ItemRow({ workoutId, item }: { workoutId: string; item: WorkoutItem }) {
  const t = await getTranslations("Studio.workouts");
  const common = await getTranslations("Studio.common");
  const library = await getTranslations("Studio.library");

  return (
    <li className="rounded-[1rem] bg-cream/[0.03] p-3 ring-1 ring-cream/10">
      <form action={updateItemAction} className="space-y-3">
        <input type="hidden" name="workoutId" value={workoutId} />
        <input type="hidden" name="itemId" value={item.id} />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-sans text-sm font-semibold text-cream">{item.exerciseName}</p>
          <span className={chip}>{library(`tracking.${item.tracking}`)}</span>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:grid-cols-7">
          <Field label={common("sets")} htmlFor={`item-${item.id}-sets`}>
            <input
              id={`item-${item.id}-sets`}
              name="sets"
              type="number"
              min={1}
              defaultValue={item.sets}
              className={fieldCompact}
            />
          </Field>
          <Field label={common("reps")} htmlFor={`item-${item.id}-reps`}>
            <input id={`item-${item.id}-reps`} name="reps" defaultValue={item.reps} className={fieldCompact} />
          </Field>
          <Field label={common("seconds")} htmlFor={`item-${item.id}-seconds`}>
            <input
              id={`item-${item.id}-seconds`}
              name="seconds"
              type="number"
              min={0}
              defaultValue={item.seconds ?? ""}
              className={fieldCompact}
            />
          </Field>
          <Field label={common("tempo")} htmlFor={`item-${item.id}-tempo`}>
            <input id={`item-${item.id}-tempo`} name="tempo" defaultValue={item.tempo} className={fieldCompact} />
          </Field>
          <Field label={common("rest")} htmlFor={`item-${item.id}-rest`}>
            <input
              id={`item-${item.id}-rest`}
              name="restSeconds"
              type="number"
              min={0}
              defaultValue={item.restSeconds}
              className={fieldCompact}
            />
          </Field>
          <Field label={common("rpe")} htmlFor={`item-${item.id}-rpe`}>
            <input id={`item-${item.id}-rpe`} name="rpe" defaultValue={item.rpe} className={fieldCompact} />
          </Field>
          <Field label={common("notes")} htmlFor={`item-${item.id}-notes`} className="col-span-3 sm:col-span-2">
            <input id={`item-${item.id}-notes`} name="notes" defaultValue={item.notes} className={fieldCompact} />
          </Field>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <SubmitButton pendingLabel={common("saving")} className="px-3 py-1.5 text-xs">
            {common("save")}
          </SubmitButton>
          <SubmitButton formAction={moveItemUpAction} variant="ghost" className="px-3 py-1.5 text-xs">
            {t("moveUp")}
          </SubmitButton>
          <SubmitButton formAction={moveItemDownAction} variant="ghost" className="px-3 py-1.5 text-xs">
            {t("moveDown")}
          </SubmitButton>
          <SubmitButton formAction={removeItemAction} variant="ghost" className="px-3 py-1.5 text-xs">
            {t("removeItem")}
          </SubmitButton>
        </div>
      </form>
    </li>
  );
}
