"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { FieldState } from "@/app/app/coach/exercicios/actions";
import { SubmitButton } from "../SubmitButton";
import { eyebrow, muted, surface } from "../theme";
import { cn } from "@/lib/utils";

const initial: FieldState = { status: "idle" };

/**
 * A panel that reads as content and edits in place.
 *
 * The exercise page is the one screen Sara opens to fix a cue or paste a link,
 * and a modal for two fields is a wall between her and the text she is looking
 * at. So the panel is the form: click the words, they become inputs, save or
 * cancel puts them back.
 *
 * Read mode is a `button` and not a `div` with a handler — it is the control
 * that opens the editor, so it has to be reachable by keyboard and announce
 * itself as one thing to press.
 */
export function InlineEditPanel({
  label,
  action,
  read,
  edit,
  hint,
  errorText,
  interactiveRead = true,
  showEdit = true,
  className,
}: {
  label: string;
  action: (state: FieldState, formData: FormData) => Promise<FieldState>;
  /** What the panel shows when nobody is editing. */
  read: React.ReactNode;
  /** The fields, rendered inside the form. */
  edit: React.ReactNode;
  /** One line under the fields, explaining the rule the editor follows. */
  hint?: string;
  /** Translated message for a refused save — a string, not a callback. */
  errorText?: { url?: string };
  /**
   * Whether clicking the read area opens the editor. False when `read` contains
   * its own controls — a video player, a link — which cannot live inside a
   * button.
   */
  interactiveRead?: boolean;
  /** Hide the header Edit control when the read surface itself opens the editor. */
  showEdit?: boolean;
  className?: string;
}) {
  const common = useTranslations("Studio.common");
  const library = useTranslations("Studio.library");
  const [editing, setEditing] = useState(false);
  /**
   * Bumped on every open and cancel so the form remounts. The fields are
   * uncontrolled — `defaultValue` from the row — and React would otherwise keep
   * the DOM node, so a cancelled edit would still be sitting there on reopen.
   */
  const [session, setSession] = useState(0);
  const firstField = useRef<HTMLDivElement>(null);

  const [state, formAction] = useActionState(async (prev: FieldState, formData: FormData) => {
    const next = await action(prev, formData);
    if (next.status === "ok") setEditing(false);
    return next;
  }, initial);

  /** Editing starts where the eyes already are: on the first field, not the panel. */
  useEffect(() => {
    if (!editing) return;
    firstField.current?.querySelector<HTMLElement>("input, textarea")?.focus();
  }, [editing, session]);

  function open() {
    setSession((count) => count + 1);
    setEditing(true);
  }

  function cancel() {
    setSession((count) => count + 1);
    setEditing(false);
  }

  const message = state.status === "error" ? errorText?.[state.reason] : undefined;

  if (!editing) {
    return (
      <div className={cn(surface, "p-5", className)}>
        <div className="flex items-baseline justify-between gap-3">
          <p className={eyebrow}>{label}</p>
          {showEdit && (
            <button
              type="button"
              onClick={open}
              className="cursor-pointer font-sans text-xs font-medium text-cream/45 underline decoration-cream/20 underline-offset-4 transition-colors hover:text-cream"
            >
              {common("edit")}
            </button>
          )}
        </div>
        {interactiveRead ? (
          <button
            type="button"
            onClick={open}
            className="group mt-3 block w-full cursor-pointer rounded-[0.85rem] text-left outline-none focus-visible:ring-2 focus-visible:ring-accent-ink/70"
          >
            {read}
            {showEdit && (
              <span className="mt-3 block font-sans text-xs text-cream/30 transition-colors group-hover:text-cream/60">
                {library("cuesEditHint")}
              </span>
            )}
          </button>
        ) : (
          <div className="mt-3">{read}</div>
        )}
      </div>
    );
  }

  return (
    <div className={cn(surface, "p-5", className)}>
      <p className={eyebrow}>{label}</p>
      {/* Escape belongs on the form, not the document: it should abandon this
          editor and nothing else on the page. */}
      <form
        key={session}
        action={formAction}
        onKeyDown={(event) => {
          if (event.key === "Escape") cancel();
        }}
        className="mt-3 space-y-3"
      >
        <div ref={firstField} className="space-y-3">
          {edit}
        </div>
        {hint && <p className="font-sans text-xs text-cream/45">{hint}</p>}
        {message && <p className="font-sans text-xs text-silk">{message}</p>}
        <div className="flex flex-wrap items-center gap-2">
          <SubmitButton pendingLabel={common("saving")} className="px-5 py-2.5">
            {common("save")}
          </SubmitButton>
          <button
            type="button"
            onClick={cancel}
            className="inline-flex items-center justify-center rounded-full px-4 py-2.5 font-sans text-sm font-semibold text-cream/60 transition-colors hover:bg-cream/5 hover:text-cream"
          >
            {common("cancel")}
          </button>
        </div>
      </form>
    </div>
  );
}

/** Shared empty line for a panel with nothing in it yet. */
export function PanelEmpty({ children }: { children: React.ReactNode }) {
  return <p className={muted}>{children}</p>;
}
