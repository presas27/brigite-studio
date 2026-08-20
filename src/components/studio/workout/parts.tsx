import type { WorkoutItem } from "@/lib/studio/types";

/**
 * The one line under an exercise name: "3 × 8-10", "3 × 20s", or just "20s"
 * inside a circuit, where the round count already carries the repetition.
 */
export function prescription(item: WorkoutItem, circuit: boolean): string {
  const timed = item.tracking === "time" || item.tracking === "hold";
  const measure = timed && item.seconds != null ? `${item.seconds}s` : item.reps.trim();
  if (circuit) return measure || "1×";
  return measure ? `${item.sets} × ${measure}` : `${item.sets}×`;
}

/** Compact numeric/short-text input for the builder's dialogs. */
export const smallField =
  "w-full rounded-[0.75rem] bg-cream/5 px-3 py-2 font-sans text-sm text-cream placeholder:text-cream/30 ring-1 ring-cream/15 outline-none transition focus:ring-2 focus:ring-caramel/70";
