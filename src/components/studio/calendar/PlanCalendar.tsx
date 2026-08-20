"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Icon } from "../coach/icons";
import { parseDayKey, shortWeekday } from "../plan/date";
import { eyebrow, heading } from "../theme";
import { CalendarDay } from "./CalendarDay";
import { DayAgenda } from "./DayAgenda";
import type { CalendarView, SessionsByDay } from "./types";

/** Where each control points. Built on the server, which owns the date maths. */
export type CalendarHrefs = {
  prev: string;
  next: string;
  today: string;
  month: string;
  week: string;
};

type Props = {
  view: CalendarView;
  /** Every day the grid renders, in order. Always a whole number of weeks. */
  days: string[];
  /** `YYYY-MM` of the page. In month view, days outside it are the quiet ones. */
  month: string;
  today: string;
  sessions: SessionsByDay;
  locale: string;
  hrefs: CalendarHrefs;
};

const ARROW_STEP: Record<string, number> = {
  ArrowLeft: -1,
  ArrowRight: 1,
  ArrowUp: -7,
  ArrowDown: 7,
};

/** The "hoje" control in the period-nav pill, link or button depending on where you are. */
const todayButton =
  "rounded-full px-3 py-1.5 font-sans text-xs font-semibold text-cream/70 transition-colors hover:bg-cream/10 hover:text-cream";

/** Round icon button in the period-nav pill. */
const stepButton =
  "inline-flex h-8 w-8 items-center justify-center rounded-full text-cream/70 transition-colors hover:bg-cream/10 hover:text-cream";

function tabClass(active: boolean) {
  return cn(
    "rounded-full px-3.5 py-1.5 font-sans text-xs font-semibold transition-colors",
    active ? "bg-caramel/20 text-accent-ink" : "text-cream/50 hover:text-cream",
  );
}

/**
 * The studio's training calendar: a month — or a week — of everyone's
 * sessions, with the selected day opened up beside it.
 *
 * Two rules hold the screen together. Colour is status and nothing else — gold
 * happened, red was missed, neutral is still ahead — so a month reads as
 * texture before it reads as text. And the grid is a single control: arrow
 * keys walk it a day or a week at a time, and walking off either end pages to
 * the next period rather than dead-ending, which is the whole point of a
 * calendar you can move through.
 */
export function PlanCalendar({ view, days, month, today, sessions, locale, hrefs }: Props) {
  const t = useTranslations("Studio.plan");
  const router = useRouter();
  const cells = useRef<(HTMLButtonElement | null)[]>([]);
  const agenda = useRef<HTMLDivElement>(null);

  const isMonth = view === "month";
  /** Week view has no outside days; month view dims the ones filling the edges. */
  const belongs = (date: string) => !isMonth || date.startsWith(month);

  const [selected, setSelected] = useState(() => {
    if (days.includes(today)) return today;
    const firstBusy = days.find((date) => belongs(date) && (sessions[date]?.length ?? 0) > 0);
    return firstBusy ?? days.find(belongs) ?? days[0];
  });

  const visible = days.filter(belongs).flatMap((date) => sessions[date] ?? []);
  const done = visible.filter((session) => session.status === "done").length;
  const skipped = visible.filter((session) => session.status === "skipped").length;
  const scheduled = visible.length - done - skipped;

  const anchor = parseDayKey(isMonth ? `${month}-01` : days[0]);
  const monthName = new Intl.DateTimeFormat(locale, {
    month: "long",
    timeZone: "UTC",
  }).format(anchor);
  // Beside the month name, a week inside one month only needs its day numbers
  // ("17 – 23"); a week that straddles two carries the months too. `formatRange`
  // writes both the way each locale does.
  const last = days[days.length - 1];
  const period = isMonth
    ? new Intl.DateTimeFormat(locale, { year: "numeric", timeZone: "UTC" }).format(anchor)
    : new Intl.DateTimeFormat(locale, {
        day: "numeric",
        month: days[0].slice(0, 7) === last.slice(0, 7) ? undefined : "short",
        timeZone: "UTC",
      }).formatRange(parseDayKey(days[0]), parseDayKey(last));

  const summary =
    visible.length === 0
      ? t(isMonth ? "calendar.emptyMonth" : "calendar.emptyWeek")
      : [
          t("calendar.sessions", { count: visible.length }),
          done > 0 ? t("calendar.done", { count: done }) : "",
          skipped > 0 ? t("calendar.missed", { count: skipped }) : "",
        ]
          .filter(Boolean)
          .join(" · ");

  const selectedIndex = Math.max(0, days.indexOf(selected));
  const selectedDay = days[selectedIndex];

  /**
   * Below `xl` the agenda sits under the grid, so a tap on a day would update
   * something the thumb is covering or has scrolled past. Nudge it into view —
   * `nearest` means the panel moves only when it actually needs to, and the
   * keyboard path deliberately skips this so focus never scrolls away.
   */
  function selectDay(date: string) {
    setSelected(date);
    if (window.matchMedia("(min-width: 80rem)").matches) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    agenda.current?.scrollIntoView({ block: "nearest", behavior: still ? "auto" : "smooth" });
  }

  /** Focusing the cell scrolls it into view, which is the whole point of "hoje". */
  function goToToday() {
    setSelected(today);
    cells.current[days.indexOf(today)]?.focus();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const step = ARROW_STEP[event.key];
    if (step === undefined) return;
    event.preventDefault();
    const next = days.indexOf(selected) + step;
    // Walking off an edge is a page turn, not a wall.
    if (next < 0) {
      router.push(hrefs.prev);
      return;
    }
    if (next >= days.length) {
      router.push(hrefs.next);
      return;
    }
    setSelected(days[next]);
    cells.current[next]?.focus();
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem] xl:gap-8">
      <div className="min-w-0 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
          <h1 className={cn(heading, "flex flex-wrap items-baseline gap-x-3")}>
            <span className="text-[2.25rem] sm:text-[2.75rem]">{monthName}</span>
            <span className={cn(eyebrow, "text-sm normal-case tracking-normal")}>{period}</span>
          </h1>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-full bg-cream/5 p-1 ring-1 ring-cream/10">
              <Link
                href={hrefs.prev}
                aria-label={isMonth ? t("calendar.prevMonth") : t("prevWeek")}
                className={stepButton}
              >
                <Icon name="chevron" className="h-4 w-4 rotate-180" />
              </Link>
              {days.includes(today) ? (
                // Already looking at today's month: "hoje" is a jump within the
                // grid, not a page load that would change nothing.
                <button type="button" onClick={goToToday} className={todayButton}>
                  {t("calendar.today")}
                </button>
              ) : (
                <Link href={hrefs.today} className={todayButton}>
                  {t("calendar.today")}
                </Link>
              )}
              <Link
                href={hrefs.next}
                aria-label={isMonth ? t("calendar.nextMonth") : t("nextWeek")}
                className={stepButton}
              >
                <Icon name="chevron" className="h-4 w-4" />
              </Link>
            </div>

            <div className="flex items-center gap-1 rounded-full bg-cream/5 p-1 ring-1 ring-cream/10">
              <Link
                href={hrefs.month}
                aria-current={isMonth ? "page" : undefined}
                className={tabClass(isMonth)}
              >
                {t("calendar.viewMonth")}
              </Link>
              <Link
                href={hrefs.week}
                aria-current={isMonth ? undefined : "page"}
                className={tabClass(!isMonth)}
              >
                {t("calendar.viewWeek")}
              </Link>
            </div>
          </div>
        </div>

        {/* The rule under the header is the summary: how much of this period
            actually happened, in the same three colours as the grid. */}
        <div className="space-y-2">
          <p className={eyebrow}>{summary}</p>
          <div aria-hidden className="flex h-[3px] overflow-hidden rounded-full bg-cream/[0.08]">
            <span className="basis-0 bg-caramel" style={{ flexGrow: done }} />
            <span className="basis-0 bg-cream/20" style={{ flexGrow: scheduled }} />
            <span className="basis-0 bg-silk" style={{ flexGrow: skipped }} />
          </div>
        </div>

        <div className="space-y-2">
          {isMonth && (
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {days.slice(0, 7).map((date) => (
                <p key={date} className={cn(eyebrow, "truncate px-1.5 capitalize sm:px-2")}>
                  {shortWeekday(date, locale)}
                </p>
              ))}
            </div>
          )}

          <div
            role="group"
            aria-label={t("calendar.grid")}
            onKeyDown={handleKeyDown}
            className={cn(
              "grid gap-1.5 sm:gap-2",
              isMonth ? "grid-cols-7" : "grid-cols-1 sm:grid-cols-7",
            )}
          >
            {days.map((date, index) => (
              <CalendarDay
                key={date}
                date={date}
                index={index}
                view={view}
                inMonth={belongs(date)}
                isToday={date === today}
                isSelected={index === selectedIndex}
                sessions={sessions[date] ?? []}
                locale={locale}
                t={t}
                onSelect={selectDay}
                innerRef={(el) => {
                  cells.current[index] = el;
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <div ref={agenda} className="scroll-mt-6">
        <DayAgenda
          date={selectedDay}
          sessions={sessions[selectedDay] ?? []}
          isToday={selectedDay === today}
          locale={locale}
          t={t}
        />
      </div>
    </div>
  );
}
