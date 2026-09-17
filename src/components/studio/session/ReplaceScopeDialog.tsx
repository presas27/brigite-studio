"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/studio/coach/icons";
import { Modal } from "@/components/studio/Modal";
import { buttonGhost, buttonPrimary, muted } from "@/components/studio/theme";
import { cn } from "@/lib/utils";

export type ReplaceScope = "today" | "forever";

/**
 * After a replacement is picked: today (this session only) or forever (the
 * plan itself). Same dialog for the coach editing a client's plan and the
 * client mid-session — either person may choose either scope.
 */
export function ReplaceScopeDialog({
  open,
  fromName,
  toName,
  pending,
  failed,
  onConfirmAction,
  onCloseAction,
}: {
  open: boolean;
  fromName: string;
  toName: string;
  pending: boolean;
  failed: boolean;
  onConfirmAction: (scope: ReplaceScope) => void;
  onCloseAction: () => void;
}) {
  const t = useTranslations("Studio.session");
  const common = useTranslations("Studio.common");
  const [scope, setScope] = useState<ReplaceScope>("today");

  return (
    <Modal
      open={open}
      onCloseAction={onCloseAction}
      title={t("replaceExercise")}
      lead={t("replaceLead", { from: fromName, to: toName })}
      width="28rem"
    >
      <div role="radiogroup" aria-label={t("replaceExercise")} className="space-y-2">
        <ScopeOption
          selected={scope === "today"}
          title={t("replaceToday")}
          hint={t("replaceTodayHint")}
          onSelect={() => setScope("today")}
        />
        <ScopeOption
          selected={scope === "forever"}
          title={t("replaceForever")}
          hint={t("replaceForeverHint")}
          onSelect={() => setScope("forever")}
        />
      </div>

      {failed && (
        <p role="alert" className="mt-3 text-sm text-silk">
          {t("saveFailed")}
        </p>
      )}

      <div className="mt-5 flex items-center justify-end gap-2 border-t border-cream/10 pt-4">
        <button
          type="button"
          onClick={onCloseAction}
          className={cn(buttonGhost, "px-4 py-2 text-sm")}
        >
          {common("cancel")}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => onConfirmAction(scope)}
          className={cn(buttonPrimary, "px-5 py-2 text-sm")}
        >
          {pending ? t("replaceConfirming") : t("replaceConfirm")}
        </button>
      </div>
    </Modal>
  );
}

function ScopeOption({
  selected,
  title,
  hint,
  onSelect,
}: {
  selected: boolean;
  title: string;
  hint: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "flex w-full items-start gap-3 rounded-[1rem] px-3.5 py-3 text-left ring-1 transition",
        selected
          ? "bg-caramel/15 ring-accent-ink/60"
          : "ring-cream/10 hover:bg-cream/5 hover:ring-cream/20",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ring-1",
          selected ? "ring-accent-ink" : "ring-cream/35",
        )}
      >
        {selected && <span className="h-2 w-2 rounded-full bg-accent-ink" />}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block font-sans text-sm font-semibold",
            selected ? "text-accent-ink" : "text-cream",
          )}
        >
          {title}
        </span>
        <span className={cn(muted, "mt-0.5 block text-xs")}>{hint}</span>
      </span>
      {selected && <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-accent-ink" />}
    </button>
  );
}
