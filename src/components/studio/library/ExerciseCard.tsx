"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import type { Exercise } from "@/lib/studio/types";
import { capitalize } from "@/lib/utils";
import { ExerciseThumb } from "./ExerciseThumb";

/**
 * One exercise in the library grid — the same tile as in the workout builder:
 * picture first, name, one quiet line of context. Cues, demo and editing live
 * on the exercise's own page, so the grid stays something Sara can scan for the
 * movement she has in mind instead of a wall of open forms.
 */
export function ExerciseCard({ exercise }: { exercise: Exercise }) {
  const t = useTranslations("Studio.library");
  const context = [t(`tracking.${exercise.tracking}`), ...exercise.tags.map(capitalize)].join(
    " · ",
  );

  return (
    <li>
      <Link
        href={`/app/coach/exercicios/${exercise.id}`}
        className="block h-full rounded-[1rem] bg-cream/[0.04] p-2.5 ring-1 ring-cream/10 transition hover:bg-cream/[0.07] hover:ring-cream/25"
      >
        <ExerciseThumb mediaId={exercise.mediaId} className="aspect-[3/2] w-full" />
        <span className="mt-3 block px-1 pb-0.5">
          {/* Two lines rather than an ellipsis: in the builder the picture
              identifies the card, here the name is what Sara scans by. */}
          <span className="line-clamp-2 block font-sans text-sm font-semibold text-cream">
            {exercise.name}
          </span>
          <span className="mt-0.5 block truncate font-sans text-xs text-cream/55">{context}</span>
        </span>
      </Link>
    </li>
  );
}
