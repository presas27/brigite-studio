"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { requireCoach } from "@/lib/studio/auth";
import {
  addProgramPhase,
  addProgramWorkout,
  captureProgramFromClient,
  createProgram,
  removeProgram,
  removeProgramPhase,
  removeProgramWorkout,
  updateProgram,
  updateProgramPhase,
} from "@/lib/studio/programs";
import type { LibraryCategory } from "@/lib/studio/types";

/**
 * Everything a coach does to a program template.
 *
 * Ownership is not checked here and does not need to be: every function in
 * `convex/programs.ts` reads the coach from the session and refuses a program
 * that is not hers, so `requireCoach` in this file is about redirecting a client
 * who lands on the URL, not about protecting the rows.
 */

const LIST_PATH = "/app/coach/programas";

function programPath(programId: string): string {
  return `${LIST_PATH}/${programId}`;
}

/** `master` unless the form said `shared`: the value comes from a form field. */
function shelfField(formData: FormData): LibraryCategory {
  return String(formData.get("category") ?? "").trim() === "shared" ? "shared" : "master";
}

/**
 * Whole weeks from a text field, or `null`. An empty field means "not decided
 * yet", which is a legitimate state for a phase and is stored as one rather than
 * being turned into a zero.
 */
function weeksField(formData: FormData): number | null {
  const raw = String(formData.get("weeks") ?? "").trim();
  if (!raw) return null;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) && value > 0 ? value : null;
}

/**
 * A new program, opened straight away: the next thing a coach does is add its
 * first phase, and that is on the program's own page.
 */
export async function createProgramAction(formData: FormData): Promise<void> {
  await requireCoach();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const programId = await createProgram({
    name,
    focus: String(formData.get("focus") ?? ""),
    notes: String(formData.get("notes") ?? ""),
    category: shelfField(formData),
  });

  refresh();
  redirect(programPath(programId));
}

export async function updateProgramAction(
  programId: string,
  formData: FormData,
): Promise<void> {
  await requireCoach();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  await updateProgram(programId, {
    name,
    focus: String(formData.get("focus") ?? ""),
    notes: String(formData.get("notes") ?? ""),
    category: shelfField(formData),
  });
  refresh();
}

/** Deletes the program, its phases, and the workout templates inside them. */
export async function deleteProgramAction(formData: FormData): Promise<void> {
  await requireCoach();
  const programId = String(formData.get("programId") ?? "").trim();
  if (!programId) return;

  await removeProgram(programId);
  refresh();
  redirect(LIST_PATH);
}

export async function addPhaseAction(programId: string, formData: FormData): Promise<void> {
  await requireCoach();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  await addProgramPhase(programId, {
    name,
    weeks: weeksField(formData),
    notes: String(formData.get("notes") ?? ""),
  });
  refresh();
}

export async function updatePhaseAction(formData: FormData): Promise<void> {
  await requireCoach();
  const phaseId = String(formData.get("phaseId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  if (!phaseId || !name) return;

  await updateProgramPhase(phaseId, { name, weeks: weeksField(formData) });
  refresh();
}

export async function removePhaseAction(formData: FormData): Promise<void> {
  await requireCoach();
  const phaseId = String(formData.get("phaseId") ?? "").trim();
  if (!phaseId) return;

  await removeProgramPhase(phaseId);
  refresh();
}

/**
 * Copy a library workout into one of the program's phases. Copy-on-add, the same
 * rule the client's plan follows: tuning the program's version of a session
 * leaves the library's template as every other program sees it.
 */
export async function addWorkoutAction(formData: FormData): Promise<void> {
  await requireCoach();
  const phaseId = String(formData.get("phaseId") ?? "").trim();
  const workoutId = String(formData.get("workoutId") ?? "").trim();
  if (!phaseId || !workoutId) return;

  await addProgramWorkout(phaseId, workoutId);
  refresh();
}

export async function removeWorkoutAction(formData: FormData): Promise<void> {
  await requireCoach();
  const phaseId = String(formData.get("phaseId") ?? "").trim();
  const workoutId = String(formData.get("workoutId") ?? "").trim();
  if (!phaseId || !workoutId) return;

  await removeProgramWorkout(phaseId, workoutId);
  refresh();
}

/**
 * Keep a client's plan as a program template, and open it.
 *
 * The client's plan is untouched: every phase and workout is deep-copied. This
 * is where "shared with clients" programs come from — one lifted off a plan
 * somebody is running is, by definition, one at least one client has.
 */
export async function captureFromClientAction(
  clientId: string,
  formData: FormData,
): Promise<void> {
  await requireCoach();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const programId = await captureProgramFromClient(clientId, name);
  refresh();
  redirect(programPath(programId));
}
