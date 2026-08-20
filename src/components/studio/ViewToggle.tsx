"use client";

import { useTranslations } from "next-intl";
import { Icon } from "@/components/studio/coach/icons";
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
    <div className="flex items-center gap-1 rounded-full bg-cream/5 p-1 ring-1 ring-cream/10">
      <button
        type="button"
        aria-label={common("viewGrid")}
        aria-pressed={view === "grid"}
        onClick={() => onChangeAction("grid")}
        className={cn(
          "rounded-full p-2 transition-colors",
          view === "grid" ? "bg-caramel/20 text-accent-ink" : "text-cream/50 hover:text-cream",
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
          "rounded-full p-2 transition-colors",
          view === "list" ? "bg-caramel/20 text-accent-ink" : "text-cream/50 hover:text-cream",
        )}
      >
        <Icon name="list" className="h-4 w-4" />
      </button>
    </div>
  );
}
