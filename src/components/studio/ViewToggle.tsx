"use client";

import { useTranslations } from "next-intl";
import { Icon } from "@/components/studio/coach/icons";
import { SegmentedTrack } from "@/components/studio/SegmentedTrack";
import { cn } from "@/lib/utils";

export type View = "grid" | "list";

/** Grid/list switch — the same pill everywhere a list can be browsed either way. */
export function ViewToggle({
  view,
  onChangeAction,
}: {
  view: View;
  onChangeAction: (view: View) => void;
}) {
  const common = useTranslations("Studio.common");

  return (
    <SegmentedTrack value={view} className="flex">
      <button
        type="button"
        aria-label={common("viewGrid")}
        aria-pressed={view === "grid"}
        onClick={() => onChangeAction("grid")}
        className={cn(
          "relative z-10 rounded-full p-2 transition-colors",
          view === "grid" ? "text-accent-ink" : "text-cream/50 hover:text-cream",
        )}
      >
        <Icon name="grid" className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label={common("viewList")}
        aria-pressed={view === "list"}
        onClick={() => onChangeAction("list")}
        className={cn(
          "relative z-10 rounded-full p-2 transition-colors",
          view === "list" ? "text-accent-ink" : "text-cream/50 hover:text-cream",
        )}
      >
        <Icon name="list" className="h-4 w-4" />
      </button>
    </SegmentedTrack>
  );
}
