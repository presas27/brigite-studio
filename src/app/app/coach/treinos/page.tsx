import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Empty } from "@/components/studio/Empty";
import { Field } from "@/components/studio/Field";
import { PageHeader } from "@/components/studio/PageHeader";
import { SubmitButton } from "@/components/studio/SubmitButton";
import { buttonGhost, buttonPrimary, field, heading, muted, surface, surfaceLink } from "@/components/studio/theme";
import { requireCoach } from "@/lib/studio/auth";
import { listWorkouts } from "@/lib/studio/library";
import { cn } from "@/lib/utils";
import { archiveWorkoutAction, createWorkoutAction, duplicateWorkoutAction } from "./actions";

export const metadata: Metadata = {
  title: "Treinos",
  robots: { index: false, follow: false },
};

/** Reusable workout templates — the blocks Sara assigns to any client's plan. */
export default async function WorkoutsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireCoach();
  const { q } = await searchParams;

  const [t, common, locale] = await Promise.all([
    getTranslations("Studio.workouts"),
    getTranslations("Studio.common"),
    getLocale(),
  ]);

  const workouts = listWorkouts(q);

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
            <div className={cn(surface, "absolute right-0 z-30 mt-3 w-[min(92vw,26rem)] p-5")}>
              <p className={cn(heading, "mb-4 text-lg")}>{t("addTitle")}</p>
              <form action={createWorkoutAction} className="space-y-4">
                <Field label={t("nameLabel")} htmlFor="new-workout-name" required>
                  <input
                    id="new-workout-name"
                    name="name"
                    required
                    placeholder={t("namePlaceholder")}
                    className={field}
                  />
                </Field>
                <Field label={t("focusLabel")} htmlFor="new-workout-focus">
                  <input id="new-workout-focus" name="focus" placeholder={t("focusPlaceholder")} className={field} />
                </Field>
                <Field label={t("notesLabel")} htmlFor="new-workout-notes">
                  <textarea
                    id="new-workout-notes"
                    name="notes"
                    rows={2}
                    placeholder={t("notesPlaceholder")}
                    className={field}
                  />
                </Field>
                <SubmitButton pendingLabel={common("creating")} className="w-full">
                  {common("create")}
                </SubmitButton>
              </form>
            </div>
          </details>
        }
      />

      <form method="get" className="flex gap-2">
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

      {workouts.length === 0 ? (
        <Empty title={t("empty")} hint={t("emptyHint")} />
      ) : (
        <ul className="space-y-3">
          {workouts.map((workout) => (
            <li key={workout.id} className={cn(surfaceLink, "flex flex-wrap items-center justify-between gap-4 p-5")}>
              <Link href={`/app/coach/treinos/${workout.id}`} className="min-w-0 grow">
                <p className="font-sans text-base font-semibold text-cream">{workout.name}</p>
                <p className={muted}>
                  {workout.focus || common("none")} · {t("items", { count: workout.itemCount })} ·{" "}
                  {new Date(workout.createdAt).toLocaleDateString(locale)}
                </p>
              </Link>
              <form className="flex shrink-0 items-center gap-2">
                <input type="hidden" name="workoutId" value={workout.id} />
                <SubmitButton
                  formAction={duplicateWorkoutAction}
                  variant="ghost"
                  className="px-3 py-1.5 text-xs"
                >
                  {t("duplicate")}
                </SubmitButton>
                <SubmitButton
                  formAction={archiveWorkoutAction}
                  variant="ghost"
                  className="px-3 py-1.5 text-xs"
                >
                  {t("archive")}
                </SubmitButton>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
