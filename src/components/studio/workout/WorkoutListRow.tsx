"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { SubmitButton } from "@/components/studio/SubmitButton";
import { muted, surfaceLink } from "@/components/studio/theme";
import { archiveWorkoutAction, duplicateWorkoutAction } from "@/app/app/coach/treinos/actions";
import type { WorkoutSummary } from "@/lib/studio/types";
import { cn } from "@/lib/utils";

/** One workout as a row: name and meta on the left, duplicate/archive on the right. */
export function WorkoutListRow({ workout, locale }: { workout: WorkoutSummary; locale: string }) {
  const t = useTranslations("Studio.workouts");
  const common = useTranslations("Studio.common");

  return (
    <li className={cn(surfaceLink, "flex flex-wrap items-center justify-between gap-4 p-5")}>
      <Link href={`/app/coach/treinos/${workout.id}`} className="min-w-0 grow">
        <p className="font-sans text-base font-semibold text-cream">{workout.name}</p>
        <p className={muted}>
          {workout.focus || common("none")} · {t("items", { count: workout.itemCount })} ·{" "}
          {new Date(workout.createdAt).toLocaleDateString(locale)}
        </p>
      </Link>
      <form className="flex shrink-0 items-center gap-2">
        <input type="hidden" name="workoutId" value={workout.id} />
        <SubmitButton formAction={duplicateWorkoutAction} variant="ghost" className="px-3 py-1.5 text-xs">
          {t("duplicate")}
        </SubmitButton>
        <SubmitButton formAction={archiveWorkoutAction} variant="ghost" className="px-3 py-1.5 text-xs">
          {t("archive")}
        </SubmitButton>
      </form>
    </li>
  );
}
