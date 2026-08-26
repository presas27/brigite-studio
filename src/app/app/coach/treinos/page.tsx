import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Empty } from "@/components/studio/Empty";
import { PageHeader } from "@/components/studio/PageHeader";
import { AddWorkoutModal } from "@/components/studio/workout/AddWorkoutModal";
import { WorkoutLibrary } from "@/components/studio/workout/WorkoutLibrary";
import { requireCoach } from "@/lib/studio/auth";
import { listWorkouts, workoutFocuses } from "@/lib/studio/library";

export const metadata: Metadata = {
  title: "Treinos",
  robots: { index: false, follow: false },
};

/** Reusable workout templates — the blocks Sara assigns to any client's plan. */
export default async function WorkoutsPage() {
  await requireCoach();

  const [t, locale, workouts, focuses] = await Promise.all([
    getTranslations("Studio.workouts"),
    getLocale(),
    listWorkouts(),
    workoutFocuses(),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader title={t("title")} action={<AddWorkoutModal />} />

      {workouts.length === 0 ? (
        <Empty title={t("empty")} hint={t("emptyHint")} />
      ) : (
        <WorkoutLibrary workouts={workouts} focuses={focuses} locale={locale} />
      )}
    </div>
  );
}
