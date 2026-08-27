import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { sm, sq } from "@/lib/studio/convexServer";
import type {
  BlockKind,
  Exercise,
  Tracking,
  Workout,
  WorkoutBlock,
  WorkoutSummary,
  WorkoutType,
} from "./types";

/**
 * Sara's own library: exercises she films herself, and the workouts built from
 * them. This is the asset no off-the-shelf platform has — aerial, hand
 * balancing and mobility work simply is not in a commercial exercise database.
 *
 * The rows now live in Convex (`convex/library.ts`, on top of the shared helpers
 * in `convex/model/library.ts`) and this module is the seam: same names, same
 * arguments, same shapes, one `await` added. It exists so that the pages and
 * server actions above it did not have to change, and so that a page still has
 * exactly one way to reach the library.
 *
 * Ids arrive from the Next layer as plain strings — a route parameter, a hidden
 * form field — and are cast here at the boundary. The cast is not the check: the
 * `v.id(...)` validator on the other side is, and it rejects an id that is not
 * an id of that table before the handler runs.
 */

/* ------------------------------------------------------------- exercises */

export async function listExercises(
  options: { search?: string; tag?: string } = {},
): Promise<Exercise[]> {
  return sq(api.library.listExercises, options);
}

export async function findExercise(exerciseId: string): Promise<Exercise | undefined> {
  const exercise = await sq(api.library.findExercise, {
    exerciseId: exerciseId as Id<"exercises">,
  });
  return exercise ?? undefined;
}

/** Every distinct tag in use, with its exercise count. */
export async function exerciseTags(): Promise<{ tag: string; count: number }[]> {
  return sq(api.library.exerciseTags);
}

/**
 * Every exercise name already in the library, accent- and case-folded.
 *
 * The seed uses this to decide what is missing. Archived rows count: a name Sara
 * archived on purpose must not come back on the next boot. A `Set` is not a
 * Convex value, so the query hands back the keys as an array and the set is
 * rebuilt here, where the callers expect one.
 */
export async function exerciseNameKeys(): Promise<Set<string>> {
  return new Set(await sq(api.library.exerciseNameKeys));
}

export async function createExercise(input: {
  name: string;
  cues?: string;
  cuesEn?: string;
  videoUrl?: string | null;
  tags?: string[];
  tracking?: Tracking;
  regressionOf?: string | null;
}): Promise<Exercise> {
  return sm(api.library.createExercise, {
    ...input,
    regressionOf: input.regressionOf as Id<"exercises"> | null | undefined,
  });
}

export async function updateExercise(
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
): Promise<void> {
  await sm(api.library.updateExercise, {
    exerciseId: exerciseId as Id<"exercises">,
    patch: {
      ...patch,
      regressionOf: patch.regressionOf as Id<"exercises"> | null | undefined,
    },
  });
}

/** Soft delete — workout history keeps referencing the row. */
export async function archiveExercise(exerciseId: string): Promise<void> {
  await sm(api.library.archiveExercise, { exerciseId: exerciseId as Id<"exercises"> });
}

/* -------------------------------------------------------------- workouts */

/** Blocks with their items, ordered, for one workout. */
export async function workoutBlocks(workoutId: string): Promise<WorkoutBlock[]> {
  return sq(api.library.workoutBlocks, { workoutId: workoutId as Id<"workouts"> });
}

export async function findWorkout(workoutId: string): Promise<Workout | undefined> {
  const workout = await sq(api.library.findWorkout, { workoutId: workoutId as Id<"workouts"> });
  return workout ?? undefined;
}

/**
 * The library: templates only. A client-scoped copy inside a training phase is
 * a `workouts` row too, and `clientId === null` is what keeps it out of here —
 * one client's adapted version of a workout is nobody else's template.
 */
export async function listWorkouts(search?: string): Promise<WorkoutSummary[]> {
  return sq(api.library.listWorkouts, { search });
}

/** Every distinct workout focus in use, with its workout count. */
export async function workoutFocuses(): Promise<{ tag: string; count: number }[]> {
  return sq(api.library.workoutFocuses);
}

/**
 * A workout row. Left plain it is a library template; give it `clientId` and
 * `phaseId` and it is that client's own copy inside one training phase, which
 * the library never lists.
 */
export async function createWorkout(input: {
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
  estimatedMinutes?: number | null;
}): Promise<string> {
  return sm(api.library.createWorkout, {
    ...input,
    coachId: input.coachId as Id<"users"> | null | undefined,
    clientId: input.clientId as Id<"users"> | null | undefined,
    phaseId: input.phaseId as Id<"trainingPhases"> | null | undefined,
  });
}

export async function updateWorkout(
  workoutId: string,
  patch: {
    name?: string;
    focus?: string;
    notes?: string;
    instructions?: string;
    workoutType?: WorkoutType;
    estimatedMinutes?: number | null;
    scheduleMode?: "weekly" | "custom" | "none" | null;
    scheduleWeekday?: number | null;
  },
): Promise<void> {
  await sm(api.library.updateWorkout, { workoutId: workoutId as Id<"workouts">, patch });
}

export async function archiveWorkout(workoutId: string): Promise<void> {
  await sm(api.library.archiveWorkout, { workoutId: workoutId as Id<"workouts"> });
}

/* -------------------------------------------------------- blocks and items */

/** Append a block at the end of a workout. Returns the new block id. */
export async function addBlock(
  workoutId: string,
  input: { kind?: BlockKind; label?: string; rounds?: number; restSeconds?: number } = {},
): Promise<string> {
  return sm(api.library.addBlock, { workoutId: workoutId as Id<"workouts">, ...input });
}

export async function updateBlock(
  blockId: string,
  patch: { kind?: BlockKind; label?: string; rounds?: number; restSeconds?: number },
): Promise<void> {
  await sm(api.library.updateBlock, { blockId: blockId as Id<"workoutBlocks">, patch });
}

export async function removeBlock(blockId: string): Promise<void> {
  await sm(api.library.removeBlock, { blockId: blockId as Id<"workoutBlocks"> });
}

export async function addItem(
  blockId: string,
  input: {
    exerciseId?: string;
    kind?: "exercise" | "rest";
    sets?: number;
    reps?: string;
    seconds?: number | null;
    tempo?: string;
    restSeconds?: number;
    rpe?: string;
    notes?: string;
  },
): Promise<string> {
  return sm(api.library.addItem, {
    ...input,
    blockId: blockId as Id<"workoutBlocks">,
    exerciseId: input.exerciseId as Id<"exercises"> | undefined,
  });
}

export async function updateItem(
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
): Promise<void> {
  await sm(api.library.updateItem, { itemId: itemId as Id<"workoutItems">, patch });
}

export async function removeItem(itemId: string): Promise<void> {
  await sm(api.library.removeItem, { itemId: itemId as Id<"workoutItems"> });
}

/** Move an item one slot up or down within its block. */
export async function moveItem(itemId: string, direction: -1 | 1): Promise<void> {
  await sm(api.library.moveItem, { itemId: itemId as Id<"workoutItems">, direction });
}

/**
 * Rewrite one block's running order after a drag. Every id in `itemIds` is
 * given the position of its index and adopted into `blockId`, which is what
 * lets a card be dragged from one block into another: the target block posts
 * its new list and the item follows it across.
 */
export async function reorderItems(blockId: string, itemIds: string[]): Promise<void> {
  await sm(api.library.reorderItems, {
    blockId: blockId as Id<"workoutBlocks">,
    itemIds: itemIds as Id<"workoutItems">[],
  });
}

/**
 * Deep-copy a workout — blocks and items included — applying `overrides` to
 * the copy's own fields. This is what keeps the library safe: adding a
 * template to a training phase copies it here and now, so every later edit the
 * coach makes lands on the client's copy and the template is never touched.
 */
export async function copyWorkout(
  workoutId: string,
  overrides: {
    name?: string;
    coachId?: string | null;
    clientId?: string | null;
    phaseId?: string | null;
    sourceWorkoutId?: string | null;
    position?: number;
  } = {},
): Promise<string | undefined> {
  const copyId = await sm(api.library.copyWorkout, {
    ...overrides,
    workoutId: workoutId as Id<"workouts">,
    coachId: overrides.coachId as Id<"users"> | null | undefined,
    clientId: overrides.clientId as Id<"users"> | null | undefined,
    phaseId: overrides.phaseId as Id<"trainingPhases"> | null | undefined,
  });
  return copyId ?? undefined;
}

/** Duplicate a library template as another library template. */
export async function duplicateWorkout(
  workoutId: string,
  name: string,
): Promise<string | undefined> {
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
export async function looseBlockId(workoutId: string): Promise<string> {
  return sm(api.library.looseBlockId, { workoutId: workoutId as Id<"workouts"> });
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
export async function groupItems(
  workoutId: string,
  itemIds: string[],
  kind: "superset" | "circuit",
  rounds = 3,
): Promise<string | undefined> {
  const blockId = await sm(api.library.groupItems, {
    workoutId: workoutId as Id<"workouts">,
    itemIds: itemIds as Id<"workoutItems">[],
    kind,
    rounds,
  });
  return blockId ?? undefined;
}

/**
 * Break a group up: its exercises go back to the loose list, in order, and the
 * group itself goes away. The inverse of `groupItems`.
 */
export async function ungroupBlock(blockId: string): Promise<void> {
  await sm(api.library.ungroupBlock, { blockId: blockId as Id<"workoutBlocks"> });
}
