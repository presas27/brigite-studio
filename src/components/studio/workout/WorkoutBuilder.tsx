"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { addBlockAction, reorderItemsAction } from "@/app/app/coach/treinos/actions";
import { Icon } from "@/components/studio/coach/icons";
import type { Exercise, WorkoutBlock } from "@/lib/studio/types";
import { BlockCard } from "./BlockCard";

/**
 * The builder's moving parts live here because a drag can cross blocks: the
 * order of every block is one piece of state, so a card dropped into a
 * neighbouring grid is a single move rather than a remove plus an add.
 *
 * The drop is applied on screen first and posted inside a transition. The
 * server answer arrives as new props and overwrites the draft, so a rejected
 * move snaps back instead of lying.
 */
export function WorkoutBuilder({
  workoutId,
  blocks,
  exercises,
}: {
  workoutId: string;
  blocks: WorkoutBlock[];
  exercises: Exercise[];
}) {
  const t = useTranslations("Studio.workouts");
  // `useOptimistic` rather than mirrored state: the arrangement snaps back to
  // the server's on its own when the transition settles, so a rejected move
  // cannot linger on screen as a lie.
  const [draft, applyDraft] = useOptimistic(blocks, (_current, next: WorkoutBlock[]) => next);
  const [dragging, setDragging] = useState<{ itemId: string; blockId: string } | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  /** Show a new arrangement at once, then persist the target block's order. */
  function commit(next: WorkoutBlock[], targetBlockId: string) {
    const target = next.find((block) => block.id === targetBlockId);
    if (!target) return;
    const itemIds = target.items.map((item) => item.id);
    startTransition(async () => {
      applyDraft(next);
      await reorderItemsAction(workoutId, targetBlockId, itemIds);
    });
  }

  /** Move the dragged card into `targetBlockId` at `index` (or at the end). */
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

  return (
    <div className="space-y-4">
      {draft.map((block) => (
        <BlockCard
          key={block.id}
          workoutId={workoutId}
          block={block}
          exercises={exercises}
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

      <form action={addBlockAction}>
        <input type="hidden" name="workoutId" value={workoutId} />
        <input type="hidden" name="kind" value="normal" />
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-[1.25rem] border border-dashed border-cream/20 py-5 font-sans text-sm font-semibold text-cream/55 transition-colors hover:border-caramel/50 hover:bg-cream/[0.03] hover:text-cream"
        >
          <Icon name="plus" className="h-4 w-4" />
          {t("addBlock")}
        </button>
      </form>
    </div>
  );
}
