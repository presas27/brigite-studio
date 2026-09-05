import { cn } from "@/lib/utils";
import type { AssignmentSummary } from "@/lib/studio/types";
import { eyebrow, muted, surface } from "../theme";
import { AssignmentCard } from "./AssignmentCard";
import type { Translate } from "./types";

type AssignmentAction = (formData: FormData) => void | Promise<void>;

/**
 * Workouts assigned with no day yet — queued, not scheduled. Lives above the
 * week regardless of which week is showing, since these have no date to put
 * them on a page of it. No "mark as missed" here: a workout that was never
 * given a day cannot have been missed on one; its date field schedules it
 * instead (`AssignmentCard` swaps the label to "Agendar" when `date` is null).
 */
export function UnscheduledList({
  assignments,
  t,
  tWorkouts,
  removeAction,
  moveAction,
}: {
  assignments: AssignmentSummary[];
  t: Translate;
  tWorkouts: Translate;
  removeAction: AssignmentAction;
  moveAction: AssignmentAction;
}) {
  if (assignments.length === 0) return null;

  return (
    <div className={cn(surface, "space-y-3 p-4")}>
      <div>
        <p className={eyebrow}>{t("unscheduledTitle")}</p>
        <p className={cn(muted, "mt-1")}>{t("unscheduledHint")}</p>
      </div>
      <div className="space-y-3">
        {assignments.map((assignment) => (
          <AssignmentCard
            key={assignment.id}
            assignment={assignment}
            t={t}
            tWorkouts={tWorkouts}
            removeAction={removeAction}
            moveAction={moveAction}
          />
        ))}
      </div>
    </div>
  );
}
