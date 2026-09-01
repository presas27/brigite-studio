import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { EditExerciseModal } from "@/components/studio/library/EditExerciseModal";
import { ExerciseCues } from "@/components/studio/library/ExerciseCues";
import { ExerciseDemo } from "@/components/studio/library/ExerciseDemo";
import { ExerciseTags } from "@/components/studio/library/ExerciseTags";
import { FindVideoButton } from "@/components/studio/library/FindVideoButton";
import { PageHeader } from "@/components/studio/PageHeader";
import { eyebrow, surface } from "@/components/studio/theme";
import { requireCoach } from "@/lib/studio/auth";
import { findExercise } from "@/lib/studio/library";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Exercício",
  robots: { index: false, follow: false },
};

/**
 * One exercise, and the only screen where it is maintained.
 *
 * Everything on it edits in place: the tags take a new one without leaving the
 * page, the cues open into Portuguese and English side by side, and the demo
 * takes a YouTube link and plays it. The modal in the masthead stays for the
 * whole-row edit — renaming, changing how the movement is measured, editing
 * the link — but the three things Sara actually touches are here.
 *
 * Demo left, cues right: on this page the video is the reference and the cues
 * are read against it, so they belong on one line at reading width rather than
 * stacked a scroll apart.
 */
export default async function ExercisePage({
  params,
}: {
  params: Promise<{ exerciseId: string }>;
}) {
  await requireCoach();
  const { exerciseId } = await params;

  const [exercise, t] = await Promise.all([
    findExercise(exerciseId),
    getTranslations("Studio.library"),
  ]);
  if (!exercise) notFound();

  const regression = exercise.regressionOf ? await findExercise(exercise.regressionOf) : undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        backHref="/app/coach/exercicios"
        title={exercise.name}
        action={<EditExerciseModal exercise={exercise} />}
      />

      <ExerciseTags
        exerciseId={exercise.id}
        tags={exercise.tags}
        tracking={t(`tracking.${exercise.tracking}`)}
      />

      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        <div className="space-y-2">
          <ExerciseDemo exerciseId={exercise.id} videoUrl={exercise.videoUrl} />
          {/* Under the plate, not in the masthead: it is one way of filling this
              one field, and it belongs next to the field it fills. */}
          <FindVideoButton exerciseId={exercise.id} />
        </div>
        <ExerciseCues exerciseId={exercise.id} cues={exercise.cues} cuesEn={exercise.cuesEn} />
      </div>

      {regression && (
        <div className={cn(surface, "max-w-md space-y-2 p-5")}>
          <p className={eyebrow}>{t("regressionOf")}</p>
          <p className="font-sans text-sm text-cream/85">{regression.name}</p>
        </div>
      )}
    </div>
  );
}
