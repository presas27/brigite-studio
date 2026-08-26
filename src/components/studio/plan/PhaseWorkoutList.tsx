import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Icon } from "@/components/studio/coach/icons";
import { SubmitButton } from "@/components/studio/SubmitButton";
import { buttonQuiet, chip, field, muted, surface } from "@/components/studio/theme";
import type { WorkoutSummary } from "@/lib/studio/types";
import { cn } from "@/lib/utils";

/**
 * The workouts inside one training phase, in the coach's order. Each row
 * doubles as a way in (the name links to the builder) and a way to place the
 * workout on the calendar right there, without opening it first.
 */
export async function PhaseWorkoutList({
  workouts,
  basePath,
  removeAction,
  scheduleAction,
  defaultDate,
}: {
  workouts: WorkoutSummary[];
  basePath: string;
  removeAction: (formData: FormData) => void | Promise<void>;
  scheduleAction: (formData: FormData) => void | Promise<void>;
  defaultDate: string;
}) {
  if (workouts.length === 0) return null;

  const [t, tPhases, tWorkouts] = await Promise.all([
    getTranslations("Studio.plan"),
    getTranslations("Studio.plan.phases"),
    getTranslations("Studio.workouts"),
  ]);

  return (
    <div className="space-y-3">
      {workouts.map((workout) => {
        const meta = [
          tWorkouts(`type.${workout.workoutType}`),
          tWorkouts("items", { count: workout.itemCount }),
          workout.focus || null,
        ]
          .filter(Boolean)
          .join(" · ");

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
              </div>
              <p className={cn(muted, "mt-0.5 truncate")}>{meta}</p>
            </Link>

            <div className="flex shrink-0 items-center gap-2">
              <form action={scheduleAction} className="flex items-center gap-2">
                <input type="hidden" name="workoutId" value={workout.id} />
                <input
                  type="date"
                  name="date"
                  defaultValue={defaultDate}
                  aria-label={tPhases("scheduleLabel")}
                  className={cn(field, "w-auto py-2")}
                />
                <SubmitButton variant="ghost">{t("schedule")}</SubmitButton>
              </form>
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
