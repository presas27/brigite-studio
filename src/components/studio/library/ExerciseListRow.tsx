"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import type { Exercise } from "@/lib/studio/types";
import { capitalize } from "@/lib/utils";
import { ExerciseThumb } from "./ExerciseThumb";

/**
 * One exercise as a row rather than a tile — same picture-first identity as
 * the grid card, just compact enough to scan a long library at a glance.
 */
export function ExerciseListRow({ exercise }: { exercise: Exercise }) {
  const t = useTranslations("Studio.library");
  const context = [t(`tracking.${exercise.tracking}`), ...exercise.tags.map((tag) => capitalize(tag))].join(
    " · ",
  );

  return (
    <li>
      <Link
        href={`/app/coach/exercicios/${exercise.id}`}
        className="flex items-center gap-3 rounded-[1rem] bg-cream/[0.04] p-2.5 ring-1 ring-cream/10 transition hover:bg-cream/[0.07] hover:ring-cream/25"
      >
        <ExerciseThumb videoUrl={exercise.videoUrl} className="aspect-[3/2] w-20 shrink-0 sm:w-24" />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-sans text-sm font-semibold text-cream">
            {exercise.name}
          </span>
          <span className="mt-0.5 block truncate font-sans text-xs text-cream/55">{context}</span>
        </span>
      </Link>
    </li>
  );
}
