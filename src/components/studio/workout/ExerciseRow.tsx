import { useState } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/studio/coach/icons";
import { ExerciseThumb } from "@/components/studio/library/ExerciseThumb";
import { buttonQuiet } from "@/components/studio/theme";
import { isRestItem, type WorkoutItem } from "@/lib/studio/types";
import { cn } from "@/lib/utils";
import { ExerciseDetailsDialog } from "./ExerciseDetailsDialog";
import { RestDurationDialog } from "./RestDurationDialog";
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
 * handle. Rest rows share the same order and grip, but they are not selectable
 * for grouping.
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
          "flex items-center gap-3 rounded-[1rem] p-2 ring-1 transition",
          rest ? "bg-cream/[0.02]" : "bg-cream/[0.04]",
          dragging ? "opacity-40" : "opacity-100",
          over ? "ring-2 ring-accent-ink" : "ring-cream/10 hover:ring-cream/25",
        )}
      >
        {rest ? (
          <span className="w-4 shrink-0" aria-hidden />
        ) : (
          <input
            type="checkbox"
            checked={selected}
            onChange={(event) => onSelectAction(event.target.checked)}
            aria-label={`${t("selectExercise")} ${item.exerciseName}`}
            className="h-4 w-4 shrink-0 accent-caramel"
          />
        )}

        <span className="w-4 shrink-0 text-center font-sans tabular-nums text-[0.7rem] text-cream/35">
          {position}
        </span>

        {rest ? (
          <span className="flex aspect-[3/2] w-16 shrink-0 items-center justify-center rounded-[0.65rem] bg-cream/[0.04] text-cream/35 ring-1 ring-cream/10">
            <Icon name="clock" className="h-5 w-5" />
          </span>
        ) : (
          <ExerciseThumb videoUrl={item.videoUrl} className="aspect-[3/2] w-16 shrink-0" />
        )}

        <button type="button" onClick={() => setOpen(true)} className="min-w-0 flex-1 text-left">
          <span className="block truncate font-sans text-sm font-semibold text-cream">
            {rest ? t("restTitle") : item.exerciseName}
          </span>
          <span className="mt-0.5 block truncate font-sans text-xs text-cream/55">
            {prescription(item, circuit)}
          </span>
        </button>

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
