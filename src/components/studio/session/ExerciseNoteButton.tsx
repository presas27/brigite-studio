"use client";

import { useRef, useState, useTransition } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useTranslations } from "next-intl";
import { Modal } from "@/components/studio/Modal";
import { Icon } from "@/components/studio/coach/icons";
import { buttonGhost, field } from "@/components/studio/theme";
import { cn } from "@/lib/utils";

/**
 * "Add note" on an exercise, and the note once it exists.
 *
 * The note belongs to this session and not to the exercise: it is the client
 * saying what happened *today* — a shoulder that twinged, a band that was too
 * light — and next week's answer is a different note. Keyed by the assignment
 * and the snapshot's `itemId`, so last week's still says what it said.
 *
 * The saved note is rendered here, under the set information, rather than being
 * hidden behind the button that wrote it. A note the client cannot see is a note
 * they will write twice.
 */
export function ExerciseNoteButton({
  exerciseName,
  note,
  onSaveAction,
  aside,
  compact = false,
  coached,
  triggerClassName,
}: {
  exerciseName: string;
  /** The note as it stands. Empty means there is none yet. */
  note: string;
  /** Persists the note. An empty body clears it. */
  onSaveAction: (body: string) => Promise<void>;
  /**
   * Other controls for the same exercise, on the row with the button — the
   * swap, today. The saved note keeps the full width under the row.
   */
  aside?: React.ReactNode;
  /** Icon-only trigger, for the player's header where there is no room for a label. */
  compact?: boolean;
  /** Whether a coach reads the note: decides what the dialog promises about who sees it. */
  coached: boolean;
  /** Extra classes on the row holding the trigger (and `aside`) — never on the saved note. */
  triggerClassName?: string;
}) {
  const t = useTranslations("Studio.session");
  const common = useTranslations("Studio.common");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(note);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!note) return;
      gsap.matchMedia().add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          "[data-note-block]",
          { autoAlpha: 0, y: -6 },
          { autoAlpha: 1, y: 0, duration: 0.28, ease: "power2.out" },
        );
      });
    },
    { dependencies: [note], scope },
  );

  // The dialog is a sibling of the box, not a child: closed, a `<dialog>` is
  // `display: none` but still a DOM child, and a `space-y-*` box would count
  // it as the last one — putting its gap under the trigger row and floating
  // the icon 4px above whatever sits beside it.
  return (
    <>
      <div ref={scope}>
        <div
          className={cn("flex flex-wrap items-center gap-1", triggerClassName)}
        >
          {aside}
          <button
            type="button"
            onClick={() => {
              setDraft(note);
              setFailed(false);
              setOpen(true);
            }}
            aria-label={note ? t("editNote") : t("addNote")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full font-sans text-xs font-medium transition-colors",
              compact ? "p-2" : "px-2.5 py-1.5",
              note
                ? "bg-caramel/15 text-accent-ink hover:bg-caramel/25"
                : "text-cream/50 hover:bg-cream/8 hover:text-cream",
            )}
          >
            <Icon name={note ? "checkin" : "message"} className="h-3.5 w-3.5" />
            {!compact && (note ? t("editNote") : t("addNote"))}
          </button>
        </div>

        {!compact && note && (
          <p
            data-note-block
            className="mt-2 rounded-[0.85rem] border-l-2 border-accent-ink/60 bg-cream/5 px-3 py-2 text-xs leading-relaxed whitespace-pre-line text-cream/75 md:text-sm"
          >
            {note}
          </p>
        )}
      </div>

      <Modal
        open={open}
        onCloseAction={() => setOpen(false)}
        title={t("noteTitle", { name: exerciseName })}
        lead={coached ? t("notePrivacy") : t("notePrivacySolo")}
        width="28rem"
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setFailed(false);
            startTransition(async () => {
              try {
                await onSaveAction(draft);
                setOpen(false);
              } catch {
                setFailed(true);
              }
            });
          }}
          className="space-y-4"
        >
          <textarea
            name="body"
            rows={4}
            autoFocus
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={t("notePlaceholder")}
            className={cn(field, "resize-y")}
          />
          {failed && (
            <p role="alert" className="text-sm text-silk">
              {t("saveFailed")}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className={cn(buttonGhost, "px-4 py-2 text-sm")}
            >
              {common("cancel")}
            </button>
            <button
              type="submit"
              disabled={pending}
              className={cn(buttonGhost, "px-4 py-2 text-sm")}
            >
              {pending ? common("saving") : t("saveNote")}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
