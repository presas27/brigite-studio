import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { formatDayKey, shortWeekday } from "@/components/studio/format";
import { Icon } from "@/components/studio/coach/icons";
import { ExerciseThumb } from "@/components/studio/library/ExerciseThumb";
import { eyebrow, muted, surface } from "@/components/studio/theme";
import type { OverviewDay, OverviewSession } from "@/lib/studio/clientConsole";
import type { AssignmentStatus } from "@/lib/studio/types";
import { cn } from "@/lib/utils";

/**
 * The week as seven rings, with what is coming next underneath.
 *
 * The old strip drew a day as a number plus a dot: two marks for one fact, and
 * the dot was the only one carrying meaning. A ring says it once — filled gold
 * happened, hollow is still ahead, red outline was missed, and a day with
 * nothing scheduled stays quiet rather than reading as a failure. Rest days are
 * part of the plan, and a calendar that scolds you for them is lying.
 *
 * "A seguir" lives in the same card because the two are one question asked in
 * two tenses: how is the week going, and what is next.
 */

/** The ring, by what the day turned out to be. `rest` is a day with nothing on it. */
const RING: Record<AssignmentStatus | "rest", string> = {
  done: "bg-accent-fill text-ink",
  scheduled: "text-cream/70 ring-1 ring-cream/20",
  skipped: "text-cream/45 ring-1 ring-silk/55",
  rest: "text-cream/25",
};

export async function WeekCard({
  week,
  today,
  upcoming,
  className,
}: {
  week: OverviewDay[];
  today: string;
  /** Sessions after today, soonest first. Already excludes whatever the hero shows. */
  upcoming: OverviewSession[];
  className?: string;
}) {
  const [t, tSessions, locale] = await Promise.all([
    getTranslations("Studio.aluno"),
    getTranslations("Studio.aluno.sessions"),
    getLocale(),
  ]);

  return (
    <section aria-labelledby="week-card" className={cn(surface, "flex flex-col", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 pt-5">
        <h2 id="week-card" className={eyebrow}>
          {t("thisWeek")}
        </h2>
        <Link
          href="/app/aluno/plano"
          className="link-grow font-sans text-xs text-accent-ink transition-colors hover:text-cream"
        >
          {t("viewPlan")}
        </Link>
      </div>

      <ol className="grid grid-cols-7 gap-1 px-3 pt-4 pb-5 sm:gap-2 sm:px-4">
        {week.map((day) => {
          const isToday = day.date === today;
          const tone = day.status ?? "rest";
          return (
            <li key={day.date} data-week-ring>
              <Link
                href={`/app/aluno/plano?vista=semana&dia=${day.date}`}
                aria-current={isToday ? "date" : undefined}
                aria-label={t(`weekDay.${tone}`, {
                  date: formatDayKey(day.date, locale),
                  count: day.total,
                })}
                className="group flex flex-col items-center gap-2 rounded-[0.85rem] py-1.5 transition-colors hover:bg-surface-hover"
              >
                <span className={eyebrow}>
                  {shortWeekday(day.date, locale)}
                </span>
                <span
                  className={cn(
                    "grid h-10 w-10 place-items-center rounded-full font-display text-[0.95rem] leading-none transition-transform group-hover:scale-105 sm:h-11 sm:w-11",
                    RING[tone],
                    // Today keeps its own mark whatever the status underneath —
                    // an offset ring, so it reads on the gold fill too.
                    isToday &&
                      "ring-2 ring-accent-ink ring-offset-2 ring-offset-ink-lift",
                  )}
                >
                  {day.status === "done" ? (
                    <Icon name="check" className="h-4 w-4" strokeWidth={2.4} />
                  ) : (
                    day.date.slice(8)
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>

      <div className="border-t border-cream/8 px-5 py-4">
        <h3 className={eyebrow}>{t("upNext")}</h3>

        {upcoming.length === 0 ? (
          <p className={cn(muted, "mt-2")}>{t("upNextEmpty")}</p>
        ) : (
          <ul className="mt-3 space-y-1">
            {upcoming.map((session) => (
              <li key={session.id}>
                <Link
                  href={`/app/aluno/treino/${session.id}`}
                  className="flex items-center gap-3 rounded-[0.9rem] p-2 transition-colors hover:bg-surface-hover"
                >
                  <ExerciseThumb videoUrl={session.videoUrl} className="h-11 w-14 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-sans text-sm font-semibold text-cream/90">
                      {session.name}
                    </span>
                    <span className={cn(eyebrow, "mt-0.5 block")}>
                      {tSessions("items", { count: session.itemCount })}
                    </span>
                  </span>
                  <span className={cn(eyebrow, "shrink-0")}>
                    {formatDayKey(session.date, locale)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
