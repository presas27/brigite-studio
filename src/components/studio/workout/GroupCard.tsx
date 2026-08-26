import { useRef, useTransition } from "react";
import { useTranslations } from "next-intl";
import { setRoundsAction, ungroupBlockAction } from "@/app/app/coach/treinos/actions";
import { buttonQuiet, surface } from "@/components/studio/theme";
import type { View } from "@/components/studio/ViewToggle";
import type { Exercise, WorkoutBlock } from "@/lib/studio/types";
import { cn } from "@/lib/utils";
import { ExerciseList } from "./ExerciseList";
import { ExercisePicker } from "./ExercisePicker";
import { smallField } from "./parts";

type DragProps = {
  draggingId: string | null;
  overId: string | null;
  onDragStartAction: (itemId: string, blockId: string) => void;
  onDragEndAction: () => void;
  onDragOverItemAction: (itemId: string) => void;
  onDropOnItemAction: (blockId: string, index: number) => void;
  onDropAtEndAction: (blockId: string) => void;
  onNudgeAction: (blockId: string, itemId: string, delta: -1 | 1) => void;
};

type Selection = {
  selected: Set<string>;
  onToggleAction: (itemId: string, checked: boolean) => void;
};

type Props = DragProps & {
  workoutId: string;
  block: WorkoutBlock;
  /** Derived display label — "Super set 1", "Circuit 2"… Never `block.label`. */
  label: string;
  rounds: number;
  exercises: Exercise[];
  selection: Selection;
  view: View;
};

/**
 * One superset or circuit: a header (name, round count for a circuit, and
 * ungroup), then its exercises in whichever view the builder is in, then a
 * picker to add straight into the group.
 */
export function GroupCard({
  workoutId,
  block,
  label,
  rounds,
  exercises,
  selection,
  view,
  draggingId,
  overId,
  onDragStartAction,
  onDragEndAction,
  onDragOverItemAction,
  onDropOnItemAction,
  onDropAtEndAction,
  onNudgeAction,
}: Props) {
  const t = useTranslations("Studio.workouts");
  const roundsRef = useRef<HTMLInputElement>(null);
  const [, startTransition] = useTransition();

  // A superset is two exercises back to back — each still logs its own sets.
  // A circuit is the whole list, repeated: the round count is what governs
  // repetition, so it is the only one with a rounds field.
  const circuit = block.kind !== "superset";

  function commitRounds() {
    const value = Number.parseInt(roundsRef.current?.value ?? "", 10);
    if (!Number.isFinite(value)) return;
    startTransition(async () => {
      await setRoundsAction(workoutId, block.id, Math.max(1, value));
    });
  }

  function ungroup() {
    startTransition(async () => {
      await ungroupBlockAction(workoutId, block.id);
    });
  }

  return (
    <section className={cn(surface, "space-y-3 p-3 sm:p-4")}>
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="font-sans text-sm font-semibold text-accent-ink">{label}</h3>

        {block.kind === "circuit" && (
          <label className="flex items-center gap-2 font-sans text-xs text-cream/55">
            <input
              ref={roundsRef}
              type="number"
              min={1}
              defaultValue={rounds}
              aria-label={t("roundsLabel")}
              onBlur={commitRounds}
              className={cn(smallField, "w-16 text-center")}
            />
            {t("roundsShort")}
          </label>
        )}

        <button type="button" onClick={ungroup} className={cn(buttonQuiet, "ml-auto")}>
          {t("ungroup")}
        </button>
      </div>

      <div
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          onDropAtEndAction(block.id);
        }}
      >
        <ExerciseList
          workoutId={workoutId}
          rows={block.items.map((item) => ({ item, blockId: block.id }))}
          view={view}
          dense
          circuit={circuit}
          selectedIds={selection.selected}
          onToggleAction={selection.onToggleAction}
          draggingId={draggingId}
          overId={overId}
          onDragStartAction={onDragStartAction}
          onDragEndAction={onDragEndAction}
          onDragOverAction={onDragOverItemAction}
          onDropOnAction={onDropOnItemAction}
          onNudgeAction={onNudgeAction}
          footer={
            <ExercisePicker
              workoutId={workoutId}
              blockId={block.id}
              exercises={exercises}
              compact={view === "list"}
            />
          }
        />
      </div>
    </section>
  );
}
