import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Empty } from "@/components/studio/Empty";
import { Field } from "@/components/studio/Field";
import { PageHeader } from "@/components/studio/PageHeader";
import { SubmitButton } from "@/components/studio/SubmitButton";
import { field, surface } from "@/components/studio/theme";
import { requireCoach } from "@/lib/studio/auth";
import { findWorkout, listExercises } from "@/lib/studio/library";
import { cn } from "@/lib/utils";
import { addBlockAction, updateWorkoutAction } from "../actions";
import { BLOCK_KINDS, BlockCard } from "./BlockCard";

export const metadata: Metadata = {
  title: "Treino",
  robots: { index: false, follow: false },
};

/**
 * The workout builder: an ordered list of blocks, each an ordered list of
 * exercises. Every row is its own plain-HTML form — no client state machine,
 * so the page works even with JavaScript disabled.
 */
export default async function WorkoutBuilderPage({
  params,
}: {
  params: Promise<{ workoutId: string }>;
}) {
  await requireCoach();
  const { workoutId } = await params;

  const workout = findWorkout(workoutId);
  if (!workout) notFound();

  const [t, common] = await Promise.all([
    getTranslations("Studio.workouts"),
    getTranslations("Studio.common"),
  ]);
  const exercises = listExercises();

  return (
    <div className="space-y-8">
      <PageHeader
        backHref="/app/coach/treinos"
        backLabel={common("back")}
        kicker={workout.focus || undefined}
        title={workout.name}
        lead={workout.notes || undefined}
      />

      <details className={cn(surface, "p-5")}>
        <summary className="cursor-pointer font-sans text-sm font-semibold text-cream/80 transition-colors hover:text-cream">
          {t("details")}
        </summary>
        <form action={updateWorkoutAction} className="mt-4 grid gap-4 sm:grid-cols-3">
          <input type="hidden" name="workoutId" value={workoutId} />
          <Field label={t("nameLabel")} htmlFor="workout-name" required>
            <input id="workout-name" name="name" required defaultValue={workout.name} className={field} />
          </Field>
          <Field label={t("focusLabel")} htmlFor="workout-focus">
            <input
              id="workout-focus"
              name="focus"
              defaultValue={workout.focus}
              placeholder={t("focusPlaceholder")}
              className={field}
            />
          </Field>
          <Field label={t("notesLabel")} htmlFor="workout-notes" className="sm:col-span-3">
            <textarea
              id="workout-notes"
              name="notes"
              rows={2}
              defaultValue={workout.notes}
              placeholder={t("notesPlaceholder")}
              className={field}
            />
          </Field>
          <div className="sm:col-span-3">
            <SubmitButton pendingLabel={common("saving")}>{common("save")}</SubmitButton>
          </div>
        </form>
      </details>

      {workout.blocks.length === 0 ? (
        <Empty title={t("noBlocks")} hint={t("noBlocksHint")} />
      ) : (
        <div className="space-y-4">
          {workout.blocks.map((block) => (
            <BlockCard key={block.id} workoutId={workoutId} block={block} exercises={exercises} />
          ))}
        </div>
      )}

      <form action={addBlockAction} className={cn(surface, "flex flex-wrap items-end gap-3 p-5")}>
        <input type="hidden" name="workoutId" value={workoutId} />
        <Field label={t("blockKindLabel")} htmlFor="new-block-kind">
          <select id="new-block-kind" name="kind" defaultValue="normal" className={field}>
            {BLOCK_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {t(`blockKind.${kind}`)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("blockLabelLabel")} htmlFor="new-block-label" className="min-w-48 grow">
          <input id="new-block-label" name="label" placeholder={t("blockLabelPlaceholder")} className={field} />
        </Field>
        <SubmitButton pendingLabel={common("adding")}>{t("addBlock")}</SubmitButton>
      </form>
    </div>
  );
}
