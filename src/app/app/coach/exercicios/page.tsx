import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AddExerciseModal } from "@/components/studio/library/AddExerciseModal";
import { ExerciseLibrary } from "@/components/studio/library/ExerciseLibrary";
import { Empty } from "@/components/studio/Empty";
import { PageHeader } from "@/components/studio/PageHeader";
import { requireCoach } from "@/lib/studio/auth";
import { exerciseTags, listExercises } from "@/lib/studio/library";

export const metadata: Metadata = {
  title: "Exercícios",
  robots: { index: false, follow: false },
};

/**
 * Sara's own exercise library — the asset no commercial database has: her
 * aerial, hand balancing and mobility progressions, filmed and cued by her.
 */
export default async function LibraryPage() {
  await requireCoach();

  const t = await getTranslations("Studio.library");
  const exercises = listExercises();
  const tags = exerciseTags();

  return (
    <div className="space-y-8">
      <PageHeader title={t("title")} action={<AddExerciseModal />} />

      {exercises.length === 0 ? (
        <Empty title={t("empty")} hint={t("emptyHint")} />
      ) : (
        <ExerciseLibrary exercises={exercises} tags={tags} />
      )}
    </div>
  );
}
