import { useOptimistic, useRef, useTransition } from "react";
import { useTranslations } from "next-intl";
import { removeBlockAction, setBlockKindAction, updateBlockAction } from "@/app/app/coach/treinos/actions";
import { Icon } from "@/components/studio/coach/icons";
import { surface } from "@/components/studio/theme";
import type { BlockKind, Exercise, WorkoutBlock } from "@/lib/studio/types";
import { cn } from "@/lib/utils";
import { ExerciseCard } from "./ExerciseCard";
import { ExercisePicker } from "./ExercisePicker";
import { smallField } from "./parts";

type Props = {
  workoutId: string;
  block: WorkoutBlock;
  exercises: Exercise[];
  draggingId: string | null;
  overId: string | null;
  onDragStartAction: (itemId: string, blockId: string) => void;
  onDragEndAction: () => void;
  onDragOverItemAction: (itemId: string) => void;
  onDropOnItemAction: (blockId: string, index: number) => void;
  onDropAtEndAction: (blockId: string) => void;
  onNudgeAction: (blockId: string, itemId: string, delta: -1 | 1) => void;
};

/**
 * One block of a workout: a format, a running order, and a grid of exercises.
 *
 * The format switch is the whole point of the block. **Séries** means each
 * exercise carries its own sets; **Circuito** means one pass through the list,
 * repeated N times — so in a circuit the per-exercise set count disappears
 * instead of quietly multiplying the volume.
 */
export function BlockCard({
  workoutId,
  block,
  exercises,
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
  const formRef = useRef<HTMLFormElement>(null);
  // Optimistic so the grid re-reads as sets or as rounds the instant it is
  // clicked, and so a failed write cannot leave the switch pointing at a
  // format the block is not in.
  const [kind, applyKind] = useOptimistic(block.kind, (_current, next: BlockKind) => next);
  const [, startTransition] = useTransition();

  // Legacy blocks may still be a superset or an interval; both are round-based,
  // so they sit on the circuit side of the switch until they are touched.
  const circuit = kind !== "normal";

  function switchKind(next: "normal" | "circuit") {
    if (next === kind) return;
    startTransition(async () => {
      applyKind(next);
      await setBlockKindAction(workoutId, block.id, next);
    });
  }

  return (
    <section className={cn(surface, "overflow-hidden")}>
      <form
        ref={formRef}
        action={updateBlockAction}
        className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-cream/10 p-3 sm:p-4"
      >
        <input type="hidden" name="workoutId" value={workoutId} />
        <input type="hidden" name="blockId" value={block.id} />
        <input type="hidden" name="kind" value={kind} />

        {/* Reads as the block's heading until you point at it; `field-sizing`
            keeps the box the width of the word instead of the row. */}
        <input
          name="label"
          defaultValue={block.label}
          size={Math.min(Math.max(block.label.length + 1, 12), 40)}
          placeholder={t("blockLabelPlaceholder")}
          aria-label={t("blockLabelLabel")}
          onBlur={() => formRef.current?.requestSubmit()}
          className="min-w-0 max-w-full rounded-[0.7rem] bg-transparent px-2.5 py-1.5 font-sans text-base font-semibold text-cream ring-1 ring-transparent transition outline-none field-sizing-content placeholder:text-cream/30 hover:bg-cream/[0.04] hover:ring-cream/15 focus:bg-cream/5 focus:ring-caramel/60"
        />

        <div className="ml-auto flex shrink-0 items-center">
          <div
            role="group"
            aria-label={t("formatLabel")}
            className="relative flex rounded-full bg-cream/[0.07] p-0.5 ring-1 ring-cream/10"
          >
            {/* The lit half slides between the two words; the fields to its
                right open at the same time, which is what pushes the whole
                switch leftward instead of making it jump. */}
            <span
              aria-hidden
              className={cn(
                "absolute inset-y-0.5 left-0.5 w-[5.5rem] rounded-full bg-accent-ink transition-transform duration-300 ease-out motion-reduce:transition-none",
                circuit ? "translate-x-full" : "translate-x-0",
              )}
            />
            {(["normal", "circuit"] as const).map((option) => {
              const on = (option === "circuit") === circuit;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => switchKind(option)}
                  aria-pressed={on}
                  className={cn(
                    "relative w-[5.5rem] rounded-full py-1.5 font-sans text-xs font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-caramel/70",
                    on ? "text-ink" : "text-cream/60 hover:text-cream",
                  )}
                >
                  {t(`format.${option}`)}
                </button>
              );
            })}
          </div>

          <div
            className={cn(
              "grid transition-[grid-template-columns] duration-300 ease-out motion-reduce:transition-none",
              circuit ? "grid-cols-[1fr]" : "grid-cols-[0fr]",
            )}
          >
            <div
              // `-my-1 py-1` widens the clip box past the pills' rings — a ring
              // is painted outside the border box, so an exact-height
              // `overflow-hidden` shaves its top and bottom off.
              className={cn(
                "-my-1 flex min-w-0 items-center gap-3 overflow-hidden py-1 pl-3 whitespace-nowrap transition-opacity duration-200 motion-reduce:transition-none",
                circuit ? "opacity-100 delay-100" : "opacity-0",
              )}
            >
              <label className="flex shrink-0 items-center gap-2 font-sans text-xs text-cream/55">
                <input
                  name="rounds"
                  type="number"
                  min={1}
                  defaultValue={block.rounds}
                  aria-label={t("roundsLabel")}
                  tabIndex={circuit ? undefined : -1}
                  onBlur={() => formRef.current?.requestSubmit()}
                  className={cn(smallField, "w-16 py-1.5 text-center")}
                />
                {t("roundsShort")}
              </label>
              <label className="flex shrink-0 items-center gap-2 font-sans text-xs text-cream/55">
                <input
                  name="restSeconds"
                  type="number"
                  min={0}
                  defaultValue={block.restSeconds}
                  aria-label={t("restLabel")}
                  tabIndex={circuit ? undefined : -1}
                  onBlur={() => formRef.current?.requestSubmit()}
                  className={cn(smallField, "w-16 py-1.5 text-center")}
                />
                {t("restShort")}
              </label>
            </div>
          </div>

          <button
            type="submit"
            formAction={removeBlockAction}
            aria-label={t("removeBlock")}
            title={t("removeBlock")}
            className="ml-3 shrink-0 rounded-full p-2 text-cream/40 transition-colors hover:bg-silk/10 hover:text-silk"
          >
            <Icon name="trash" className="h-4 w-4" />
          </button>
        </div>
      </form>

      <div
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          onDropAtEndAction(block.id);
        }}
        className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-3 sm:p-4 xl:grid-cols-4"
      >
        {block.items.map((item, index) => (
          <ExerciseCard
            key={item.id}
            workoutId={workoutId}
            item={item}
            position={index + 1}
            circuit={circuit}
            dragging={draggingId === item.id}
            over={overId === item.id && draggingId !== item.id}
            onDragStartAction={() => onDragStartAction(item.id, block.id)}
            onDragEndAction={onDragEndAction}
            onDragOverAction={() => onDragOverItemAction(item.id)}
            onDropOnAction={() => onDropOnItemAction(block.id, index)}
            onNudgeAction={(delta) => onNudgeAction(block.id, item.id, delta)}
          />
        ))}
        <ExercisePicker workoutId={workoutId} blockId={block.id} exercises={exercises} />
      </div>
    </section>
  );
}
