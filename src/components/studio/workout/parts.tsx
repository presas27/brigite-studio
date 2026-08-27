import { formatRestDuration } from "@/lib/studio/duration";
import { isRestItem, type WorkoutItem } from "@/lib/studio/types";

export { formatRestDuration, REST_PRESETS, parseDurationInput } from "@/lib/studio/duration";

/**
 * The one line under an exercise name: "3 × 8-10", "3 × 20s", or just "20s"
 * inside a circuit, where the round count already carries the repetition.
 * Rest rows show only the pause, e.g. "60s".
 */
export function prescription(item: WorkoutItem, circuit: boolean): string {
  if (isRestItem(item)) return formatRestDuration(item.seconds ?? 60);
  const timed = item.seconds != null && item.reps.trim() === "";
  const measure = timed ? formatRestDuration(item.seconds ?? 0) : item.reps.trim();
  if (circuit) return measure || "1×";
  return measure ? `${item.sets} × ${measure}` : `${item.sets}×`;
}

/** Compact numeric/short-text input for the builder's dialogs. */
export const smallField =
  "w-full rounded-[0.75rem] bg-cream/5 px-3 py-2 font-sans text-sm text-cream placeholder:text-cream/30 ring-1 ring-cream/15 outline-none transition focus:ring-2 focus:ring-caramel/70";
