import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { formatDayKey } from "@/components/studio/format";
import { Icon } from "@/components/studio/coach/icons";
import { buttonQuiet, chip, muted, surface } from "@/components/studio/theme";
import type { PhaseWorkout } from "@/lib/studio/types";
import { cn } from "@/lib/utils";
import { WorkoutScheduleMenu } from "./WorkoutScheduleMenu";

/** How many days a row spells out before it starts counting the rest. */
const DATES_SHOWN = 3;

/**
 * The workouts inside one training phase, in the coach's order. Each row
 * doubles as a way in (the name links to the builder) and a way to place the
 * workout on the calendar right there, without opening it first.
 *
 * A row always says where the workout sits: the weekday it repeats on, the days
 * it was given, or that it has none. "Unscheduled" disappearing with nothing in
 * its place is worse than either.
 */
export async function PhaseWorkoutList({
  workouts,
  basePath,
  removeAction,
  scheduleAction,
  canRepeatWeekly,
}: {
  workouts: PhaseWorkout[];
  basePath: string;
  removeAction: (formData: FormData) => void | Promise<void>;
  scheduleAction: (formData: FormData) => void | Promise<void>;
  canRepeatWeekly: boolean;
}) {
  if (workouts.length === 0) return null;

  const [t, tPhases, tWorkouts, locale] = await Promise.all([
    getTranslations("Studio.plan"),
    getTranslations("Studio.plan.phases"),
    getTranslations("Studio.workouts"),
    getLocale(),
  ]);

  return (
    <div className="space-y-3">
      {workouts.map((workout) => {
        const meta = [
          tWorkouts(`type.${workout.workoutType}`),
          tWorkouts("items", { count: workout.itemCount }),
          workout.estimatedMinutes
            ? tWorkouts("durationMinutes", { count: workout.estimatedMinutes })
            : null,
          workout.focus || null,
        ]
          .filter(Boolean)
          .join(" · ");

        // `scheduleMode` is the method the coach chose; the dates are what came
        // of it. A custom placement whose sessions have all been moved or
        // deleted is unscheduled again, whatever the method still says.
        const weekly = workout.scheduleMode === "weekly" && workout.scheduleWeekday != null;
        const dates = workout.scheduleMode === "custom" ? workout.scheduleDates : [];
        const unscheduled = !weekly && dates.length === 0;

        return (
          <div
            key={workout.id}
            className={cn(surface, "flex flex-wrap items-center justify-between gap-4 p-4")}
          >
            <Link href={`${basePath}/treino/${workout.id}`} className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate font-sans text-sm font-semibold text-cream">
                  {workout.name}
                </span>
                {workout.sourceWorkoutId && (
                  <span className={chip} title={tPhases("clientCopyHint")}>
                    <Icon name="library" className="h-3.5 w-3.5" />
                  </span>
                )}
                {unscheduled && <span className={chip}>{t("unscheduled")}</span>}
                {weekly && (
                  <span className={chip}>
                    {t("everyWeekday", { day: tPhases(`weekday.${workout.scheduleWeekday}`) })}
                  </span>
                )}
                {dates.slice(0, DATES_SHOWN).map((date) => (
                  <span key={date} className={chip}>
                    {formatDayKey(date, locale)}
                  </span>
                ))}
                {dates.length > DATES_SHOWN && (
                  <span className={chip}>
                    {t("datesMore", { count: dates.length - DATES_SHOWN })}
                  </span>
                )}
              </div>
              <p className={cn(muted, "mt-0.5 truncate")}>{meta}</p>
            </Link>

            <div className="flex shrink-0 items-center gap-2">
              <WorkoutScheduleMenu
                workout={workout}
                scheduleAction={scheduleAction}
                canRepeatWeekly={canRepeatWeekly}
              />
              <form action={removeAction}>
                <input type="hidden" name="workoutId" value={workout.id} />
                <button
                  type="submit"
                  aria-label={tPhases("removeWorkout")}
                  title={tPhases("removeWorkout")}
                  className={buttonQuiet}
                >
                  <Icon name="trash" className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>
        );
      })}
    </div>
  );
}
