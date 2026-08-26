import { useRef, useTransition } from "react";
import { useTranslations } from "next-intl";
import { setRoundsAction, ungroupBlockAction } from "@/app/app/coach/treinos/actions";
import { buttonQuiet, surface } from "@/components/studio/theme";
import type { Exercise, WorkoutBlock } from "@/lib/studio/types";
import { cn } from "@/lib/utils";
import { ExercisePicker } from "./ExercisePicker";
import { ExerciseRow } from "./ExerciseRow";
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
};

/**
 * One superset or circuit: a header (name, round count for a circuit, and
 * ungroup), then its exercises as rows, then a picker to add straight into
 * the group.
 */
export function GroupCard({
  workoutId,
  block,
  label,
  rounds,
  exercises,
  selection,
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
        className="space-y-2"
      >
        {block.items.map((item, index) => (
          <ExerciseRow
            key={item.id}
            workoutId={workoutId}
            item={item}
            position={index + 1}
            circuit={circuit}
            selected={selection.selected.has(item.id)}
            onSelectAction={(checked) => selection.onToggleAction(item.id, checked)}
            dragging={draggingId === item.id}
            over={overId === item.id && draggingId !== item.id}
            onDragStartAction={() => onDragStartAction(item.id, block.id)}
            onDragEndAction={onDragEndAction}
            onDragOverAction={() => onDragOverItemAction(item.id)}
            onDropOnAction={() => onDropOnItemAction(block.id, index)}
            onNudgeAction={(delta) => onNudgeAction(block.id, item.id, delta)}
          />
        ))}

        <ExercisePicker workoutId={workoutId} blockId={block.id} exercises={exercises} compact />
      </div>
    </section>
  );
}
