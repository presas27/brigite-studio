import Link from "next/link";
import { useFormStatus } from "react-dom";
import { Icon } from "@/components/studio/coach/icons";
import type { Translate } from "@/components/studio/plan/types";
import { chip, chipAccent, eyebrow, heading, muted, surfaceLink } from "@/components/studio/theme";
import type { ClientWorkout } from "@/lib/studio/types";
import { capitalize, cn } from "@/lib/utils";

/**
 * One workout of the plan as a tile, and the button that starts it.
 *
 * The whole card is the submit control of its own form: a workout is a thing
 * you do, and asking someone to find a small "start" pill inside a card they
 * already tapped is a second decision for no reason. The mutation behind it
 * reuses today's session when the coach already placed one, so tapping a card
 * twice cannot leave two sessions behind.
 *
 * `useFormStatus` needs to be inside the form, which is why the surface is its
 * own component and not the card's outer element.
 */
export function WorkoutCard({
  workout,
  lastDoneLabel,
  weekdayLabel,
  doneToday,
  t,
  startAction,
  editHref,
}: {
  workout: ClientWorkout;
  /** Formatted `lastDoneDate`, or null when it was never finished. */
  lastDoneLabel: string | null;
  /** "Every Tuesday", or null when the coach set no weekly day. */
  weekdayLabel: string | null;
  doneToday: boolean;
  t: Translate;
  startAction: (formData: FormData) => void | Promise<void>;
  /** Where this workout is edited — only for one the person built themselves. */
  editHref?: string | null;
}) {
  return (
    // The edit link sits over the card's corner rather than under the card:
    // the card is one big submit button, so the link cannot be inside it, but
    // a bare text link floating under a tile read as belonging to nothing.
    <li data-workout-card className="relative">
      <form action={startAction} className="h-full">
        <input type="hidden" name="workoutId" value={workout.id} />
        <CardSurface
          workout={workout}
          lastDoneLabel={lastDoneLabel}
          weekdayLabel={weekdayLabel}
          doneToday={doneToday}
          editable={editHref != null}
          t={t}
        />
      </form>
      {editHref && (
        <Link
          href={editHref}
          aria-label={t("workouts.edit")}
          title={t("workouts.edit")}
          className="absolute top-3 right-3 inline-flex h-9 w-9 items-center justify-center rounded-full text-cream/50 transition-colors hover:bg-cream/8 hover:text-cream"
        >
          <Icon name="settings" className="h-4 w-4" />
        </Link>
      )}
    </li>
  );
}

function CardSurface({
  workout,
  lastDoneLabel,
  weekdayLabel,
  doneToday,
  editable,
  t,
}: {
  workout: ClientWorkout;
  lastDoneLabel: string | null;
  weekdayLabel: string | null;
  doneToday: boolean;
  /** An edit control sits over the top-right corner; the top row keeps clear of it. */
  editable: boolean;
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

  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        surfaceLink,
        "flex h-full w-full flex-col gap-4 p-5 text-left disabled:opacity-60",
        workout.startedToday && "ring-caramel/40",
      )}
    >
      <div className={cn("flex items-start justify-between gap-3", editable && "pr-8")}>
        <p className={cn(eyebrow, "truncate")}>{workout.phaseName ?? t("workouts.noPhase")}</p>
        {workout.startedToday ? (
          <span className={chipAccent}>{t("workouts.inProgress")}</span>
        ) : (
          doneToday && <span className={chip}>{t("workouts.doneToday")}</span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className={cn(heading, "line-clamp-2 text-[1.35rem] text-cream")}>{workout.name}</p>
        {workout.focus && <p className={cn(muted, "mt-1.5 truncate")}>{capitalize(workout.focus)}</p>}
        {/* The day the coach suggested, said once and without weight: it is a
            suggestion, and this page exists so it never reads as a gate. */}
        {weekdayLabel && <p className={cn(eyebrow, "mt-2 truncate")}>{weekdayLabel}</p>}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-cream/10 pt-3">
        <p className={eyebrow}>
          {t("workouts.items", { count: workout.itemCount })} ·{" "}
          {t("workouts.blocks", { count: workout.blockCount })}
          {workout.estimatedMinutes
            ? ` · ${t("workouts.duration", { count: workout.estimatedMinutes })}`
            : ""}
        </p>
        <span className={chipAccent}>{action}</span>
      </div>

      <p className={cn(eyebrow, "truncate")}>
        {lastDoneLabel ? t("workouts.lastDone", { date: lastDoneLabel }) : t("workouts.neverDone")}
      </p>
    </button>
  );
}
