"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { SubmitButton } from "@/components/studio/SubmitButton";
import { muted, surfaceLink } from "@/components/studio/theme";
import { archiveWorkoutAction, duplicateWorkoutAction } from "@/app/app/coach/treinos/actions";
import type { WorkoutSummary } from "@/lib/studio/types";
import { cn } from "@/lib/utils";

/** One workout as a tile — no thumbnail to lead with, so the name carries the card. */
export function WorkoutCard({ workout, locale }: { workout: WorkoutSummary; locale: string }) {
  const t = useTranslations("Studio.workouts");
  const common = useTranslations("Studio.common");

  return (
    <li className={cn(surfaceLink, "flex h-full flex-col gap-4 p-4")}>
      <Link href={`/app/coach/treinos/${workout.id}`} className="min-w-0 flex-1 space-y-1.5">
        <p className="line-clamp-2 font-sans text-sm font-semibold text-cream">{workout.name}</p>
        <p className={cn(muted, "truncate")}>{workout.focus || common("none")}</p>
        <p className={muted}>
          {t("items", { count: workout.itemCount })} · {new Date(workout.createdAt).toLocaleDateString(locale)}
        </p>
      </Link>
      <form className="flex items-center gap-2 border-t border-cream/10 pt-3">
        <input type="hidden" name="workoutId" value={workout.id} />
        <SubmitButton formAction={duplicateWorkoutAction} variant="ghost" className="flex-1 px-3 py-1.5 text-xs">
          {t("duplicate")}
        </SubmitButton>
        <SubmitButton formAction={archiveWorkoutAction} variant="ghost" className="flex-1 px-3 py-1.5 text-xs">
          {t("archive")}
        </SubmitButton>
      </form>
    </li>
  );
}
