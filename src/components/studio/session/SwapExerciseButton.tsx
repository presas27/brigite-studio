"use client";

import { useDeferredValue, useState, useTransition } from "react";
import { useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Icon } from "@/components/studio/coach/icons";
import { ExerciseThumb } from "@/components/studio/library/ExerciseThumb";
import { Modal } from "@/components/studio/Modal";
import { buttonGhost, buttonPrimary, eyebrow, field } from "@/components/studio/theme";
import type { ItemSwap } from "@/lib/studio/types";
import { cn } from "@/lib/utils";

/**
 * "Swap exercise" on the set in front of her, and the picker behind it.
 *
 * The swap is for this session only — the plan the coach wrote is untouched,
 * and next week the slot asks for the original again. The picker is live: the
 * options come straight off the deployment as she types, since the library is
 * two thousand movements and none of them belong in the page that opens a
 * workout. With nothing typed it suggests the movements nearest the one she is
 * replacing, and the one the coach prescribed when this slot was already
 * swapped once, so undoing a swap is a tap and not a search.
 */
export function SwapExerciseButton({
  assignmentId,
  itemId,
  exerciseName,
  replaces,
  coached,
  onSwapAction,
}: {
  assignmentId: string;
  itemId: string;
  exerciseName: string;
  /** The prescribed exercise, when this slot has already been swapped. */
  replaces: ItemSwap | undefined;
  /** Whether a coach will hear about it: decides how the note is labelled. */
  coached: boolean;
  onSwapAction: (input: { exerciseId: string; exerciseName: string; note: string }) => Promise<void>;
}) {
  const t = useTranslations("Studio.session");
  const common = useTranslations("Studio.common");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<{ id: string; name: string } | null>(null);
  const [note, setNote] = useState("");
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  // Typing runs ahead of the subscription: the field stays responsive and the
  // list catches up, rather than a new query being opened per keystroke.
  const search = useDeferredValue(query);
  const options = useQuery(
    api.plan.swapOptions,
    open ? { assignmentId: assignmentId as Id<"assignments">, itemId, search } : "skip",
  );

  function openPicker() {
    setQuery("");
    setPicked(null);
    setNote("");
    setFailed(false);
    setOpen(true);
  }

  function confirm() {
    if (!picked) return;
    setFailed(false);
    startTransition(async () => {
      try {
        await onSwapAction({ exerciseId: picked.id, exerciseName: picked.name, note });
        setOpen(false);
      } catch {
        setFailed(true);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={openPicker}
        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 font-sans text-xs font-medium text-cream/50 transition-colors hover:bg-cream/8 hover:text-cream"
      >
        <Icon name="swap" className="h-3.5 w-3.5" />
        {t("swapExercise")}
      </button>

      <Modal
        open={open}
        onCloseAction={() => setOpen(false)}
        title={t("swapTitle", { name: exerciseName })}
        lead={coached ? t("swapLeadCoached") : t("swapLead")}
        width="40rem"
      >
        <div className="relative">
          <Icon
            name="search"
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-cream/40"
          />
          <input
            autoFocus
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("swapSearch")}
            aria-label={t("swapSearch")}
            className={cn(field, "py-2.5 pl-9 text-sm")}
          />
        </div>
        {options === undefined ? (
          <p className="mt-6 font-sans text-sm text-cream/55">{t("swapLoading")}</p>
        ) : options.length === 0 ? (
          <p className="mt-6 font-sans text-sm text-cream/55">{t("swapNoResults")}</p>
        ) : (
          <>
            {!search.trim() && <p className={cn(eyebrow, "mt-4")}>{t("swapSuggested")}</p>}
            <ul
              role="listbox"
              aria-label={t("swapSearch")}
              className="mt-3 grid max-h-[40vh] grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3"
            >
              {options.map((option) => {
                const selected = picked?.id === option.id;
                const original = replaces?.exerciseId === option.id;
                return (
                  <li key={option.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => setPicked({ id: option.id, name: option.name })}
                      className={cn(
                        "relative w-full rounded-[1rem] bg-cream/[0.04] p-2 text-left ring-1 transition",
                        selected ? "ring-2 ring-accent-ink" : "ring-cream/10 hover:ring-caramel/50",
                      )}
                    >
                      <ExerciseThumb videoUrl={option.videoUrl} className="aspect-[3/2] w-full" />
                      <span className="mt-2 block truncate px-1 font-sans text-sm font-semibold text-cream">
                        {option.name}
                      </span>
                      {original && (
                        <span className="absolute top-3 right-3 rounded-full bg-accent-fill px-2 py-0.5 font-sans text-[0.65rem] leading-none font-semibold text-ink">
                          {t("swapOriginal")}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        <label className="mt-5 block space-y-1.5">
          <span className={eyebrow}>{coached ? t("swapNoteCoached") : t("swapNote")}</span>
          <textarea
            rows={2}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={t("swapNotePlaceholder")}
            className={cn(field, "resize-y text-sm")}
          />
        </label>

        {failed && (
          <p role="alert" className="mt-3 text-sm text-silk">
            {t("saveFailed")}
          </p>
        )}

        <div className="mt-5 flex items-center justify-end gap-2 border-t border-cream/10 pt-4">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className={cn(buttonGhost, "px-4 py-2 text-sm")}
          >
            {common("cancel")}
          </button>
          <button
            type="button"
            disabled={!picked || pending}
            onClick={confirm}
            className={cn(buttonPrimary, "px-5 py-2 text-sm")}
          >
            {pending ? t("swapping") : picked ? t("swapConfirm", { name: picked.name }) : t("swapPick")}
          </button>
        </div>
      </Modal>
    </>
  );
}
