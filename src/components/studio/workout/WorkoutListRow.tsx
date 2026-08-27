"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/studio/coach/icons";
import { Modal } from "@/components/studio/Modal";
import { buttonDanger, buttonGhost, muted, surfaceLink } from "@/components/studio/theme";
import { archiveWorkoutAction } from "@/app/app/coach/treinos/actions";
import type { WorkoutSummary } from "@/lib/studio/types";
import { capitalize, cn } from "@/lib/utils";

/** One workout as a row: name and meta on the left, delete on the right. */
export function WorkoutListRow({ workout, locale }: { workout: WorkoutSummary; locale: string }) {
  const t = useTranslations("Studio.workouts");
  const common = useTranslations("Studio.common");
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <li className={cn(surfaceLink, "group relative flex flex-wrap items-center justify-between gap-4 p-5")}>
      <Link href={`/app/coach/treinos/${workout.id}`} className="min-w-0 grow pr-8">
        <p className="font-sans text-base font-bold text-cream">{workout.name}</p>
        <p className={muted}>
          {workout.focus ? capitalize(workout.focus) : common("none")} · {t("items", { count: workout.itemCount })}
          {workout.estimatedMinutes
            ? ` · ${t("durationMinutes", { count: workout.estimatedMinutes })}`
            : ""}{" "}
          · {t("editedOn", { date: new Date(workout.updatedAt).toLocaleDateString(locale) })}
        </p>
      </Link>

      <button
        type="button"
        aria-label={t("delete")}
        onClick={() => setConfirmOpen(true)}
        className="absolute top-3 right-3 cursor-pointer text-silk opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
      >
        <Icon name="trash" className="h-4 w-4" />
      </button>

      <Modal
        open={confirmOpen}
        onCloseAction={() => setConfirmOpen(false)}
        title={t("deleteConfirmTitle")}
        lead={t("deleteConfirmBody", { name: workout.name })}
        width="24rem"
      >
        <form
          action={async (formData) => {
            await archiveWorkoutAction(formData);
            setConfirmOpen(false);
          }}
          className="flex justify-end gap-2"
        >
          <input type="hidden" name="workoutId" value={workout.id} />
          <button type="button" onClick={() => setConfirmOpen(false)} className={cn(buttonGhost, "px-4 py-2 text-sm")}>
            {common("cancel")}
          </button>
          <button type="submit" className={cn(buttonDanger, "px-4 py-2 text-sm")}>
            {t("delete")}
          </button>
        </form>
      </Modal>
    </li>
  );
}
