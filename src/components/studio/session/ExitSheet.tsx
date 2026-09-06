"use client";

import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useTranslations } from "next-intl";
import { Modal } from "../Modal";
import { buttonDanger, buttonGhost, buttonPrimary, muted } from "../theme";
import { cn } from "@/lib/utils";

/**
 * What happens when she taps the cross. There is never a state this player can
 * reach with no way out, and leaving is never the same as losing the work:
 *
 * - **Submit** goes to the effort question with whatever is logged, half a
 *   session included. A workout cut short is still a workout that happened.
 * - **Leave** changes nothing at all — the sets are already saved; she comes
 *   back and carries on.
 * - **Discard** throws the sets away and puts the session back to untouched.
 *   Destructive, so it asks twice.
 * - **Couldn't train** is the existing skip: a fact about the week Sara needs
 *   to see, which is a different thing from a session logged and dropped.
 */
export function ExitSheet({
  open,
  onCloseAction,
  doneCount,
  totalCount,
  onSubmit,
  onLeave,
  onDiscard,
  onSkip,
}: {
  open: boolean;
  onCloseAction: () => void;
  doneCount: number;
  totalCount: number;
  onSubmit: () => void;
  onLeave: () => void;
  onDiscard: () => Promise<void>;
  onSkip: () => Promise<void>;
}) {
  const t = useTranslations("Studio.session");
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  const [busy, setBusy] = useState<"discard" | "skip" | null>(null);
  const [failed, setFailed] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);
  // The row's height the moment before it swaps content, so the tween starts
  // from where the eye was. `null` outside a swap: the first render and the
  // reset on re-open must not animate.
  const fromHeightRef = useRef<number | null>(null);

  // Re-opening the sheet must never land on the armed destructive state. This
  // is React's "adjust state when a prop changes" pattern rather than an
  // effect: it settles before paint, so the armed row is never rendered once.
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    setConfirmingDiscard(false);
    setBusy(null);
    setFailed(false);
  }

  function arm(next: boolean) {
    fromHeightRef.current = rowRef.current?.getBoundingClientRect().height ?? null;
    setConfirmingDiscard(next);
  }

  // The bottom row swaps between the two quiet links and the armed pair. Its
  // height is tweened for real — not with a transform — because the dialog is
  // centred by its margins, and only a real height change lets it re-centre
  // frame by frame instead of jumping to its new middle. Same pattern as the
  // cues panel in `ExerciseStage`.
  //
  // The row clips only while it moves. Left on, `overflow: hidden` trims the
  // buttons' 1px ring along their bottom edge — the pills are outline-only, so
  // on paper that read as the buttons being cut off — and would swallow the
  // focus ring too. Cleared with the height when the tween lands.
  useGSAP(
    () => {
      const row = rowRef.current;
      const from = fromHeightRef.current;
      if (!row || from == null) return;
      fromHeightRef.current = null;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      gsap.set(row, { clearProps: "height,overflow" });
      const to = row.getBoundingClientRect().height;
      gsap.fromTo(
        row,
        { height: from, overflow: "hidden" },
        {
          height: to,
          duration: 0.24,
          ease: "power2.out",
          onComplete: () => gsap.set(row, { clearProps: "height,overflow" }),
        },
      );
      gsap.fromTo(
        row.firstElementChild,
        { autoAlpha: 0, y: 4 },
        { autoAlpha: 1, y: 0, duration: 0.2, delay: 0.06, ease: "power2.out" },
      );
    },
    { dependencies: [confirmingDiscard] },
  );

  // Busy is released only on failure. Success means the player is on its way
  // out — to the summary, or off the route — and the sheet's job is to hold
  // still until it goes, not to hand the buttons back for the last frames.
  async function run(kind: "discard" | "skip", action: () => Promise<void>) {
    setBusy(kind);
    setFailed(false);
    try {
      await action();
    } catch {
      setFailed(true);
      setBusy(null);
    }
  }

  // The bordeaux button is the one she is being invited to press, so it has
  // to be the honest one. With sets on the board, submit; with nothing logged
  // there is nothing to submit yet, and "leave and come back" is the answer
  // — submitting an empty session is still there, one tier down.
  const nothingLogged = doneCount === 0;
  const leave = (
    <button
      key="leave"
      type="button"
      disabled={busy != null}
      onClick={onLeave}
      className={cn(nothingLogged ? buttonPrimary : buttonGhost, "w-full")}
    >
      {t("leaveForLater")}
    </button>
  );
  const submit = (
    <button
      key="submit"
      type="button"
      disabled={busy != null}
      onClick={onSubmit}
      className={cn(nothingLogged ? buttonGhost : buttonPrimary, "w-full")}
    >
      {t("submitWorkout")}
    </button>
  );

  return (
    <Modal open={open} onCloseAction={onCloseAction} title={t("exitTitle")} width="26rem">
      <div className="space-y-5">
        <p className={muted}>{t("exitLead", { done: doneCount, total: totalCount })}</p>

        <div className="flex flex-col gap-2">{nothingLogged ? [leave, submit] : [submit, leave]}</div>

        {failed && (
          <p role="alert" className="text-sm text-silk">
            {t("saveFailed")}
          </p>
        )}

        <div ref={rowRef} className="border-t border-cream/10">
          {confirmingDiscard ? (
            <div className="space-y-2 pt-4">
              <p className="text-center text-sm text-cream/70">{t("discardConfirm")}</p>
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  disabled={busy != null}
                  onClick={() => void run("discard", onDiscard)}
                  className={buttonDanger}
                >
                  {busy === "discard" ? t("discarding") : t("discardYes")}
                </button>
                <button
                  type="button"
                  disabled={busy != null}
                  onClick={() => arm(false)}
                  className={cn(buttonGhost, "px-5 py-2.5 text-sm")}
                >
                  {t("keepLogs")}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 pt-4">
              <button
                type="button"
                disabled={busy != null}
                onClick={() => arm(true)}
                className="font-sans text-xs text-cream/55 underline decoration-cream/25 underline-offset-4 transition-colors hover:text-cream disabled:opacity-50"
              >
                {t("discardWorkout")}
              </button>
              <button
                type="button"
                disabled={busy != null}
                onClick={() => void run("skip", onSkip)}
                className="font-sans text-xs text-cream/55 underline decoration-cream/25 underline-offset-4 transition-colors hover:text-cream disabled:opacity-50"
              >
                {busy === "skip" ? t("skipping") : t("skip")}
              </button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
