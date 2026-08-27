"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { requireClientAccess } from "@/lib/studio/auth";
import {
  addLibraryWorkoutToPhase,
  createPhaseWorkout,
  findPhase,
  removePhaseWorkout,
} from "@/lib/studio/phases";
import { assignWorkout } from "@/lib/studio/plan";
import type { WorkoutType } from "@/lib/studio/types";

/**
 * Everything a coach does inside one training phase. The two ways a workout
 * gets in — from the library, or built here — both end in the same place: a
 * workout row owned by this client and this phase, which the coach then edits
 * freely. Nothing in this file can write to a library template.
 */

function phasePath(clientId: string, phaseId: string): string {
  return `/app/coach/alunos/${clientId}/plano/fase/${phaseId}`;
}

async function assertCoach(clientId: string): Promise<void> {
  const { viewer } = await requireClientAccess(clientId);
  if (viewer.role !== "coach") redirect("/app/aluno");
}

/** Guards against a phase id from another client's plan reaching these writes. */
async function assertPhaseBelongsTo(phaseId: string, clientId: string): Promise<boolean> {
  return (await findPhase(phaseId))?.clientId === clientId;
}

const WORKOUT_TYPES: readonly WorkoutType[] = ["regular", "circuit", "interval"];

/**
 * "Add from library". Copies the template in and opens the copy, because the
 * next thing a coach does is adapt it — and the copy is the only thing they can
 * adapt without touching the template.
 */
export async function addFromLibraryAction(
  clientId: string,
  phaseId: string,
  formData: FormData,
): Promise<void> {
  await assertCoach(clientId);
  if (!(await assertPhaseBelongsTo(phaseId, clientId))) return;
  const workoutId = String(formData.get("workoutId") ?? "").trim();
  if (!workoutId) return;

  const copyId = await addLibraryWorkoutToPhase(phaseId, workoutId);
  refresh();
  if (copyId) redirect(`${phasePath(clientId, phaseId)}/treino/${copyId}`);
}

/** "Build workout": a workout that exists only for this client's phase. */
export async function buildWorkoutAction(
  clientId: string,
  phaseId: string,
  formData: FormData,
): Promise<void> {
  await assertCoach(clientId);
  if (!(await assertPhaseBelongsTo(phaseId, clientId))) return;
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const rawType = String(formData.get("workoutType") ?? "").trim() as WorkoutType;
  const workoutId = await createPhaseWorkout(phaseId, {
    name,
    focus: String(formData.get("focus") ?? ""),
    notes: String(formData.get("notes") ?? ""),
    workoutType: WORKOUT_TYPES.includes(rawType) ? rawType : "regular",
  });

  refresh();
  if (workoutId) redirect(`${phasePath(clientId, phaseId)}/treino/${workoutId}`);
}

export async function removeWorkoutAction(
  clientId: string,
  phaseId: string,
  formData: FormData,
): Promise<void> {
  await assertCoach(clientId);
  if (!(await assertPhaseBelongsTo(phaseId, clientId))) return;
  const workoutId = String(formData.get("workoutId") ?? "").trim();
  if (!workoutId) return;
  await removePhaseWorkout(phaseId, workoutId);
  refresh();
}

/**
 * Put one of the phase's workouts on a day. The phase says *what* the client
 * trains and for how long; the calendar still says *when* — this is the one
 * bridge between them, and it freezes a snapshot exactly like any other
 * assignment.
 */
export async function scheduleWorkoutAction(
  clientId: string,
  phaseId: string,
  formData: FormData,
): Promise<void> {
  await assertCoach(clientId);
  if (!(await assertPhaseBelongsTo(phaseId, clientId))) return;
  const workoutId = String(formData.get("workoutId") ?? "").trim();
  if (!workoutId) return;

  await assignWorkout({
    clientId,
    workoutId,
    date: String(formData.get("date") ?? "").trim() || null,
  });
  refresh();
}
