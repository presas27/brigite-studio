"use client";

import { useMemo, useOptimistic, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  addBlockAction,
  addRestAction,
  groupItemsAction,
  moveBlockAction,
  reorderItemsAction,
  updateInstructionsAction,
} from "@/app/app/coach/treinos/actions";
import { Icon } from "@/components/studio/coach/icons";
import { Empty } from "@/components/studio/Empty";
import { buttonGhost, buttonQuiet, eyebrow, field, heading, muted, surface } from "@/components/studio/theme";
import { usePersistedView } from "@/components/studio/usePersistedView";
import { ViewToggle } from "@/components/studio/ViewToggle";
import { isRestItem, type Exercise, type Workout, type WorkoutBlock } from "@/lib/studio/types";
import { cn } from "@/lib/utils";
import { BlockCard } from "./BlockCard";
import { ExercisePicker } from "./ExercisePicker";

/**
 * The construction screen for a workout: instructions, then the workout's
 * blocks, top to bottom, in the order they are performed.
 *
 * Everything is a block. A plain block is a sequence — three sets of this, then
 * three sets of that; a superset or circuit is the same list read a different
 * way, with the round count replacing the per-exercise sets. Nothing floats
 * outside a block any more, which is what makes the running order editable at
 * all: a block moves as one thing, and the ungrouped list this replaced could
 * not move, so a circuit typed first was stuck above the stretches it belonged
 * after.
 *
 * Two views, same blocks and same behaviour: the horizontal picture grid, for
 * reading the shape of a session, and the stacked rows, for reading its
 * numbers. The choice is the coach's and it sticks — see `usePersistedView`,
 * the same preference the libraries keep.
 *
 * The drag machinery lives here rather than in a child because a drag can cross
 * blocks: the order of every block is one piece of state, so a card dropped
 * into a neighbouring block is a single move rather than a remove plus an add.
 * The drop is applied on screen first and posted inside a transition — the
 * server answer arrives as new props and overwrites the draft, so a rejected
 * move snaps back instead of lying.
 */
export function WorkoutBuilder({
  workout,
  exercises,
}: {
  workout: Workout;
  exercises: Pick<Exercise, "id" | "name" | "videoUrl" | "tags">[];
}) {
  const t = useTranslations("Studio.workouts");
  const instructionsFormRef = useRef<HTMLFormElement>(null);
  const [draft, applyDraft] = useOptimistic(workout.blocks, (_current, next: WorkoutBlock[]) => next);
  const [dragging, setDragging] = useState<{ itemId: string; blockId: string } | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [view, setView] = usePersistedView("studio.workout.builder.view");
  const [, startTransition] = useTransition();

  const blocks = useMemo(() => [...draft].sort((a, b) => a.position - b.position), [draft]);
  const total = draft.reduce((sum, block) => sum + block.items.length, 0);

  // The order a grouping action posts ids in: on-screen order, block by block —
  // not the order the coach happened to click.
  const orderedItemIds = useMemo(
    () => blocks.flatMap((block) => block.items.map((item) => item.id)),
    [blocks],
  );

  /** Show a new arrangement at once, then persist the target block's order. */
  function commit(next: WorkoutBlock[], targetBlockId: string) {
    const target = next.find((block) => block.id === targetBlockId);
    if (!target) return;
    const itemIds = target.items.map((item) => item.id);
    startTransition(async () => {
      applyDraft(next);
      await reorderItemsAction(workout.id, targetBlockId, itemIds);
    });
  }

  /** Move the dragged row into `targetBlockId` at `index` (or at the end). */
  function drop(targetBlockId: string, index: number | "end") {
    const drag = dragging;
    setDragging(null);
    setOverId(null);
    if (!drag) return;

    const next = draft.map((block) => ({ ...block, items: [...block.items] }));
    const from = next.find((block) => block.id === drag.blockId);
    const to = next.find((block) => block.id === targetBlockId);
    if (!from || !to) return;

    const fromIndex = from.items.findIndex((item) => item.id === drag.itemId);
    if (fromIndex < 0) return;
    const [moved] = from.items.splice(fromIndex, 1);
    const at = index === "end" ? to.items.length : Math.min(index, to.items.length);
    if (from === to && at === fromIndex) return;
    to.items.splice(at, 0, moved);

    commit(next, targetBlockId);
  }

  /** Keyboard equivalent of a short drag: one slot either way, same block. */
  function nudge(blockId: string, itemId: string, delta: -1 | 1) {
    const next = draft.map((block) => ({ ...block, items: [...block.items] }));
    const block = next.find((candidate) => candidate.id === blockId);
    if (!block) return;
    const index = block.items.findIndex((item) => item.id === itemId);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= block.items.length) return;
    [block.items[index], block.items[target]] = [block.items[target], block.items[index]];
    commit(next, blockId);
  }

  /**
   * Move a whole block one slot — the card and every exercise in it, as one
   * move. Two positions are swapped rather than the list renumbered, because
   * position is the only thing on-screen order is derived from.
   */
  function moveBlock(blockId: string, delta: -1 | 1) {
    const index = blocks.findIndex((block) => block.id === blockId);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= blocks.length) return;

    const from = blocks[index];
    const to = blocks[target];
    const next = draft.map((block) => {
      if (block.id === from.id) return { ...block, position: to.position };
      if (block.id === to.id) return { ...block, position: from.position };
      return block;
    });
    startTransition(async () => {
      applyDraft(next);
      await moveBlockAction(workout.id, blockId, delta);
    });
  }

  function toggleSelected(itemId: string, checked: boolean) {
    const item = draft.flatMap((block) => block.items).find((row) => row.id === itemId);
    if (item && isRestItem(item)) return;
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) next.add(itemId);
      else next.delete(itemId);
      return next;
    });
  }

  /**
   * Combine the current selection into a block of its own, where the selection
   * already sits, and clear it — the selection never survives past the click.
   */
  function groupSelection(kind: "superset" | "circuit") {
    const restIds = new Set(
      draft.flatMap((block) => block.items).filter(isRestItem).map((item) => item.id),
    );
    const ids = orderedItemIds.filter((id) => selectedIds.has(id) && !restIds.has(id));
    if (ids.length < 2) return;
    startTransition(async () => {
      setSelectedIds(new Set());
      if (kind === "superset") await groupItemsAction(workout.id, ids, "superset");
      else await groupItemsAction(workout.id, ids, "circuit", 3);
    });
  }

  return (
    <div className="space-y-6">
      <form ref={instructionsFormRef} action={updateInstructionsAction} className="space-y-1.5">
        <input type="hidden" name="workoutId" value={workout.id} />
        <label htmlFor="workout-instructions" className={eyebrow}>
          {t("instructionsLabel")}
        </label>
        <textarea
          id="workout-instructions"
          name="instructions"
          rows={3}
          defaultValue={workout.instructions}
          placeholder={t("instructionsPlaceholder")}
          onBlur={() => instructionsFormRef.current?.requestSubmit()}
          className={field}
        />
      </form>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className={cn(heading, "text-lg")}>{t("exercisesTitle")}</h2>
          <div className="flex items-center gap-2">
            <ViewToggle view={view} onChangeAction={setView} />
            <button
              type="button"
              onClick={() => startTransition(() => addRestAction(workout.id))}
              className={cn(buttonGhost, "gap-1.5 px-4 py-2 text-xs")}
            >
              <Icon name="plus" className="h-4 w-4" />
              {t("addRest")}
            </button>
            <ExercisePicker workoutId={workout.id} exercises={exercises} compact />
          </div>
        </div>

        {blocks.length === 0 && <Empty title={t("noExercises")} hint={t("noExercisesHint")} />}

        <div className="space-y-3">
          {blocks.map((block, index) => (
            <BlockCard
              key={block.id}
              workoutId={workout.id}
              block={block}
              exercises={exercises}
              canMoveUp={index > 0}
              canMoveDown={index < blocks.length - 1}
              onMoveAction={(delta) => moveBlock(block.id, delta)}
              selection={{ selected: selectedIds, onToggleAction: toggleSelected }}
              view={view}
              draggingId={dragging?.itemId ?? null}
              overId={overId}
              onDragStartAction={(itemId, blockId) => setDragging({ itemId, blockId })}
              onDragEndAction={() => {
                setDragging(null);
                setOverId(null);
              }}
              onDragOverItemAction={setOverId}
              onDropOnItemAction={drop}
              onDropAtEndAction={(blockId) => drop(blockId, "end")}
              onNudgeAction={nudge}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => startTransition(() => addBlockAction(workout.id))}
          className={cn(buttonGhost, "w-full gap-1.5 px-4 py-3 text-xs")}
        >
          <Icon name="plus" className="h-4 w-4" />
          {t("addBlock")}
        </button>

        {total > 0 &&
          (selectedIds.size < 2 ? (
            <p className={muted}>{t("groupHint")}</p>
          ) : (
            <div className={cn(surface, "sticky bottom-4 z-10 flex items-center gap-2 p-3")}>
              <span className="font-sans text-sm font-semibold text-cream">
                {t("groupSelected", { count: selectedIds.size })}
              </span>
              <button
                type="button"
                onClick={() => groupSelection("superset")}
                className={cn(buttonGhost, "px-4 py-2 text-xs")}
              >
                {t("groupAsSuperset")}
              </button>
              <button
                type="button"
                onClick={() => groupSelection("circuit")}
                className={cn(buttonGhost, "px-4 py-2 text-xs")}
              >
                {t("groupAsCircuit")}
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className={buttonQuiet}
              >
                {t("clearSelection")}
              </button>
            </div>
          ))}
      </div>
    </div>
  );
}
