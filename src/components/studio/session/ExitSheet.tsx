"use client";

import { useState } from "react";
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

  async function run(kind: "discard" | "skip", action: () => Promise<void>) {
    setBusy(kind);
    setFailed(false);
    try {
      await action();
    } catch {
      setFailed(true);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Modal open={open} onCloseAction={onCloseAction} title={t("exitTitle")} width="26rem">
      <div className="space-y-5">
        <p className={muted}>{t("exitLead", { done: doneCount, total: totalCount })}</p>

        <div className="flex flex-col gap-2">
          <button type="button" onClick={onSubmit} className={cn(buttonPrimary, "w-full")}>
            {t("submitWorkout")}
          </button>
          <button type="button" onClick={onLeave} className={cn(buttonGhost, "w-full")}>
            {t("leaveForLater")}
          </button>
        </div>

        {failed && (
          <p role="alert" className="text-sm text-silk">
            {t("saveFailed")}
          </p>
        )}

        <div className="space-y-3 border-t border-cream/10 pt-4">
          {confirmingDiscard ? (
            <div className="space-y-2">
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
                  onClick={() => setConfirmingDiscard(false)}
                  className={cn(buttonGhost, "px-5 py-2.5 text-sm")}
                >
                  {t("keepLogs")}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
              <button
                type="button"
                onClick={() => setConfirmingDiscard(true)}
                className="font-sans text-xs text-cream/55 underline decoration-cream/25 underline-offset-4 transition-colors hover:text-cream"
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
