import { all, type Row } from "./db";
import { assignmentHistory, findAssignment, logsFor } from "./plan";
import { buildSessionQueue } from "./session-queue";
import type { Assignment, BlockKind, SetLog, Tracking, WorkoutItem } from "./types";

/**
 * The training log read from the coach's side: what a client actually did,
 * session by session, and one session in full detail.
 *
 * The plan module answers "what is scheduled"; this one answers "what
 * happened". Both read the same two tables, but the questions are different
 * enough that mixing them would leave `plan.ts` with two audiences.
 *
 * Everything is derived from the assignment's frozen `snapshot` via
 * `buildSessionQueue` — the same function the player walks — so the report
 * lists exactly the sets the client was asked for, in the order she trained
 * them, and a template edited afterwards never rewrites the report.
 */

/** One session in the history list: enough to scan a year without opening anything. */
export type SessionRow = {
  id: string;
  date: string | null;
  name: string;
  focus: string;
  status: Assignment["status"];
  effort: number | null;
  extraRestSeconds: number;
  /** Sets the workout asked for. */
  plannedSets: number;
  /** Sets the client actually wrote a number into. */
  loggedSets: number;
  /** Wall-clock length, `null` when the session was never opened or never closed. */
  durationMinutes: number | null;
  volumeKg: number;
};

/** Reps × load over every set that had both. A plank contributes nothing, which is correct. */
function volumeOf(logs: SetLog[]): number {
  return logs.reduce(
    (total, log) => (log.reps != null && log.loadKg != null ? total + log.reps * log.loadKg : total),
    0,
  );
}

function durationOf(assignment: Assignment): number | null {
  if (assignment.startedAt == null || assignment.doneAt == null) return null;
  return Math.max(1, Math.round((assignment.doneAt - assignment.startedAt) / 60_000));
}

/**
 * Every session this client has finished or missed, newest first.
 *
 * Two queries for the whole list rather than one per session: the aggregate
 * below is what the list rows are made of, and thirty round trips to draw
 * thirty rows is thirty round trips too many.
 */
export function sessionHistory(clientId: string, limit = 60): SessionRow[] {
  const assignments = assignmentHistory(clientId, limit);
  if (assignments.length === 0) return [];

  const totals = new Map<string, { sets: number; volume: number }>();
  for (const row of all<Row>(
    `SELECT l.assignment_id AS id, count(*) AS sets,
            sum(CASE WHEN l.reps IS NOT NULL AND l.load_kg IS NOT NULL
                     THEN l.reps * l.load_kg ELSE 0 END) AS volume
       FROM set_logs l
       JOIN assignments a ON a.id = l.assignment_id
      WHERE a.client_id = ?
      GROUP BY l.assignment_id`,
    clientId,
  )) {
    totals.set(String(row.id), { sets: Number(row.sets ?? 0), volume: Number(row.volume ?? 0) });
  }

  return assignments.map((assignment) => {
    const logged = totals.get(assignment.id);
    return {
      id: assignment.id,
      date: assignment.date,
      name: assignment.snapshot.name,
      focus: assignment.snapshot.focus,
      status: assignment.status,
      effort: assignment.effort,
      extraRestSeconds: assignment.extraRestSeconds,
      plannedSets: buildSessionQueue(assignment.snapshot).length,
      loggedSets: logged?.sets ?? 0,
      durationMinutes: durationOf(assignment),
      volumeKg: logged?.volume ?? 0,
    };
  });
}

/** One prescribed set and the number that came back for it, if any. */
export type ReportSet = {
  setNumber: number;
  tracking: Tracking;
  log: SetLog | null;
};

export type ReportItem = {
  item: WorkoutItem;
  /** True when the item lives in a superset, circuit or interval block. */
  interleaved: boolean;
  sets: ReportSet[];
};

export type ReportBlock = {
  id: string;
  kind: BlockKind;
  label: string;
  items: ReportItem[];
};

export type SessionReport = {
  assignment: Assignment;
  blocks: ReportBlock[];
  plannedSets: number;
  loggedSets: number;
  durationMinutes: number | null;
  volumeKg: number;
  /** Everything the client typed into a set's note field, in session order. */
  setNotes: { exerciseName: string; setNumber: number; body: string }[];
};

/**
 * One session, prescribed against logged.
 *
 * Sets with nothing against them are kept rather than dropped — a report that
 * silently omits the two sets she never did says the workout was three sets
 * long, which is the one thing the coach must not be told.
 */
export function sessionReport(assignmentId: string): SessionReport | undefined {
  const assignment = findAssignment(assignmentId);
  if (!assignment) return undefined;

  const steps = buildSessionQueue(assignment.snapshot);
  const logs = logsFor(assignment.id);
  const byKey = new Map(logs.map((log) => [`${log.itemId}:${log.setIndex}`, log]));

  const blocks: ReportBlock[] = [];
  const items = new Map<string, ReportItem>();
  const setNotes: SessionReport["setNotes"] = [];

  for (const step of steps) {
    let block = blocks.find((candidate) => candidate.id === step.blockId);
    if (!block) {
      block = { id: step.blockId, kind: step.blockKind, label: step.blockLabel, items: [] };
      blocks.push(block);
    }

    const itemKey = `${step.blockId}:${step.itemId}`;
    let entry = items.get(itemKey);
    if (!entry) {
      entry = { item: step.item, interleaved: step.round != null, sets: [] };
      items.set(itemKey, entry);
      block.items.push(entry);
    }

    const log = byKey.get(step.key) ?? null;
    entry.sets.push({ setNumber: step.setNumber, tracking: step.tracking, log });
    if (log?.notes.trim()) {
      setNotes.push({
        exerciseName: step.item.exerciseName,
        setNumber: step.setNumber,
        body: log.notes.trim(),
      });
    }
  }

  return {
    assignment,
    blocks,
    plannedSets: steps.length,
    loggedSets: steps.filter((step) => byKey.has(step.key)).length,
    durationMinutes: durationOf(assignment),
    volumeKg: volumeOf(logs),
    setNotes,
  };
}
