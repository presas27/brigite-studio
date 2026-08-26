"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireClientAccess, requireCoach } from "@/lib/studio/auth";
import { createPhase, removePhase, updatePhase } from "@/lib/studio/phases";
import { assignWorkout, moveAssignment, removeAssignment, repeatWeek, setAssignmentStatus } from "@/lib/studio/plan";
import type { PhaseDurationType } from "@/lib/studio/types";

function planPath(clientId: string): string {
  return `/app/coach/alunos/${clientId}/plano`;
}

/** Every action here is coach-only, scoped to one client's calendar. */
async function assertCoach(clientId: string): Promise<void> {
  const { viewer } = await requireClientAccess(clientId);
  if (viewer.role !== "coach") redirect("/app/aluno");
}

/* ---------------------------------------------------------- training phases */

/**
 * Create a phase and open it, so the coach lands where the workouts go rather
 * than back on a list with one more row on it.
 *
 * Duration is one of two shapes and the form posts both sets of fields; which
 * one is kept is decided by `durationType` in `createPhase`.
 */
export async function createPhaseAction(clientId: string, formData: FormData): Promise<void> {
  const coach = await requireCoach();
  await assertCoach(clientId);
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const durationType: PhaseDurationType =
    String(formData.get("durationType") ?? "") === "weeks" ? "weeks" : "calendar";
  const weeksRaw = Number.parseInt(String(formData.get("weeks") ?? ""), 10);

  const phaseId = createPhase({
    coachId: coach.id,
    clientId,
    name,
    durationType,
    startDate: String(formData.get("startDate") ?? "").trim() || null,
    endDate: String(formData.get("endDate") ?? "").trim() || null,
    weeks: Number.isNaN(weeksRaw) ? null : weeksRaw,
  });

  revalidatePath(planPath(clientId));
  redirect(`${planPath(clientId)}/fase/${phaseId}`);
}

export async function updatePhaseAction(clientId: string, formData: FormData): Promise<void> {
  await assertCoach(clientId);
  const phaseId = String(formData.get("phaseId") ?? "").trim();
  if (!phaseId) return;

  const durationType: PhaseDurationType =
    String(formData.get("durationType") ?? "") === "weeks" ? "weeks" : "calendar";
  const weeksRaw = Number.parseInt(String(formData.get("weeks") ?? ""), 10);

  updatePhase(phaseId, {
    name: String(formData.get("name") ?? "").trim() || undefined,
    durationType,
    startDate: String(formData.get("startDate") ?? "").trim() || null,
    endDate: String(formData.get("endDate") ?? "").trim() || null,
    weeks: Number.isNaN(weeksRaw) ? null : weeksRaw,
  });

  revalidatePath(planPath(clientId));
  revalidatePath(`${planPath(clientId)}/fase/${phaseId}`);
}

/** Removes the phase and, by cascade, the client's copies of its workouts. */
export async function deletePhaseAction(clientId: string, formData: FormData): Promise<void> {
  await assertCoach(clientId);
  const phaseId = String(formData.get("phaseId") ?? "").trim();
  if (!phaseId) return;
  removePhase(phaseId);
  revalidatePath(planPath(clientId));
  redirect(planPath(clientId));
}

/* --------------------------------------------------------- week assignments */

/**
 * Place a workout template on the client's calendar, freezing it into a
 * snapshot. An empty day leaves it unscheduled — see `assignWorkout`.
 */
export async function assign(clientId: string, formData: FormData): Promise<void> {
  await assertCoach(clientId);
  const workoutId = String(formData.get("workoutId") ?? "");
  const date = String(formData.get("date") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  if (!workoutId) return;
  assignWorkout({ clientId, workoutId, date: date || null, note: note || undefined });
  revalidatePath(planPath(clientId));
}

/** Drop an assignment off the calendar entirely. */
export async function remove(clientId: string, formData: FormData): Promise<void> {
  await assertCoach(clientId);
  const assignmentId = String(formData.get("assignmentId") ?? "");
  if (!assignmentId) return;
  removeAssignment(assignmentId);
  revalidatePath(planPath(clientId));
}

/** Relocate an assignment to a different day. */
export async function move(clientId: string, formData: FormData): Promise<void> {
  await assertCoach(clientId);
  const assignmentId = String(formData.get("assignmentId") ?? "");
  const date = String(formData.get("date") ?? "");
  if (!assignmentId || !date) return;
  moveAssignment(assignmentId, date);
  revalidatePath(planPath(clientId));
}

/** Flag a session as missed without deleting the record. */
export async function markSkipped(clientId: string, formData: FormData): Promise<void> {
  await assertCoach(clientId);
  const assignmentId = String(formData.get("assignmentId") ?? "");
  if (!assignmentId) return;
  setAssignmentStatus(assignmentId, "skipped");
  revalidatePath(planPath(clientId));
}

/**
 * Copy the whole visible week forward by one week. Redirects back with the
 * copy count in the query string so the page can surface `plan.repeated`.
 */
export async function repeat(clientId: string, formData: FormData): Promise<void> {
  await assertCoach(clientId);
  const monday = String(formData.get("monday") ?? "");
  if (!monday) return;
  const count = repeatWeek(clientId, monday, 1);
  revalidatePath(planPath(clientId));
  redirect(`${planPath(clientId)}?semana=${monday}&repetido=${count}`);
}
