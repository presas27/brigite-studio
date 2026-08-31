"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { requireClient } from "@/lib/studio/auth";
import { startWorkoutNow } from "@/lib/studio/plan";

/**
 * Start a workout of your own plan, now.
 *
 * The client id comes from the session and never from the form, so the only
 * thing a caller can choose is which workout — and Convex refuses any that is
 * not a copy inside their own plan.
 *
 * `startWorkoutNow` reuses today's session for that workout when there is one,
 * which is what makes a double tap harmless: the same id comes back and the
 * redirect lands on the session already open rather than on a second one.
 */
export async function startWorkout(formData: FormData): Promise<void> {
  const client = await requireClient();
  const workoutId = String(formData.get("workoutId") ?? "");
  if (!workoutId) return;

  const assignmentId = await startWorkoutNow(client.id, workoutId);
  // No id means the workout is gone or was never theirs. The page re-renders
  // without it rather than sending them into a session that does not exist.
  if (!assignmentId) {
    refresh();
    return;
  }

  refresh();
  redirect(`/app/aluno/treino/${assignmentId}`);
}
