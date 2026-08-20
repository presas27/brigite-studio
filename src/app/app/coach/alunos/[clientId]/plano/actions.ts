"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireClientAccess } from "@/lib/studio/auth";
import { assignWorkout, moveAssignment, removeAssignment, repeatWeek, setAssignmentStatus } from "@/lib/studio/plan";

function planPath(clientId: string): string {
  return `/app/coach/alunos/${clientId}/plano`;
}

/** Every action here is coach-only, scoped to one client's calendar. */
async function assertCoach(clientId: string): Promise<void> {
  const { viewer } = await requireClientAccess(clientId);
  if (viewer.role !== "coach") redirect("/app/aluno");
}

/** Place a workout template on the client's calendar, freezing it into a snapshot. */
export async function assign(clientId: string, formData: FormData): Promise<void> {
  await assertCoach(clientId);
  const workoutId = String(formData.get("workoutId") ?? "");
  const date = String(formData.get("date") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  if (!workoutId || !date) return;
  assignWorkout({ clientId, workoutId, date, note: note || undefined });
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
