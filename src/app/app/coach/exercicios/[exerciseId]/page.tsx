import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { EditExerciseModal } from "@/components/studio/library/EditExerciseModal";
import { PageHeader } from "@/components/studio/PageHeader";
import { chip, chipAccent, eyebrow, muted, surface } from "@/components/studio/theme";
import { requireCoach } from "@/lib/studio/auth";
import { findExercise } from "@/lib/studio/library";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Exercício",
  robots: { index: false, follow: false },
};

/**
 * One exercise, full size: the demo big enough to judge a shape by, and the
 * cues beside it in the order Sara wrote them. Editing is one control in the
 * masthead — this page is for reading the movement, not maintaining it.
 *
 * Without a filmed demo the page drops to a single column instead of holding
 * open a screen-high empty plate: an exercise that is still just words should
 * look like words.
 */
export default async function ExercisePage({
  params,
}: {
  params: Promise<{ exerciseId: string }>;
}) {
  await requireCoach();
  const { exerciseId } = await params;

  const exercise = findExercise(exerciseId);
  if (!exercise) notFound();

  const t = await getTranslations("Studio.library");
  const regression = exercise.regressionOf ? findExercise(exercise.regressionOf) : undefined;
  const cues = exercise.cues
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <div className="space-y-6">
      <PageHeader
        backHref="/app/coach/exercicios"
        title={exercise.name}
        action={<EditExerciseModal exercise={exercise} />}
      />

      <div
        className={cn(
          "gap-5",
          exercise.mediaId
            ? "grid lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start"
            : "max-w-2xl",
        )}
      >
        {exercise.mediaId && (
          <div className={cn(surface, "p-3")}>
            <video
              controls
              preload="metadata"
              playsInline
              src={`/app/media/${exercise.mediaId}`}
              className="aspect-[3/2] w-full rounded-[0.85rem] bg-cream/[0.06] object-cover"
            />
          </div>
        )}

        <div className="space-y-5">
          <div className="flex flex-wrap gap-2">
            <span className={chipAccent}>{t(`tracking.${exercise.tracking}`)}</span>
            {exercise.tags.map((tag) => (
              <span key={tag} className={chip}>
                {tag}
              </span>
            ))}
          </div>

          <div className={cn(surface, "space-y-2 p-5")}>
            <p className={eyebrow}>{t("cuesLabel")}</p>
            {cues.length > 0 ? (
              <ul className={cn(muted, "list-disc space-y-1 pl-4")}>
                {cues.map((line, index) => (
                  // Cue lines have no stable identity beyond order; index is safe here.
                  <li key={index}>{line}</li>
                ))}
              </ul>
            ) : (
              <p className={muted}>{t("noCues")}</p>
            )}
          </div>

          {/* Only worth a panel when there is something to say: a link to a
              demo hosted elsewhere, or the fact that nothing is filmed yet. */}
          {(exercise.videoUrl || !exercise.mediaId) && (
            <div className={cn(surface, "space-y-2 p-5")}>
              <p className={eyebrow}>{t("uploadLabel")}</p>
              {exercise.videoUrl ? (
                <a
                  href={exercise.videoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="block font-sans text-sm text-accent-ink underline underline-offset-2"
                >
                  {t("demo")}
                </a>
              ) : (
                <p className={muted}>{t("noMedia")}</p>
              )}
            </div>
          )}

          {regression && (
            <div className={cn(surface, "space-y-2 p-5")}>
              <p className={eyebrow}>{t("regressionOf")}</p>
              <p className="font-sans text-sm text-cream/85">{regression.name}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
