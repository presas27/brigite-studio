import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { addExerciseAction } from "@/app/app/coach/treinos/actions";
import { Icon } from "@/components/studio/coach/icons";
import { ExerciseThumb } from "@/components/studio/library/ExerciseThumb";
import { Modal } from "@/components/studio/Modal";
import { field } from "@/components/studio/theme";
import type { Exercise } from "@/lib/studio/types";
import { cn } from "@/lib/utils";

/**
 * Add exercises without leaving the block: type two letters, click the picture.
 * The dialog stays open after each pick, because a block is almost never one
 * exercise and reopening it four times is the slow way to build a circuit.
 */
export function ExercisePicker({
  workoutId,
  blockId,
  exercises,
}: {
  workoutId: string;
  blockId: string;
  exercises: Exercise[];
}) {
  const t = useTranslations("Studio.workouts");
  const common = useTranslations("Studio.common");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [added, setAdded] = useState<string[]>([]);
  const [, startTransition] = useTransition();

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return exercises;
    return exercises.filter(
      (exercise) =>
        exercise.name.toLowerCase().includes(needle) ||
        exercise.tags.some((tag) => tag.toLowerCase().includes(needle)),
    );
  }, [exercises, query]);

  function add(exerciseId: string) {
    setAdded((current) => [...current, exerciseId]);
    startTransition(async () => {
      await addExerciseAction(workoutId, blockId, exerciseId);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setQuery("");
          setAdded([]);
          setOpen(true);
        }}
        className="flex aspect-[3/2] w-full flex-col items-center justify-center gap-2 rounded-[1rem] border border-dashed border-cream/20 bg-transparent p-4 font-sans text-xs font-semibold text-cream/55 transition-colors hover:border-caramel/50 hover:bg-cream/[0.03] hover:text-cream"
      >
        <Icon name="plus" className="h-5 w-5" />
        {t("addExercise")}
      </button>

      <Modal
        open={open}
        onCloseAction={() => setOpen(false)}
        title={t("addExercise")}
        width="46rem"
      >
        <div className="relative">
          <Icon
            name="search"
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-cream/40"
          />
          <input
            autoFocus
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("searchExercise")}
            aria-label={t("searchExercise")}
            className={cn(field, "py-2.5 pl-9 text-sm")}
          />
        </div>

        {results.length === 0 ? (
          <p className="mt-6 font-sans text-sm text-cream/55">{t("noExerciseResults")}</p>
        ) : (
          <ul className="mt-4 grid max-h-[50vh] grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3">
            {results.map((exercise) => {
              const count = added.filter((id) => id === exercise.id).length;
              return (
                <li key={exercise.id}>
                  <button
                    type="button"
                    onClick={() => add(exercise.id)}
                    className="group relative w-full rounded-[1rem] bg-cream/[0.04] p-2 text-left ring-1 ring-cream/10 transition hover:ring-caramel/50"
                  >
                    <ExerciseThumb mediaId={exercise.mediaId} className="aspect-[3/2] w-full" />
                    <span className="mt-2 block truncate px-1 font-sans text-sm font-semibold text-cream">
                      {exercise.name}
                    </span>
                    {count > 0 && (
                      <span className="absolute top-3 right-3 inline-flex min-w-5 items-center justify-center rounded-full bg-accent-fill px-1.5 py-0.5 font-sans tabular-nums text-[0.65rem] leading-none text-ink">
                        {count}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-5 flex justify-end border-t border-cream/10 pt-4">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-butter px-5 py-2.5 font-sans text-sm font-semibold text-on-primary transition-colors hover:bg-primary-hover"
          >
            {common("close")}
          </button>
        </div>
      </Modal>
    </>
  );
}
