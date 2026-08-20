"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
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
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onCloseAction}
      onClick={(event) => {
        if (event.target === dialogRef.current) onCloseAction();
      }}
      style={{ width: `min(${width}, calc(100vw - 2rem))` }}
      className="m-auto max-h-[85vh] overflow-y-auto rounded-[1.25rem] border-0 bg-ink-lift p-6 text-cream ring-1 ring-cream/10 backdrop:bg-ink/70 backdrop:backdrop-blur-sm sm:p-7"
    >
      {open && (
        <>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className={cn(heading, "text-xl")}>{title}</h2>
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
          <div className="mt-5">{children}</div>
        </>
      )}
    </dialog>
  );
}
