"use client";

import { useDeferredValue, useEffect, useRef, useState, useTransition } from "react";
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
import { youtubeId } from "@/lib/youtube";

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
  compact = false,
  eager = false,
}: {
  assignmentId: string;
  itemId: string;
  exerciseName: string;
  /** The prescribed exercise, when this slot has already been swapped. */
  replaces: ItemSwap | undefined;
  /** Whether a coach will hear about it: decides how the note is labelled. */
  coached: boolean;
  onSwapAction: (input: { exerciseId: string; exerciseName: string; note: string }) => Promise<void>;
  /** Icon-only trigger, for the player's header. */
  compact?: boolean;
  /**
   * Subscribe to the suggestions before the picker opens. On for the exercise
   * in front of her — the one she is likely to swap — so the picker opens
   * already filled instead of animating in around a "searching…" line and
   * then reflowing when the grid lands. Off in the sheet, where one
   * subscription per exercise would be paid for pickers nobody opens.
   */
  eager?: boolean;
}) {
  const t = useTranslations("Studio.session");
  const common = useTranslations("Studio.common");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<{ id: string; name: string } | null>(null);
  const [note, setNote] = useState("");
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();
  const searchRef = useRef<HTMLInputElement>(null);

  // Typing runs ahead of the subscription: the field stays responsive and the
  // list catches up, rather than a new query being opened per keystroke.
  const search = useDeferredValue(query);
  const options = useQuery(
    api.plan.swapOptions,
    open || eager ? { assignmentId: assignmentId as Id<"assignments">, itemId, search } : "skip",
  );

  // The search field takes focus only where focusing it costs nothing. On a
  // phone, focus means the keyboard, and the keyboard sliding up under a
  // modal that is still animating in — covering the suggestions she came
  // for — is the single worst frame of the whole picker.
  useEffect(() => {
    if (!open) return;
    if (window.matchMedia("(pointer: fine)").matches) searchRef.current?.focus();
  }, [open]);

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
        aria-label={t("swapExercise")}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full font-sans text-xs font-medium text-cream/50 transition-colors hover:bg-cream/8 hover:text-cream",
          compact ? "p-2" : "px-2.5 py-1.5",
        )}
      >
        <Icon name="swap" className="h-3.5 w-3.5" />
        {!compact && t("swapExercise")}
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
            ref={searchRef}
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
            {/* A list, not a grid of cards: nearly every movement has no video
                yet, and a card whose picture is a plate is a card that shows
                less than a line does. A row carries the whole name and the
                tags that made it a suggestion; the thumbnail only when there
                is one. */}
            <ul
              role="listbox"
              aria-label={t("swapSearch")}
              className="mt-3 max-h-[44vh] space-y-1 overflow-y-auto pr-1"
            >
              {options.map((option) => {
                const selected = picked?.id === option.id;
                const original = replaces?.exerciseId === option.id;
                const thumb = option.videoUrl && youtubeId(option.videoUrl) ? option.videoUrl : null;
                return (
                  <li key={option.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => setPicked({ id: option.id, name: option.name })}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-[0.85rem] px-3 py-2.5 text-left ring-1 transition",
                        selected
                          ? "bg-caramel/15 ring-caramel/40"
                          : "ring-transparent hover:bg-cream/5 hover:ring-cream/10",
                      )}
                    >
                      {thumb && (
                        <ExerciseThumb videoUrl={thumb} className="h-10 w-14 shrink-0 rounded-[0.6rem]" />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block font-sans text-sm font-semibold leading-snug text-cream">
                          {option.name}
                        </span>
                        {(option.tags.length > 0 || original) && (
                          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-sans text-xs text-cream/45">
                            {original && (
                              <span className="font-semibold text-accent-ink">{t("swapOriginal")}</span>
                            )}
                            {option.tags.slice(0, 3).map((tag) => (
                              <span key={tag}>{tag}</span>
                            ))}
                          </span>
                        )}
                      </span>
                      <Icon
                        name="check"
                        className={cn("h-4 w-4 shrink-0 text-accent-ink transition-opacity", selected ? "opacity-100" : "opacity-0")}
                      />
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
