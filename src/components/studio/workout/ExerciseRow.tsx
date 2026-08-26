import { useState } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/studio/coach/icons";
import { ExerciseThumb } from "@/components/studio/library/ExerciseThumb";
import { buttonQuiet } from "@/components/studio/theme";
import type { WorkoutItem } from "@/lib/studio/types";
import { cn } from "@/lib/utils";
import { ExerciseDetailsDialog } from "./ExerciseDetailsDialog";
import { prescription } from "./parts";

type Props = {
  workoutId: string;
  item: WorkoutItem;
  /** Running order — in a circuit this is the sequence within the round. */
  position: number;
  circuit: boolean;
  selected: boolean;
  onSelectAction: (selected: boolean) => void;
  dragging: boolean;
  over: boolean;
  onDragStartAction: () => void;
  onDragEndAction: () => void;
  onDragOverAction: () => void;
  onDropOnAction: () => void;
  onNudgeAction: (delta: -1 | 1) => void;
};

/**
 * One exercise as a compact row: a checkbox to pick it for grouping, its
 * picture, name and prescription, then a details control and the drag/reorder
 * handle. The picture stays — it's how Sara recognises her own filmed
 * exercises, grid or row.
 *
 * The whole row is the drag surface, same wiring as the old card grid: a
 * native HTML5 drag plus a keyboard-operable grip for arrow-key reordering.
 */
export function ExerciseRow({
  workoutId,
  item,
  position,
  circuit,
  selected,
  onSelectAction,
  dragging,
  over,
  onDragStartAction,
  onDragEndAction,
  onDragOverAction,
  onDropOnAction,
  onNudgeAction,
}: Props) {
  const t = useTranslations("Studio.workouts");
  const [open, setOpen] = useState(false);

  return (
    <>
      <div
        draggable
        onDragStart={(event) => {
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("text/plain", item.id);
          onDragStartAction();
        }}
        onDragEnd={onDragEndAction}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
          onDragOverAction();
        }}
        onDrop={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onDropOnAction();
        }}
        className={cn(
          "flex items-center gap-3 rounded-[1rem] bg-cream/[0.04] p-2 ring-1 transition",
          dragging ? "opacity-40" : "opacity-100",
          over ? "ring-2 ring-accent-ink" : "ring-cream/10 hover:ring-cream/25",
        )}
      >
        <input
          type="checkbox"
          checked={selected}
          onChange={(event) => onSelectAction(event.target.checked)}
          aria-label={`${t("selectExercise")} ${item.exerciseName}`}
          className="h-4 w-4 shrink-0 accent-caramel"
        />

        <span className="w-4 shrink-0 text-center font-sans tabular-nums text-[0.7rem] text-cream/35">
          {position}
        </span>

        <ExerciseThumb videoUrl={item.videoUrl} className="aspect-[3/2] w-16 shrink-0" />

        <span className="min-w-0 flex-1">
          <span className="block truncate font-sans text-sm font-semibold text-cream">
            {item.exerciseName}
          </span>
          <span className="mt-0.5 block truncate font-sans text-xs text-cream/55">
            {prescription(item, circuit)}
          </span>
        </span>

        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t("details")}
          title={t("details")}
          className={cn(buttonQuiet, "shrink-0")}
        >
          <Icon name="settings" className="h-4 w-4" />
        </button>

        <button
          type="button"
          aria-label={t("reorder")}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
              event.preventDefault();
              onNudgeAction(-1);
            }
            if (event.key === "ArrowRight" || event.key === "ArrowDown") {
              event.preventDefault();
              onNudgeAction(1);
            }
          }}
          className="shrink-0 cursor-grab rounded-full p-1.5 text-cream/40 transition-colors hover:bg-cream/8 hover:text-cream active:cursor-grabbing"
        >
          <Icon name="grip" className="h-4 w-4" />
        </button>
      </div>

      <ExerciseDetailsDialog
        workoutId={workoutId}
        item={item}
        open={open}
        onCloseAction={() => setOpen(false)}
      />
    </>
  );
}
