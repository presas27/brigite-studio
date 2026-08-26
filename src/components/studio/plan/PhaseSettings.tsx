"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/studio/coach/icons";
import { Modal } from "@/components/studio/Modal";
import { ModalCloseProvider } from "@/components/studio/AddModal";
import { buttonDanger, buttonGhost } from "@/components/studio/theme";
import type { TrainingPhase } from "@/lib/studio/types";
import { cn } from "@/lib/utils";
import { PhaseForm } from "./PhaseForm";

/**
 * Rename a phase, change its duration, or delete it — the three things a coach
 * needs after the fact and cannot do from the create dialog. Same shape and
 * same position on the page as `WorkoutSettings`, so the gesture is the one
 * they already know.
 *
 * Deleting takes a second dialog because the cascade is not obvious from the
 * button: the client's copies of the phase's workouts go with it.
 */
export function PhaseSettings({
  phase,
  updateAction,
  deleteAction,
}: {
  phase: TrainingPhase;
  updateAction: (formData: FormData) => void | Promise<void>;
  deleteAction: (formData: FormData) => void | Promise<void>;
}) {
  const t = useTranslations("Studio.plan.phases");
  const common = useTranslations("Studio.common");
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 font-sans text-xs font-semibold text-cream/70 ring-1 ring-cream/15 transition-colors hover:bg-cream/5 hover:text-cream hover:ring-cream/30"
      >
        <Icon name="settings" className="h-4 w-4" />
        <span className="hidden sm:inline">{common("edit")}</span>
      </button>

      <Modal open={open} onCloseAction={() => setOpen(false)} title={t("editTitle")}>
        <ModalCloseProvider close={() => setOpen(false)}>
          <PhaseForm action={updateAction} phase={phase} submitLabel={common("save")} />
        </ModalCloseProvider>
        <div className="mt-5 border-t border-cream/10 pt-4">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setConfirmOpen(true);
            }}
            className={cn(buttonDanger, "px-4 py-2 text-sm")}
          >
            {t("delete")}
          </button>
        </div>
      </Modal>

      <Modal
        open={confirmOpen}
        onCloseAction={() => setConfirmOpen(false)}
        title={t("deleteConfirmTitle")}
        lead={t("deleteConfirmBody", { name: phase.name })}
        width="24rem"
      >
        <form action={deleteAction} className="flex justify-end gap-2">
          <input type="hidden" name="phaseId" value={phase.id} />
          <button
            type="button"
            onClick={() => setConfirmOpen(false)}
            className={cn(buttonGhost, "px-4 py-2 text-sm")}
          >
            {common("cancel")}
          </button>
          <button type="submit" className={cn(buttonDanger, "px-4 py-2 text-sm")}>
            {t("delete")}
          </button>
        </form>
      </Modal>
    </>
  );
}
