import { getTranslations } from "next-intl/server";
import { archiveExerciseAction } from "@/app/app/coach/biblioteca/actions";
import { cn } from "@/lib/utils";
import type { Exercise } from "@/lib/studio/types";
import { SubmitButton } from "../SubmitButton";
import { chip, chipAccent, muted, surface } from "../theme";
import { EditExerciseForm } from "./EditExerciseForm";

/** One exercise: cues, tags, demo, inline edit and archive. */
export async function ExerciseCard({ exercise }: { exercise: Exercise }) {
  const t = await getTranslations("Studio.library");
  const common = await getTranslations("Studio.common");
  const cues = exercise.cues
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <li className={cn(surface, "flex flex-col gap-3 p-5")}>
      <div className="flex items-start justify-between gap-3">
        <p className="font-sans text-base font-semibold text-cream">{exercise.name}</p>
        <span className={chipAccent}>{t(`tracking.${exercise.tracking}`)}</span>
      </div>

      {exercise.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {exercise.tags.map((tag) => (
            <span key={tag} className={chip}>
              {tag}
            </span>
          ))}
        </div>
      )}

      {cues.length > 0 && (
        <ul className={cn(muted, "list-disc space-y-0.5 pl-4")}>
          {cues.map((line, index) => (
            // Cue lines have no stable identity beyond order; index is safe here.
            <li key={index}>{line}</li>
          ))}
        </ul>
      )}

      {exercise.mediaId ? (
        <video
          controls
          preload="metadata"
          className="w-full rounded-lg"
          src={`/app/media/${exercise.mediaId}`}
        />
      ) : (
        exercise.videoUrl && (
          <a
            href={exercise.videoUrl}
            target="_blank"
            rel="noreferrer"
            className="font-sans text-sm text-accent-ink underline underline-offset-2"
          >
            {t("demo")}
          </a>
        )
      )}

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-cream/10 pt-3">
        <details className="grow">
          <summary className="cursor-pointer font-sans text-xs text-cream/60 transition-colors hover:text-cream">
            {common("edit")}
          </summary>
          <div className="mt-3">
            <EditExerciseForm exercise={exercise} />
          </div>
        </details>
        <form action={archiveExerciseAction.bind(null, exercise.id)}>
          <SubmitButton
            variant="ghost"
            className="shrink-0 px-3 py-1.5 text-xs text-cream/60 ring-cream/15 hover:text-cream"
          >
            {t("archive")}
          </SubmitButton>
        </form>
      </div>
    </li>
  );
}
