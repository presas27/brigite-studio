"use client";

import { useMemo, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useTranslations } from "next-intl";
import { Empty } from "@/components/studio/Empty";
import { FilterBar } from "@/components/studio/FilterBar";
import { muted } from "@/components/studio/theme";
import { usePersistedView } from "@/components/studio/usePersistedView";
import type { Exercise } from "@/lib/studio/types";
import { capitalize, searchKey } from "@/lib/utils";
import { ExerciseCard } from "./ExerciseCard";
import { ExerciseListRow } from "./ExerciseListRow";

// More than a screenful in either view, so scrolling still feels
// unbounded, while the DOM stays small enough that filtering is instant.
const LIMIT = 60;

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
  const listRef = useRef<HTMLDivElement>(null);
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
        searchKey(exercise.cuesEn).includes(needle) ||
        exercise.tags.some((exerciseTag) => searchKey(exerciseTag).includes(needle));
      const matchesTag = !tag || exercise.tags.includes(tag);
      return matchesQuery && matchesTag;
    });
  }, [exercises, query, tag]);

  const shown = results.slice(0, LIMIT);
  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      gsap.fromTo(
        "[data-exercise-card]",
        { autoAlpha: 0, y: 14, scale: 0.98 },
        {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          duration: 0.28,
          stagger: 0.02,
          ease: "power2.out",
          overwrite: "auto",
        },
      );
    },
    { scope: listRef, dependencies: [shown.map((e) => e.id).join(","), view] },
  );

  return (
    <div ref={listRef} className="space-y-6">
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
          <p className={muted}>
            {results.length > LIMIT
              ? t("showingSome", { shown: LIMIT, total: results.length })
              : t("count", { count: results.length })}
          </p>
          {view === "grid" ? (
            <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 2xl:grid-cols-4">
              {shown.map((exercise) => (
                <ExerciseCard key={exercise.id} exercise={exercise} />
              ))}
            </ul>
          ) : (
            <ul className="space-y-2">
              {shown.map((exercise) => (
                <ExerciseListRow key={exercise.id} exercise={exercise} />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
