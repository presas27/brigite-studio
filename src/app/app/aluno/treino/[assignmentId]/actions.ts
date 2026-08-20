"use server";

import { revalidatePath } from "next/cache";
import { requireClientAccess } from "@/lib/studio/auth";
import { clearSet, findAssignment, recordSet, setAssignmentStatus, startAssignment } from "@/lib/studio/plan";
import type { Assignment } from "@/lib/studio/types";

/**
 * Every mutation here is scoped to one assignment and gated the same way:
 * load it, then run `requireClientAccess` on its owning client. That covers
 * both the client logging their own session and the coach opening it to
 * check in — either way, only the right people can write to it.
 */
async function assignmentFor(assignmentId: string): Promise<Assignment> {
  const assignment = findAssignment(assignmentId);
  if (!assignment) throw new Error("Assignment not found");
  await requireClientAccess(assignment.clientId);
  return assignment;
}

/**
 * Record one set. `recordSet` upserts on (assignment, item, set index), so
 * replaying the same call after a dropped connection never duplicates a row
 * — this is what makes the client's offline retry queue safe.
 */
export async function logSet(input: {
  assignmentId: string;
  itemId: string;
  exerciseId: string;
  setIndex: number;
  reps: number | null;
  loadKg: number | null;
  seconds: number | null;
  rpe: number | null;
}): Promise<void> {
  const assignment = await assignmentFor(input.assignmentId);
  recordSet({
    assignmentId: assignment.id,
    itemId: input.itemId,
    exerciseId: input.exerciseId,
    setIndex: input.setIndex,
    reps: input.reps,
    loadKg: input.loadKg,
    seconds: input.seconds,
    rpe: input.rpe,
  });
  // No revalidatePath: this fires on every logged set, sometimes every
  // debounce tick while typing. The logger already reflects the write in its
  // own state — refetching the whole route on this cadence would be wasted
  // work for no visible change.
}

export async function unlogSet(input: {
  assignmentId: string;
  itemId: string;
  setIndex: number;
}): Promise<void> {
  const assignment = await assignmentFor(input.assignmentId);
  clearSet(assignment.id, input.itemId, input.setIndex);
}

export async function beginSession(assignmentId: string): Promise<void> {
  const assignment = await assignmentFor(assignmentId);
  startAssignment(assignment.id);
  revalidatePath(`/app/aluno/treino/${assignment.id}`);
}

export async function finishSession(assignmentId: string): Promise<void> {
  const assignment = await assignmentFor(assignmentId);
  setAssignmentStatus(assignment.id, "done");
  revalidatePath(`/app/aluno/treino/${assignment.id}`);
  revalidatePath("/app/aluno");
  revalidatePath("/app/aluno/plano");
  revalidatePath("/app/aluno/progresso");
}

export async function skipSession(assignmentId: string): Promise<void> {
  const assignment = await assignmentFor(assignmentId);
  setAssignmentStatus(assignment.id, "skipped");
  revalidatePath(`/app/aluno/treino/${assignment.id}`);
  revalidatePath("/app/aluno");
  revalidatePath("/app/aluno/plano");
}
