"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Empty } from "@/components/studio/Empty";
import { FilterBar } from "@/components/studio/FilterBar";
import { eyebrow, muted } from "@/components/studio/theme";
import { usePersistedView } from "@/components/studio/usePersistedView";
import { shortWeekday } from "@/components/studio/plan/date";
import { formatDayKey } from "@/components/studio/coach/format";
import type { ClientSession } from "@/lib/studio/clientConsole";
import type { AssignmentStatus } from "@/lib/studio/types";
import { capitalize, cn, searchKey } from "@/lib/utils";
import { SessionCard } from "./SessionCard";
import { SessionListRow } from "./SessionListRow";

/** The four ways an aluna actually asks about her training. */
type StatusFilter = "all" | "upcoming" | "done" | "skipped";

const STATUS_FILTERS: StatusFilter[] = ["all", "upcoming", "done", "skipped"];

function matchesStatus(status: AssignmentStatus, filter: StatusFilter): boolean {
  if (filter === "all") return true;
  if (filter === "upcoming") return status === "scheduled";
  return status === filter;
}

/**
 * Every session on the aluna's calendar, browsable — the same library the
 * coach gets over her workout templates, over the sessions actually assigned
 * to this person.
 *
 * Three filters stack because they answer three different questions: the
 * search box is "where is that one workout", the focus dropdown is "show me
 * the mobility ones", and the status pills are "what have I still got left".
 * The grid/list switch is remembered per aluna, same as everywhere else.
 */
export function SessionLibrary({
  sessions,
  focuses,
  today,
}: {
  sessions: ClientSession[];
  focuses: { tag: string; count: number }[];
  /** `YYYY-MM-DD`, from the server — the browser's idea of today can be a day off. */
  today: string;
}) {
  const t = useTranslations("Studio.aluno");
  const tPlan = useTranslations("Studio.plan");
  const locale = useLocale();

  const [query, setQuery] = useState("");
  const [focus, setFocus] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [view, setView] = usePersistedView("studio.aluno.sessions.view");

  const categoryOptions = useMemo(
    () => focuses.map(({ tag: value, count }) => ({ value, label: capitalize(value), count })),
    [focuses],
  );

  const counts = useMemo(
    () =>
      Object.fromEntries(
        STATUS_FILTERS.map((filter) => [
          filter,
          sessions.filter((session) => matchesStatus(session.status, filter)).length,
        ]),
      ) as Record<StatusFilter, number>,
    [sessions],
  );

  const results = useMemo(() => {
    const needle = searchKey(query.trim());
    return sessions.filter((session) => {
      const matchesQuery =
        !needle ||
        searchKey(session.name).includes(needle) ||
        searchKey(session.focus).includes(needle);
      return (
        matchesQuery &&
        (!focus || session.focus === focus) &&
        matchesStatus(session.status, status)
      );
    });
  }, [sessions, query, focus, status]);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <FilterBar
          query={query}
          onQueryChangeAction={setQuery}
          categoryOptions={categoryOptions}
          categoryValue={focus}
          onCategoryChangeAction={setFocus}
          view={view}
          onViewChangeAction={setView}
        />

        <div
          role="group"
          aria-label={t("sessions.statusFilter")}
          className="-mx-1 flex gap-1 overflow-x-auto px-1"
        >
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter}
              type="button"
              aria-pressed={status === filter}
              onClick={() => setStatus(filter)}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-1.5 font-sans text-xs font-semibold whitespace-nowrap transition-colors",
                status === filter
                  ? "bg-caramel/20 text-accent-ink"
                  : "text-cream/50 hover:text-cream",
              )}
            >
              {t(`sessions.filter.${filter}`)}
              <span className="font-mono text-[0.65rem] opacity-70">{counts[filter]}</span>
            </button>
          ))}
        </div>
      </div>

      {results.length === 0 ? (
        <Empty title={t("sessions.noResults")} hint={t("sessions.noResultsHint")} />
      ) : (
        <>
          <p className={cn(eyebrow, "font-mono")}>
            {t("sessions.count", { count: results.length })}
          </p>
          {view === "grid" ? (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {results.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  dateLabel={formatDayKey(session.date, locale)}
                  isToday={session.date === today}
                  t={t}
                  tPlan={tPlan}
                />
              ))}
            </ul>
          ) : (
            <ul className="space-y-2.5">
              {results.map((session) => (
                <SessionListRow
                  key={session.id}
                  session={session}
                  dateLabel={formatDayKey(session.date, locale)}
                  dayNumber={session.date.slice(8)}
                  weekday={shortWeekday(session.date, locale)}
                  isToday={session.date === today}
                  t={t}
                  tPlan={tPlan}
                />
              ))}
            </ul>
          )}
          {/* A year back and the planned weeks ahead — said once, at the end,
              so nobody reads a filtered list as their whole history. */}
          <p className={muted}>{t("sessions.rangeNote")}</p>
        </>
      )}
    </div>
  );
}
