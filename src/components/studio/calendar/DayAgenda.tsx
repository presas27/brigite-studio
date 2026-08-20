import Link from "next/link";
import { cn } from "@/lib/utils";
import { Icon } from "../coach/icons";
import { mondayOf, parseDayKey } from "../plan/date";
import type { Translate } from "../plan/types";
import { eyebrow, heading, muted, surface } from "../theme";
import { STATUS_MARK, type CalendarSession } from "./types";

/**
 * The selected day, in full — the half of the calendar that names names.
 *
 * The grid carries shape and volume; this carries identity and is the only
 * way off the page, straight into the week where that session can be edited.
 */
export function DayAgenda({
  date,
  sessions,
  isToday,
  locale,
  t,
}: {
  date: string;
  sessions: CalendarSession[];
  isToday: boolean;
  locale: string;
  t: Translate;
}) {
  const day = parseDayKey(date);
  const weekday = new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: "UTC" }).format(day);
  const dayMonth = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(day);
  const done = sessions.filter((session) => session.status === "done").length;

  return (
    <aside className={cn(surface, "p-5 xl:sticky xl:top-6")}>
      <div className="flex items-baseline justify-between gap-3">
        <p className={cn(eyebrow, "capitalize")}>{weekday}</p>
        {isToday && (
          <span className={cn(eyebrow, "text-accent-ink")}>{t("calendar.today")}</span>
        )}
      </div>
      <p className={cn(heading, "mt-1 text-[1.6rem]")}>{dayMonth}</p>
      <p className={cn(eyebrow, "mt-1.5")}>
        {t("calendar.sessions", { count: sessions.length })}
        {done > 0 && ` · ${t("calendar.done", { count: done })}`}
      </p>

      {sessions.length === 0 ? (
        <div className="mt-5 border-t border-cream/10 pt-4">
          <p className="font-sans text-sm font-semibold text-cream/85">{t("calendar.dayEmpty")}</p>
          <p className={cn(muted, "mt-1.5")}>{t("calendar.dayEmptyHint")}</p>
        </div>
      ) : (
        <ul className="mt-5 space-y-1.5 border-t border-cream/10 pt-4">
          {sessions.map((session) => (
            <li key={session.id}>
              <Link
                href={`/app/coach/alunos/${session.clientId}/plano?semana=${mondayOf(session.date)}`}
                className="group flex items-center gap-3 rounded-[0.9rem] px-3 py-2.5 transition-colors hover:bg-surface-hover"
              >
                <span
                  className={cn(
                    "h-8 w-[3px] shrink-0 rounded-full",
                    STATUS_MARK[session.status],
                  )}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-sans text-sm font-semibold text-cream">
                    {session.clientName}
                  </span>
                  <span className="block truncate font-sans text-xs text-cream/55">
                    {session.workoutName}
                    {session.status !== "scheduled" && ` · ${t(`status.${session.status}`)}`}
                  </span>
                </span>
                <Icon
                  name="chevron"
                  className="h-3.5 w-3.5 shrink-0 text-cream/35 transition-transform group-hover:translate-x-0.5 group-hover:text-cream/60 motion-reduce:transition-none"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
