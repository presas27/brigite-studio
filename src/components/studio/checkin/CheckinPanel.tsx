"use client";

import { useState } from "react";
import { MorphHeight } from "../MorphHeight";
import { SegmentedTrack } from "../SegmentedTrack";
import { Icon, type IconName } from "../coach/icons";
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
 * Two views of the same week, one card. The toggle sits above the card on the
 * same edge as the submit button, so the whole panel has a single right margin.
 *
 * Both views stay mounted and the inactive one is hidden: the form is
 * uncontrolled, and unmounting it to peek at last week would throw away
 * whatever had been typed.
 */
export function CheckinPanel({
  formLabel,
  historyLabel,
  form,
  history,
}: {
  formLabel: string;
  historyLabel: string;
  form: React.ReactNode;
  history: React.ReactNode;
}) {
  const [view, setView] = useState<View>("form");

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
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
      <MorphHeight contentKey={view}>
        <div hidden={view !== "form"}>{form}</div>
        <div hidden={view !== "history"}>{history}</div>
      </MorphHeight>
    </div>
  );
}
