import { cn } from "@/lib/utils";
import type { Assignment } from "@/lib/studio/types";
import { eyebrow, muted, surface } from "../theme";
import { AssignmentCard } from "./AssignmentCard";
import { parseDayKey } from "./date";
import type { Translate } from "./types";

type AssignmentAction = (formData: FormData) => void | Promise<void>;

/**
 * One day of the training week: a fixed date rail on the left, the day's
 * assignments stacked to the right.
 *
 * Deliberately a row and not a column in a seven-across grid — at 1280px a
 * seven-column week truncates every workout name to one letter and wraps the
 * controls onto three lines. A week reads fine vertically; a name does not read
 * at all when it is clipped.
 */
export function DayColumn({
  date,
  assignments,
  locale,
  isToday,
  t,
  tWorkouts,
  removeAction,
  markSkippedAction,
  moveAction,
}: {
  date: string;
  assignments: Assignment[];
  locale: string;
  isToday: boolean;
  t: Translate;
  tWorkouts: Translate;
  removeAction: AssignmentAction;
  markSkippedAction: AssignmentAction;
  moveAction: AssignmentAction;
}) {
  const day = parseDayKey(date);
  const weekday = new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: "UTC" }).format(day);
  const short = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(day);

  return (
    <div
      className={cn(
        surface,
        isToday && "ring-2 ring-caramel/50",
        "flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:gap-5",
      )}
    >
      <div className="flex items-baseline gap-2 sm:w-36 sm:shrink-0 sm:flex-col sm:gap-0.5">
        <p className={cn(eyebrow, "capitalize")}>{weekday}</p>
        <p className="font-mono text-xs text-cream/40">{short}</p>
      </div>
      <div className="min-w-0 grow">
        {assignments.length === 0 ? (
          <p className={muted}>{t("restDay")}</p>
        ) : (
          <div className="space-y-3">
            {assignments.map((assignment) => (
              <AssignmentCard
                key={assignment.id}
                assignment={assignment}
                t={t}
                tWorkouts={tWorkouts}
                removeAction={removeAction}
                markSkippedAction={markSkippedAction}
                moveAction={moveAction}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
