"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/studio/coach/icons";
import { ExerciseThumb } from "@/components/studio/library/ExerciseThumb";
import { isRestItem, type WorkoutItem } from "@/lib/studio/types";
import { cn } from "@/lib/utils";
import { ExerciseDetailsDialog } from "./ExerciseDetailsDialog";
import { RestDurationDialog } from "./RestDurationDialog";
import { prescription } from "./parts";

type Props = {
  workoutId: string;
  item: WorkoutItem;
  /** Running order inside the block, 1-based. In a circuit this is the sequence. */
  position: number;
  circuit: boolean;
  selected: boolean;
  onSelectAction: (selected: boolean) => void;
  dragging: boolean;
  over: boolean;
  onDragStartAction: () => void;
  onDragEndAction: () => void;
  onDropOnAction: () => void;
  onDragOverAction: () => void;
  onNudgeAction: (delta: -1 | 1) => void;
};

export function ExerciseCard({
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
  onDropOnAction,
  onDragOverAction,
  onNudgeAction,
}: Props) {
  const t = useTranslations("Studio.workouts");
  const [open, setOpen] = useState(false);
  const rest = isRestItem(item);

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
          "group relative rounded-[1rem] p-2 ring-1 transition",
          rest ? "bg-cream/[0.02]" : "bg-cream/[0.04]",
          dragging ? "opacity-40" : "opacity-100",
          over || selected ? "ring-2 ring-accent-ink" : "ring-cream/10 hover:ring-cream/25",
        )}
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="block w-full cursor-grab text-left active:cursor-grabbing"
        >
          {rest ? (
            <span className="flex aspect-[3/2] w-full items-center justify-center rounded-[0.65rem] bg-cream/[0.04] text-cream/35 ring-1 ring-cream/10">
              <Icon name="clock" className="h-8 w-8" />
            </span>
          ) : (
            <ExerciseThumb videoUrl={item.videoUrl} className="aspect-[3/2] w-full" />
          )}
          <span className="mt-2.5 flex items-start gap-2 px-1">
            <span className="mt-px font-sans tabular-nums text-[0.7rem] text-cream/35">{position}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-sans text-sm font-semibold text-cream">
                {rest ? t("restTitle") : item.exerciseName}
              </span>
              <span className="mt-0.5 block truncate font-sans text-xs text-cream/55">
                {prescription(item, circuit)}
              </span>
            </span>
          </span>
        </button>

        {!rest && (
          <input
            type="checkbox"
            checked={selected}
            onChange={(event) => onSelectAction(event.target.checked)}
            aria-label={`${t("selectExercise")} ${item.exerciseName}`}
            className={cn(
              "absolute top-3 left-3 h-4 w-4 accent-caramel transition-opacity",
              selected ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
            )}
          />
        )}

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
          className="absolute top-3 right-3 rounded-full bg-ink/60 p-1 text-cream/60 opacity-0 backdrop-blur-sm transition group-hover:opacity-100 hover:text-cream focus-visible:opacity-100"
        >
          <Icon name="grip" className="h-4 w-4" />
        </button>
      </div>

      {rest ? (
        <RestDurationDialog
          workoutId={workoutId}
          item={item}
          open={open}
          onCloseAction={() => setOpen(false)}
        />
      ) : (
        <ExerciseDetailsDialog
          workoutId={workoutId}
          item={item}
          circuit={circuit}
          open={open}
          onCloseAction={() => setOpen(false)}
        />
      )}
    </>
  );
}
