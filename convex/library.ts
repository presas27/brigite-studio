import { v } from "convex/values";
import type { WorkoutSummary } from "../src/lib/studio/types";
import { searchKey } from "../src/lib/utils";
import type { Doc, Id } from "./_generated/dataModel";
import {
  internalMutation,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { requireBuilder, requireCoach, requireViewer } from "./model/authz";
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
 * Who may be here: any coach, and a client who trains alone — a *builder*
 * (`requireBuilder`). The exercise catalogue is shared and readable by every
 * builder, and only a coach edits it. Workouts are owned: a template or a
 * phase copy carries its builder as `coachId`, and every write below checks
 * it (`ownedWorkout`). A coached client never reads a template or a block —
 * they read the *snapshot* frozen into their assignment, which is
 * `convex/plan.ts` and goes nowhere near these tables.
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

const libraryCategory = v.union(v.literal("master"), v.literal("shared"));

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
  libraryCategory,
  hiddenFromClient: v.boolean(),
  programPhaseId: v.union(v.null(), v.string()),
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

/**
 * The workout, if the caller may edit it: they built it. A coach edits their
 * templates and their clients' phase copies (both carry the coach's id); a
 * client training alone edits their own. Anyone else gets an error, not a
 * different answer.
 */
async function ownedWorkout(ctx: QueryCtx, workoutId: Id<"workouts">): Promise<Doc<"workouts">> {
  const builder = await requireBuilder(ctx);
  const doc = await ctx.db.get("workouts", workoutId);
  if (!doc || doc.coachId !== builder._id) throw new Error("Not your workout");
  return doc;
}

/** The block and the workout it belongs to, ownership already checked. */
async function ownedBlock(
  ctx: QueryCtx,
  blockId: Id<"workoutBlocks">,
): Promise<{ block: Doc<"workoutBlocks">; workout: Doc<"workouts"> }> {
  const block = await ctx.db.get("workoutBlocks", blockId);
  if (!block) throw new Error("No such block");
  return { block, workout: await ownedWorkout(ctx, block.workoutId) };
}

/** Same, one level down. */
async function ownedItem(
  ctx: QueryCtx,
  itemId: Id<"workoutItems">,
): Promise<{ item: Doc<"workoutItems">; block: Doc<"workoutBlocks">; workout: Doc<"workouts"> }> {
  const item = await ctx.db.get("workoutItems", itemId);
  if (!item) throw new Error("No such item");
  return { item, ...(await ownedBlock(ctx, item.blockId)) };
}

/**
 * A workout the caller may *read*: its builder, or the client it was copied
 * for. `null` for anyone else, so a page renders "not found" rather than an
 * error for an id that is not theirs.
 */
async function readableWorkout(
  ctx: QueryCtx,
  workoutId: Id<"workouts">,
): Promise<Doc<"workouts"> | null> {
  const user = await requireViewer(ctx);
  const doc = await ctx.db.get("workouts", workoutId);
  if (!doc) return null;
  return doc.coachId === user._id || doc.clientId === user._id ? doc : null;
}

/**
 * The duration a timed movement is prescribed at when the coach adds it and
 * says nothing else — a working number she can see and change, not a silent
 * zero, and short enough that leaving it unread is never a hard set.
 */
const DEFAULT_TIMED_SECONDS = 30;

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
 * Where a loose add lands: the workout's last block when that block is a plain
 * one, and a new plain block appended after it otherwise.
 *
 * Every block is first-class — a plain block is "these exercises in this order,
 * each with its own sets", a superset or circuit is the same list read a
 * different way — so there is no single ungrouped bucket any more. What is left
 * is the question "an exercise arrived with no block named: where does it go?",
 * and the answer is the end of the workout, without ever appending into
 * somebody's circuit.
 */
async function tailBlock(
  ctx: MutationCtx,
  workoutId: Id<"workouts">,
): Promise<Id<"workoutBlocks">> {
  const last = await ctx.db
    .query("workoutBlocks")
    .withIndex("by_workout_and_position", (q) => q.eq("workoutId", workoutId))
    .order("desc")
    .first();
  if (last && last.kind === "normal") return last._id;

  const blockId = await appendBlock(ctx, workoutId, { kind: "normal" });
  await touchWorkout(ctx, workoutId);
  return blockId;
}

/**
 * Write `0, 1, 2…` onto the blocks in the order given, touching only the rows
 * that actually move. Position is the only thing on-screen order is derived
 * from, so an insertion in the middle is expressed as a full renumber rather
 * than as fractional positions.
 */
async function orderBlocks(
  ctx: MutationCtx,
  ordered: Id<"workoutBlocks">[],
): Promise<void> {
  for (const [position, blockId] of ordered.entries()) {
    const block = await ctx.db.get("workoutBlocks", blockId);
    if (!block || block.position === position) continue;
    await ctx.db.patch("workoutBlocks", blockId, { position });
  }
}

/* ------------------------------------------------------------- exercises */

export const listExercises = query({
  args: { search: v.optional(v.string()), tag: v.optional(v.string()) },
  returns: v.array(exerciseShape),
  handler: async (ctx, args) => {
    await requireBuilder(ctx);
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
    await requireBuilder(ctx);
    const doc = await ctx.db.get("exercises", args.exerciseId);
    return doc ? mapExercise(doc) : null;
  },
});

/** Every distinct tag in use, with its exercise count. */
export const exerciseTags = query({
  args: {},
  returns: v.array(tagCountShape),
  handler: async (ctx) => {
    await requireBuilder(ctx);
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
    await requireBuilder(ctx);
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
    if (!(await readableWorkout(ctx, args.workoutId))) return [];
    return blocksFor(ctx, args.workoutId);
  },
});

export const findWorkout = query({
  args: { workoutId: v.id("workouts") },
  returns: v.union(v.null(), workoutShape),
  handler: async (ctx, args) => {
    if (!(await readableWorkout(ctx, args.workoutId))) return null;
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
    const builder = await requireBuilder(ctx);
    const docs = await libraryWorkouts(ctx, builder._id);
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
    const builder = await requireBuilder(ctx);
    const counts = new Map<string, number>();
    for (const doc of await libraryWorkouts(ctx, builder._id)) {
      const focus = doc.focus.trim();
      if (focus) counts.set(focus, (counts.get(focus) ?? 0) + 1);
    }
    return byFrequency(counts);
  },
});

/**
 * A library template, owned by whoever is signed in. Phase copies are not made
 * here — `phases.addWorkout` and `phases.createWorkout` do that, from a phase
 * the caller has already been checked against.
 */
export const createWorkout = mutation({
  args: {
    name: v.string(),
    focus: v.optional(v.string()),
    instructions: v.optional(v.string()),
    workoutType: v.optional(workoutType),
    estimatedMinutes: v.optional(v.union(v.null(), v.number())),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const builder = await requireBuilder(ctx);
    return insertWorkout(ctx, {
      name: args.name,
      focus: args.focus ?? "",
      instructions: args.instructions ?? "",
      workoutType: args.workoutType ?? "regular",
      coachId: builder._id,
      clientId: null,
      phaseId: null,
      sourceWorkoutId: null,
      position: 0,
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
    await ownedWorkout(ctx, args.workoutId);
    const patch: WorkoutPatch = {};
    if (args.patch.name !== undefined) patch.name = args.patch.name.trim();
    if (args.patch.focus !== undefined) patch.focus = args.patch.focus;
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
    await ownedWorkout(ctx, args.workoutId);
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
    await ownedWorkout(ctx, args.workoutId);
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
    await ownedBlock(ctx, args.blockId);
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
    const { block } = await ownedBlock(ctx, args.blockId);
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
    await ownedBlock(ctx, args.blockId);
    const rest = args.kind === "rest";
    if (!rest && !args.exerciseId) throw new Error("exerciseId required");
    const position = (await lastItemPosition(ctx, args.blockId)) + 1;

    // A movement the library measures on a clock arrives prescribed on a clock.
    // Landing it on an empty rep field instead is what left a warm-up full of
    // stretches asking the client for reps and kilos: the coach has to notice
    // and flip every single one, and the ones she misses train wrong.
    const exercise = rest || !args.exerciseId ? null : await ctx.db.get("exercises", args.exerciseId);
    const timed = exercise?.tracking === "time" || exercise?.tracking === "hold";
    const seconds = rest
      ? whole(args.seconds ?? 60, 0)
      : args.seconds != null
        ? whole(args.seconds, 0)
        : timed && !args.reps?.trim()
          ? DEFAULT_TIMED_SECONDS
          : null;

    const itemId = await ctx.db.insert("workoutItems", {
      blockId: args.blockId,
      position,
      kind: rest ? "rest" : "exercise",
      exerciseId: rest ? null : args.exerciseId!,
      sets: whole(args.sets ?? (rest ? 1 : 3), 1),
      reps: args.reps ?? "",
      seconds,
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
    await ownedItem(ctx, args.itemId);
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
    const { item } = await ownedItem(ctx, args.itemId);
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
    const { item } = await ownedItem(ctx, args.itemId);

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
    await ownedBlock(ctx, args.blockId);
    if (args.itemIds.length === 0) return null;
    await renumber(ctx, args.blockId, args.itemIds);
    const workoutId = await workoutIdForBlock(ctx, args.blockId);
    if (workoutId) await touchWorkout(ctx, workoutId);
    return null;
  },
});

/**
 * Deep-copy one of your workouts — blocks and items included — as a library
 * template of your own, optionally renamed. `null` when there is no such
 * workout, which is the `undefined` the caller used to get.
 */
export const copyWorkout = mutation({
  args: { workoutId: v.id("workouts"), name: v.optional(v.string()) },
  returns: v.union(v.null(), v.string()),
  handler: async (ctx, args) => {
    const source = await ownedWorkout(ctx, args.workoutId);
    return copyWorkoutRow(ctx, args.workoutId, {
      name: args.name,
      coachId: source.coachId,
      clientId: null,
      phaseId: null,
      sourceWorkoutId: null,
      position: 0,
    });
  },
});

/**
 * "Copy to Workout Library": take any workout — usually a client's phase copy
 * the coach has just finished tuning — and put it on one of her library
 * shelves as a template of its own.
 *
 * The copy is deliberately cut loose from where it came from: no client, no
 * phase, no program, `position` 0, and `sourceWorkoutId` pointing back at the
 * workout it was taken from so the provenance survives. Editing the template
 * afterwards cannot reach back into the client's plan, which is the same
 * one-way rule `addLibraryWorkout` relies on in the other direction.
 *
 * `null` when the id names nothing, matching the rest of this file.
 */
export const copyToLibrary = mutation({
  args: { workoutId: v.id("workouts"), category: libraryCategory },
  returns: v.union(v.null(), v.string()),
  handler: async (ctx, args) => {
    const source = await ownedWorkout(ctx, args.workoutId);

    return copyWorkoutRow(ctx, args.workoutId, {
      coachId: source.coachId,
      clientId: null,
      phaseId: null,
      programPhaseId: null,
      position: 0,
      sourceWorkoutId: args.workoutId,
      libraryCategory: args.category,
    });
  },
});

/** Move a template between the two library shelves. */
export const setLibraryCategory = mutation({
  args: { workoutId: v.id("workouts"), category: libraryCategory },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ownedWorkout(ctx, args.workoutId);
    // Filing is not editing, so `updatedAt` is left where the last real edit
    // put it — the same reasoning as `archiveWorkout` above.
    await ctx.db.patch("workouts", args.workoutId, { libraryCategory: args.category });
    return null;
  },
});

/**
 * One-off: file the templates a client already has onto the shared shelf.
 *
 * `libraryCategory` is written from now on by whatever hands a template to a
 * client (`phases.addLibraryWorkout`), but rows that predate the field read as
 * `master` by default — including templates a client has been training for
 * months. This walks every phase copy, follows its `sourceWorkoutId` back to
 * the template it came from, and moves that template across.
 *
 * Internal, and safe to run more than once: it only ever patches a template
 * that is not already `shared`, and it returns how many it moved. Run it once
 * after deploying the field:
 *
 * ```
 * bunx convex run library:backfillLibraryCategory
 * ```
 */
export const backfillLibraryCategory = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    // Every workout that came from somewhere. `by_source` is bounded by the
    // template it points at, so this walks the plans' copies rather than the
    // whole table, and each distinct source is patched at most once.
    const copies = await ctx.db
      .query("workouts")
      .withIndex("by_source")
      .collect();

    const seen = new Set<string>();
    let moved = 0;
    for (const copy of copies) {
      // A library-to-library copy is not a client having it; only a row that
      // belongs to a client says a template was actually handed over.
      if (!copy.sourceWorkoutId || copy.clientId === null) continue;
      if (seen.has(copy.sourceWorkoutId)) continue;
      seen.add(copy.sourceWorkoutId);

      const template = await ctx.db.get("workouts", copy.sourceWorkoutId as Id<"workouts">);
      if (!template || template.libraryCategory === "shared") continue;
      await ctx.db.patch("workouts", template._id, { libraryCategory: "shared" });
      moved += 1;
    }
    return moved;
  },
});

/**
 * One-off: collapse the workout's two free-text preambles into one.
 *
 * A workout used to carry both `notes` — written in the settings dialog, shown
 * under the title and read to the client mid-session — and `instructions`,
 * written at the top of the builder and only ever printed. They said the same
 * thing twice, in two places, and only one of them was editable where the
 * coach works. `instructions` is now the only one; this merges the other into
 * it and strips the column.
 *
 * `instructions` wins where both have text: it is the longer, prescriptive one
 * the print sheet already used. Where it is empty the notes move across intact,
 * so nothing the coach typed is lost.
 *
 * Assignments are walked too: their snapshot froze both fields, and the session
 * player reads the snapshot rather than the workout.
 *
 * Internal, idempotent, and it must run before the `notes` lines come out of
 * `convex/schema.ts` — a document with a field the schema does not declare
 * fails validation on deploy:
 *
 * ```
 * bunx convex run library:collapseWorkoutNotes
 * bunx convex run --prod library:collapseWorkoutNotes
 * ```
 */
export const collapseWorkoutNotes = internalMutation({
  args: {},
  returns: v.object({ workouts: v.number(), assignments: v.number() }),
  handler: async (ctx) => {
    let workouts = 0;
    for (const doc of await ctx.db.query("workouts").collect()) {
      if (doc.notes === undefined) continue;
      const merged = doc.instructions.trim() ? doc.instructions : doc.notes;
      // `undefined` is how Convex removes a field, and the merge and the
      // removal are one patch: a half-applied row would lose the text.
      await ctx.db.patch("workouts", doc._id, { instructions: merged, notes: undefined });
      workouts += 1;
    }

    let assignments = 0;
    for (const doc of await ctx.db.query("assignments").collect()) {
      const { notes, ...rest } = doc.snapshot;
      if (notes === undefined) continue;
      const merged = rest.instructions.trim() ? rest.instructions : notes;
      // The snapshot is one value, so the whole object is rewritten without
      // the key rather than patched field by field.
      await ctx.db.patch("assignments", doc._id, {
        snapshot: { ...rest, instructions: merged },
      });
      assignments += 1;
    }

    return { workouts, assignments };
  },
});

/* --------------------------------------------------------- blocks, grouped */

/**
 * The block an exercise added with no block named lands in. See `tailBlock`:
 * the last plain block, or a new one appended after whatever is there.
 */
export const tailBlockId = mutation({
  args: { workoutId: v.id("workouts") },
  returns: v.string(),
  handler: async (ctx, args) => {
    await ownedWorkout(ctx, args.workoutId);
    return tailBlock(ctx, args.workoutId);
  },
});

/**
 * Turn `itemIds` into one new superset or circuit block, in the order given.
 *
 * The new block is placed **where the selection already was**, not at the end
 * of the workout: the block holding the first selected exercise is split at
 * that exercise, what came before it stays put, what came after it moves into a
 * plain block of its own, and the group goes between the two. Appending was
 * what made a circuit impossible to place — it landed below the stretches it
 * was meant to precede and no amount of moving could fix it, because the
 * ungrouped exercises were not blocks and could not move at all.
 *
 * Blocks the selection emptied are deleted; a block that was already empty is
 * left alone, because the coach put it there to fill.
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
    await ownedWorkout(ctx, args.workoutId);
    if (args.itemIds.length < 2) return null;

    const blocks = await ctx.db
      .query("workoutBlocks")
      .withIndex("by_workout_and_position", (q) => q.eq("workoutId", args.workoutId))
      .collect();
    // Every list is read before anything is written: the writes below move items
    // between these very blocks, so a second read would see them half-moved.
    const itemsByBlock = new Map<Id<"workoutBlocks">, Id<"workoutItems">[]>();
    for (const block of blocks) itemsByBlock.set(block._id, await itemIdsOf(ctx, block._id));

    const chosen = new Set<string>(args.itemIds);
    let anchorIndex = -1;
    let splitAt = 0;
    for (const [index, block] of blocks.entries()) {
      const at = (itemsByBlock.get(block._id) ?? []).findIndex((id) => chosen.has(id));
      if (at < 0) continue;
      anchorIndex = index;
      splitAt = at;
      break;
    }
    if (anchorIndex < 0) return null;

    const anchorItems = itemsByBlock.get(blocks[anchorIndex]._id) ?? [];
    const head = anchorItems.slice(0, splitAt);
    const tail = anchorItems.slice(splitAt).filter((id) => !chosen.has(id));

    // Positions here are provisional — `orderBlocks` writes the real ones once
    // the whole sequence is known.
    const groupId = await ctx.db.insert("workoutBlocks", {
      workoutId: args.workoutId,
      position: (await lastBlockPosition(ctx, args.workoutId)) + 1,
      kind: args.kind,
      label: "",
      // Rounds are a circuit's idea. A superset is one pass through its
      // exercises, so it is always 1 whatever the form sent.
      rounds: args.kind === "circuit" ? whole(args.rounds ?? 3, 1) : 1,
      restSeconds: 60,
    });
    await renumber(ctx, groupId, args.itemIds);

    // The remainder of the split block is the same section as the block it came
    // from, so it keeps its name — but only when the original is going away
    // with the selection, or the workout would show the name twice.
    const tailId =
      tail.length > 0
        ? await appendBlock(ctx, args.workoutId, {
            kind: "normal",
            label: head.length === 0 ? blocks[anchorIndex].label : "",
            restSeconds: blocks[anchorIndex].restSeconds,
          })
        : null;
    if (tailId) await renumber(ctx, tailId, tail);

    const ordered: Id<"workoutBlocks">[] = [];
    for (const [index, block] of blocks.entries()) {
      const before = itemsByBlock.get(block._id) ?? [];
      const kept = index === anchorIndex ? head : before.filter((id) => !chosen.has(id));
      if (kept.length === 0 && before.length > 0) {
        await ctx.db.delete("workoutBlocks", block._id);
      } else {
        if (kept.length < before.length) await renumber(ctx, block._id, kept);
        ordered.push(block._id);
      }
      if (index === anchorIndex) {
        ordered.push(groupId);
        if (tailId) ordered.push(tailId);
      }
    }
    await orderBlocks(ctx, ordered);
    await touchWorkout(ctx, args.workoutId);
    return groupId;
  },
});

/**
 * Move a block one slot up or down, exercises and all: a block is one thing on
 * the screen, so it reorders as one thing.
 *
 * Every block takes part, plain ones included. That is the difference between
 * this builder and the one before it — an exercise sequence is a block like any
 * other, so a warm-up can be dragged under the stretches it belongs after
 * without regrouping anything.
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
    const { block } = await ownedBlock(ctx, args.blockId);

    // The nearest neighbour on the chosen side, straight off the position index.
    const neighbour =
      args.direction < 0
        ? await ctx.db
            .query("workoutBlocks")
            .withIndex("by_workout_and_position", (q) =>
              q.eq("workoutId", block.workoutId).lt("position", block.position),
            )
            .order("desc")
            .first()
        : await ctx.db
            .query("workoutBlocks")
            .withIndex("by_workout_and_position", (q) =>
              q.eq("workoutId", block.workoutId).gt("position", block.position),
            )
            .first();
    if (!neighbour) return null;

    await ctx.db.patch("workoutBlocks", neighbour._id, { position: block.position });
    await ctx.db.patch("workoutBlocks", block._id, { position: neighbour.position });
    await touchWorkout(ctx, block.workoutId);
    return null;
  },
});
