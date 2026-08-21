"use client";

import type { SessionStep } from "@/lib/studio/session-queue";
import { cn } from "@/lib/utils";

/**
 * The whole session as a row of blocks — one per set, grouped by exercise and
 * spaced wider at a block boundary.
 *
 * This is what makes a change of set and a change of exercise legible without a
 * word of explanation: within an exercise the fill just steps along; at a new
 * exercise it jumps a visible gap. It doubles as the way into the session list,
 * which is why it is rendered inside a button — the map of the session is the
 * obvious thing to press when you want to see the map of the session.
 */
export function StepProgress({
  steps,
  currentIndex,
  isLogged,
  variant = "segments",
}: {
  steps: SessionStep[];
  currentIndex: number;
  isLogged: (step: SessionStep) => boolean;
  /**
   * `segments` is the map — one block per set, readable at header width.
   * `line` is the same progress with the detail thrown away: a single hairline
   * filled to where she is. On a phone seventeen blocks three pixels wide are
   * a texture, not a map, so the panel uses the line and the list carries the
   * detail.
   */
  variant?: "segments" | "line";
}) {
  if (variant === "line") {
    const percent = steps.length === 0 ? 0 : ((currentIndex + 1) / steps.length) * 100;
    return (
      <span aria-hidden className="block h-[3px] w-full overflow-hidden rounded-full bg-cream/12">
        <span
          className="block h-full rounded-full bg-caramel transition-[width] duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </span>
    );
  }

  return (
    <span aria-hidden className="flex h-3 w-full items-center">
      {steps.map((step, index) => {
        const previous = steps[index - 1];
        const newExercise = previous != null && previous.itemId !== step.itemId;
        const newBlock = previous != null && previous.blockId !== step.blockId;
        const current = index === currentIndex;
        const logged = isLogged(step);
        const passed = index < currentIndex;

        return (
          <span
            key={step.key}
            className={cn(
              "flex-1 rounded-[2px] transition-[height,background-color] duration-300",
              current ? "h-2.5 bg-caramel" : "h-1.5",
              !current && logged && "bg-caramel/70",
              !current && !logged && passed && "bg-cream/25",
              !current && !logged && !passed && "bg-cream/15",
              index > 0 && (newBlock ? "ml-2.5" : newExercise ? "ml-1.5" : "ml-[3px]"),
            )}
          />
        );
      })}
    </span>
  );
}
