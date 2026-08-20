"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { archiveExerciseAction } from "@/app/app/coach/exercicios/actions";
import { ModalCloseProvider } from "@/components/studio/AddModal";
import { Icon } from "@/components/studio/coach/icons";
import { Modal } from "@/components/studio/Modal";
import { buttonDanger } from "@/components/studio/theme";
import type { Exercise } from "@/lib/studio/types";
import { cn } from "@/lib/utils";
import { EditExerciseForm } from "./EditExerciseForm";

/**
 * Everything editable about one exercise — name, cues, tags, demo, and
 * archiving it — behind one control in the masthead of its page. The page
 * itself stays what Sara opened it for: the video and the cues.
 */
export function EditExerciseModal({ exercise }: { exercise: Exercise }) {
  const t = useTranslations("Studio.library");
  const common = useTranslations("Studio.common");
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 font-sans text-xs font-semibold text-cream/70 ring-1 ring-cream/15 transition-colors hover:bg-cream/5 hover:text-cream hover:ring-cream/30"
      >
        <Icon name="settings" className="h-4 w-4" />
        {common("edit")}
      </button>

      <Modal
        open={open}
        onCloseAction={close}
        title={t("editTitle")}
        lead={exercise.name}
        width="34rem"
      >
        <ModalCloseProvider close={close}>
          <EditExerciseForm exercise={exercise} />
        </ModalCloseProvider>

        {/* Archiving navigates back to the library, so the dialog goes with the page. */}
        <form
          action={archiveExerciseAction.bind(null, exercise.id)}
          className="mt-5 flex justify-end border-t border-cream/10 pt-4"
        >
          <button type="submit" className={cn(buttonDanger, "text-xs")}>
            {t("archive")}
          </button>
        </form>
      </Modal>
    </>
  );
}
