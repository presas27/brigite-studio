import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { sm, sq } from "@/lib/studio/convexServer";
import type {
  PhaseDurationType,
  PhaseWorkout,
  TrainingPhase,
  TrainingPhaseSummary,
  WorkoutType,
} from "./types";

/**
 * Training phases: the blocks a coach's plan is actually built from. A workout
 * is never assigned to a bare week — it belongs to a phase ("Phase 1 - Base
 * building"), and the phase says how long that stretch of training runs.
 *
 * Two invariants matter here:
 *  1. A phase is scoped by `coachId` as well as `clientId`. Nothing in this
 *     file assumes a single coach.
 *  2. Adding a library workout to a phase *copies* it. The coach then edits the
 *     copy, and the template stays exactly as every other client sees it. This
 *     is the same reasoning as the assignment snapshot in `plan.ts`, one level
 *     earlier: the moment work leaves the library it stops being shared.
 *
 * The rules themselves now live in `convex/phases.ts` — the duration invariant,
 * the cascade that empties a phase before deleting it, the copy-on-add — and
 * this module is the thin server-side call into them. Nothing here decides
 * anything; if a behaviour looks missing, it moved rather than went.
 *
 * Identity is one thing that did change shape. The coach is no longer part of
 * any call: Convex takes the actor from the verified session, so `createPhase`
 * has no `coachId` parameter to pass the wrong value to. Whoever is signed in
 * owns the phase they create, and nothing else is expressible.
 */

/** Every phase of one client's plan, in the order the coach arranged them. */
export async function listPhases(clientId: string): Promise<TrainingPhaseSummary[]> {
  return sq(api.phases.list, { clientId: clientId as Id<"users"> });
}

export async function findPhase(phaseId: string): Promise<TrainingPhase | undefined> {
  // Convex has no `undefined`, so "no such phase" arrives as null and is turned
  // back into the absence the callers already branch on.
  return (await sq(api.phases.find, { phaseId: phaseId as Id<"trainingPhases"> })) ?? undefined;
}

/**
 * Duration comes in one of two shapes and only one is ever stored:
 *  - `calendar` keeps the two dates the coach picked;
 *  - `weeks` keeps the count and no dates at all — six weeks of hypertrophy,
 *    starting whenever the current phase ends, is a phase the coach has not
 *    dated yet and that is a legitimate state.
 *
 * Which fields survive is decided in the mutation, not here. See
 * `normaliseDuration` in `convex/phases.ts`.
 */
export async function createPhase(input: {
  clientId: string;
  name: string;
  durationType: PhaseDurationType;
  startDate?: string | null;
  endDate?: string | null;
  weeks?: number | null;
}): Promise<string> {
  return sm(api.phases.create, {
    clientId: input.clientId as Id<"users">,
    name: input.name,
    durationType: input.durationType,
    // Spread rather than pass: an absent field means "not given", and sending
    // it as an explicit null would mean "clear it", which is a different thing.
    ...(input.startDate === undefined ? {} : { startDate: input.startDate }),
    ...(input.endDate === undefined ? {} : { endDate: input.endDate }),
    ...(input.weeks === undefined ? {} : { weeks: input.weeks }),
  });
}

export async function updatePhase(
  phaseId: string,
  patch: {
    name?: string;
    durationType?: PhaseDurationType;
    startDate?: string | null;
    endDate?: string | null;
    weeks?: number | null;
  },
): Promise<void> {
  await sm(api.phases.update, {
    phaseId: phaseId as Id<"trainingPhases">,
    ...(patch.name === undefined ? {} : { name: patch.name }),
    ...(patch.durationType === undefined ? {} : { durationType: patch.durationType }),
    ...(patch.startDate === undefined ? {} : { startDate: patch.startDate }),
    ...(patch.endDate === undefined ? {} : { endDate: patch.endDate }),
    ...(patch.weeks === undefined ? {} : { weeks: patch.weeks }),
  });
}

/** Deletes the phase and, by cascade, the client-scoped workouts inside it. */
export async function removePhase(phaseId: string): Promise<void> {
  await sm(api.phases.remove, { phaseId: phaseId as Id<"trainingPhases"> });
}

/* ------------------------------------------------------ workouts in a phase */

/** The workouts of one phase, in the coach's order, with their calendar days. */
export async function phaseWorkouts(phaseId: string): Promise<PhaseWorkout[]> {
  return sq(api.phases.workouts, { phaseId: phaseId as Id<"trainingPhases"> });
}

/**
 * "Add from library". Copies the template into the phase there and then, so the
 * coach's first edit has nowhere to leak: the row they are editing was never
 * the library's. `sourceWorkoutId` keeps the provenance visible.
 */
export async function addLibraryWorkoutToPhase(
  phaseId: string,
  libraryWorkoutId: string,
): Promise<string | undefined> {
  return (
    (await sm(api.phases.addLibraryWorkout, {
      phaseId: phaseId as Id<"trainingPhases">,
      libraryWorkoutId: libraryWorkoutId as Id<"workouts">,
    })) ?? undefined
  );
}

/** "Build workout": a new workout that exists only for this client's phase. */
export async function createPhaseWorkout(
  phaseId: string,
  input: {
    name: string;
    focus?: string;
    notes?: string;
    workoutType?: WorkoutType;
    estimatedMinutes?: number | null;
  },
): Promise<string | undefined> {
  return (
    (await sm(api.phases.createWorkout, {
      phaseId: phaseId as Id<"trainingPhases">,
      name: input.name,
      ...(input.focus === undefined ? {} : { focus: input.focus }),
      ...(input.notes === undefined ? {} : { notes: input.notes }),
      ...(input.workoutType === undefined ? {} : { workoutType: input.workoutType }),
      ...(input.estimatedMinutes === undefined
        ? {}
        : { estimatedMinutes: input.estimatedMinutes }),
    })) ?? undefined
  );
}

/**
 * Hard delete, not archive: a client-scoped copy has no life outside its phase,
 * and any session already built from it kept its own snapshot.
 */
export async function removePhaseWorkout(phaseId: string, workoutId: string): Promise<void> {
  await sm(api.phases.removeWorkout, {
    phaseId: phaseId as Id<"trainingPhases">,
    workoutId: workoutId as Id<"workouts">,
  });
}
