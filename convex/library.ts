import { v } from "convex/values";
import type { WorkoutSummary } from "../src/lib/studio/types";
import { searchKey } from "../src/lib/utils";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { requireCoach } from "./model/authz";
import {
  blocksFor,
  copyWorkout as copyWorkoutRow,
  exerciseKeys,
  insertExercise,
  insertWorkout,
  libraryWorkouts,
  liveExercises,
  mapExercise,
  searchExercises,
  touchWorkout,
  workoutSummary,
  workoutWithBlocks,
} from "./model/library";

/**
 * The library, over the wire: Sara's exercises and the workouts built from them.
 *
 * Every function here is `requireCoach`. The library is the coach's workshop —
 * a client never reads a template or a block, they read the *snapshot* frozen
 * into their assignment, which is `convex/plan.ts` and goes nowhere near these
 * tables. So coach-only is the default and there is no exception in this file.
 *
 * Two things SQLite gave for free and which are therefore written out by hand:
 * the `ON DELETE CASCADE` from a block down to its items (`removeBlock`), and
 * the `updated_at` stamp on the parent workout after any block or item edit
 * (`touchWorkout`, called in exactly the places the SQL called it).
 */

/* ------------------------------------------------------------- validators */

const tracking = v.union(
  v.literal("reps"),
  v.literal("time"),
  v.literal("hold"),
  v.literal("distance"),
);

const blockKind = v.union(
  v.literal("normal"),
  v.literal("superset"),
  v.literal("circuit"),
  v.literal("interval"),
);

const workoutType = v.union(v.literal("regular"), v.literal("circuit"), v.literal("interval"));

/**
 * The return shapes are the domain types from `src/lib/studio/types.ts`, so the
 * id fields are `v.string()` and not `v.id(...)`: a page receives `id: string`
 * and hands it back as one.
 */
const exerciseShape = v.object({
  id: v.string(),
  name: v.string(),
  cues: v.string(),
  cuesEn: v.string(),
  videoUrl: v.union(v.null(), v.string()),
  tags: v.array(v.string()),
  tracking,
  regressionOf: v.union(v.null(), v.string()),
  archived: v.boolean(),
  createdAt: v.number(),
});

const itemShape = v.object({
  id: v.string(),
  position: v.number(),
  kind: v.optional(v.union(v.literal("exercise"), v.literal("rest"))),
  exerciseId: v.string(),
  exerciseName: v.string(),
  tracking,
  videoUrl: v.union(v.null(), v.string()),
  cues: v.string(),
  cuesEn: v.string(),
  sets: v.number(),
  reps: v.string(),
  seconds: v.union(v.null(), v.number()),
  tempo: v.string(),
  restSeconds: v.number(),
  rpe: v.string(),
  notes: v.string(),
});

const blockShape = v.object({
  id: v.string(),
  position: v.number(),
  kind: blockKind,
  label: v.string(),
  rounds: v.number(),
  restSeconds: v.number(),
  items: v.array(itemShape),
});

const workoutFields = {
  id: v.string(),
  name: v.string(),
  focus: v.string(),
  notes: v.string(),
  instructions: v.string(),
  workoutType,
  coachId: v.union(v.null(), v.string()),
  clientId: v.union(v.null(), v.string()),
  phaseId: v.union(v.null(), v.string()),
  sourceWorkoutId: v.union(v.null(), v.string()),
  position: v.number(),
  archived: v.boolean(),
  createdAt: v.number(),
  updatedAt: v.number(),
  estimatedMinutes: v.union(v.null(), v.number()),
  scheduleMode: v.union(v.null(), v.literal("weekly"), v.literal("custom"), v.literal("none")),
  scheduleWeekday: v.union(v.null(), v.number()),
};

const workoutShape = v.object({ ...workoutFields, blocks: v.array(blockShape) });
const summaryShape = v.object({ ...workoutFields, itemCount: v.number() });
const tagCountShape = v.object({ tag: v.string(), count: v.number() });

/* ---------------------------------------------------------------- helpers */

type ExercisePatch = Partial<Omit<Doc<"exercises">, "_id" | "_creationTime">>;
type WorkoutPatch = Partial<Omit<Doc<"workouts">, "_id" | "_creationTime">>;
type BlockPatch = Partial<Omit<Doc<"workoutBlocks">, "_id" | "_creationTime">>;
type ItemPatch = Partial<Omit<Doc<"workoutItems">, "_id" | "_creationTime">>;

/**
 * A whole number at or above `min`. Sets, rounds and rest seconds arrive from a
 * form field, so `NaN` and `Infinity` are reachable from outside and would be
 * written to the row as-is; SQLite's `INTEGER` column at least refused a
 * fraction, and this is the replacement for that.
 */
function whole(value: number, min: number): number {
  if (!Number.isFinite(value)) throw new Error("Expected a finite number");
  return Math.max(min, Math.trunc(value));
}

/** Counts by label, commonest first, ties alphabetical — tags and focuses both. */
function byFrequency(counts: Map<string, number>): { tag: string; count: number }[] {
  return [...counts]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, "pt"));
}

async function lastBlockPosition(ctx: QueryCtx, workoutId: Id<"workouts">): Promise<number> {
  const last = await ctx.db
    .query("workoutBlocks")
    .withIndex("by_workout_and_position", (q) => q.eq("workoutId", workoutId))
    .order("desc")
    .first();
  return last?.position ?? -1;
}

async function lastItemPosition(ctx: QueryCtx, blockId: Id<"workoutBlocks">): Promise<number> {
  const last = await ctx.db
    .query("workoutItems")
    .withIndex("by_block_and_position", (q) => q.eq("blockId", blockId))
    .order("desc")
    .first();
  return last?.position ?? -1;
}

async function workoutIdForBlock(
  ctx: QueryCtx,
  blockId: Id<"workoutBlocks">,
): Promise<Id<"workouts"> | undefined> {
  const block = await ctx.db.get("workoutBlocks", blockId);
  return block?.workoutId;
}

async function itemIdsOf(
  ctx: QueryCtx,
  blockId: Id<"workoutBlocks">,
): Promise<Id<"workoutItems">[]> {
  const items = await ctx.db
    .query("workoutItems")
    .withIndex("by_block_and_position", (q) => q.eq("blockId", blockId))
    .collect();
  return items.map((item) => item._id);
}

/**
 * Give every id in `itemIds` the position of its index and adopt it into
 * `blockId`. Adoption is what lets a card be dragged from one block into
 * another: the target block posts its new list and the item follows it across.
 */
async function renumber(
  ctx: MutationCtx,
  blockId: Id<"workoutBlocks">,
  itemIds: Id<"workoutItems">[],
): Promise<void> {
  for (const [index, itemId] of itemIds.entries()) {
    // An id that no longer exists is skipped rather than fatal: the SQL was an
    // `UPDATE … WHERE id = ?`, which quietly matched nothing.
    const item = await ctx.db.get("workoutItems", itemId);
    if (!item) continue;
    await ctx.db.patch("workoutItems", itemId, { blockId, position: index });
  }
}

async function appendBlock(
  ctx: MutationCtx,
  workoutId: Id<"workouts">,
  input: { kind?: Doc<"workoutBlocks">["kind"]; label?: string; rounds?: number; restSeconds?: number },
): Promise<Id<"workoutBlocks">> {
  const position = (await lastBlockPosition(ctx, workoutId)) + 1;
  return ctx.db.insert("workoutBlocks", {
    workoutId,
    position,
    kind: input.kind ?? "normal",
    label: input.label ?? "",
    rounds: whole(input.rounds ?? 1, 1),
    restSeconds: whole(input.restSeconds ?? 60, 0),
  });
}

/**
 * Exercises that belong to no group. Every workout has exactly one of these:
 * the `normal` block, kept after every group so the builder reads "groups, then
 * whatever is still loose".
 *
 * Created on demand, and consolidated when it has to be: the block-first builder
 * this replaced let a coach add several plain blocks to one workout, and an
 * exercise-first list has one place for ungrouped work, not three. The extra
 * blocks' exercises are folded into the survivor rather than dropped.
 */
async function looseBlock(
  ctx: MutationCtx,
  workoutId: Id<"workouts">,
): Promise<Id<"workoutBlocks">> {
  const blocks = await ctx.db
    .query("workoutBlocks")
    .withIndex("by_workout_and_position", (q) => q.eq("workoutId", workoutId))
    .collect();
  // `kind` is not part of the index and does not need to be: a workout's blocks
  // are a handful of rows, already ordered by position.
  const normals = blocks.filter((block) => block.kind === "normal");

  if (normals.length === 0) {
    const blockId = await appendBlock(ctx, workoutId, { kind: "normal" });
    await touchWorkout(ctx, workoutId);
    return blockId;
  }
  if (normals.length === 1) return normals[0]._id;

  const [keeper, ...extras] = normals;
  const merged: Id<"workoutItems">[] = [];
  for (const block of normals) merged.push(...(await itemIdsOf(ctx, block._id)));
  await renumber(ctx, keeper._id, merged);
  for (const extra of extras) await ctx.db.delete("workoutBlocks", extra._id);
  await touchWorkout(ctx, workoutId);
  return keeper._id;
}

/**
 * Groups left empty by a regroup are noise, not structure — a "Super set 2" with
 * nothing in it would still take a number. The loose block survives empty
 * because `looseBlock` would only recreate it.
 */
async function dropEmptyGroups(ctx: MutationCtx, workoutId: Id<"workouts">): Promise<void> {
  const blocks = await ctx.db
    .query("workoutBlocks")
    .withIndex("by_workout_and_position", (q) => q.eq("workoutId", workoutId))
    .collect();
  for (const block of blocks) {
    if (block.kind === "normal") continue;
    const first = await ctx.db
      .query("workoutItems")
      .withIndex("by_block_and_position", (q) => q.eq("blockId", block._id))
      .first();
    if (!first) await ctx.db.delete("workoutBlocks", block._id);
  }
}

/* ------------------------------------------------------------- exercises */

export const listExercises = query({
  args: { search: v.optional(v.string()), tag: v.optional(v.string()) },
  returns: v.array(exerciseShape),
  handler: async (ctx, args) => {
    await requireCoach(ctx);
    const search = args.search?.trim();
    const tag = args.tag?.trim();
    const docs = search ? await searchExercises(ctx, search) : await liveExercises(ctx);
    // Tags are an array field, so there is no index to range over: the SQL
    // matched them with `tags LIKE '%"mobilidade"%'`, which was a table scan too.
    const matching = tag ? docs.filter((doc) => doc.tags.includes(tag)) : docs;
    return matching.map(mapExercise);
  },
});

export const findExercise = query({
  args: { exerciseId: v.id("exercises") },
  returns: v.union(v.null(), exerciseShape),
  handler: async (ctx, args) => {
    await requireCoach(ctx);
    const doc = await ctx.db.get("exercises", args.exerciseId);
    return doc ? mapExercise(doc) : null;
  },
});

/** Every distinct tag in use, with its exercise count. */
export const exerciseTags = query({
  args: {},
  returns: v.array(tagCountShape),
  handler: async (ctx) => {
    await requireCoach(ctx);
    const counts = new Map<string, number>();
    for (const doc of await liveExercises(ctx)) {
      for (const tag of doc.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
    return byFrequency(counts);
  },
});

/**
 * Every exercise name already in the library, accent- and case-folded, as an
 * array — a `Set` is not a Convex value, so the wrapper in
 * `src/lib/studio/library.ts` is what rebuilds it.
 */
export const exerciseNameKeys = query({
  args: {},
  returns: v.array(v.string()),
  handler: async (ctx) => {
    await requireCoach(ctx);
    return [...(await exerciseKeys(ctx))];
  },
});

export const createExercise = mutation({
  args: {
    name: v.string(),
    cues: v.optional(v.string()),
    cuesEn: v.optional(v.string()),
    videoUrl: v.optional(v.union(v.null(), v.string())),
    tags: v.optional(v.array(v.string())),
    tracking: v.optional(tracking),
    regressionOf: v.optional(v.union(v.null(), v.id("exercises"))),
  },
  returns: exerciseShape,
  handler: async (ctx, args) => {
    await requireCoach(ctx);
    const exerciseId = await insertExercise(ctx, args);
    const doc = await ctx.db.get("exercises", exerciseId);
    if (!doc) throw new Error("Exercise vanished on insert");
    return mapExercise(doc);
  },
});

export const updateExercise = mutation({
  args: {
    exerciseId: v.id("exercises"),
    patch: v.object({
      name: v.optional(v.string()),
      cues: v.optional(v.string()),
      cuesEn: v.optional(v.string()),
      videoUrl: v.optional(v.union(v.null(), v.string())),
      tags: v.optional(v.array(v.string())),
      tracking: v.optional(tracking),
      regressionOf: v.optional(v.union(v.null(), v.id("exercises"))),
    }),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireCoach(ctx);
    // Absent means "leave it alone", which is why every field is optional and
    // the patch is built rather than spread: `videoUrl: undefined` would *clear*
    // the column, and the form that sends no video field means nothing by it.
    const patch: ExercisePatch = {};
    if (args.patch.name !== undefined) patch.name = args.patch.name.trim();
    if (args.patch.cues !== undefined) patch.cues = args.patch.cues;
    if (args.patch.cuesEn !== undefined) patch.cuesEn = args.patch.cuesEn;
    if (args.patch.videoUrl !== undefined) patch.videoUrl = args.patch.videoUrl?.trim() || null;
    if (args.patch.tags !== undefined) patch.tags = args.patch.tags;
    if (args.patch.tracking !== undefined) patch.tracking = args.patch.tracking;
    if (args.patch.regressionOf !== undefined) patch.regressionOf = args.patch.regressionOf;
    if (Object.keys(patch).length === 0) return null;

    const doc = await ctx.db.get("exercises", args.exerciseId);
    if (!doc) return null;
    await ctx.db.patch("exercises", args.exerciseId, patch);
    return null;
  },
});

/**
 * Soft delete — workout history keeps referencing the row, and the exercise
 * picker reads `by_archived_and_name`, so an archived movement simply stops
 * being offered.
 *
 * `regressionOf` is left alone on purpose. The old DDL had
 * `ON DELETE SET NULL` on it, but nothing in the app ever deleted an exercise
 * and nothing does now: an archived movement is still a valid thing for an
 * easier one to regress from, and clearing those pointers would lose the
 * progression Sara recorded.
 */
export const archiveExercise = mutation({
  args: { exerciseId: v.id("exercises") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireCoach(ctx);
    const doc = await ctx.db.get("exercises", args.exerciseId);
    if (!doc) return null;
    await ctx.db.patch("exercises", args.exerciseId, { archived: true });
    return null;
  },
});

/* -------------------------------------------------------------- workouts */

/** Blocks with their items, ordered, for one workout. */
export const workoutBlocks = query({
  args: { workoutId: v.id("workouts") },
  returns: v.array(blockShape),
  handler: async (ctx, args) => {
    await requireCoach(ctx);
    return blocksFor(ctx, args.workoutId);
  },
});

export const findWorkout = query({
  args: { workoutId: v.id("workouts") },
  returns: v.union(v.null(), workoutShape),
  handler: async (ctx, args) => {
    await requireCoach(ctx);
    return (await workoutWithBlocks(ctx, args.workoutId)) ?? null;
  },
});

/**
 * The library: templates only. A client-scoped copy inside a training phase is
 * a `workouts` row too, and `clientId === null` is what keeps it out of here —
 * one client's adapted version of a workout is nobody else's template.
 */
export const listWorkouts = query({
  args: { search: v.optional(v.string()) },
  returns: v.array(summaryShape),
  handler: async (ctx, args) => {
    await requireCoach(ctx);
    const docs = await libraryWorkouts(ctx);
    // The SQL matched name and focus with a `LIKE`; folding both sides through
    // `searchKey` keeps that and adds what a Portuguese library needs, which is
    // for "mobilidade" to find "Mobilidade".
    const key = args.search?.trim() ? searchKey(args.search.trim()) : null;
    const matching = key
      ? docs.filter(
          (doc) => searchKey(doc.name).includes(key) || searchKey(doc.focus).includes(key),
        )
      : docs;

    const out: WorkoutSummary[] = [];
    for (const doc of matching) out.push(await workoutSummary(ctx, doc));
    return out;
  },
});

/** Every distinct workout focus in use, with its workout count. */
export const workoutFocuses = query({
  args: {},
  returns: v.array(tagCountShape),
  handler: async (ctx) => {
    await requireCoach(ctx);
    const counts = new Map<string, number>();
    for (const doc of await libraryWorkouts(ctx)) {
      const focus = doc.focus.trim();
      if (focus) counts.set(focus, (counts.get(focus) ?? 0) + 1);
    }
    return byFrequency(counts);
  },
});

/**
 * A workout row. Left plain it is a library template; give it `clientId` and
 * `phaseId` and it is that client's own copy inside one training phase, which
 * the library never lists.
 */
export const createWorkout = mutation({
  args: {
    name: v.string(),
    focus: v.optional(v.string()),
    notes: v.optional(v.string()),
    instructions: v.optional(v.string()),
    workoutType: v.optional(workoutType),
    coachId: v.optional(v.union(v.null(), v.id("users"))),
    clientId: v.optional(v.union(v.null(), v.id("users"))),
    phaseId: v.optional(v.union(v.null(), v.id("trainingPhases"))),
    sourceWorkoutId: v.optional(v.union(v.null(), v.string())),
    position: v.optional(v.number()),
    estimatedMinutes: v.optional(v.union(v.null(), v.number())),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    await requireCoach(ctx);
    return insertWorkout(ctx, {
      name: args.name,
      focus: args.focus ?? "",
      notes: args.notes ?? "",
      instructions: args.instructions ?? "",
      workoutType: args.workoutType ?? "regular",
      coachId: args.coachId ?? null,
      clientId: args.clientId ?? null,
      phaseId: args.phaseId ?? null,
      sourceWorkoutId: args.sourceWorkoutId ?? null,
      position: args.position === undefined ? 0 : whole(args.position, 0),
      estimatedMinutes: args.estimatedMinutes ?? null,
    });
  },
});

export const updateWorkout = mutation({
  args: {
    workoutId: v.id("workouts"),
    patch: v.object({
      name: v.optional(v.string()),
      focus: v.optional(v.string()),
      notes: v.optional(v.string()),
      instructions: v.optional(v.string()),
      workoutType: v.optional(workoutType),
      estimatedMinutes: v.optional(v.union(v.null(), v.number())),
      scheduleMode: v.optional(
        v.union(v.null(), v.literal("weekly"), v.literal("custom"), v.literal("none")),
      ),
      scheduleWeekday: v.optional(v.union(v.null(), v.number())),
    }),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireCoach(ctx);
    const patch: WorkoutPatch = {};
    if (args.patch.name !== undefined) patch.name = args.patch.name.trim();
    if (args.patch.focus !== undefined) patch.focus = args.patch.focus;
    if (args.patch.notes !== undefined) patch.notes = args.patch.notes;
    if (args.patch.instructions !== undefined) patch.instructions = args.patch.instructions;
    if (args.patch.workoutType !== undefined) patch.workoutType = args.patch.workoutType;
    if (args.patch.estimatedMinutes !== undefined)
      patch.estimatedMinutes = args.patch.estimatedMinutes;
    if (args.patch.scheduleMode !== undefined) patch.scheduleMode = args.patch.scheduleMode ?? undefined;
    if (args.patch.scheduleWeekday !== undefined)
      patch.scheduleWeekday = args.patch.scheduleWeekday;
    if (Object.keys(patch).length === 0) return null;

    const doc = await ctx.db.get("workouts", args.workoutId);
    if (!doc) return null;
    patch.updatedAt = Date.now();
    await ctx.db.patch("workouts", args.workoutId, patch);
    return null;
  },
});

/** Archiving is not editing: `updatedAt` stays where the last real edit left it. */
export const archiveWorkout = mutation({
  args: { workoutId: v.id("workouts") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireCoach(ctx);
    const doc = await ctx.db.get("workouts", args.workoutId);
    if (!doc) return null;
    await ctx.db.patch("workouts", args.workoutId, { archived: true });
    return null;
  },
});

/* -------------------------------------------------------- blocks and items */

/** Append a block at the end of a workout. Returns the new block id. */
export const addBlock = mutation({
  args: {
    workoutId: v.id("workouts"),
    kind: v.optional(blockKind),
    label: v.optional(v.string()),
    rounds: v.optional(v.number()),
    restSeconds: v.optional(v.number()),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    await requireCoach(ctx);
    const blockId = await appendBlock(ctx, args.workoutId, args);
    await touchWorkout(ctx, args.workoutId);
    return blockId;
  },
});

export const updateBlock = mutation({
  args: {
    blockId: v.id("workoutBlocks"),
    patch: v.object({
      kind: v.optional(blockKind),
      label: v.optional(v.string()),
      rounds: v.optional(v.number()),
      restSeconds: v.optional(v.number()),
    }),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireCoach(ctx);
    const patch: BlockPatch = {};
    if (args.patch.kind !== undefined) patch.kind = args.patch.kind;
    if (args.patch.label !== undefined) patch.label = args.patch.label;
    if (args.patch.rounds !== undefined) patch.rounds = whole(args.patch.rounds, 1);
    if (args.patch.restSeconds !== undefined)
      patch.restSeconds = whole(args.patch.restSeconds, 0);
    if (Object.keys(patch).length === 0) return null;

    const block = await ctx.db.get("workoutBlocks", args.blockId);
    if (!block) return null;
    await ctx.db.patch("workoutBlocks", args.blockId, patch);
    await touchWorkout(ctx, block.workoutId);
    return null;
  },
});

/** The block and its exercises — SQLite cascaded, and this is that cascade. */
export const removeBlock = mutation({
  args: { blockId: v.id("workoutBlocks") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireCoach(ctx);
    const block = await ctx.db.get("workoutBlocks", args.blockId);
    if (!block) return null;
    for (const itemId of await itemIdsOf(ctx, args.blockId)) {
      await ctx.db.delete("workoutItems", itemId);
    }
    await ctx.db.delete("workoutBlocks", args.blockId);
    await touchWorkout(ctx, block.workoutId);
    return null;
  },
});

/** Append an exercise to a block. Returns the new item id. */
export const addItem = mutation({
  args: {
    blockId: v.id("workoutBlocks"),
    exerciseId: v.optional(v.id("exercises")),
    kind: v.optional(v.union(v.literal("exercise"), v.literal("rest"))),
    sets: v.optional(v.number()),
    reps: v.optional(v.string()),
    seconds: v.optional(v.union(v.null(), v.number())),
    tempo: v.optional(v.string()),
    restSeconds: v.optional(v.number()),
    rpe: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    await requireCoach(ctx);
    const rest = args.kind === "rest";
    if (!rest && !args.exerciseId) throw new Error("exerciseId required");
    const position = (await lastItemPosition(ctx, args.blockId)) + 1;
    const itemId = await ctx.db.insert("workoutItems", {
      blockId: args.blockId,
      position,
      kind: rest ? "rest" : "exercise",
      exerciseId: rest ? null : args.exerciseId!,
      sets: whole(args.sets ?? (rest ? 1 : 3), 1),
      reps: args.reps ?? "",
      seconds: rest ? whole(args.seconds ?? 60, 0) : args.seconds == null ? null : whole(args.seconds, 0),
      tempo: args.tempo ?? "",
      restSeconds: whole(args.restSeconds ?? (rest ? 0 : 60), 0),
      rpe: args.rpe ?? "",
      notes: args.notes ?? "",
    });
    const workoutId = await workoutIdForBlock(ctx, args.blockId);
    if (workoutId) await touchWorkout(ctx, workoutId);
    return itemId;
  },
});

export const updateItem = mutation({
  args: {
    itemId: v.id("workoutItems"),
    patch: v.object({
      sets: v.optional(v.number()),
      reps: v.optional(v.string()),
      seconds: v.optional(v.union(v.null(), v.number())),
      tempo: v.optional(v.string()),
      restSeconds: v.optional(v.number()),
      rpe: v.optional(v.string()),
      notes: v.optional(v.string()),
    }),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireCoach(ctx);
    const patch: ItemPatch = {};
    if (args.patch.sets !== undefined) patch.sets = whole(args.patch.sets, 1);
    if (args.patch.reps !== undefined) patch.reps = args.patch.reps;
    // Null is meaningful here and absent is not: a rep-tracked exercise has no
    // seconds, and clearing the field is a real edit.
    if (args.patch.seconds !== undefined)
      patch.seconds = args.patch.seconds == null ? null : whole(args.patch.seconds, 0);
    if (args.patch.tempo !== undefined) patch.tempo = args.patch.tempo;
    if (args.patch.restSeconds !== undefined)
      patch.restSeconds = whole(args.patch.restSeconds, 0);
    if (args.patch.rpe !== undefined) patch.rpe = args.patch.rpe;
    if (args.patch.notes !== undefined) patch.notes = args.patch.notes;
    if (Object.keys(patch).length === 0) return null;

    const item = await ctx.db.get("workoutItems", args.itemId);
    if (!item) return null;
    await ctx.db.patch("workoutItems", args.itemId, patch);
    const workoutId = await workoutIdForBlock(ctx, item.blockId);
    if (workoutId) await touchWorkout(ctx, workoutId);
    return null;
  },
});

export const removeItem = mutation({
  args: { itemId: v.id("workoutItems") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireCoach(ctx);
    const item = await ctx.db.get("workoutItems", args.itemId);
    if (!item) return null;
    // The parent is read before the delete, because after it there is no item
    // left to ask which block it belonged to.
    const workoutId = await workoutIdForBlock(ctx, item.blockId);
    await ctx.db.delete("workoutItems", args.itemId);
    if (workoutId) await touchWorkout(ctx, workoutId);
    return null;
  },
});

/** Move an item one slot up or down within its block. */
export const moveItem = mutation({
  args: {
    itemId: v.id("workoutItems"),
    // Not `v.number()`: a direction is one of two things, and a client that
    // could send 7 would be renumbering the block by arithmetic.
    direction: v.union(v.literal(-1), v.literal(1)),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireCoach(ctx);
    const item = await ctx.db.get("workoutItems", args.itemId);
    if (!item) return null;

    // The nearest neighbour on the chosen side, straight off the position index.
    const neighbour =
      args.direction < 0
        ? await ctx.db
            .query("workoutItems")
            .withIndex("by_block_and_position", (q) =>
              q.eq("blockId", item.blockId).lt("position", item.position),
            )
            .order("desc")
            .first()
        : await ctx.db
            .query("workoutItems")
            .withIndex("by_block_and_position", (q) =>
              q.eq("blockId", item.blockId).gt("position", item.position),
            )
            .first();
    if (!neighbour) return null;

    await ctx.db.patch("workoutItems", neighbour._id, { position: item.position });
    await ctx.db.patch("workoutItems", item._id, { position: neighbour.position });
    const workoutId = await workoutIdForBlock(ctx, item.blockId);
    if (workoutId) await touchWorkout(ctx, workoutId);
    return null;
  },
});

/**
 * Rewrite one block's running order after a drag. Every id in `itemIds` is given
 * the position of its index and adopted into `blockId`, which is what lets a
 * card be dragged from one block into another: the target block posts its new
 * list and the item follows it across.
 */
export const reorderItems = mutation({
  args: { blockId: v.id("workoutBlocks"), itemIds: v.array(v.id("workoutItems")) },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireCoach(ctx);
    if (args.itemIds.length === 0) return null;
    await renumber(ctx, args.blockId, args.itemIds);
    const workoutId = await workoutIdForBlock(ctx, args.blockId);
    if (workoutId) await touchWorkout(ctx, workoutId);
    return null;
  },
});

/**
 * Deep-copy a workout — blocks and items included — applying the overrides to
 * the copy's own fields. `null` when there is no such workout, which is the
 * `undefined` the caller used to get.
 */
export const copyWorkout = mutation({
  args: {
    workoutId: v.id("workouts"),
    name: v.optional(v.string()),
    coachId: v.optional(v.union(v.null(), v.id("users"))),
    clientId: v.optional(v.union(v.null(), v.id("users"))),
    phaseId: v.optional(v.union(v.null(), v.id("trainingPhases"))),
    sourceWorkoutId: v.optional(v.union(v.null(), v.string())),
    position: v.optional(v.number()),
  },
  returns: v.union(v.null(), v.string()),
  handler: async (ctx, args) => {
    await requireCoach(ctx);
    const source = await ctx.db.get("workouts", args.workoutId);
    if (!source) return null;
    return copyWorkoutRow(ctx, args.workoutId, {
      name: args.name,
      // An override that is absent keeps the source's coach; absent client and
      // phase mean "a library template", which is why those two default to null
      // and not to the source's own.
      coachId: args.coachId ?? source.coachId,
      clientId: args.clientId ?? null,
      phaseId: args.phaseId ?? null,
      sourceWorkoutId: args.sourceWorkoutId ?? null,
      position: args.position === undefined ? 0 : whole(args.position, 0),
    });
  },
});

/* --------------------------------------------------- supersets and circuits */

/** The workout's one ungrouped block, created or consolidated as needed. */
export const looseBlockId = mutation({
  args: { workoutId: v.id("workouts") },
  returns: v.string(),
  handler: async (ctx, args) => {
    await requireCoach(ctx);
    return looseBlock(ctx, args.workoutId);
  },
});

/**
 * Pull `itemIds` out of wherever they sit and into one new group, in the order
 * given. The group is appended after every existing block and the loose block is
 * then pushed past it, which keeps two things true at once: groups stay in the
 * order they were created, and the ungrouped list stays last.
 *
 * `null` when fewer than two exercises were selected: a group of one is just an
 * exercise.
 */
export const groupItems = mutation({
  args: {
    workoutId: v.id("workouts"),
    itemIds: v.array(v.id("workoutItems")),
    kind: v.union(v.literal("superset"), v.literal("circuit")),
    rounds: v.optional(v.number()),
  },
  returns: v.union(v.null(), v.string()),
  handler: async (ctx, args) => {
    await requireCoach(ctx);
    if (args.itemIds.length < 2) return null;

    // Order matters: the loose block may not exist yet, and creating it moves
    // the last position the new group is placed after.
    const loose = await looseBlock(ctx, args.workoutId);
    const last = await lastBlockPosition(ctx, args.workoutId);

    const blockId = await ctx.db.insert("workoutBlocks", {
      workoutId: args.workoutId,
      position: last + 1,
      kind: args.kind,
      label: "",
      // Rounds are a circuit's idea. A superset is one pass through its
      // exercises, so it is always 1 whatever the form sent.
      rounds: args.kind === "circuit" ? whole(args.rounds ?? 3, 1) : 1,
      restSeconds: 60,
    });
    await ctx.db.patch("workoutBlocks", loose, { position: last + 2 });
    await renumber(ctx, blockId, args.itemIds);
    await dropEmptyGroups(ctx, args.workoutId);
    await touchWorkout(ctx, args.workoutId);
    return blockId;
  },
});

/**
 * Break a group up: its exercises go back to the loose list, in order, and the
 * group itself goes away. The inverse of `groupItems`.
 */
export const ungroupBlock = mutation({
  args: { blockId: v.id("workoutBlocks") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireCoach(ctx);
    const workoutId = await workoutIdForBlock(ctx, args.blockId);
    if (!workoutId) return null;

    // Consolidating the loose list can itself delete a block, so the target is
    // re-read afterwards: a `DELETE … WHERE id = ?` on a row that is already
    // gone was a no-op in SQLite and throws here.
    const loose = await looseBlock(ctx, workoutId);
    if (loose !== args.blockId && (await ctx.db.get("workoutBlocks", args.blockId))) {
      const looseItems = await itemIdsOf(ctx, loose);
      const moving = await itemIdsOf(ctx, args.blockId);
      await renumber(ctx, loose, [...looseItems, ...moving]);
      await ctx.db.delete("workoutBlocks", args.blockId);
    }
    await touchWorkout(ctx, workoutId);
    return null;
  },
});

/**
 * Move a group one slot up or down among the workout's other groups, exercises
 * and all: a superset or circuit is one thing on the screen, so it reorders as
 * one thing.
 *
 * Only groups take part. The loose block is the tail of the list by
 * construction — `groupItems` pushes it past every new group — so it is
 * filtered out before the neighbour is chosen rather than swapped into the
 * middle, which would strand the ungrouped exercises above a circuit.
 */
export const moveBlock = mutation({
  args: {
    blockId: v.id("workoutBlocks"),
    // Two literals rather than `v.number()`, as in `moveItem`: a client that
    // could send 7 would be renumbering the workout by arithmetic.
    direction: v.union(v.literal(-1), v.literal(1)),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireCoach(ctx);
    const block = await ctx.db.get("workoutBlocks", args.blockId);
    if (!block || block.kind === "normal") return null;

    // Already ordered by the index, so the groups are in screen order.
    const blocks = await ctx.db
      .query("workoutBlocks")
      .withIndex("by_workout_and_position", (q) => q.eq("workoutId", block.workoutId))
      .collect();
    const groups = blocks.filter((candidate) => candidate.kind !== "normal");

    const index = groups.findIndex((candidate) => candidate._id === block._id);
    const target = index + args.direction;
    if (index < 0 || target < 0 || target >= groups.length) return null;

    const neighbour = groups[target];
    await ctx.db.patch("workoutBlocks", neighbour._id, { position: block.position });
    await ctx.db.patch("workoutBlocks", block._id, { position: neighbour.position });
    await touchWorkout(ctx, block.workoutId);
    return null;
  },
});
