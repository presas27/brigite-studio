"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Empty } from "@/components/studio/Empty";
import { ShelfTabs } from "@/components/studio/ShelfTabs";
import { chip, muted, surfaceLink } from "@/components/studio/theme";
import type { LibraryCategory, TrainingProgramSummary } from "@/lib/studio/types";
import { capitalize, cn, searchKey } from "@/lib/utils";

/**
 * The coach's programs, split across the same two shelves as her workouts.
 *
 * A list and not a grid: a program's useful metadata is three numbers and a
 * date, which read across a row and would need a card's whole height to say the
 * same thing. Nothing here is a tile worth looking at — the phases inside are,
 * and those are one click away.
 */
export function ProgramLibrary({
  programs,
  locale,
}: {
  programs: TrainingProgramSummary[];
  locale: string;
}) {
  const t = useTranslations("Studio.programs");
  const tLibrary = useTranslations("Studio.library");
  const common = useTranslations("Studio.common");
  const [shelf, setShelf] = useState<LibraryCategory>("master");
  const [query, setQuery] = useState("");

  // Counted before the search is applied, so the tabs keep saying how big each
  // shelf is rather than how much of it matches what is typed.
  const shelves = useMemo(
    () =>
      (
        [
          { value: "master", label: tLibrary("tabs.masterPrograms") },
          { value: "shared", label: tLibrary("tabs.shared") },
        ] as const
      ).map(({ value, label }) => ({
        value,
        label,
        count: programs.filter((program) => program.libraryCategory === value).length,
      })),
    [programs, tLibrary],
  );

  const results = useMemo(() => {
    const needle = searchKey(query.trim());
    return programs.filter((program) => {
      if (program.libraryCategory !== shelf) return false;
      if (!needle) return true;
      return (
        searchKey(program.name).includes(needle) || searchKey(program.focus).includes(needle)
      );
    });
  }, [programs, query, shelf]);

  return (
    <div className="space-y-6">
      <ShelfTabs shelves={shelves} value={shelf} onChangeAction={setShelf} label={t("title")} />

      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={common("searchPlaceholder")}
        aria-label={common("search")}
        className="w-full rounded-[1rem] bg-cream/5 px-4 py-3 font-sans text-base text-cream ring-1 ring-cream/15 outline-none transition placeholder:text-cream/35 focus:ring-2 focus:ring-accent-ink/70"
      />

      {results.length === 0 ? (
        // An empty shelf and an empty search are different problems: one needs
        // explaining, the other needs the search widening.
        query.trim() ? (
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
          <ul className="space-y-3">
            {results.map((program) => (
              <li key={program.id}>
                <Link
                  href={`/app/coach/programas/${program.id}`}
                  className={cn(
                    surfaceLink,
                    "flex flex-wrap items-center justify-between gap-4 p-5",
                  )}
                >
                  <span className="min-w-0 grow">
                    <span className="block font-sans text-base font-bold text-cream">
                      {program.name}
                    </span>
                    <span className={cn(muted, "block")}>
                      {program.focus ? `${capitalize(program.focus)} · ` : ""}
                      {t("phaseCount", { count: program.phaseCount })}
                      {program.weekCount > 0
                        ? ` · ${t("weekCount", { count: program.weekCount })}`
                        : ""}
                      {" · "}
                      {t("workoutCount", { count: program.workoutCount })}
                      {" · "}
                      {t("editedOn", {
                        date: new Date(program.updatedAt).toLocaleDateString(locale),
                      })}
                    </span>
                  </span>
                  {program.libraryCategory === "shared" && (
                    <span className={cn(chip, "shrink-0")}>{tLibrary("tabs.shared")}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
