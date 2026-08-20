import { randomUUID } from "node:crypto";
import { all, dayKey, get, run, shiftDay, tx, type Row } from "./db";
import { findWorkout } from "./library";
import type {
  Assignment,
  AssignmentStatus,
  SetLog,
  WorkoutSnapshot,
} from "./types";

/**
 * The training plan: workouts placed on a client's calendar, and what the
 * client actually logged against them.
 *
 * Two invariants matter here and are easy to get wrong:
 *  1. An assignment stores a frozen `snapshot` of the workout. Editing the
 *     template later never rewrites a session the client already saw.
 *  2. Logs are keyed by `item_id` from that snapshot, so re-ordering the
 *     template cannot scramble past numbers.
 */

const EMPTY_SNAPSHOT: WorkoutSnapshot = { name: "", focus: "", notes: "", blocks: [] };

function parseSnapshot(raw: unknown): WorkoutSnapshot {
  try {
    const parsed: unknown = JSON.parse(String(raw ?? ""));
    if (parsed && typeof parsed === "object" && "blocks" in parsed) {
      return parsed as WorkoutSnapshot;
    }
  } catch {
    /* fall through */
  }
  return EMPTY_SNAPSHOT;
}

function mapAssignment(row: Row): Assignment {
  return {
    id: String(row.id),
    clientId: String(row.client_id),
    workoutId: row.workout_id == null ? null : String(row.workout_id),
    date: String(row.date),
    status: String(row.status) as AssignmentStatus,
    note: String(row.note ?? ""),
    startedAt: row.started_at == null ? null : Number(row.started_at),
    doneAt: row.done_at == null ? null : Number(row.done_at),
    createdAt: Number(row.created_at),
    snapshot: parseSnapshot(row.snapshot),
  };
}

const ASSIGNMENT_COLUMNS =
  "id, client_id, workout_id, date, status, note, snapshot, started_at, done_at, created_at";

/** Place a workout on a client's calendar, freezing the template as it is now. */
export function assignWorkout(input: {
  clientId: string;
  workoutId: string;
  date: string;
  note?: string;
}): string | undefined {
  const workout = findWorkout(input.workoutId);
  if (!workout) return undefined;
  const snapshot: WorkoutSnapshot = {
    name: workout.name,
    focus: workout.focus,
    notes: workout.notes,
    blocks: workout.blocks,
  };
  const assignmentId = randomUUID();
  run(
    `INSERT INTO assignments
       (id, client_id, workout_id, date, status, snapshot, note, created_at)
     VALUES (?, ?, ?, ?, 'scheduled', ?, ?, ?)`,
    assignmentId,
    input.clientId,
    input.workoutId,
    input.date,
    JSON.stringify(snapshot),
    input.note ?? "",
    Date.now(),
  );
  return assignmentId;
}

export function findAssignment(assignmentId: string): Assignment | undefined {
  const row = get<Row>(
    `SELECT ${ASSIGNMENT_COLUMNS} FROM assignments WHERE id = ?`,
    assignmentId,
  );
  return row && mapAssignment(row);
}

/** Assignments for a client between two `YYYY-MM-DD` keys, inclusive. */
export function assignmentsBetween(clientId: string, from: string, to: string): Assignment[] {
  const rows = all<Row>(
    `SELECT ${ASSIGNMENT_COLUMNS} FROM assignments
      WHERE client_id = ? AND date BETWEEN ? AND ?
      ORDER BY date, created_at`,
    clientId,
    from,
    to,
  );
  return rows.map(mapAssignment);
}

export function assignmentsOn(clientId: string, date: string): Assignment[] {
  const rows = all<Row>(
    `SELECT ${ASSIGNMENT_COLUMNS} FROM assignments
      WHERE client_id = ? AND date = ? ORDER BY created_at`,
    clientId,
    date,
  );
  return rows.map(mapAssignment);
}

/** The client's next unfinished session — today's if there is one, else the soonest ahead. */
export function nextAssignment(clientId: string, from: string = dayKey()): Assignment | undefined {
  const row = get<Row>(
    `SELECT ${ASSIGNMENT_COLUMNS} FROM assignments
      WHERE client_id = ? AND date >= ? AND status = 'scheduled'
      ORDER BY date, created_at LIMIT 1`,
    clientId,
    from,
  );
  return row && mapAssignment(row);
}

/** Completed sessions, newest first. */
export function assignmentHistory(clientId: string, limit = 30): Assignment[] {
  const rows = all<Row>(
    `SELECT ${ASSIGNMENT_COLUMNS} FROM assignments
      WHERE client_id = ? AND status != 'scheduled'
      ORDER BY date DESC, created_at DESC LIMIT ?`,
    clientId,
    limit,
  );
  return rows.map(mapAssignment);
}

export function moveAssignment(assignmentId: string, date: string): void {
  run("UPDATE assignments SET date = ? WHERE id = ?", date, assignmentId);
}

export function removeAssignment(assignmentId: string): void {
  run("DELETE FROM assignments WHERE id = ?", assignmentId);
}

export function startAssignment(assignmentId: string): void {
  run(
    "UPDATE assignments SET started_at = ? WHERE id = ? AND started_at IS NULL",
    Date.now(),
    assignmentId,
  );
}

export function setAssignmentStatus(assignmentId: string, status: AssignmentStatus): void {
  run(
    "UPDATE assignments SET status = ?, done_at = ? WHERE id = ?",
    status,
    status === "done" ? Date.now() : null,
    assignmentId,
  );
}

/** Copy a whole week of assignments forward by `weeks`. Returns how many landed. */
export function repeatWeek(clientId: string, mondayKey: string, weeks = 1): number {
  const source = assignmentsBetween(clientId, mondayKey, shiftDay(mondayKey, 6));
  if (source.length === 0) return 0;
  return tx(() => {
    let created = 0;
    for (let week = 1; week <= weeks; week += 1) {
      for (const assignment of source) {
        run(
          `INSERT INTO assignments
             (id, client_id, workout_id, date, status, snapshot, note, created_at)
           VALUES (?, ?, ?, ?, 'scheduled', ?, ?, ?)`,
          randomUUID(),
          clientId,
          assignment.workoutId,
          shiftDay(assignment.date, week * 7),
          JSON.stringify(assignment.snapshot),
          assignment.note,
          Date.now(),
        );
        created += 1;
      }
    }
    return created;
  });
}

function mapLog(row: Row): SetLog {
  return {
    id: String(row.id),
    assignmentId: String(row.assignment_id),
    itemId: String(row.item_id),
    exerciseId: String(row.exercise_id),
    setIndex: Number(row.set_index),
    reps: row.reps == null ? null : Number(row.reps),
    loadKg: row.load_kg == null ? null : Number(row.load_kg),
    seconds: row.seconds == null ? null : Number(row.seconds),
    rpe: row.rpe == null ? null : Number(row.rpe),
    notes: String(row.notes ?? ""),
    loggedAt: Number(row.logged_at),
  };
}

const LOG_COLUMNS =
  "id, assignment_id, item_id, exercise_id, set_index, reps, load_kg, seconds, rpe, notes, logged_at";

export function logsFor(assignmentId: string): SetLog[] {
  const rows = all<Row>(
    `SELECT ${LOG_COLUMNS} FROM set_logs WHERE assignment_id = ? ORDER BY item_id, set_index`,
    assignmentId,
  );
  return rows.map(mapLog);
}

/**
 * Record one set. Idempotent per (assignment, item, set) so a flaky connection
 * re-sending the same set does not duplicate it — this is what makes the
 * offline queue on the client safe to replay.
 */
export function recordSet(input: {
  assignmentId: string;
  itemId: string;
  exerciseId: string;
  setIndex: number;
  reps?: number | null;
  loadKg?: number | null;
  seconds?: number | null;
  rpe?: number | null;
  notes?: string;
}): void {
  const existing = get<Row>(
    "SELECT id FROM set_logs WHERE assignment_id = ? AND item_id = ? AND set_index = ?",
    input.assignmentId,
    input.itemId,
    input.setIndex,
  );
  if (existing) {
    run(
      `UPDATE set_logs SET reps = ?, load_kg = ?, seconds = ?, rpe = ?, notes = ?, logged_at = ?
        WHERE id = ?`,
      input.reps ?? null,
      input.loadKg ?? null,
      input.seconds ?? null,
      input.rpe ?? null,
      input.notes ?? "",
      Date.now(),
      String(existing.id),
    );
    return;
  }
  run(
    `INSERT INTO set_logs
       (id, assignment_id, item_id, exercise_id, set_index, reps, load_kg, seconds, rpe, notes, logged_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    randomUUID(),
    input.assignmentId,
    input.itemId,
    input.exerciseId,
    input.setIndex,
    input.reps ?? null,
    input.loadKg ?? null,
    input.seconds ?? null,
    input.rpe ?? null,
    input.notes ?? "",
    Date.now(),
  );
}

export function clearSet(assignmentId: string, itemId: string, setIndex: number): void {
  run(
    "DELETE FROM set_logs WHERE assignment_id = ? AND item_id = ? AND set_index = ?",
    assignmentId,
    itemId,
    setIndex,
  );
}

/**
 * The client's previous numbers for an exercise, so the logger can pre-fill
 * instead of asking them to remember. Excludes the session in progress.
 */
export function lastLogsForExercise(
  clientId: string,
  exerciseId: string,
  excludeAssignmentId?: string,
): SetLog[] {
  const previous = get<Row>(
    `SELECT l.assignment_id FROM set_logs l
       JOIN assignments a ON a.id = l.assignment_id
      WHERE a.client_id = ? AND l.exercise_id = ?
        ${excludeAssignmentId ? "AND l.assignment_id != ?" : ""}
      ORDER BY l.logged_at DESC LIMIT 1`,
    clientId,
    exerciseId,
    ...(excludeAssignmentId ? [excludeAssignmentId] : []),
  );
  if (!previous) return [];
  const rows = all<Row>(
    `SELECT ${LOG_COLUMNS} FROM set_logs
      WHERE assignment_id = ? AND exercise_id = ? ORDER BY set_index`,
    String(previous.assignment_id),
    exerciseId,
  );
  return rows.map(mapLog);
}

/** Heaviest set and longest hold ever logged, per exercise. */
export function personalRecords(
  clientId: string,
): { exerciseId: string; exerciseName: string; bestLoadKg: number | null; bestSeconds: number | null; bestReps: number | null }[] {
  const rows = all<Row>(
    `SELECT l.exercise_id, e.name AS exercise_name,
            max(l.load_kg) AS best_load, max(l.seconds) AS best_seconds, max(l.reps) AS best_reps
       FROM set_logs l
       JOIN assignments a ON a.id = l.assignment_id
       JOIN exercises e ON e.id = l.exercise_id
      WHERE a.client_id = ?
      GROUP BY l.exercise_id
      ORDER BY e.name COLLATE NOCASE`,
    clientId,
  );
  return rows.map((row) => ({
    exerciseId: String(row.exercise_id),
    exerciseName: String(row.exercise_name),
    bestLoadKg: row.best_load == null ? null : Number(row.best_load),
    bestSeconds: row.best_seconds == null ? null : Number(row.best_seconds),
    bestReps: row.best_reps == null ? null : Number(row.best_reps),
  }));
}

/** Share of scheduled sessions completed over the last `days` days. */
export function adherence(clientId: string, days = 28): { done: number; total: number } {
  const from = shiftDay(dayKey(), -days);
  const row = get<Row>(
    `SELECT count(*) AS total, sum(CASE WHEN status = 'done' THEN 1 ELSE 0 END) AS done
       FROM assignments
      WHERE client_id = ? AND date BETWEEN ? AND ?`,
    clientId,
    from,
    dayKey(),
  );
  return { done: Number(row?.done ?? 0), total: Number(row?.total ?? 0) };
}
