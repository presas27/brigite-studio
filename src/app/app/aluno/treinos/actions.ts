"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { requireClient } from "@/lib/studio/auth";
import { startEmptySession, startWorkoutNow } from "@/lib/studio/plan";
import { capitalize } from "@/lib/utils";
import { getUserLocale } from "@/i18n/locale";

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

/**
 * Start a session with no template — a blank sheet, or a run, that they fill
 * in as they go. Named here, in the client's language, because the generic
 * "treino de terça-feira" is a display string and the translations live on
 * this side. Today's open live session is reused, so a double tap is a
 * resume.
 */
export async function startLiveWorkout(formData: FormData): Promise<void> {
  const client = await requireClient();
  const kind = String(formData.get("kind") ?? "empty") === "run" ? "run" : "empty";
  const locale = await getUserLocale();
  const weekday = capitalize(
    new Intl.DateTimeFormat(locale, {
      weekday: "long",
      timeZone: "Europe/Lisbon",
    }).format(new Date()),
    locale,
  );
  const name =
    locale === "en"
      ? kind === "run"
        ? `${weekday} run`
        : `${weekday} workout`
      : kind === "run"
        ? `Corrida de ${weekday}`
        : `Treino de ${weekday}`;
  const assignmentId = await startEmptySession(client.id, name, kind);
  if (!assignmentId) {
    refresh();
    return;
  }
  redirect(`/app/aluno/treino/${assignmentId}`);
}
