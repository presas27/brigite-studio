"use client";

import { useMemo, useOptimistic, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { groupItemsAction, reorderItemsAction, updateInstructionsAction } from "@/app/app/coach/treinos/actions";
import { Empty } from "@/components/studio/Empty";
import { buttonGhost, buttonQuiet, eyebrow, field, heading, muted, surface } from "@/components/studio/theme";
import { usePersistedView } from "@/components/studio/usePersistedView";
import { ViewToggle } from "@/components/studio/ViewToggle";
import type { Exercise, Workout, WorkoutBlock } from "@/lib/studio/types";
import { cn } from "@/lib/utils";
import { ExerciseList } from "./ExerciseList";
import { ExercisePicker } from "./ExercisePicker";
import { GroupCard } from "./GroupCard";

/**
 * The construction screen for a `regular` workout: instructions, then a flat,
 * checkbox-selectable list of exercises that the coach groups into supersets
 * and circuits two or more at a time. There is no "add block" any more —
 * every exercise starts loose and joins a group only when the coach asks.
 *
 * Two views, same list and same behaviour: the horizontal picture grid, for
 * reading the shape of a session, and the stacked rows, for reading its
 * numbers. The choice is the coach's and it sticks — see `usePersistedView`,
 * the same preference the libraries keep.
 *
 * The drag machinery lives here rather than in a child because a drag can
 * cross groups: the order of every block is one piece of state, so a card
 * dropped into a neighbouring group is a single move rather than a remove
 * plus an add. The drop is applied on screen first and posted inside a
 * transition — the server answer arrives as new props and overwrites the
 * draft, so a rejected move snaps back instead of lying.
 */
export function WorkoutBuilder({ workout, exercises }: { workout: Workout; exercises: Exercise[] }) {
  const t = useTranslations("Studio.workouts");
  const instructionsFormRef = useRef<HTMLFormElement>(null);
  const [draft, applyDraft] = useOptimistic(workout.blocks, (_current, next: WorkoutBlock[]) => next);
  const [dragging, setDragging] = useState<{ itemId: string; blockId: string } | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [view, setView] = usePersistedView("studio.workout.builder.view");
  const [, startTransition] = useTransition();

  const groups = useMemo(
    () => draft.filter((block) => block.kind !== "normal").sort((a, b) => a.position - b.position),
    [draft],
  );

  /**
   * The ungrouped list. Plural `normal` blocks are possible on a workout built
   * with the old block-first builder, and their exercises must all show up
   * here or they would simply vanish from the screen. The first one is the
   * drop target; the data layer folds the rest into it on the next write.
   */
  const looseRows = useMemo(
    () =>
      draft
        .filter((block) => block.kind === "normal")
        .sort((a, b) => a.position - b.position)
        .flatMap((block) => block.items.map((item) => ({ item, blockId: block.id }))),
    [draft],
  );
  const looseTargetId = looseRows[0]?.blockId ?? draft.find((b) => b.kind === "normal")?.id ?? null;
  const total = draft.reduce((sum, block) => sum + block.items.length, 0);

  // Group labels are derived at render, never stored: "Super set 1", "Super
  // set 2", "Circuit 1"… counted independently, in the order groups appear.
  // Deleting a group therefore renumbers the rest instead of leaving a gap.
  const groupsWithLabels = useMemo(() => {
    const seen = { superset: 0, circuit: 0 };
    return groups.map((block) => {
      if (block.kind === "superset") {
        seen.superset += 1;
        return { block, label: t("supersetLabel", { index: seen.superset }) };
      }
      seen.circuit += 1;
      return { block, label: t("circuitLabel", { index: seen.circuit }) };
    });
  }, [groups, t]);

  // The order a grouping action posts ids in: groups first, then the loose
  // list, each in on-screen order — not the order the coach happened to click.
  const orderedItemIds = useMemo(() => {
    const ids = groups.flatMap((block) => block.items.map((item) => item.id));
    return [...ids, ...looseRows.map((row) => row.item.id)];
  }, [groups, looseRows]);

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

  function toggleSelected(itemId: string, checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) next.add(itemId);
      else next.delete(itemId);
      return next;
    });
  }

  /** Combine the current selection and clear it — the selection never survives past the click. */
  function groupSelection(kind: "superset" | "circuit") {
    const ids = orderedItemIds.filter((id) => selectedIds.has(id));
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
            <ExercisePicker workoutId={workout.id} exercises={exercises} compact />
          </div>
        </div>

        {total === 0 && <Empty title={t("noExercises")} hint={t("noExercisesHint")} />}

        <div className="space-y-3">
          {groupsWithLabels.map(({ block, label }) => (
            <GroupCard
              key={block.id}
              workoutId={workout.id}
              block={block}
              label={label}
              rounds={block.rounds}
              exercises={exercises}
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

          {looseTargetId && looseRows.length > 0 && (
            <div
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                drop(looseTargetId, "end");
              }}
              className={cn(groups.length > 0 && "border-t border-cream/10 pt-3")}
            >
              <ExerciseList
                workoutId={workout.id}
                rows={looseRows}
                view={view}
                circuit={false}
                selectedIds={selectedIds}
                onToggleAction={toggleSelected}
                draggingId={dragging?.itemId ?? null}
                overId={overId}
                onDragStartAction={(itemId, blockId) => setDragging({ itemId, blockId })}
                onDragEndAction={() => {
                  setDragging(null);
                  setOverId(null);
                }}
                onDragOverAction={setOverId}
                onDropOnAction={(blockId, index) => drop(blockId, index)}
                onNudgeAction={nudge}
              />
            </div>
          )}
        </div>

        {selectedIds.size < 2 ? (
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
            <button type="button" onClick={() => setSelectedIds(new Set())} className={buttonQuiet}>
              {t("clearSelection")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
