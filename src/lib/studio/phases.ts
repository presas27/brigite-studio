import { all, get, run, shiftDay, tx, type Row } from "./db";
import { newId } from "./id";
import { copyWorkout, createWorkout, workoutMetaFromRow } from "./library";
import type {
  PhaseDurationType,
  TrainingPhase,
  TrainingPhaseSummary,
  WorkoutSummary,
  WorkoutType,
} from "./types";

/**
 * Training phases: the blocks a coach's plan is actually built from. A workout
 * is never assigned to a bare week — it belongs to a phase ("Phase 1 - Base
 * building"), and the phase says how long that stretch of training runs.
 *
 * Two invariants matter here:
 *  1. A phase is scoped by `coach_id` as well as `client_id`. Nothing in this
 *     file assumes a single coach.
 *  2. Adding a library workout to a phase *copies* it. The coach then edits the
 *     copy, and the template stays exactly as every other client sees it. This
 *     is the same reasoning as the assignment snapshot in `plan.ts`, one level
 *     earlier: the moment work leaves the library it stops being shared.
 */

const PHASE_COLUMNS =
  "id, coach_id, client_id, name, position, duration_type, start_date, end_date, weeks, " +
  "created_at, updated_at";

function mapPhase(row: Row): TrainingPhase {
  return {
    id: String(row.id),
    coachId: String(row.coach_id),
    clientId: String(row.client_id),
    name: String(row.name),
    position: Number(row.position),
    durationType: String(row.duration_type) as PhaseDurationType,
    startDate: row.start_date == null ? null : String(row.start_date),
    endDate: row.end_date == null ? null : String(row.end_date),
    weeks: row.weeks == null ? null : Number(row.weeks),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}

/** Every phase of one client's plan, in the order the coach arranged them. */
export function listPhases(clientId: string): TrainingPhaseSummary[] {
  const rows = all<Row>(
    `SELECT ${PHASE_COLUMNS},
            (SELECT count(*) FROM workouts w
              WHERE w.phase_id = training_phases.id AND w.archived = 0) AS workout_count
       FROM training_phases
      WHERE client_id = ?
      ORDER BY position, created_at`,
    clientId,
  );
  return rows.map((row) => ({ ...mapPhase(row), workoutCount: Number(row.workout_count) }));
}

export function findPhase(phaseId: string): TrainingPhase | undefined {
  const row = get<Row>(`SELECT ${PHASE_COLUMNS} FROM training_phases WHERE id = ?`, phaseId);
  return row ? mapPhase(row) : undefined;
}

/**
 * Duration comes in one of two shapes and only one is ever stored:
 *  - `calendar` keeps the two dates the coach picked;
 *  - `weeks` keeps the count, and derives the end date only if a start date
 *    came with it. A phase the coach has not dated yet is a legitimate state —
 *    six weeks of hypertrophy, starting whenever the current phase ends.
 */
export function createPhase(input: {
  coachId: string;
  clientId: string;
  name: string;
  durationType: PhaseDurationType;
  startDate?: string | null;
  endDate?: string | null;
  weeks?: number | null;
}): string {
  const phaseId = newId();
  const now = Date.now();
  const last = get<Row>(
    "SELECT coalesce(max(position), -1) AS last FROM training_phases WHERE client_id = ?",
    input.clientId,
  );
  const duration = normaliseDuration(input);
  run(
    `INSERT INTO training_phases
       (id, coach_id, client_id, name, position, duration_type, start_date, end_date, weeks,
        created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    phaseId,
    input.coachId,
    input.clientId,
    input.name.trim(),
    Number(last?.last ?? -1) + 1,
    duration.durationType,
    duration.startDate,
    duration.endDate,
    duration.weeks,
    now,
    now,
  );
  return phaseId;
}

export function updatePhase(
  phaseId: string,
  patch: {
    name?: string;
    durationType?: PhaseDurationType;
    startDate?: string | null;
    endDate?: string | null;
    weeks?: number | null;
  },
): void {
  const current = findPhase(phaseId);
  if (!current) return;
  const duration = normaliseDuration({
    durationType: patch.durationType ?? current.durationType,
    startDate: patch.startDate === undefined ? current.startDate : patch.startDate,
    endDate: patch.endDate === undefined ? current.endDate : patch.endDate,
    weeks: patch.weeks === undefined ? current.weeks : patch.weeks,
  });
  run(
    `UPDATE training_phases
        SET name = ?, duration_type = ?, start_date = ?, end_date = ?, weeks = ?, updated_at = ?
      WHERE id = ?`,
    (patch.name ?? current.name).trim(),
    duration.durationType,
    duration.startDate,
    duration.endDate,
    duration.weeks,
    Date.now(),
    phaseId,
  );
}

/** Deletes the phase and, by cascade, the client-scoped workouts inside it. */
export function removePhase(phaseId: string): void {
  run("DELETE FROM training_phases WHERE id = ?", phaseId);
}

/**
 * Keeps the two duration shapes from bleeding into each other: a calendar phase
 * has no week count, and a weeks phase has no end date it did not derive.
 */
function normaliseDuration(input: {
  durationType: PhaseDurationType;
  startDate?: string | null;
  endDate?: string | null;
  weeks?: number | null;
}): {
  durationType: PhaseDurationType;
  startDate: string | null;
  endDate: string | null;
  weeks: number | null;
} {
  const start = input.startDate?.trim() || null;
  if (input.durationType === "calendar") {
    return {
      durationType: "calendar",
      startDate: start,
      endDate: input.endDate?.trim() || null,
      weeks: null,
    };
  }
  const weeks = input.weeks == null ? null : Math.max(1, Math.trunc(input.weeks));
  return {
    durationType: "weeks",
    startDate: start,
    // A phase of N weeks that starts on a day ends the day before week N+1.
    endDate: start && weeks ? shiftDay(start, weeks * 7 - 1) : null,
    weeks,
  };
}

/* ------------------------------------------------------ workouts in a phase */

/** The workouts of one phase, in the coach's order. */
export function phaseWorkouts(phaseId: string): WorkoutSummary[] {
  const rows = all<Row>(
    `SELECT w.id, w.name, w.focus, w.notes, w.instructions, w.workout_type, w.coach_id,
            w.client_id, w.phase_id, w.source_workout_id, w.position, w.archived,
            w.created_at, w.updated_at,
            (SELECT count(*) FROM workout_items i
               JOIN workout_blocks b ON b.id = i.block_id
              WHERE b.workout_id = w.id) AS item_count
       FROM workouts w
      WHERE w.phase_id = ? AND w.archived = 0
      ORDER BY w.position, w.created_at`,
    phaseId,
  );
  return rows.map((row) => ({ ...workoutMetaFromRow(row), itemCount: Number(row.item_count) }));
}

function nextPosition(phaseId: string): number {
  const row = get<Row>(
    "SELECT coalesce(max(position), -1) AS last FROM workouts WHERE phase_id = ?",
    phaseId,
  );
  return Number(row?.last ?? -1) + 1;
}

/**
 * "Add from library". Copies the template into the phase there and then, so the
 * coach's first edit has nowhere to leak: the row they are editing was never
 * the library's. `sourceWorkoutId` keeps the provenance visible.
 */
export function addLibraryWorkoutToPhase(
  phaseId: string,
  libraryWorkoutId: string,
): string | undefined {
  const phase = findPhase(phaseId);
  if (!phase) return undefined;
  return tx(() =>
    copyWorkout(libraryWorkoutId, {
      coachId: phase.coachId,
      clientId: phase.clientId,
      phaseId: phase.id,
      sourceWorkoutId: libraryWorkoutId,
      position: nextPosition(phaseId),
    }),
  );
}

/** "Build workout": a new workout that exists only for this client's phase. */
export function createPhaseWorkout(
  phaseId: string,
  input: {
    name: string;
    focus?: string;
    notes?: string;
    workoutType?: WorkoutType;
  },
): string | undefined {
  const phase = findPhase(phaseId);
  if (!phase) return undefined;
  return createWorkout({
    name: input.name,
    focus: input.focus,
    notes: input.notes,
    workoutType: input.workoutType,
    coachId: phase.coachId,
    clientId: phase.clientId,
    phaseId: phase.id,
    position: nextPosition(phaseId),
  });
}

/**
 * Hard delete, not archive: a client-scoped copy has no life outside its phase,
 * and any session already built from it kept its own snapshot.
 */
export function removePhaseWorkout(phaseId: string, workoutId: string): void {
  run("DELETE FROM workouts WHERE id = ? AND phase_id = ?", workoutId, phaseId);
}
