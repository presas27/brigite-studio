import { randomUUID } from "node:crypto";
import { all, get, run, tx, type Row } from "./db";
import type {
  BlockKind,
  Exercise,
  Tracking,
  Workout,
  WorkoutBlock,
  WorkoutItem,
  WorkoutSummary,
} from "./types";

/**
 * Sara's own library: exercises she films herself, and the workouts built from
 * them. This is the asset no off-the-shelf platform has — aerial, hand
 * balancing and mobility work simply is not in a commercial exercise database.
 */

function parseTags(raw: unknown): string[] {
  try {
    const parsed: unknown = JSON.parse(String(raw ?? "[]"));
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function mapExercise(row: Row): Exercise {
  return {
    id: String(row.id),
    name: String(row.name),
    cues: String(row.cues ?? ""),
    videoUrl: row.video_url == null ? null : String(row.video_url),
    mediaId: row.media_id == null ? null : String(row.media_id),
    tags: parseTags(row.tags),
    tracking: String(row.tracking) as Tracking,
    regressionOf: row.regression_of == null ? null : String(row.regression_of),
    archived: Number(row.archived) === 1,
    createdAt: Number(row.created_at),
  };
}

const EXERCISE_COLUMNS =
  "id, name, cues, video_url, media_id, tags, tracking, regression_of, archived, created_at";

export function listExercises(options: { search?: string; tag?: string } = {}): Exercise[] {
  const clauses = ["archived = 0"];
  const params: string[] = [];
  if (options.search?.trim()) {
    clauses.push("(name LIKE ? OR cues LIKE ?)");
    const like = `%${options.search.trim()}%`;
    params.push(like, like);
  }
  if (options.tag?.trim()) {
    clauses.push("tags LIKE ?");
    params.push(`%"${options.tag.trim()}"%`);
  }
  const rows = all<Row>(
    `SELECT ${EXERCISE_COLUMNS} FROM exercises
      WHERE ${clauses.join(" AND ")}
      ORDER BY name COLLATE NOCASE`,
    ...params,
  );
  return rows.map(mapExercise);
}

export function findExercise(exerciseId: string): Exercise | undefined {
  const row = get<Row>(`SELECT ${EXERCISE_COLUMNS} FROM exercises WHERE id = ?`, exerciseId);
  return row && mapExercise(row);
}

/** Every distinct tag in use, with its exercise count. */
export function exerciseTags(): { tag: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const exercise of listExercises()) {
    for (const tag of exercise.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return [...counts]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, "pt"));
}

export function createExercise(input: {
  name: string;
  cues?: string;
  videoUrl?: string | null;
  mediaId?: string | null;
  tags?: string[];
  tracking?: Tracking;
  regressionOf?: string | null;
}): Exercise {
  const exerciseId = randomUUID();
  run(
    `INSERT INTO exercises
       (id, name, cues, video_url, media_id, tags, tracking, regression_of, archived, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
    exerciseId,
    input.name.trim(),
    input.cues ?? "",
    input.videoUrl?.trim() || null,
    input.mediaId ?? null,
    JSON.stringify(input.tags ?? []),
    input.tracking ?? "reps",
    input.regressionOf ?? null,
    Date.now(),
  );
  return findExercise(exerciseId)!;
}

export function updateExercise(
  exerciseId: string,
  patch: {
    name?: string;
    cues?: string;
    videoUrl?: string | null;
    mediaId?: string | null;
    tags?: string[];
    tracking?: Tracking;
    regressionOf?: string | null;
  },
): void {
  const fields: string[] = [];
  const values: (string | number | null)[] = [];
  if (patch.name !== undefined) {
    fields.push("name = ?");
    values.push(patch.name.trim());
  }
  if (patch.cues !== undefined) {
    fields.push("cues = ?");
    values.push(patch.cues);
  }
  if (patch.videoUrl !== undefined) {
    fields.push("video_url = ?");
    values.push(patch.videoUrl?.trim() || null);
  }
  if (patch.mediaId !== undefined) {
    fields.push("media_id = ?");
    values.push(patch.mediaId);
  }
  if (patch.tags !== undefined) {
    fields.push("tags = ?");
    values.push(JSON.stringify(patch.tags));
  }
  if (patch.tracking !== undefined) {
    fields.push("tracking = ?");
    values.push(patch.tracking);
  }
  if (patch.regressionOf !== undefined) {
    fields.push("regression_of = ?");
    values.push(patch.regressionOf);
  }
  if (fields.length === 0) return;
  run(`UPDATE exercises SET ${fields.join(", ")} WHERE id = ?`, ...values, exerciseId);
}

/** Soft delete — workout history keeps referencing the row. */
export function archiveExercise(exerciseId: string): void {
  run("UPDATE exercises SET archived = 1 WHERE id = ?", exerciseId);
}

/**
 * True when a media id is an exercise demo. Demos are coach-owned but meant to
 * be watched by clients, so the media route needs this to widen access without
 * opening up client uploads.
 */
export function isExerciseDemo(mediaId: string): boolean {
  return get<Row>("SELECT 1 AS hit FROM exercises WHERE media_id = ? LIMIT 1", mediaId) != null;
}

function mapItem(row: Row): WorkoutItem {
  return {
    id: String(row.id),
    position: Number(row.position),
    exerciseId: String(row.exercise_id),
    exerciseName: String(row.exercise_name ?? ""),
    tracking: String(row.tracking ?? "reps") as Tracking,
    videoUrl: row.video_url == null ? null : String(row.video_url),
    mediaId: row.media_id == null ? null : String(row.media_id),
    cues: String(row.cues ?? ""),
    sets: Number(row.sets),
    reps: String(row.reps ?? ""),
    seconds: row.seconds == null ? null : Number(row.seconds),
    tempo: String(row.tempo ?? ""),
    restSeconds: Number(row.rest_seconds),
    rpe: String(row.rpe ?? ""),
    notes: String(row.notes ?? ""),
  };
}

/** Blocks with their items, ordered, for one workout. */
export function workoutBlocks(workoutId: string): WorkoutBlock[] {
  const blockRows = all<Row>(
    `SELECT id, position, kind, label, rounds, rest_seconds
       FROM workout_blocks WHERE workout_id = ? ORDER BY position`,
    workoutId,
  );
  if (blockRows.length === 0) return [];

  const itemRows = all<Row>(
    `SELECT i.id, i.block_id, i.position, i.exercise_id, i.sets, i.reps, i.seconds,
            i.tempo, i.rest_seconds, i.rpe, i.notes,
            e.name AS exercise_name, e.tracking, e.video_url, e.media_id, e.cues
       FROM workout_items i
       JOIN exercises e ON e.id = i.exercise_id
      WHERE i.block_id IN (SELECT id FROM workout_blocks WHERE workout_id = ?)
      ORDER BY i.position`,
    workoutId,
  );

  const byBlock = new Map<string, WorkoutItem[]>();
  for (const row of itemRows) {
    const key = String(row.block_id);
    const list = byBlock.get(key);
    if (list) list.push(mapItem(row));
    else byBlock.set(key, [mapItem(row)]);
  }

  return blockRows.map((row) => ({
    id: String(row.id),
    position: Number(row.position),
    kind: String(row.kind) as BlockKind,
    label: String(row.label ?? ""),
    rounds: Number(row.rounds),
    restSeconds: Number(row.rest_seconds),
    items: byBlock.get(String(row.id)) ?? [],
  }));
}

export function findWorkout(workoutId: string): Workout | undefined {
  const row = get<Row>(
    "SELECT id, name, focus, notes, archived, created_at FROM workouts WHERE id = ?",
    workoutId,
  );
  if (!row) return undefined;
  return {
    id: String(row.id),
    name: String(row.name),
    focus: String(row.focus ?? ""),
    notes: String(row.notes ?? ""),
    archived: Number(row.archived) === 1,
    createdAt: Number(row.created_at),
    blocks: workoutBlocks(workoutId),
  };
}

export function listWorkouts(search?: string): WorkoutSummary[] {
  const like = search?.trim() ? `%${search.trim()}%` : null;
  const rows = all<Row>(
    `SELECT w.id, w.name, w.focus, w.notes, w.archived, w.created_at,
            (SELECT count(*) FROM workout_items i
               JOIN workout_blocks b ON b.id = i.block_id
              WHERE b.workout_id = w.id) AS item_count
       FROM workouts w
      WHERE w.archived = 0 ${like ? "AND (w.name LIKE ? OR w.focus LIKE ?)" : ""}
      ORDER BY w.created_at DESC`,
    ...(like ? [like, like] : []),
  );
  return rows.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    focus: String(row.focus ?? ""),
    notes: String(row.notes ?? ""),
    archived: Number(row.archived) === 1,
    createdAt: Number(row.created_at),
    itemCount: Number(row.item_count),
  }));
}

/** Every distinct workout focus in use, with its workout count. */
export function workoutFocuses(): { tag: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const workout of listWorkouts()) {
    const focus = workout.focus.trim();
    if (focus) counts.set(focus, (counts.get(focus) ?? 0) + 1);
  }
  return [...counts]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, "pt"));
}

export function createWorkout(input: {
  name: string;
  focus?: string;
  notes?: string;
}): string {
  const workoutId = randomUUID();
  run(
    `INSERT INTO workouts (id, name, focus, notes, archived, created_at)
     VALUES (?, ?, ?, ?, 0, ?)`,
    workoutId,
    input.name.trim(),
    input.focus ?? "",
    input.notes ?? "",
    Date.now(),
  );
  return workoutId;
}

export function updateWorkout(
  workoutId: string,
  patch: { name?: string; focus?: string; notes?: string },
): void {
  const fields: string[] = [];
  const values: string[] = [];
  if (patch.name !== undefined) {
    fields.push("name = ?");
    values.push(patch.name.trim());
  }
  if (patch.focus !== undefined) {
    fields.push("focus = ?");
    values.push(patch.focus);
  }
  if (patch.notes !== undefined) {
    fields.push("notes = ?");
    values.push(patch.notes);
  }
  if (fields.length === 0) return;
  run(`UPDATE workouts SET ${fields.join(", ")} WHERE id = ?`, ...values, workoutId);
}

export function archiveWorkout(workoutId: string): void {
  run("UPDATE workouts SET archived = 1 WHERE id = ?", workoutId);
}

/** Append a block at the end of a workout. Returns the new block id. */
export function addBlock(
  workoutId: string,
  input: { kind?: BlockKind; label?: string; rounds?: number; restSeconds?: number } = {},
): string {
  const row = get<Row>(
    "SELECT coalesce(max(position), -1) AS last FROM workout_blocks WHERE workout_id = ?",
    workoutId,
  );
  const blockId = randomUUID();
  run(
    `INSERT INTO workout_blocks (id, workout_id, position, kind, label, rounds, rest_seconds)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    blockId,
    workoutId,
    Number(row?.last ?? -1) + 1,
    input.kind ?? "normal",
    input.label ?? "",
    input.rounds ?? 1,
    input.restSeconds ?? 60,
  );
  return blockId;
}

export function updateBlock(
  blockId: string,
  patch: { kind?: BlockKind; label?: string; rounds?: number; restSeconds?: number },
): void {
  const fields: string[] = [];
  const values: (string | number)[] = [];
  if (patch.kind !== undefined) {
    fields.push("kind = ?");
    values.push(patch.kind);
  }
  if (patch.label !== undefined) {
    fields.push("label = ?");
    values.push(patch.label);
  }
  if (patch.rounds !== undefined) {
    fields.push("rounds = ?");
    values.push(Math.max(1, Math.trunc(patch.rounds)));
  }
  if (patch.restSeconds !== undefined) {
    fields.push("rest_seconds = ?");
    values.push(Math.max(0, Math.trunc(patch.restSeconds)));
  }
  if (fields.length === 0) return;
  run(`UPDATE workout_blocks SET ${fields.join(", ")} WHERE id = ?`, ...values, blockId);
}

export function removeBlock(blockId: string): void {
  run("DELETE FROM workout_blocks WHERE id = ?", blockId);
}

/** Append an exercise to a block. Returns the new item id. */
export function addItem(
  blockId: string,
  input: {
    exerciseId: string;
    sets?: number;
    reps?: string;
    seconds?: number | null;
    tempo?: string;
    restSeconds?: number;
    rpe?: string;
    notes?: string;
  },
): string {
  const row = get<Row>(
    "SELECT coalesce(max(position), -1) AS last FROM workout_items WHERE block_id = ?",
    blockId,
  );
  const itemId = randomUUID();
  run(
    `INSERT INTO workout_items
       (id, block_id, position, exercise_id, sets, reps, seconds, tempo, rest_seconds, rpe, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    itemId,
    blockId,
    Number(row?.last ?? -1) + 1,
    input.exerciseId,
    input.sets ?? 3,
    input.reps ?? "",
    input.seconds ?? null,
    input.tempo ?? "",
    input.restSeconds ?? 60,
    input.rpe ?? "",
    input.notes ?? "",
  );
  return itemId;
}

export function updateItem(
  itemId: string,
  patch: {
    sets?: number;
    reps?: string;
    seconds?: number | null;
    tempo?: string;
    restSeconds?: number;
    rpe?: string;
    notes?: string;
  },
): void {
  const fields: string[] = [];
  const values: (string | number | null)[] = [];
  if (patch.sets !== undefined) {
    fields.push("sets = ?");
    values.push(Math.max(1, Math.trunc(patch.sets)));
  }
  if (patch.reps !== undefined) {
    fields.push("reps = ?");
    values.push(patch.reps);
  }
  if (patch.seconds !== undefined) {
    fields.push("seconds = ?");
    values.push(patch.seconds);
  }
  if (patch.tempo !== undefined) {
    fields.push("tempo = ?");
    values.push(patch.tempo);
  }
  if (patch.restSeconds !== undefined) {
    fields.push("rest_seconds = ?");
    values.push(Math.max(0, Math.trunc(patch.restSeconds)));
  }
  if (patch.rpe !== undefined) {
    fields.push("rpe = ?");
    values.push(patch.rpe);
  }
  if (patch.notes !== undefined) {
    fields.push("notes = ?");
    values.push(patch.notes);
  }
  if (fields.length === 0) return;
  run(`UPDATE workout_items SET ${fields.join(", ")} WHERE id = ?`, ...values, itemId);
}

export function removeItem(itemId: string): void {
  run("DELETE FROM workout_items WHERE id = ?", itemId);
}

/** Move an item one slot up or down within its block. */
export function moveItem(itemId: string, direction: -1 | 1): void {
  const item = get<Row>(
    "SELECT block_id, position FROM workout_items WHERE id = ?",
    itemId,
  );
  if (!item) return;
  const neighbour = get<Row>(
    `SELECT id, position FROM workout_items
      WHERE block_id = ? AND position ${direction < 0 ? "<" : ">"} ?
      ORDER BY position ${direction < 0 ? "DESC" : "ASC"} LIMIT 1`,
    String(item.block_id),
    Number(item.position),
  );
  if (!neighbour) return;
  tx(() => {
    run("UPDATE workout_items SET position = ? WHERE id = ?", Number(item.position), String(neighbour.id));
    run("UPDATE workout_items SET position = ? WHERE id = ?", Number(neighbour.position), itemId);
  });
}

/**
 * Rewrite one block's running order after a drag. Every id in `itemIds` is
 * given the position of its index and adopted into `blockId`, which is what
 * lets a card be dragged from one block into another: the target block posts
 * its new list and the item follows it across.
 */
export function reorderItems(blockId: string, itemIds: string[]): void {
  if (itemIds.length === 0) return;
  tx(() => {
    itemIds.forEach((itemId, index) => {
      run(
        "UPDATE workout_items SET block_id = ?, position = ? WHERE id = ?",
        blockId,
        index,
        itemId,
      );
    });
  });
}

/** Deep-copy a workout, blocks and items included. */
export function duplicateWorkout(workoutId: string, name: string): string | undefined {
  const source = findWorkout(workoutId);
  if (!source) return undefined;
  return tx(() => {
    const copyId = createWorkout({ name, focus: source.focus, notes: source.notes });
    for (const block of source.blocks) {
      const blockId = addBlock(copyId, {
        kind: block.kind,
        label: block.label,
        rounds: block.rounds,
        restSeconds: block.restSeconds,
      });
      for (const item of block.items) {
        addItem(blockId, {
          exerciseId: item.exerciseId,
          sets: item.sets,
          reps: item.reps,
          seconds: item.seconds,
          tempo: item.tempo,
          restSeconds: item.restSeconds,
          rpe: item.rpe,
          notes: item.notes,
        });
      }
    }
    return copyId;
  });
}
