import { cn } from "@/lib/utils";
import type { Assignment } from "@/lib/studio/types";
import { eyebrow, muted, surface } from "../theme";
import { AssignmentCard } from "./AssignmentCard";
import { formatDayKey, shortWeekday } from "../format";
import type { Translate } from "./types";

type AssignmentAction = (formData: FormData) => void | Promise<void>;

/**
 * The week as seven cards — Monday to Sunday, left to right on a laptop and
 * stacked on a phone. It replaced a list/grid toggle: two shapes for the same
 * seven days, where the grid answers "what does her week look like" and the
 * list only restated it one row taller. One view, no control to get wrong.
 */
export function WeekGrid({
  days,
  byDate,
  locale,
  today,
  t,
  tWorkouts,
  removeAction,
  markSkippedAction,
  moveAction,
}: {
  days: string[];
  byDate: Record<string, Assignment[]>;
  locale: string;
  today: string;
  t: Translate;
  tWorkouts: Translate;
  removeAction: AssignmentAction;
  markSkippedAction: AssignmentAction;
  moveAction: AssignmentAction;
}) {
  return (
    <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2 lg:grid-cols-7">
      {days.map((date) => {
        const isToday = date === today;
        const short = formatDayKey(date, locale);
        const assignments = byDate[date] ?? [];

        return (
          <div
            key={date}
            className={cn(surface, isToday && "ring-2 ring-caramel/50", "flex flex-col gap-3 p-3")}
          >
            <div className="flex items-baseline gap-2">
              <p className={eyebrow}>{shortWeekday(date, locale)}</p>
              <p className="font-sans text-xs text-cream/40">{short}</p>
            </div>
            {assignments.length === 0 ? (
              <p className={muted}>{t("restDay")}</p>
            ) : (
              <div className="space-y-2">
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
        );
      })}
    </div>
  );
}
