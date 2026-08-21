"use client";

import { createContext, useContext, useState } from "react";
import { Icon } from "./coach/icons";
import { Modal } from "./Modal";
import { buttonPrimary } from "./theme";
import { cn } from "@/lib/utils";

const CloseContext = createContext<() => void>(() => {});

/**
 * Lets the form inside an `AddModal` dismiss it once the server accepts.
 * Outside a modal it is a no-op, so the same form works inline.
 */
export function useModalClose(): () => void {
  return useContext(CloseContext);
}

/**
 * Hands a dialog's close function to whatever form is rendered inside it, so
 * the same form dismisses an add dialog and an edit dialog alike.
 */
export function ModalCloseProvider({
  close,
  children,
}: {
  close: () => void;
  children: React.ReactNode;
}) {
  return <CloseContext.Provider value={close}>{children}</CloseContext.Provider>;
}

/**
 * Adding anything, anywhere in the app, looks like this: a caramel pill
 * carrying a plus and the noun, opening a dialog with the fields that noun
 * actually needs. One shape for clients, exercises and workouts alike — the
 * fields differ, the gesture never does.
 */
export function AddModal({
  label,
  title,
  lead,
  width,
  compact = false,
  iconOnlyOnPhone = false,
  children,
}: {
  /** The noun being added — "Aluno", "Exercício". The plus supplies the verb. */
  label: string;
  title: string;
  lead?: string;
  width?: string;
  /**
   * Smaller pill, for a control that shares a row with other controls — the
   * topbar, or the plan's week nav — rather than heading a page.
   */
  compact?: boolean;
  /**
   * Drops the noun below `sm`, leaving the plus alone with the label as its
   * `aria-label`. For the topbar, where a full pill wrapped onto two lines and
   * made the bar taller than the content under it.
   */
  iconOnlyOnPhone?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={iconOnlyOnPhone ? label : undefined}
        className={cn(
          buttonPrimary,
          "whitespace-nowrap",
          compact ? "gap-1.5 px-4 py-2 text-xs" : "px-5 py-2.5",
          iconOnlyOnPhone && "px-2.5 sm:px-4",
        )}
      >
        <Icon name="plus" className="h-4 w-4" />
        <span className={iconOnlyOnPhone ? "hidden sm:inline" : undefined}>{label}</span>
      </button>

      <Modal open={open} onCloseAction={close} title={title} lead={lead} width={width}>
        <ModalCloseProvider close={close}>{children}</ModalCloseProvider>
      </Modal>
    </>
  );
}
