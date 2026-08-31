import { useFormStatus } from "react-dom";
import type { Translate } from "@/components/studio/plan/types";
import { chip, chipAccent, eyebrow, muted, surfaceLink } from "@/components/studio/theme";
import type { ClientWorkout } from "@/lib/studio/types";
import { capitalize, cn } from "@/lib/utils";

/** One workout of the plan as a row. Same form and same action as the card. */
export function WorkoutListRow({
  workout,
  lastDoneLabel,
  weekdayLabel,
  doneToday,
  t,
  startAction,
}: {
  workout: ClientWorkout;
  lastDoneLabel: string | null;
  weekdayLabel: string | null;
  doneToday: boolean;
  t: Translate;
  startAction: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <li>
      <form action={startAction}>
        <input type="hidden" name="workoutId" value={workout.id} />
        <RowSurface
          workout={workout}
          lastDoneLabel={lastDoneLabel}
          weekdayLabel={weekdayLabel}
          doneToday={doneToday}
          t={t}
        />
      </form>
    </li>
  );
}

function RowSurface({
  workout,
  lastDoneLabel,
  weekdayLabel,
  doneToday,
  t,
}: {
  workout: ClientWorkout;
  lastDoneLabel: string | null;
  weekdayLabel: string | null;
  doneToday: boolean;
  t: Translate;
}) {
  const { pending } = useFormStatus();

  const action = pending
    ? t("workouts.starting")
    : workout.startedToday
      ? t("workouts.resume")
      : doneToday
        ? t("workouts.again")
        : t("workouts.start");

  const meta = [
    capitalize(workout.focus),
    t("workouts.items", { count: workout.itemCount }),
    workout.estimatedMinutes ? t("workouts.duration", { count: workout.estimatedMinutes }) : null,
    lastDoneLabel ? t("workouts.lastDone", { date: lastDoneLabel }) : t("workouts.neverDone"),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        surfaceLink,
        "flex w-full items-center gap-4 p-4 text-left disabled:opacity-60 sm:gap-5 sm:p-5",
        workout.startedToday && "ring-caramel/40",
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate font-sans text-base font-semibold text-cream">
          {workout.name}
        </span>
        <span className={cn(muted, "block truncate")}>{meta}</span>
      </span>

      {weekdayLabel && (
        <span className={cn(eyebrow, "hidden shrink-0 truncate sm:block")}>{weekdayLabel}</span>
      )}

      {workout.startedToday ? (
        <span className={chipAccent}>{t("workouts.inProgress")}</span>
      ) : (
        <>
          {doneToday && <span className={cn(chip, "hidden sm:inline-flex")}>{t("workouts.doneToday")}</span>}
          <span className={chipAccent}>{action}</span>
        </>
      )}
    </button>
  );
}
