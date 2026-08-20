import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { shortWeekday } from "@/components/studio/plan/date";
import { STATUS_MARK } from "@/components/studio/calendar/types";
import { eyebrow, surface } from "@/components/studio/theme";
import type { Assignment } from "@/lib/studio/types";
import { cn } from "@/lib/utils";

/**
 * The week as seven marks — the smallest possible view of a training plan.
 *
 * Same three colours as the calendar (gold happened, red was missed, neutral
 * is still ahead), so it is the month grid compressed to one row rather than a
 * new thing to learn. It exists because "how is my week going" is a question
 * you ask standing up, and it should not cost a page load to answer.
 */
export async function WeekStrip({
  days,
  assignments,
  today,
}: {
  /** The seven `YYYY-MM-DD` keys, Monday first. */
  days: string[];
  assignments: Assignment[];
  today: string;
}) {
  const [t, locale] = await Promise.all([getTranslations("Studio.aluno"), getLocale()]);

  const byDate = new Map<string, Assignment[]>();
  for (const assignment of assignments) {
    byDate.set(assignment.date, [...(byDate.get(assignment.date) ?? []), assignment]);
  }

  return (
    <section aria-labelledby="week-strip" className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="week-strip" className={eyebrow}>
          {t("thisWeek")}
        </h2>
        <Link
          href="/app/aluno/plano"
          className="link-grow font-sans text-xs text-accent-ink transition-colors hover:text-butter"
        >
          {t("viewPlan")}
        </Link>
      </div>

      <ul className={cn(surface, "grid grid-cols-7 gap-1 p-2 sm:gap-2 sm:p-3")}>
        {days.map((date) => {
          const sessions = byDate.get(date) ?? [];
          const isToday = date === today;
          return (
            <li key={date}>
              <Link
                href={`/app/aluno/plano?vista=semana&dia=${date}`}
                aria-current={isToday ? "date" : undefined}
                className={cn(
                  "flex min-h-[4.25rem] flex-col items-center gap-1.5 rounded-[0.75rem] px-1 py-2 transition-colors hover:bg-surface-hover",
                  isToday && "bg-cream/[0.06]",
                )}
              >
                <span className={cn(eyebrow, "capitalize")}>{shortWeekday(date, locale)}</span>
                <span
                  className={cn(
                    "grid h-7 w-7 place-items-center rounded-full font-display text-[0.95rem] leading-none",
                    isToday ? "bg-caramel text-ink" : "text-cream/70",
                  )}
                >
                  {date.slice(8)}
                </span>
                <span className="flex min-h-[0.375rem] items-center gap-1">
                  {sessions.slice(0, 3).map((assignment) => (
                    <span
                      key={assignment.id}
                      className={cn("h-1.5 w-1.5 rounded-full", STATUS_MARK[assignment.status])}
                    />
                  ))}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
