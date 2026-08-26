import { searchKey } from "@/lib/utils";
import { all, get, run, tx, type Row } from "./db";
import { newId } from "./id";
import type {
  BlockKind,
  Exercise,
  Tracking,
  Workout,
  WorkoutBlock,
  WorkoutItem,
  WorkoutSummary,
  WorkoutType,
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
    cuesEn: String(row.cues_en ?? ""),
    videoUrl: row.video_url == null ? null : String(row.video_url),
    tags: parseTags(row.tags),
    tracking: String(row.tracking) as Tracking,
    regressionOf: row.regression_of == null ? null : String(row.regression_of),
    archived: Number(row.archived) === 1,
    createdAt: Number(row.created_at),
  };
}

const EXERCISE_COLUMNS =
  "id, name, cues, cues_en, video_url, tags, tracking, regression_of, archived, created_at";

export function listExercises(options: { search?: string; tag?: string } = {}): Exercise[] {
  const clauses = ["archived = 0"];
  const params: string[] = [];
  if (options.search?.trim()) {
    clauses.push("(name LIKE ? OR cues LIKE ? OR cues_en LIKE ?)");
    const like = `%${options.search.trim()}%`;
    params.push(like, like, like);
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

/**
 * Every exercise name already in the library, accent- and case-folded.
 *
 * The seed uses this to decide what is missing. Archived rows count: a name
 * Sara archived on purpose must not come back on the next boot.
 */
export function exerciseNameKeys(): Set<string> {
  const rows = all<Row>("SELECT name FROM exercises");
  return new Set(rows.map((row) => searchKey(String(row.name)).trim()));
}

export function createExercise(input: {
  name: string;
  cues?: string;
  cuesEn?: string;
  videoUrl?: string | null;
  tags?: string[];
  tracking?: Tracking;
  regressionOf?: string | null;
}): Exercise {
  const exerciseId = newId();
  run(
    `INSERT INTO exercises
       (id, name, cues, cues_en, video_url, tags, tracking, regression_of, archived, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
    exerciseId,
    input.name.trim(),
    input.cues ?? "",
    input.cuesEn ?? "",
    input.videoUrl?.trim() || null,
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
    cuesEn?: string;
    videoUrl?: string | null;
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
  if (patch.cuesEn !== undefined) {
    fields.push("cues_en = ?");
    values.push(patch.cuesEn);
  }
  if (patch.videoUrl !== undefined) {
    fields.push("video_url = ?");
    values.push(patch.videoUrl?.trim() || null);
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

function mapItem(row: Row): WorkoutItem {
  return {
    id: String(row.id),
    position: Number(row.position),
    exerciseId: String(row.exercise_id),
    exerciseName: String(row.exercise_name ?? ""),
    tracking: String(row.tracking ?? "reps") as Tracking,
    videoUrl: row.video_url == null ? null : String(row.video_url),
    cues: String(row.cues ?? ""),
    cuesEn: String(row.cues_en ?? ""),
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
            e.name AS exercise_name, e.tracking, e.video_url, e.cues, e.cues_en
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

const WORKOUT_COLUMNS =
  "id, name, focus, notes, instructions, workout_type, coach_id, client_id, phase_id, " +
  "source_workout_id, position, archived, created_at, updated_at";

/** Shared by the library and by `phases.ts`, which lists the same rows. */
export function workoutMetaFromRow(row: Row): Omit<Workout, "blocks"> {
  return {
    id: String(row.id),
    name: String(row.name),
    focus: String(row.focus ?? ""),
    notes: String(row.notes ?? ""),
    instructions: String(row.instructions ?? ""),
    workoutType: String(row.workout_type ?? "regular") as WorkoutType,
    coachId: row.coach_id == null ? null : String(row.coach_id),
    clientId: row.client_id == null ? null : String(row.client_id),
    phaseId: row.phase_id == null ? null : String(row.phase_id),
    sourceWorkoutId: row.source_workout_id == null ? null : String(row.source_workout_id),
    position: Number(row.position ?? 0),
    archived: Number(row.archived) === 1,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}

export function findWorkout(workoutId: string): Workout | undefined {
  const row = get<Row>(`SELECT ${WORKOUT_COLUMNS} FROM workouts WHERE id = ?`, workoutId);
  if (!row) return undefined;
  return { ...workoutMetaFromRow(row), blocks: workoutBlocks(workoutId) };
}

/**
 * The library: templates only. A client-scoped copy inside a training phase is
 * a `workouts` row too, and `client_id IS NULL` is what keeps it out of here —
 * one client's adapted version of a workout is nobody else's template.
 */
export function listWorkouts(search?: string): WorkoutSummary[] {
  const like = search?.trim() ? `%${search.trim()}%` : null;
  const rows = all<Row>(
    `SELECT w.id, w.name, w.focus, w.notes, w.instructions, w.workout_type, w.coach_id,
            w.client_id, w.phase_id, w.source_workout_id, w.position, w.archived,
            w.created_at, w.updated_at,
            (SELECT count(*) FROM workout_items i
               JOIN workout_blocks b ON b.id = i.block_id
              WHERE b.workout_id = w.id) AS item_count
       FROM workouts w
      WHERE w.archived = 0 AND w.client_id IS NULL
            ${like ? "AND (w.name LIKE ? OR w.focus LIKE ?)" : ""}
      ORDER BY w.created_at DESC`,
    ...(like ? [like, like] : []),
  );
  return rows.map((row) => ({ ...workoutMetaFromRow(row), itemCount: Number(row.item_count) }));
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

/**
 * A workout row. Left plain it is a library template; give it `clientId` and
 * `phaseId` and it is that client's own copy inside one training phase, which
 * the library never lists.
 */
export function createWorkout(input: {
  name: string;
  focus?: string;
  notes?: string;
  instructions?: string;
  workoutType?: WorkoutType;
  coachId?: string | null;
  clientId?: string | null;
  phaseId?: string | null;
  sourceWorkoutId?: string | null;
  position?: number;
}): string {
  const workoutId = newId();
  const now = Date.now();
  run(
    `INSERT INTO workouts
       (id, name, focus, notes, instructions, workout_type, coach_id, client_id, phase_id,
        source_workout_id, position, archived, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
    workoutId,
    input.name.trim(),
    input.focus ?? "",
    input.notes ?? "",
    input.instructions ?? "",
    input.workoutType ?? "regular",
    input.coachId ?? null,
    input.clientId ?? null,
    input.phaseId ?? null,
    input.sourceWorkoutId ?? null,
    input.position ?? 0,
    now,
    now,
  );
  return workoutId;
}

export function updateWorkout(
  workoutId: string,
  patch: {
    name?: string;
    focus?: string;
    notes?: string;
    instructions?: string;
    workoutType?: WorkoutType;
  },
): void {
  const fields: string[] = [];
  const values: (string | number)[] = [];
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
  if (patch.instructions !== undefined) {
    fields.push("instructions = ?");
    values.push(patch.instructions);
  }
  if (patch.workoutType !== undefined) {
    fields.push("workout_type = ?");
    values.push(patch.workoutType);
  }
  if (fields.length === 0) return;
  fields.push("updated_at = ?");
  values.push(Date.now());
  run(`UPDATE workouts SET ${fields.join(", ")} WHERE id = ?`, ...values, workoutId);
}

export function archiveWorkout(workoutId: string): void {
  run("UPDATE workouts SET archived = 1 WHERE id = ?", workoutId);
}

/** Stamps the parent workout as edited — called after any block/item mutation. */
function touchWorkout(workoutId: string): void {
  run("UPDATE workouts SET updated_at = ? WHERE id = ?", Date.now(), workoutId);
}

function workoutIdForBlock(blockId: string): string | undefined {
  const row = get<Row>("SELECT workout_id FROM workout_blocks WHERE id = ?", blockId);
  return row ? String(row.workout_id) : undefined;
}

function workoutIdForItem(itemId: string): string | undefined {
  const row = get<Row>(
    `SELECT b.workout_id AS workout_id FROM workout_items i
       JOIN workout_blocks b ON b.id = i.block_id
      WHERE i.id = ?`,
    itemId,
  );
  return row ? String(row.workout_id) : undefined;
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
  const blockId = newId();
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
  touchWorkout(workoutId);
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
  const workoutId = workoutIdForBlock(blockId);
  if (workoutId) touchWorkout(workoutId);
}

export function removeBlock(blockId: string): void {
  const workoutId = workoutIdForBlock(blockId);
  run("DELETE FROM workout_blocks WHERE id = ?", blockId);
  if (workoutId) touchWorkout(workoutId);
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
  const itemId = newId();
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
  const workoutId = workoutIdForBlock(blockId);
  if (workoutId) touchWorkout(workoutId);
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
  const workoutId = workoutIdForItem(itemId);
  if (workoutId) touchWorkout(workoutId);
}

export function removeItem(itemId: string): void {
  const workoutId = workoutIdForItem(itemId);
  run("DELETE FROM workout_items WHERE id = ?", itemId);
  if (workoutId) touchWorkout(workoutId);
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
  const workoutId = workoutIdForBlock(String(item.block_id));
  if (workoutId) touchWorkout(workoutId);
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
  const workoutId = workoutIdForBlock(blockId);
  if (workoutId) touchWorkout(workoutId);
}

/**
 * Deep-copy a workout — blocks and items included — applying `overrides` to
 * the copy's own columns. This is what keeps the library safe: adding a
 * template to a training phase copies it here and now, so every later edit the
 * coach makes lands on the client's copy and the template is never touched.
 */
export function copyWorkout(
  workoutId: string,
  overrides: {
    name?: string;
    coachId?: string | null;
    clientId?: string | null;
    phaseId?: string | null;
    sourceWorkoutId?: string | null;
    position?: number;
  } = {},
): string | undefined {
  const source = findWorkout(workoutId);
  if (!source) return undefined;
  return tx(() => {
    const copyId = createWorkout({
      name: overrides.name ?? source.name,
      focus: source.focus,
      notes: source.notes,
      instructions: source.instructions,
      workoutType: source.workoutType,
      coachId: overrides.coachId ?? source.coachId,
      clientId: overrides.clientId ?? null,
      phaseId: overrides.phaseId ?? null,
      sourceWorkoutId: overrides.sourceWorkoutId ?? null,
      position: overrides.position ?? 0,
    });
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

/** Duplicate a library template as another library template. */
export function duplicateWorkout(workoutId: string, name: string): string | undefined {
  return copyWorkout(workoutId, { name });
}

/* --------------------------------------------------- supersets and circuits */

/**
 * Exercises that belong to no group. Every workout has exactly one of these:
 * the `normal` block, kept after every group so the builder reads "groups,
 * then whatever is still loose".
 *
 * Created on demand, and consolidated when it has to be: the block-first
 * builder this replaced let a coach add several plain blocks to one workout,
 * and an exercise-first list has one place for ungrouped work, not three. The
 * extra blocks' exercises are folded into the survivor rather than dropped.
 */
export function looseBlockId(workoutId: string): string {
  const normals = all<Row>(
    `SELECT id FROM workout_blocks WHERE workout_id = ? AND kind = 'normal' ORDER BY position`,
    workoutId,
  ).map((row) => String(row.id));

  if (normals.length === 0) return addBlock(workoutId, { kind: "normal" });
  if (normals.length === 1) return normals[0];

  const [keeper, ...extras] = normals;
  tx(() => {
    const merged = [keeper, ...extras].flatMap((blockId) =>
      all<Row>("SELECT id FROM workout_items WHERE block_id = ? ORDER BY position", blockId).map(
        (row) => String(row.id),
      ),
    );
    reorderItems(keeper, merged);
    for (const blockId of extras) run("DELETE FROM workout_blocks WHERE id = ?", blockId);
  });
  return keeper;
}

/**
 * Pull `itemIds` out of wherever they sit and into one new group, in the order
 * given. The group is appended after every existing block and the loose block
 * is then pushed past it, which keeps two things true at once: groups stay in
 * the order they were created, and the ungrouped list stays last.
 *
 * Returns the new block id, or `undefined` when fewer than two exercises were
 * selected: a group of one is just an exercise.
 */
export function groupItems(
  workoutId: string,
  itemIds: string[],
  kind: "superset" | "circuit",
  rounds = 3,
): string | undefined {
  if (itemIds.length < 2) return undefined;
  return tx(() => {
    const loose = looseBlockId(workoutId);
    const last = Number(
      get<Row>(
        "SELECT coalesce(max(position), -1) AS last FROM workout_blocks WHERE workout_id = ?",
        workoutId,
      )?.last ?? -1,
    );
    const blockId = newId();
    run(
      `INSERT INTO workout_blocks (id, workout_id, position, kind, label, rounds, rest_seconds)
       VALUES (?, ?, ?, ?, '', ?, 60)`,
      blockId,
      workoutId,
      last + 1,
      kind,
      kind === "circuit" ? Math.max(1, Math.trunc(rounds)) : 1,
    );
    run("UPDATE workout_blocks SET position = ? WHERE id = ?", last + 2, loose);
    reorderItems(blockId, itemIds);
    dropEmptyGroups(workoutId);
    touchWorkout(workoutId);
    return blockId;
  });
}

/**
 * Break a group up: its exercises go back to the loose list, in order, and the
 * group itself goes away. The inverse of `groupItems`.
 */
export function ungroupBlock(blockId: string): void {
  const workoutId = workoutIdForBlock(blockId);
  if (!workoutId) return;
  tx(() => {
    const loose = looseBlockId(workoutId);
    if (loose === blockId) return;
    const looseItems = all<Row>(
      "SELECT id FROM workout_items WHERE block_id = ? ORDER BY position",
      loose,
    ).map((row) => String(row.id));
    const moving = all<Row>(
      "SELECT id FROM workout_items WHERE block_id = ? ORDER BY position",
      blockId,
    ).map((row) => String(row.id));
    reorderItems(loose, [...looseItems, ...moving]);
    run("DELETE FROM workout_blocks WHERE id = ?", blockId);
  });
  touchWorkout(workoutId);
}

/**
 * Groups left empty by a regroup are noise, not structure — a "Super set 2"
 * with nothing in it would still take a number. The loose block survives empty
 * because `looseBlockId` would only recreate it.
 */
function dropEmptyGroups(workoutId: string): void {
  run(
    `DELETE FROM workout_blocks
      WHERE workout_id = ? AND kind <> 'normal'
        AND NOT EXISTS (SELECT 1 FROM workout_items WHERE block_id = workout_blocks.id)`,
    workoutId,
  );
}
