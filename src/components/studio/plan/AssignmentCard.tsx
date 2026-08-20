import { cn } from "@/lib/utils";
import type { Assignment } from "@/lib/studio/types";
import { SubmitButton } from "../SubmitButton";
import { chip, chipAccent, fieldCompact, muted, surface } from "../theme";
import type { Translate } from "./types";

type AssignmentAction = (formData: FormData) => void | Promise<void>;

/**
 * One assignment on the coach's week grid: what it is, whether it happened,
 * and the three things Sara can do to it without leaving the week view.
 */
export function AssignmentCard({
  assignment,
  t,
  tWorkouts,
  removeAction,
  markSkippedAction,
  moveAction,
}: {
  assignment: Assignment;
  t: Translate;
  tWorkouts: Translate;
  removeAction: AssignmentAction;
  markSkippedAction: AssignmentAction;
  moveAction: AssignmentAction;
}) {
  const itemCount = assignment.snapshot.blocks.reduce((n, block) => n + block.items.length, 0);
  const statusClass =
    assignment.status === "done"
      ? chipAccent
      : assignment.status === "skipped"
        ? cn(chip, "text-silk ring-silk/30")
        : chip;

  return (
    <div className={cn(surface, "space-y-3 bg-cream/[0.03] p-4")}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-sans text-sm font-semibold text-cream">{assignment.snapshot.name}</p>
          {assignment.snapshot.focus && (
            <p className="text-xs text-cream/55">{assignment.snapshot.focus}</p>
          )}
        </div>
        <span className={statusClass}>{t(`status.${assignment.status}`)}</span>
      </div>

      <p className="font-mono text-xs text-cream/45">{tWorkouts("items", { count: itemCount })}</p>

      {assignment.note && <p className={muted}>{assignment.note}</p>}

      <div className="flex flex-wrap items-center gap-2 border-t border-cream/10 pt-3">
        <form action={removeAction}>
          <input type="hidden" name="assignmentId" value={assignment.id} />
          <SubmitButton variant="ghost" className="px-3 py-1.5 text-xs">
            {t("remove")}
          </SubmitButton>
        </form>

        {assignment.status === "scheduled" && (
          <form action={markSkippedAction}>
            <input type="hidden" name="assignmentId" value={assignment.id} />
            <SubmitButton variant="ghost" className="px-3 py-1.5 text-xs">
              {t("markSkipped")}
            </SubmitButton>
          </form>
        )}

        <form action={moveAction} className="flex items-center gap-1.5">
          <input type="hidden" name="assignmentId" value={assignment.id} />
          <input
            type="date"
            name="date"
            defaultValue={assignment.date}
            aria-label={t("moveLabel")}
            required
            className={cn(fieldCompact, "w-auto px-2 py-1.5 text-xs")}
          />
          <SubmitButton variant="ghost" className="px-3 py-1.5 text-xs">
            {t("move")}
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}
