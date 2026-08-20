import type { AssignmentStatus } from "@/lib/studio/types";
import { cn } from "@/lib/utils";

/**
 * A session's status as a chip.
 *
 * Same three colours the calendar uses — gold happened, red was missed,
 * neutral is still ahead — so a card, a calendar tape and a list row all say
 * the same thing the same way, and the aluna only has to learn it once.
 */
const TONE: Record<AssignmentStatus, string> = {
  done: "bg-caramel/15 text-accent-ink ring-caramel/25",
  scheduled: "bg-cream/5 text-cream/70 ring-cream/10",
  skipped: "bg-silk/[0.14] text-cream/60 ring-silk/25",
};

export function StatusChip({
  status,
  label,
  className,
}: {
  status: AssignmentStatus;
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 font-sans text-xs ring-1",
        TONE[status],
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          status === "done" ? "bg-caramel" : status === "skipped" ? "bg-silk" : "bg-cream/40",
        )}
      />
      {label}
    </span>
  );
}
