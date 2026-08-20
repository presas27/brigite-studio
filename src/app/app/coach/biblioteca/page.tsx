import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { CreateExerciseForm } from "@/components/studio/library/CreateExerciseForm";
import { ExerciseCard } from "@/components/studio/library/ExerciseCard";
import { Empty } from "@/components/studio/Empty";
import { PageHeader } from "@/components/studio/PageHeader";
import { buttonGhost, buttonPrimary, chip, chipAccent, field, heading, muted, surface } from "@/components/studio/theme";
import { requireCoach } from "@/lib/studio/auth";
import { exerciseTags, listExercises } from "@/lib/studio/library";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Biblioteca",
  robots: { index: false, follow: false },
};

/**
 * Sara's own exercise library — the asset no commercial database has: her
 * aerial, hand balancing and mobility progressions, filmed and cued by her.
 */
export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string }>;
}) {
  await requireCoach();
  const { q, tag } = await searchParams;

  const [t, common] = await Promise.all([
    getTranslations("Studio.library"),
    getTranslations("Studio.common"),
  ]);

  const exercises = listExercises({ search: q, tag });
  const tags = exerciseTags();

  const hrefFor = (nextTag?: string) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (nextTag) params.set("tag", nextTag);
    const qs = params.toString();
    return qs ? `/app/coach/biblioteca?${qs}` : "/app/coach/biblioteca";
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("title")}
        lead={t("lead")}
        action={
          <details className="relative">
            <summary
              className={cn(
                buttonPrimary,
                "cursor-pointer list-none [&::-webkit-details-marker]:hidden",
              )}
            >
              {t("add")}
            </summary>
            <div className={cn(surface, "absolute right-0 z-30 mt-3 w-[min(92vw,28rem)] p-5")}>
              <p className={cn(heading, "mb-4 text-lg")}>{t("addTitle")}</p>
              <CreateExerciseForm />
            </div>
          </details>
        }
      />

      <div className="space-y-3">
        <form method="get" className="flex gap-2">
          {tag && <input type="hidden" name="tag" value={tag} />}
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder={common("searchPlaceholder")}
            aria-label={common("search")}
            className={field}
          />
          <button type="submit" className={buttonGhost}>
            {common("search")}
          </button>
        </form>

        <div className="flex flex-wrap gap-2">
          <Link href={hrefFor()} className={!tag ? chipAccent : chip}>
            {common("all")}
          </Link>
          {tags.map(({ tag: name, count }) => (
            <Link key={name} href={hrefFor(name)} className={tag === name ? chipAccent : chip}>
              {name} · {count}
            </Link>
          ))}
        </div>
      </div>

      {exercises.length === 0 ? (
        <Empty
          title={q || tag ? t("noResults") : t("empty")}
          hint={q || tag ? undefined : t("emptyHint")}
        />
      ) : (
        <>
          <p className={muted}>{t("count", { count: exercises.length })}</p>
          <ul className="grid gap-4 sm:grid-cols-2">
            {exercises.map((exercise) => (
              <ExerciseCard key={exercise.id} exercise={exercise} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
