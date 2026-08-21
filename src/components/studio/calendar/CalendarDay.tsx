import { capitalize, cn } from "@/lib/utils";
import { shortWeekday } from "../format";
import { parseDayKey } from "../plan/date";
import type { Translate } from "../plan/types";
import {
  firstName,
  STATUS_MARK,
  STATUS_TAPE,
  type CalendarSession,
  type CalendarSubject,
  type CalendarView,
} from "./types";

/** Tapes a month cell shows before it collapses the rest into "+n". */
const MONTH_TAPES = 3;

/** Diagonal stagger, so a new month deals itself out from the top-left corner. */
const STAGGER_MS = 18;

type Props = {
  date: string;
  /** Position in the grid — drives the entrance stagger only. */
  index: number;
  view: CalendarView;
  /** Whether a tape names the aluna or the workout. See `CalendarSubject`. */
  subject: CalendarSubject;
  /** False for the leading/trailing days that complete the first and last weeks. */
  inMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  sessions: CalendarSession[];
  locale: string;
  t: Translate;
  onSelect: (date: string) => void;
  innerRef: (el: HTMLButtonElement | null) => void;
};

/**
 * One day on the calendar — a button, always, in both views.
 *
 * The whole cell is a single click target that selects the day; the sessions
 * inside it are marks, not links. That split is what keeps the grid readable:
 * the calendar answers "when", the agenda beside it answers "who" and gives
 * you somewhere to go. Nesting a link per session would also nest interactive
 * elements inside a button, which no assistive technology handles well.
 */
export function CalendarDay({
  date,
  index,
  view,
  subject,
  inMonth,
  isToday,
  isSelected,
  sessions,
  locale,
  t,
  onSelect,
  innerRef,
}: Props) {
  const day = parseDayKey(date);
  const dayNumber = new Intl.DateTimeFormat(locale, { day: "numeric", timeZone: "UTC" }).format(day);
  const weekday = shortWeekday(date, locale);
  const fullDate = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(day);

  const isWeekend = index % 7 >= 5;
  const isMonth = view === "month";
  const byClient = subject === "client";
  const shown = isMonth ? sessions.slice(0, MONTH_TAPES) : sessions;
  const hidden = sessions.length - shown.length;

  return (
    <button
      ref={innerRef}
      type="button"
      onClick={() => onSelect(date)}
      tabIndex={isSelected ? 0 : -1}
      aria-pressed={isSelected}
      aria-current={isToday ? "date" : undefined}
      aria-label={`${fullDate} — ${t("calendar.sessions", { count: sessions.length })}`}
      style={{ animationDelay: `${((index % 7) + Math.floor(index / 7)) * STAGGER_MS}ms` }}
      className={cn(
        "plan-cell group flex flex-col rounded-[0.9rem] text-left outline-none ring-1 transition-colors",
        "focus-visible:ring-2 focus-visible:ring-caramel",
        isMonth
          ? "min-h-[4.5rem] gap-1 p-1.5 sm:min-h-[6.75rem] sm:gap-1.5 sm:p-2"
          : "min-h-[7rem] gap-2 p-3 sm:min-h-[16rem]",
        inMonth ? "bg-ink-lift ring-cream/[0.07]" : "bg-transparent ring-cream/[0.04]",
        !inMonth && "opacity-55",
        inMonth && isWeekend && "bg-cream/[0.02]",
        isSelected ? "bg-surface-hover ring-2 ring-cream/30" : "hover:bg-surface-hover",
      )}
    >
      <span className={cn("flex items-baseline gap-1.5", !isMonth && "justify-between")}>
        <span
          className={cn(
            "flex items-center justify-center rounded-full font-display leading-none",
            isMonth
              ? "h-[1.4rem] w-[1.4rem] text-[0.8rem] sm:h-6 sm:w-6 sm:text-[0.95rem]"
              : "h-7 w-7 text-[1.05rem]",
            isToday ? "bg-caramel text-ink" : "text-cream/70 group-hover:text-cream",
          )}
        >
          {dayNumber}
        </span>
        {!isMonth && (
          <span className="font-sans text-xs font-medium text-cream/55">{weekday}</span>
        )}
      </span>

      {/* Below `sm` a month cell is ~44px wide: no name fits, so the day's load
          becomes a row of dots. The tapes take over as soon as there is room. */}
      {isMonth && sessions.length > 0 && (
        <span className="flex flex-wrap gap-1 sm:hidden">
          {sessions.slice(0, 6).map((session) => (
            <span
              key={session.id}
              className={cn("h-1.5 w-1.5 rounded-full", STATUS_MARK[session.status])}
            />
          ))}
        </span>
      )}

      <span className={cn("flex-col gap-1", isMonth ? "hidden sm:flex" : "flex")}>
        {shown.map((session) => (
          <span
            key={session.id}
            className={cn(
              "flex items-center gap-1.5 overflow-hidden rounded-[0.4rem]",
              isMonth ? "px-1.5 py-[3px]" : "px-2 py-1.5",
              STATUS_TAPE[session.status],
            )}
          >
            <span
              className={cn(
                "w-[2px] shrink-0 self-stretch rounded-full",
                STATUS_MARK[session.status],
              )}
            />
            <span className="min-w-0">
              <span
                className={cn(
                  "block truncate font-sans font-medium leading-tight",
                  isMonth ? "text-[0.68rem]" : "text-[0.8rem]",
                )}
              >
                {byClient
                  ? isMonth
                    ? firstName(session.clientName)
                    : session.clientName
                  : session.workoutName}
              </span>
              {!isMonth && (byClient || session.focus) && (
                <span className="block truncate font-sans text-[0.7rem] leading-tight opacity-65">
                  {byClient ? session.workoutName : capitalize(session.focus)}
                </span>
              )}
            </span>
          </span>
        ))}
        {hidden > 0 && (
          <span className="pl-1.5 font-sans text-[0.65rem] font-medium leading-none text-cream/55">
            +{hidden}
          </span>
        )}
      </span>
    </button>
  );
}
