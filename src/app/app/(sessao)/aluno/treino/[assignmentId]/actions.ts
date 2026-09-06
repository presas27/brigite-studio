"use server";

import { getTranslations } from "next-intl/server";
import { requireClientAccess } from "@/lib/studio/auth";
import {
  clearSet,
  completeAssignment,
  discardAssignment,
  findAssignment,
  recordSet,
  saveExerciseNote,
  setAssignmentStatus,
  startAssignment,
  swapExercise,
} from "@/lib/studio/plan";
import { isRestItem, type Assignment } from "@/lib/studio/types";

/**
 * Every mutation here is scoped to one assignment and gated the same way:
 * load it, then run `requireClientAccess` on its owning client. That covers
 * both the client logging their own session and the coach opening it to
 * check in — either way, only the right people can write to it.
 */
async function assignmentFor(assignmentId: string): Promise<Assignment> {
  const assignment = await findAssignment(assignmentId);
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
  await recordSet({
    assignmentId: assignment.id,
    itemId: input.itemId,
    exerciseId: input.exerciseId,
    setIndex: input.setIndex,
    reps: input.reps,
    loadKg: input.loadKg,
    seconds: input.seconds,
    rpe: input.rpe,
  });
  // No `refresh()`: this fires on every logged set, sometimes every debounce
  // tick while typing. The logger already reflects the write in its own state —
  // re-rendering the whole route on this cadence would be wasted work for no
  // visible change, and would fight the input the client is still typing into.
}

export async function unlogSet(input: {
  assignmentId: string;
  itemId: string;
  setIndex: number;
}): Promise<void> {
  const assignment = await assignmentFor(input.assignmentId);
  await clearSet(assignment.id, input.itemId, input.setIndex);
}

/**
 * Save the client's own note on one exercise of this session, or clear it by
 * saving an empty one.
 *
 * No `refresh()`, for the same reason `logSet` has none: the player already
 * holds the note in its own state and shows it, and re-rendering the route
 * mid-session would throw away the position she is at in the queue.
 */
export async function saveNote(input: {
  assignmentId: string;
  itemId: string;
  exerciseId: string;
  body: string;
}): Promise<void> {
  const assignment = await assignmentFor(input.assignmentId);
  await saveExerciseNote({
    assignmentId: assignment.id,
    itemId: input.itemId,
    exerciseId: input.exerciseId,
    body: input.body,
  });
}

/**
 * Swap one exercise of this session for another, this session only.
 *
 * The line the coach's thread gets is worded here, in the client's language,
 * because this is where the translations are; the mutation only posts it when
 * there is a coach to read it. No `refresh()`: the player subscribes to the
 * assignment, so the swapped snapshot arrives without throwing the route.
 */
export async function swapSessionExercise(input: {
  assignmentId: string;
  itemId: string;
  exerciseId: string;
  exerciseName: string;
  note: string;
}): Promise<void> {
  const assignment = await assignmentFor(input.assignmentId);
  const current = assignment.snapshot.blocks
    .flatMap((block) => block.items)
    .find((item) => item.id === input.itemId);
  if (!current || isRestItem(current)) throw new Error("No such exercise in this session");

  const t = await getTranslations("Studio.session");
  const note = input.note.trim();
  const restoring = current.replaces?.exerciseId === input.exerciseId;
  const line = restoring
    ? t("swapRestoreMessage", { name: input.exerciseName, workout: assignment.snapshot.name })
    : t("swapMessage", {
        from: current.replaces?.exerciseName ?? current.exerciseName,
        to: input.exerciseName,
        workout: assignment.snapshot.name,
      });

  await swapExercise({
    assignmentId: assignment.id,
    itemId: input.itemId,
    exerciseId: input.exerciseId,
    note,
    message: note ? `${line}\n${note}` : line,
  });
}

export async function beginSession(assignmentId: string): Promise<void> {
  const assignment = await assignmentFor(assignmentId);
  await startAssignment(assignment.id);
}

/**
 * Close the session. `effort` is the 1-10 the player asks for on the way out —
 * `null` when she chose not to answer, which is a legitimate answer and not a
 * reason to refuse the write. `extraRestSeconds` is how much she added to the
 * prescribed rests, which is Sara's signal that a session was pitched too hard.
 * A session submitted half-finished is still a session that happened.
 *
 * No `refresh()`, same as `discardSession`: the player draws the summary from
 * its own state the moment this resolves, and the live subscription carries
 * the new status; a route refresh here was one more server round trip between
 * "finish" and the summary, for a page that nothing on it re-reads.
 */
export async function finishSession(
  assignmentId: string,
  input: { effort: number | null; extraRestSeconds: number },
): Promise<void> {
  const assignment = await assignmentFor(assignmentId);
  const effort =
    input.effort == null || Number.isNaN(input.effort) ? null : input.effort;
  const extraRestSeconds = Number.isFinite(input.extraRestSeconds) ? input.extraRestSeconds : 0;
  await completeAssignment(assignment.id, { effort, extraRestSeconds });
}

export async function skipSession(assignmentId: string): Promise<void> {
  const assignment = await assignmentFor(assignmentId);
  await setAssignmentStatus(assignment.id, "skipped");
}

/**
 * Throw the session away and put it back to never-opened: logs deleted,
 * `startedAt` cleared, status back to scheduled. Deliberately distinct from
 * skipping — "I opened this by mistake" and "I could not train this week" are
 * different facts, and only the second one is Sara's business.
 *
 * No `refresh()` here either: the player leaves this route the moment the
 * discard lands, and refreshing the page on the way out re-rendered it as an
 * untouched session for one frame under the sheet — the workout flashing
 * back before the exit. `/app/aluno` is dynamic and renders fresh.
 */
export async function discardSession(assignmentId: string): Promise<void> {
  const assignment = await assignmentFor(assignmentId);
  await discardAssignment(assignment.id);
}
