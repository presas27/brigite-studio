import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { sq } from "@/lib/studio/convexServer";
import { exerciseNotesFor, findAssignment, logsFor } from "./plan";
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
 *
 * The list used to be a `GROUP BY` over `set_logs` stitched to the assignments
 * here; that counting now happens in `convex/plan.ts`, next to the logs, and
 * the page gets its rows in one call. The detail view still composes on this
 * side, because it composes out of two things the app already fetches.
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

/** Every session this client has finished or missed, newest first. */
export async function sessionHistory(clientId: string, limit = 60): Promise<SessionRow[]> {
  return sq(api.plan.sessionHistory, { clientId: clientId as Id<"users">, limit });
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
  /**
   * What the client wrote about each exercise in this session, in the order the
   * exercises came up.
   *
   * Separate from `setNotes`: that is a remark attached to one set's numbers,
   * this is the client telling the coach about the movement — the shoulder, the
   * band, the thing she would have had to ask about otherwise.
   */
  exerciseNotes: { exerciseName: string; body: string }[];
};

/**
 * One session, prescribed against logged.
 *
 * Sets with nothing against them are kept rather than dropped — a report that
 * silently omits the two sets she never did says the workout was three sets
 * long, which is the one thing the coach must not be told.
 */
export async function sessionReport(assignmentId: string): Promise<SessionReport | undefined> {
  const assignment = await findAssignment(assignmentId);
  if (!assignment) return undefined;

  const steps = buildSessionQueue(assignment.snapshot);
  const [logs, notes] = await Promise.all([
    logsFor(assignment.id),
    exerciseNotesFor(assignment.id),
  ]);
  const byKey = new Map(logs.map((log) => [`${log.itemId}:${log.setIndex}`, log]));
  const noteByItem = new Map(notes.map((note) => [note.itemId, note.body]));

  const blocks: ReportBlock[] = [];
  const items = new Map<string, ReportItem>();
  const setNotes: SessionReport["setNotes"] = [];
  const exerciseNotes: SessionReport["exerciseNotes"] = [];

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

      // Collected on the item's first step rather than on every set of it, so
      // one note per exercise is listed once — the steps loop visits an
      // exercise as many times as it has sets.
      const note = noteByItem.get(step.itemId);
      if (note?.trim()) {
        exerciseNotes.push({ exerciseName: step.item.exerciseName, body: note.trim() });
      }
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

  const sessionNote = noteByItem.get("__session");
  if (sessionNote?.trim()) {
    exerciseNotes.unshift({
      exerciseName: assignment.snapshot.name,
      body: sessionNote.trim(),
    });
  }

  return {
    assignment,
    blocks,
    plannedSets: steps.length,
    loggedSets: steps.filter((step) => byKey.has(step.key)).length,
    durationMinutes: durationOf(assignment),
    volumeKg: volumeOf(logs),
    setNotes,
    exerciseNotes,
  };
}
