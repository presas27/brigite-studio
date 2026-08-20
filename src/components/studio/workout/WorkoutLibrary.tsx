"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Empty } from "@/components/studio/Empty";
import { FilterBar } from "@/components/studio/FilterBar";
import { muted } from "@/components/studio/theme";
import { usePersistedView } from "@/components/studio/usePersistedView";
import type { WorkoutSummary } from "@/lib/studio/types";
import { capitalize, searchKey } from "@/lib/utils";
import { WorkoutCard } from "./WorkoutCard";
import { WorkoutListRow } from "./WorkoutListRow";

/**
 * Same filter bar as the exercise library, adapted to workouts: the category
 * is each workout's focus instead of a tag, and the grid tile has no
 * thumbnail to lead with since a workout has no picture of its own.
 */
export function WorkoutLibrary({
  workouts,
  focuses,
  locale,
}: {
  workouts: WorkoutSummary[];
  focuses: { tag: string; count: number }[];
  locale: string;
}) {
  const t = useTranslations("Studio.workouts");
  const [query, setQuery] = useState("");
  const [focus, setFocus] = useState<string | null>(null);
  const [view, setView] = usePersistedView("studio.workouts.view");

  const categoryOptions = useMemo(
    () => focuses.map(({ tag: value, count }) => ({ value, label: capitalize(value), count })),
    [focuses],
  );

  const results = useMemo(() => {
    const needle = searchKey(query.trim());
    return workouts.filter((workout) => {
      const matchesQuery =
        !needle || searchKey(workout.name).includes(needle) || searchKey(workout.focus).includes(needle);
      const matchesFocus = !focus || workout.focus === focus;
      return matchesQuery && matchesFocus;
    });
  }, [workouts, query, focus]);

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
        <Empty title={t("noResults")} />
      ) : (
        <>
          <p className={muted}>{t("count", { count: results.length })}</p>
          {view === "grid" ? (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {results.map((workout) => (
                <WorkoutCard key={workout.id} workout={workout} locale={locale} />
              ))}
            </ul>
          ) : (
            <ul className="space-y-3">
              {results.map((workout) => (
                <WorkoutListRow key={workout.id} workout={workout} locale={locale} />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
