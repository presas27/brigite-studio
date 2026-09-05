"use client";

import { useEffect, useId, useRef } from "react";
import { useTranslations } from "next-intl";
import { motion, useReducedMotion } from "motion/react";
import { Icon } from "./coach/icons";
import { heading, muted } from "./theme";
import { cn } from "@/lib/utils";

type ModalProps = {
  open: boolean;
  /** Called on ESC, on the backdrop, and by the close button. */
  onCloseAction: () => void;
  title: string;
  /** One line under the title. Skip it when the title is self-evident. */
  lead?: string;
  /** Panel width. Always capped to the viewport. */
  width?: string;
  children: React.ReactNode;
};

/**
 * Native `<dialog>` wrapper. Focus trapping, ESC and the backdrop come from the
 * platform — no modal library. The body only renders while open, so forms
 * inside always start from fresh `defaultValue`s.
 */
export function Modal({ open, onCloseAction, title, lead, width = "32rem", children }: ModalProps) {
  const common = useTranslations("Studio.common");
  const reduceMotion = useReducedMotion();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={onCloseAction}
      onClick={(event) => {
        if (event.target === dialogRef.current) onCloseAction();
      }}
      style={{ width: `min(${width}, calc(100vw - 2rem))` }}
      className="m-auto max-h-[85vh] overflow-y-auto rounded-[1.25rem] border-0 bg-ink-lift p-6 text-cream ring-1 ring-cream/10 backdrop:bg-ink/70 backdrop:backdrop-blur-sm sm:p-7"
    >
      {open && (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 420, damping: 32 }}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 id={titleId} className={cn(heading, "text-xl")}>
                {title}
              </h2>
              {lead && <p className={cn(muted, "mt-1")}>{lead}</p>}
            </div>
            <button
              type="button"
              onClick={onCloseAction}
              aria-label={common("close")}
              className="shrink-0 text-cream/50 transition-colors hover:text-cream"
            >
              <Icon name="close" className="h-5 w-5" />
            </button>
          </div>
          <motion.div
            key={title}
            initial={reduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="mt-5"
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </dialog>
  );
}
