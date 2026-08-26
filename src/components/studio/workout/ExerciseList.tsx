"use client";

import type { View } from "@/components/studio/ViewToggle";
import type { WorkoutItem } from "@/lib/studio/types";
import { ExerciseCard } from "./ExerciseCard";
import { ExerciseRow } from "./ExerciseRow";

/** An exercise plus the block it currently belongs to. */
export type ExerciseSlot = { item: WorkoutItem; blockId: string };

type Props = {
  workoutId: string;
  rows: ExerciseSlot[];
  view: View;
  /** Grid columns, `list` ignores it. Groups sit inside a card and get fewer. */
  dense?: boolean;
  circuit: boolean;
  selectedIds: Set<string>;
  onToggleAction: (itemId: string, selected: boolean) => void;
  draggingId: string | null;
  overId: string | null;
  onDragStartAction: (itemId: string, blockId: string) => void;
  onDragEndAction: () => void;
  onDragOverAction: (itemId: string) => void;
  onDropOnAction: (blockId: string, index: number) => void;
  onNudgeAction: (blockId: string, itemId: string, delta: -1 | 1) => void;
  /** Rendered after the last exercise — the block's own "add exercise" control. */
  footer?: React.ReactNode;
};

/**
 * The exercises of one section, in whichever view the coach is working in.
 *
 * Both views carry the same behaviour — selection, drag, keyboard nudge, the
 * details dialog — because they are the same list read two ways, not two
 * features. Keeping the choice here rather than in `GroupCard` and the loose
 * section separately is what stops the two from drifting apart.
 *
 * **Grid** lays the pictures out horizontally: the view for reading the shape
 * of a session. **List** stacks them: the view for reading its numbers, and
 * the only one that survives a narrow phone with a long workout.
 */
export function ExerciseList({
  workoutId,
  rows,
  view,
  dense = false,
  circuit,
  selectedIds,
  onToggleAction,
  draggingId,
  overId,
  onDragStartAction,
  onDragEndAction,
  onDragOverAction,
  onDropOnAction,
  onNudgeAction,
  footer,
}: Props) {
  if (view === "list") {
    return (
      <div className="space-y-2">
        {rows.map(({ item, blockId }, index) => (
          <ExerciseRow
            key={item.id}
            workoutId={workoutId}
            item={item}
            position={index + 1}
            circuit={circuit}
            selected={selectedIds.has(item.id)}
            onSelectAction={(checked) => onToggleAction(item.id, checked)}
            dragging={draggingId === item.id}
            over={overId === item.id && draggingId !== item.id}
            onDragStartAction={() => onDragStartAction(item.id, blockId)}
            onDragEndAction={onDragEndAction}
            onDragOverAction={() => onDragOverAction(item.id)}
            onDropOnAction={() => onDropOnAction(blockId, index)}
            onNudgeAction={(delta) => onNudgeAction(blockId, item.id, delta)}
          />
        ))}
        {footer}
      </div>
    );
  }

  return (
    <div
      className={
        dense
          ? "grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4"
          : "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
      }
    >
      {rows.map(({ item, blockId }, index) => (
        <ExerciseCard
          key={item.id}
          workoutId={workoutId}
          item={item}
          position={index + 1}
          circuit={circuit}
          selected={selectedIds.has(item.id)}
          onSelectAction={(checked) => onToggleAction(item.id, checked)}
          dragging={draggingId === item.id}
          over={overId === item.id && draggingId !== item.id}
          onDragStartAction={() => onDragStartAction(item.id, blockId)}
          onDragEndAction={onDragEndAction}
          onDragOverAction={() => onDragOverAction(item.id)}
          onDropOnAction={() => onDropOnAction(blockId, index)}
          onNudgeAction={(delta) => onNudgeAction(blockId, item.id, delta)}
        />
      ))}
      {footer}
    </div>
  );
}
