import { capitalize, cn } from "@/lib/utils";
import type { AssignmentSummary } from "@/lib/studio/types";
import { SubmitButton } from "../SubmitButton";
import { chip, chipAccent, muted } from "../theme";
import type { Translate } from "./types";

type AssignmentAction = (formData: FormData) => void | Promise<void>;

/**
 * One assignment on the coach's week: what it is, whether it happened, and the
 * three things Sara can do to it without leaving the week view.
 *
 * Laid out by container width, not viewport width. The same card sits in a
 * full-width day row, in a narrow column of the seven-across grid, and in the
 * unscheduled queue — a `sm:` breakpoint reads the window and would get two of
 * those three wrong. Past `@lg` the facts run left and the controls sit right;
 * below it everything stacks.
 *
 * `markSkippedAction` is omitted for a "sem dia" assignment — a workout that
 * was never scheduled to a day cannot have been missed on one. Its date field
 * doubles as the way to schedule it: same action, "Agendar" instead of "Mover".
 */
export function AssignmentCard({
  assignment,
  t,
  tWorkouts,
  removeAction,
  markSkippedAction,
  moveAction,
}: {
  assignment: AssignmentSummary;
  t: Translate;
  tWorkouts: Translate;
  removeAction: AssignmentAction;
  markSkippedAction?: AssignmentAction;
  moveAction: AssignmentAction;
}) {
  const locked = assignment.status !== "scheduled" || assignment.startedAt != null;
  const statusClass =
    assignment.status === "done"
      ? chipAccent
      : assignment.status === "skipped"
        ? cn(chip, "text-silk ring-silk/30")
        : chip;
  const facts = [
    assignment.focus && capitalize(assignment.focus),
    tWorkouts("items", { count: assignment.itemCount }),
    assignment.estimatedMinutes && tWorkouts("durationMinutes", { count: assignment.estimatedMinutes }),
    assignment.effort != null && t("effort", { value: assignment.effort }),
    assignment.extraRestSeconds > 0 &&
      t("extraRest", { minutes: Math.max(1, Math.round(assignment.extraRestSeconds / 60)) }),
  ].filter(Boolean);

  return (
    <div className="@container rounded-[1rem] bg-cream/[0.04] px-3.5 py-3">
      <div className="flex flex-col gap-3 @lg:flex-row @lg:items-start @lg:justify-between @lg:gap-6">
        <div className="min-w-0 @lg:pt-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            <p className="min-w-0 line-clamp-2 font-sans text-[0.95rem] font-semibold text-cream @lg:line-clamp-1">
              {assignment.name}
            </p>
            <span className={statusClass}>{t(`status.${assignment.status}`)}</span>
          </div>
          {facts.length > 0 && (
            <p className="mt-1 font-sans text-xs leading-relaxed text-cream/45">{facts.join(" · ")}</p>
          )}
          {assignment.note && <p className={cn(muted, "mt-2")}>{assignment.note}</p>}
        </div>

        {!locked && (
          <div className="flex shrink-0 flex-col items-start gap-1 @lg:flex-row @lg:flex-wrap @lg:items-center @lg:justify-end">
            <form action={moveAction} className="flex flex-wrap items-center gap-1">
              <input type="hidden" name="assignmentId" value={assignment.id} />
              <input
                type="date"
                name="date"
                defaultValue={assignment.date ?? ""}
                aria-label={t("moveLabel")}
                required
                className="h-8 max-w-full rounded-full bg-transparent px-2.5 font-sans text-xs text-cream/50 outline-none transition-colors hover:bg-cream/8 hover:text-cream focus:bg-cream/8 focus:text-cream focus:ring-2 focus:ring-caramel/70"
              />
              <SubmitButton variant="quiet" className="text-accent-ink hover:bg-caramel/15">
                {assignment.date == null ? t("schedule") : t("move")}
              </SubmitButton>
            </form>

            {markSkippedAction && (
              <form action={markSkippedAction}>
                <input type="hidden" name="assignmentId" value={assignment.id} />
                <SubmitButton variant="quiet">{t("markSkipped")}</SubmitButton>
              </form>
            )}

            <form action={removeAction}>
              <input type="hidden" name="assignmentId" value={assignment.id} />
              <SubmitButton variant="quiet" className="hover:bg-silk/10 hover:text-silk">
                {t("remove")}
              </SubmitButton>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
