"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Empty } from "@/components/studio/Empty";
import { FilterBar } from "@/components/studio/FilterBar";
import { muted } from "@/components/studio/theme";
import { usePersistedView } from "@/components/studio/usePersistedView";
import type { Exercise } from "@/lib/studio/types";
import { capitalize, searchKey } from "@/lib/utils";
import { ExerciseCard } from "./ExerciseCard";
import { ExerciseListRow } from "./ExerciseListRow";

/**
 * The library's filter bar and results, all client-side: with everything
 * already on the page, filtering by typing or picking a category is instant —
 * no round trip, no submit button.
 */
export function ExerciseLibrary({
  exercises,
  tags,
}: {
  exercises: Exercise[];
  tags: { tag: string; count: number }[];
}) {
  const t = useTranslations("Studio.library");
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const [view, setView] = usePersistedView("studio.exercises.view");

  const categoryOptions = useMemo(
    () => tags.map(({ tag: value, count }) => ({ value, label: capitalize(value), count })),
    [tags],
  );

  const results = useMemo(() => {
    const needle = searchKey(query.trim());
    return exercises.filter((exercise) => {
      const matchesQuery =
        !needle ||
        searchKey(exercise.name).includes(needle) ||
        searchKey(exercise.cues).includes(needle) ||
        exercise.tags.some((exerciseTag) => searchKey(exerciseTag).includes(needle));
      const matchesTag = !tag || exercise.tags.includes(tag);
      return matchesQuery && matchesTag;
    });
  }, [exercises, query, tag]);

  return (
    <div className="space-y-6">
      <FilterBar
        query={query}
        onQueryChangeAction={setQuery}
        categoryOptions={categoryOptions}
        categoryValue={tag}
        onCategoryChangeAction={setTag}
        view={view}
        onViewChangeAction={setView}
      />

      {results.length === 0 ? (
        <Empty title={t("noResults")} />
      ) : (
        <>
          <p className={muted}>{t("count", { count: results.length })}</p>
          {view === "grid" ? (
            <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 2xl:grid-cols-4">
              {results.map((exercise) => (
                <ExerciseCard key={exercise.id} exercise={exercise} />
              ))}
            </ul>
          ) : (
            <ul className="space-y-2">
              {results.map((exercise) => (
                <ExerciseListRow key={exercise.id} exercise={exercise} />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
