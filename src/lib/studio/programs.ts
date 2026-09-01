import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { sm, sq } from "@/lib/studio/convexServer";
import type {
  LibraryCategory,
  ProgramPhaseDetail,
  TrainingProgram,
  TrainingProgramSummary,
} from "./types";

/**
 * Training programs: the multi-week shape of a block of training, kept as a
 * template instead of being built straight into one client's plan.
 *
 * This module is the seam between the pages and `convex/programs.ts`, and it
 * follows the same conventions as its siblings here: ids arrive from the Next
 * layer as plain strings — a route parameter, a hidden form field — and are cast
 * at the boundary. The cast is not the check; the `v.id(...)` validator on the
 * other side is, and it rejects an id that is not an id of that table before the
 * handler runs.
 *
 * The coach is never an argument. Every function on the other side reads her
 * from the session, so a caller cannot reach another coach's shelf by naming it.
 */

/** This coach's programs, newest edit first, optionally one shelf at a time. */
export async function listPrograms(
  category?: LibraryCategory,
): Promise<TrainingProgramSummary[]> {
  return sq(api.programs.list, { category });
}

export async function findProgram(programId: string): Promise<TrainingProgram | undefined> {
  const program = await sq(api.programs.find, {
    programId: programId as Id<"trainingPrograms">,
  });
  return program ?? undefined;
}

/** The phases of one program, in order, each with the sessions inside it. */
export async function programPhases(programId: string): Promise<ProgramPhaseDetail[]> {
  return sq(api.programs.phases, { programId: programId as Id<"trainingPrograms"> });
}

export async function createProgram(input: {
  name: string;
  focus?: string;
  notes?: string;
  category?: LibraryCategory;
}): Promise<string> {
  return sm(api.programs.create, input);
}

export async function updateProgram(
  programId: string,
  patch: { name?: string; focus?: string; notes?: string; category?: LibraryCategory },
): Promise<void> {
  await sm(api.programs.update, {
    programId: programId as Id<"trainingPrograms">,
    patch,
  });
}

/** Deletes the program, its phases, and the workout templates inside them. */
export async function removeProgram(programId: string): Promise<void> {
  await sm(api.programs.remove, { programId: programId as Id<"trainingPrograms"> });
}

export async function addProgramPhase(
  programId: string,
  input: { name: string; weeks?: number | null; notes?: string },
): Promise<string | undefined> {
  const id = await sm(api.programs.addPhase, {
    programId: programId as Id<"trainingPrograms">,
    ...input,
  });
  return id ?? undefined;
}

export async function updateProgramPhase(
  phaseId: string,
  patch: { name?: string; weeks?: number | null; notes?: string },
): Promise<void> {
  await sm(api.programs.updatePhase, {
    phaseId: phaseId as Id<"programPhases">,
    patch,
  });
}

export async function removeProgramPhase(phaseId: string): Promise<void> {
  await sm(api.programs.removePhase, { phaseId: phaseId as Id<"programPhases"> });
}

/**
 * Copy a library workout into one of a program's phases. Copy-on-add, the same
 * rule the client's plan follows: tuning the program's version of a session
 * leaves the library's template as every other program sees it.
 */
export async function addProgramWorkout(
  phaseId: string,
  libraryWorkoutId: string,
): Promise<string | undefined> {
  const id = await sm(api.programs.addWorkout, {
    phaseId: phaseId as Id<"programPhases">,
    libraryWorkoutId: libraryWorkoutId as Id<"workouts">,
  });
  return id ?? undefined;
}

export async function removeProgramWorkout(
  phaseId: string,
  workoutId: string,
): Promise<void> {
  await sm(api.programs.removeWorkout, {
    phaseId: phaseId as Id<"programPhases">,
    workoutId: workoutId as Id<"workouts">,
  });
}

/**
 * Keep a client's plan — its phases and every workout in them — as a program
 * template. Where "shared with clients" programs come from: a program lifted off
 * a plan somebody is running is, by definition, one at least one client has.
 */
export async function captureProgramFromClient(
  clientId: string,
  name: string,
): Promise<string> {
  return sm(api.programs.captureFromClient, {
    clientId: clientId as Id<"users">,
    name,
  });
}
