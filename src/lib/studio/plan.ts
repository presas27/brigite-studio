import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { sm, sq } from "@/lib/studio/convexServer";
import { dayKey } from "./dates";
import type {
  Assignment,
  AssignmentStatus,
  ScheduledAssignment,
  SetLog,
} from "./types";

/**
 * The training plan: workouts placed on a client's calendar, and what the
 * client actually logged against them.
 *
 * The two invariants that matter have moved into `convex/plan.ts`, where they
 * are enforced next to the data:
 *  1. An assignment stores a frozen `snapshot` of the workout. Editing the
 *     template later never rewrites a session the client already saw.
 *  2. Logs are keyed by `itemId` from that snapshot, so re-ordering the
 *     template cannot scramble past numbers.
 *
 * What is left here is the shape the app was written against: the same
 * functions, the same arguments, the same return values — only awaited. Each
 * one is one Convex call with the caller's session token attached (`sq`/`sm`),
 * and the function on the other side authorizes itself. Nothing on this side
 * decides who may read what.
 */

/**
 * Place a workout on a client's calendar, freezing the template as it is now.
 * `date: null` leaves it unscheduled — it lands in the "sem dia" bucket until
 * the coach assigns it a day. `undefined` means the workout was gone and
 * nothing was written.
 */
export async function assignWorkout(input: {
  clientId: string;
  workoutId: string;
  date: string | null;
  note?: string;
}): Promise<string | undefined> {
  const assignmentId = await sm(api.plan.assignWorkout, {
    clientId: input.clientId as Id<"users">,
    workoutId: input.workoutId as Id<"workouts">,
    date: input.date,
    note: input.note ?? "",
  });
  return assignmentId ?? undefined;
}

export async function rescheduleWorkout(input: {
  clientId: string;
  workoutId: string;
  mode: "weekly" | "custom" | "none";
  weekday?: number | null;
  dates?: string[];
}): Promise<void> {
  await sm(api.plan.rescheduleWorkout, {
    clientId: input.clientId as Id<"users">,
    workoutId: input.workoutId as Id<"workouts">,
    mode: input.mode,
    weekday: input.weekday,
    dates: input.dates,
  });
}

export async function findAssignment(assignmentId: string): Promise<Assignment | undefined> {
  const assignment = await sq(api.plan.findAssignment, {
    assignmentId: assignmentId as Id<"assignments">,
  });
  return assignment ?? undefined;
}

/** Assignments for a client between two `YYYY-MM-DD` keys, inclusive. */
export async function assignmentsBetween(
  clientId: string,
  from: string,
  to: string,
): Promise<ScheduledAssignment[]> {
  return sq(api.plan.assignmentsBetween, { clientId: clientId as Id<"users">, from, to });
}

/** A client's workouts assigned with no day yet, oldest first. */
export async function unscheduledAssignments(clientId: string): Promise<Assignment[]> {
  return sq(api.plan.unscheduledAssignments, { clientId: clientId as Id<"users"> });
}

/**
 * Every active client's assignments in a date range, with the client's name
 * already attached. The studio-wide calendar reads a whole month at once —
 * one query per client per page would be thirty round trips to draw a grid.
 */
export async function studioAssignmentsBetween(
  from: string,
  to: string,
): Promise<(ScheduledAssignment & { clientName: string })[]> {
  return sq(api.plan.studioAssignmentsBetween, { from, to });
}

export async function assignmentsOn(
  clientId: string,
  date: string,
): Promise<ScheduledAssignment[]> {
  return sq(api.plan.assignmentsOn, { clientId: clientId as Id<"users">, date });
}

/** The client's next unfinished session — today's if there is one, else the soonest ahead. */
export async function nextAssignment(
  clientId: string,
  from: string = dayKey(),
): Promise<ScheduledAssignment | undefined> {
  const assignment = await sq(api.plan.nextAssignment, {
    clientId: clientId as Id<"users">,
    from,
  });
  return assignment ?? undefined;
}

/** Completed sessions, newest first. */
export async function assignmentHistory(clientId: string, limit = 30): Promise<Assignment[]> {
  return sq(api.plan.assignmentHistory, { clientId: clientId as Id<"users">, limit });
}

export async function moveAssignment(assignmentId: string, date: string): Promise<void> {
  await sm(api.plan.moveAssignment, { assignmentId: assignmentId as Id<"assignments">, date });
}

export async function removeAssignment(assignmentId: string): Promise<void> {
  await sm(api.plan.removeAssignment, { assignmentId: assignmentId as Id<"assignments"> });
}

export async function startAssignment(assignmentId: string): Promise<void> {
  await sm(api.plan.startAssignment, { assignmentId: assignmentId as Id<"assignments"> });
}

/**
 * `at` overrides when the session was finished. The app never passes it — a
 * session is done at the moment it is marked done — but the demo seed builds a
 * month of history in one boot, and stamping all of it with `Date.now()` would
 * put four weeks of training in the same second of the activity feed.
 */
export async function setAssignmentStatus(
  assignmentId: string,
  status: AssignmentStatus,
  at: number = Date.now(),
): Promise<void> {
  await sm(api.plan.setAssignmentStatus, {
    assignmentId: assignmentId as Id<"assignments">,
    status,
    at,
  });
}

/**
 * Close a session and record what it cost her: the effort she reported, and how
 * much rest she took beyond what Sara prescribed. Separate from
 * `setAssignmentStatus` because only this path has those two answers — marking
 * a session skipped from the week grid never does.
 */
export async function completeAssignment(
  assignmentId: string,
  input: { effort: number | null; extraRestSeconds: number; at?: number },
): Promise<void> {
  await sm(api.plan.completeAssignment, {
    assignmentId: assignmentId as Id<"assignments">,
    effort: input.effort,
    extraRestSeconds: input.extraRestSeconds,
    at: input.at ?? Date.now(),
  });
}

/**
 * Throw away everything logged against a session and put it back the way it was
 * before it was ever opened. This is the client discarding a workout she started
 * by mistake or abandoned — not the same as skipping it, which is a fact about
 * the week that Sara needs to see.
 */
export async function discardAssignment(assignmentId: string): Promise<void> {
  await sm(api.plan.discardAssignment, { assignmentId: assignmentId as Id<"assignments"> });
}

/** Copy a whole week of assignments forward by `weeks`. Returns how many landed. */
export async function repeatWeek(
  clientId: string,
  mondayKey: string,
  weeks = 1,
): Promise<number> {
  return sm(api.plan.repeatWeek, { clientId: clientId as Id<"users">, mondayKey, weeks });
}

export async function logsFor(assignmentId: string): Promise<SetLog[]> {
  return sq(api.plan.logsFor, { assignmentId: assignmentId as Id<"assignments"> });
}

/**
 * Record one set. Idempotent per (assignment, item, set) so a flaky connection
 * re-sending the same set does not duplicate it — this is what makes the
 * offline queue on the client safe to replay.
 */
export async function recordSet(input: {
  assignmentId: string;
  itemId: string;
  exerciseId: string;
  setIndex: number;
  reps?: number | null;
  loadKg?: number | null;
  seconds?: number | null;
  rpe?: number | null;
  notes?: string;
}): Promise<void> {
  await sm(api.plan.recordSet, {
    assignmentId: input.assignmentId as Id<"assignments">,
    itemId: input.itemId,
    exerciseId: input.exerciseId,
    setIndex: input.setIndex,
    reps: input.reps ?? null,
    loadKg: input.loadKg ?? null,
    seconds: input.seconds ?? null,
    rpe: input.rpe ?? null,
    notes: input.notes ?? "",
  });
}

export async function clearSet(
  assignmentId: string,
  itemId: string,
  setIndex: number,
): Promise<void> {
  await sm(api.plan.clearSet, {
    assignmentId: assignmentId as Id<"assignments">,
    itemId,
    setIndex,
  });
}

/**
 * The client's previous numbers for an exercise, so the logger can pre-fill
 * instead of asking them to remember. Excludes the session in progress.
 */
export async function lastLogsForExercise(
  clientId: string,
  exerciseId: string,
  excludeAssignmentId?: string,
): Promise<SetLog[]> {
  return sq(api.plan.lastLogsForExercise, {
    clientId: clientId as Id<"users">,
    exerciseId,
    // Left out entirely rather than sent as null: the argument means "there is
    // a session in progress", and there usually is not.
    ...(excludeAssignmentId
      ? { excludeAssignmentId: excludeAssignmentId as Id<"assignments"> }
      : {}),
  });
}

/** Heaviest set and longest hold ever logged, per exercise. */
export async function personalRecords(
  clientId: string,
): Promise<
  {
    exerciseId: string;
    exerciseName: string;
    bestLoadKg: number | null;
    bestSeconds: number | null;
    bestReps: number | null;
  }[]
> {
  return sq(api.plan.personalRecords, { clientId: clientId as Id<"users"> });
}

/** Share of scheduled sessions completed over the last `days` days. */
export async function adherence(
  clientId: string,
  days = 28,
): Promise<{ done: number; total: number }> {
  return sq(api.plan.adherence, { clientId: clientId as Id<"users">, days });
}
