"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Empty } from "@/components/studio/Empty";
import { FilterBar } from "@/components/studio/FilterBar";
import { ShelfTabs } from "@/components/studio/ShelfTabs";
import { muted } from "@/components/studio/theme";
import { usePersistedView } from "@/components/studio/usePersistedView";
import type { LibraryCategory, WorkoutSummary } from "@/lib/studio/types";
import { capitalize, searchKey } from "@/lib/utils";
import { WorkoutCard } from "./WorkoutCard";
import { WorkoutListRow } from "./WorkoutListRow";

/**
 * Same filter bar as the exercise library, adapted to workouts: the category
 * is each workout's focus instead of a tag, and the grid tile has no
 * thumbnail to lead with since a workout has no picture of its own.
 *
 * Above the bar, the two shelves: what the coach has drafted, and what a client
 * has actually been given. That split is the one thing a search box cannot
 * answer, which is why it is tabs and not another category in the dropdown.
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
  const tLibrary = useTranslations("Studio.library");
  const [query, setQuery] = useState("");
  const [focus, setFocus] = useState<string | null>(null);
  const [shelf, setShelf] = useState<LibraryCategory>("master");
  const [view, setView] = usePersistedView("studio.workouts.view");

  const categoryOptions = useMemo(
    () => focuses.map(({ tag: value, count }) => ({ value, label: capitalize(value), count })),
    [focuses],
  );

  // The shelf is applied before search and focus, so the tab counts stay the
  // size of each shelf rather than of whatever is typed in the search box —
  // a count that moved while filtering would be answering a different question.
  const shelves = useMemo(
    () =>
      ([
        { value: "master", label: tLibrary("tabs.masterWorkouts") },
        { value: "shared", label: tLibrary("tabs.shared") },
      ] as const).map(({ value, label }) => ({
        value,
        label,
        count: workouts.filter((workout) => workout.libraryCategory === value).length,
      })),
    [workouts, tLibrary],
  );

  const results = useMemo(() => {
    const needle = searchKey(query.trim());
    return workouts.filter((workout) => {
      if (workout.libraryCategory !== shelf) return false;
      const matchesQuery =
        !needle || searchKey(workout.name).includes(needle) || searchKey(workout.focus ?? "").includes(needle);
      const matchesFocus = !focus || workout.focus === focus;
      return matchesQuery && matchesFocus;
    });
  }, [workouts, query, focus, shelf]);

  const searching = query.trim().length > 0 || focus !== null;

  return (
    <div className="space-y-6">
      <ShelfTabs
        shelves={shelves}
        value={shelf}
        onChangeAction={setShelf}
        label={t("title")}
      />

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
        // An empty shelf and an empty result set are different problems: one
        // needs explaining, the other needs the search widening.
        searching ? (
          <Empty title={t("noResults")} />
        ) : (
          <Empty
            title={shelf === "master" ? tLibrary("emptyMaster") : tLibrary("emptyShared")}
            hint={shelf === "master" ? tLibrary("emptyMasterHint") : tLibrary("emptySharedHint")}
          />
        )
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
