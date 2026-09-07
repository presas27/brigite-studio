"use client";

import { useState } from "react";
import { MorphHeight } from "../MorphHeight";
import { SegmentedTrack } from "../SegmentedTrack";
import { Icon, type IconName } from "../coach/icons";
import { heading } from "../theme";
import { cn } from "@/lib/utils";

type View = "form" | "history";

function ViewTab({
  icon,
  label,
  active,
  onSelect,
}: {
  icon: IconName;
  label: string;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={cn(
        "relative z-10 inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors",
        active ? "text-on-primary" : "text-cream/55 hover:text-cream",
      )}
    >
      <Icon name={icon} className="h-[1.15rem] w-[1.15rem]" />
    </button>
  );
}

/**
 * Title, lead and the form/history switch share one row so the toggle sits
 * where the page action always sits — top right, against the display face —
 * instead of floating in the gap above the card.
 */
export function CheckinPanel({
  title,
  lead,
  formLabel,
  historyLabel,
  form,
  history,
}: {
  title: string;
  lead?: string;
  formLabel: string;
  historyLabel: string;
  form: React.ReactNode;
  history: React.ReactNode;
}) {
  const [view, setView] = useState<View>("form");

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className={cn(heading, "text-[1.75rem] sm:text-[2.25rem]")}>{title}</h1>
          {lead && <p className="mt-2 max-w-prose text-sm leading-relaxed text-cream/60">{lead}</p>}
        </div>
        <div className="mt-1 shrink-0">
          <SegmentedTrack value={view} thumbClassName="bg-butter">
            <ViewTab
              icon="checkin"
              label={formLabel}
              active={view === "form"}
              onSelect={() => setView("form")}
            />
            <ViewTab
              icon="history"
              label={historyLabel}
              active={view === "history"}
              onSelect={() => setView("history")}
            />
          </SegmentedTrack>
        </div>
      </div>
      <MorphHeight contentKey={view}>
        <div hidden={view !== "form"}>{form}</div>
        <div hidden={view !== "history"}>{history}</div>
      </MorphHeight>
    </div>
  );
}
