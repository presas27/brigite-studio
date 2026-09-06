"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Empty } from "@/components/studio/Empty";
import { FilterBar } from "@/components/studio/FilterBar";
import { formatDayKey } from "@/components/studio/format";
import { eyebrow } from "@/components/studio/theme";
import { usePersistedView } from "@/components/studio/usePersistedView";
import type { ClientWorkout } from "@/lib/studio/types";
import { capitalize, searchKey } from "@/lib/utils";
import { WorkoutCard } from "./WorkoutCard";
import { WorkoutListRow } from "./WorkoutListRow";

/**
 * Every workout of the aluna's plan, browsable and startable.
 *
 * Not a list of sessions on the calendar: the plan page owns "when", and this
 * one owns "what". Any workout Sara put in any phase of this person's plan is
 * here on any day of the week, because the day is a suggestion and the person
 * training is the one who knows what they have time for today.
 *
 * Two filters stack because they answer two different questions: the search box
 * is "where is that one workout", and the focus dropdown is "show me the
 * mobility ones". The grid/list switch is remembered per aluna, same as
 * everywhere else.
 */
export function WorkoutLibrary({
  workouts,
  focuses,
  today,
  startAction,
  editBase,
}: {
  workouts: ClientWorkout[];
  focuses: { tag: string; count: number }[];
  /** `YYYY-MM-DD`, from the server — the browser's idea of today can be a day off. */
  today: string;
  startAction: (formData: FormData) => void | Promise<void>;
  /**
   * For someone training alone: the editor path their own workouts open under.
   * A workout inside a phase is the coach's and never gets the link.
   */
  editBase?: string;
}) {
  const t = useTranslations("Studio.aluno");
  const tPhases = useTranslations("Studio.plan.phases");
  const locale = useLocale();

  const [query, setQuery] = useState("");
  const [focus, setFocus] = useState<string | null>(null);
  const [view, setView] = usePersistedView("studio.aluno.workouts.view");

  const categoryOptions = useMemo(
    () => focuses.map(({ tag: value, count }) => ({ value, label: capitalize(value), count })),
    [focuses],
  );

  const results = useMemo(() => {
    const needle = searchKey(query.trim());
    return workouts.filter((workout) => {
      const matchesQuery =
        !needle ||
        searchKey(workout.name).includes(needle) ||
        searchKey(workout.focus ?? "").includes(needle) ||
        searchKey(workout.phaseName ?? "").includes(needle);
      return matchesQuery && (!focus || workout.focus === focus);
    });
  }, [workouts, query, focus]);

  /** The three labels a row needs that only the locale and today can give it. */
  function labelsFor(workout: ClientWorkout) {
    return {
      lastDoneLabel: workout.lastDoneDate ? formatDayKey(workout.lastDoneDate, locale) : null,
      weekdayLabel:
        workout.scheduleWeekday == null
          ? null
          : t("workouts.everyWeekday", { day: tPhases(`weekday.${workout.scheduleWeekday}`) }),
      doneToday: workout.lastDoneDate === today,
    };
  }

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
        <Empty title={t("workouts.noResults")} hint={t("workouts.noResultsHint")} />
      ) : (
        <>
          <p className={eyebrow}>{t("workouts.count", { count: results.length })}</p>
          {view === "grid" ? (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {results.map((workout) => (
                <WorkoutCard
                  key={workout.id}
                  workout={workout}
                  {...labelsFor(workout)}
                  t={t}
                  startAction={startAction}
                  editHref={editBase && !workout.phaseId ? `${editBase}/${workout.id}` : null}
                />
              ))}
            </ul>
          ) : (
            <ul className="space-y-2.5">
              {results.map((workout) => (
                <WorkoutListRow
                  key={workout.id}
                  workout={workout}
                  {...labelsFor(workout)}
                  t={t}
                  startAction={startAction}
                  editHref={editBase && !workout.phaseId ? `${editBase}/${workout.id}` : null}
                />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
