import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { eyebrow, heading, muted, surfaceLink } from "@/components/studio/theme";
import type { OverviewDay } from "@/lib/studio/clientConsole";
import type { ScheduledSummary } from "@/lib/studio/types";
import { capitalize, cn } from "@/lib/utils";

/**
 * The week, as the two numbers she actually asks for: how many sessions are
 * done out of the ones planned, and which one is next.
 *
 * This replaced a ring of the week's sessions by focus. Sara plans in focuses,
 * but an aluna does not train in them — "3 força, 1 aéreo" is the coach's
 * reading of the plan, and it cost half the top of the screen to say nothing
 * she could act on. "2 of 4 · next: Wednesday, Força A" is hers.
 */
export async function WeekProgressCard({
  week,
  next,
  today,
  className,
}: {
  /** Seven entries, Monday first — the same rows the week card draws. */
  week: OverviewDay[];
  /** The session still to do, today's first, or nothing left ahead. */
  next: ScheduledSummary | undefined;
  /** `YYYY-MM-DD`, from the server. */
  today: string;
  className?: string;
}) {
  const [t, locale] = await Promise.all([getTranslations("Studio.aluno.weekProgress"), getLocale()]);

  const total = week.reduce((sum, day) => sum + day.total, 0);
  const done = week.reduce((sum, day) => sum + day.done, 0);
  // Sessions whose day has passed with something still open: the honest
  // reading of a week with nothing ahead and a number short of the total.
  const missed = week
    .filter((day) => day.date < today)
    .reduce((sum, day) => sum + (day.total - day.done), 0);

  const when =
    next &&
    capitalize(
      new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: "Europe/Lisbon" }).format(
        new Date(`${next.date}T12:00:00Z`),
      ),
      locale,
    );

  return (
    <Link
      href="/app/aluno/plano"
      className={cn(surfaceLink, "flex flex-col justify-between gap-4 p-4 sm:gap-6 sm:p-6", className)}
    >
      <div>
        <p className={eyebrow}>{t("title")}</p>
        {total === 0 ? (
          <p className={cn(muted, "mt-3")}>{t("none")}</p>
        ) : (
          <p className={cn(heading, "mt-2 text-[2.5rem] text-cream sm:mt-3 sm:text-[3.25rem] xl:text-[4rem]")}>
            {done}
            <span className="text-[0.45em] text-cream/45">/{total}</span>
          </p>
        )}
      </div>

      {total > 0 && (
        <p className={muted}>
          {next && when
            ? t("next", { when, name: next.name })
            : done >= total
              ? t("allDone")
              : missed > 0
                ? t("missed", { count: missed })
                : t("of", { done, total })}
        </p>
      )}
    </Link>
  );
}
