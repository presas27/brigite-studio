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
}) {
  const t = useTranslations("Studio.session");
  const common = useTranslations("Studio.common");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(note);
  const [pending, startTransition] = useTransition();
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!note) return;
      gsap.matchMedia().add("(prefers-reduced-motion: no-preference)", () => {
        // The block grows into place the first time it appears, so a note that
        // has just been saved is visibly the thing that changed.
        gsap.fromTo(
          "[data-note-block]",
          { autoAlpha: 0, y: -6 },
          { autoAlpha: 1, y: 0, duration: 0.28, ease: "power2.out" },
        );
      });
    },
    { dependencies: [note], scope },
  );

  return (
    <div ref={scope} className="space-y-2">
      <div className="flex flex-wrap items-center gap-1">
        {aside}
        <button
          type="button"
          onClick={() => {
            setDraft(note);
            setOpen(true);
          }}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 font-sans text-xs font-medium transition-colors",
            note
              ? "bg-caramel/15 text-accent-ink hover:bg-caramel/25"
              : "text-cream/50 hover:bg-cream/8 hover:text-cream",
          )}
        >
          <Icon name={note ? "checkin" : "message"} className="h-3.5 w-3.5" />
          {note ? t("editNote") : t("addNote")}
        </button>
      </div>

      {note && (
        <p
          data-note-block
          className="rounded-[0.85rem] border-l-2 border-accent-ink/60 bg-cream/5 px-3 py-2 text-xs leading-relaxed whitespace-pre-line text-cream/75 md:text-sm"
        >
          {note}
        </p>
      )}

      <Modal
        open={open}
        onCloseAction={() => setOpen(false)}
        title={t("noteTitle", { name: exerciseName })}
        lead={t("notePrivacy")}
        width="28rem"
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            startTransition(async () => {
              await onSaveAction(draft);
              setOpen(false);
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
    </div>
  );
}
