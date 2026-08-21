"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Empty } from "@/components/studio/Empty";
import { FilterBar } from "@/components/studio/FilterBar";
import { eyebrow, muted } from "@/components/studio/theme";
import { usePersistedView } from "@/components/studio/usePersistedView";
import { formatDayKey, shortWeekday } from "@/components/studio/format";
import type { ClientSession } from "@/lib/studio/clientConsole";
import { capitalize, searchKey } from "@/lib/utils";
import { SessionCard } from "./SessionCard";
import { SessionListRow } from "./SessionListRow";

/**
 * Every session on the aluna's calendar, browsable — the same library the
 * coach gets over her workout templates, over the sessions actually assigned
 * to this person.
 *
 * Two filters stack because they answer two different questions: the
 * search box is "where is that one workout", and the focus dropdown is
 * "show me the mobility ones". The grid/list switch is remembered per
 * aluna, same as everywhere else.
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
  const [view, setView] = usePersistedView("studio.aluno.sessions.view");

  const categoryOptions = useMemo(
    () => focuses.map(({ tag: value, count }) => ({ value, label: capitalize(value), count })),
    [focuses],
  );

  const results = useMemo(() => {
    const needle = searchKey(query.trim());
    return sessions.filter((session) => {
      const matchesQuery =
        !needle ||
        searchKey(session.name).includes(needle) ||
        searchKey(session.focus).includes(needle);
      return matchesQuery && (!focus || session.focus === focus);
    });
  }, [sessions, query, focus]);

  return (
    <div className="space-y-6">
      <FilterBar
        query={query}
        onQueryChangeAction={setQuery}
        categoryOptions={categoryOptions}
        categoryValue={focus}
        onCategoryChangeAction={setFocus}
        view={view}
        onViewChangeAction={setView}
      />

      {results.length === 0 ? (
        <Empty title={t("sessions.noResults")} hint={t("sessions.noResultsHint")} />
      ) : (
        <>
          <p className={eyebrow}>
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
