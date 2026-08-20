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
  children,
}: {
  /** The noun being added — "Aluno", "Exercício". The plus supplies the verb. */
  label: string;
  title: string;
  lead?: string;
  width?: string;
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
        className={cn(buttonPrimary, "px-5 py-2.5")}
      >
        <Icon name="plus" className="h-4 w-4" />
        {label}
      </button>

      <Modal open={open} onCloseAction={close} title={title} lead={lead} width={width}>
        <ModalCloseProvider close={close}>{children}</ModalCloseProvider>
      </Modal>
    </>
  );
}
