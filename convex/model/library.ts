import { searchKey } from "../../src/lib/utils";
import type {
  Exercise,
  LibraryCategory,
  Tracking,
  Workout,
  WorkoutBlock,
  WorkoutItem,
  WorkoutSummary,
  WorkoutType,
} from "../../src/lib/studio/types";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import type { Ctx } from "./authz";

/**
 * Sara's own library, on the read/write side: exercises she films herself, and
 * the workouts built from them. This is the asset no off-the-shelf platform
 * has — aerial, hand balancing and mobility work simply is not in a commercial
 * exercise database.
 *
 * Everything here takes a `ctx` and returns domain shapes from
 * `src/lib/studio/types.ts`. It lives in `model/` rather than in
 * `convex/library.ts` because three other modules build on the same rows and
 * must build on them the same way: `convex/phases.ts` copies workouts into a
 * client's phase, `convex/plan.ts` freezes one into an assignment snapshot, and
 * `convex/seed.ts` inserts the starter library. A second implementation of
 * "workout with its blocks" in any of them is a second set of bugs.
 *
 * What SQLite did and Convex does not, and which therefore happens here by
 * hand: `ON DELETE CASCADE` from a workout down to its blocks and items, and
 * `ON DELETE SET NULL` from an assignment back up to the workout it was built
 * from (`deleteWorkoutCascade`).
 */

/* ------------------------------------------------------------- exercises */

export function mapExercise(doc: Doc<"exercises">): Exercise {
  return {
    id: doc._id,
    name: doc.name,
    cues: doc.cues,
    cuesEn: doc.cuesEn,
    videoUrl: doc.videoUrl,
    tags: doc.tags,
    tracking: doc.tracking,
    regressionOf: doc.regressionOf,
    archived: doc.archived,
    createdAt: doc._creationTime,
  };
}

/**
 * A new library entry. The defaults are the ones the SQL `INSERT` carried:
 * empty cues on both sides, no tags, measured in reps, and `videoUrl` empty
 * rather than blank — a demo link is either there or it is null, never `""`.
 */
export type ExerciseInput = {
  name: string;
  cues?: string;
  cuesEn?: string;
  videoUrl?: string | null;
  tags?: string[];
  tracking?: Tracking;
  regressionOf?: Id<"exercises"> | null;
};

export async function insertExercise(
  ctx: MutationCtx,
  input: ExerciseInput,
): Promise<Id<"exercises">> {
  return ctx.db.insert("exercises", {
    name: input.name.trim(),
    cues: input.cues ?? "",
    cuesEn: input.cuesEn ?? "",
    videoUrl: input.videoUrl?.trim() || null,
    tags: input.tags ?? [],
    tracking: input.tracking ?? "reps",
    regressionOf: input.regressionOf ?? null,
    archived: false,
  });
}

/**
 * The ceiling on a whole-library read.
 *
 * The library is a hand-filmed asset — the Trainerize import is ~2 200 rows and
 * grows by whatever Sara films this month — and the exercise picker genuinely
 * wants all of it, so this is a guardrail against a runaway read rather than a
 * page size. Convex allows ~16 000 document reads in one function.
 */
const EXERCISE_LIMIT = 6000;

/** Relevance-ordered hits kept from a free-text name search. */
const EXERCISE_SEARCH_LIMIT = 200;

/**
 * Every exercise name already in the library, accent- and case-folded.
 *
 * The seed uses this to decide what is missing. Archived rows count: a name
 * Sara archived on purpose must not come back on the next boot. The folding is
 * `searchKey` from the app's own utilities and not a second copy of it — the
 * seed compares the keys it computes from `library-trainerize.ts` against these,
 * so the two sides drifting would silently re-insert two thousand duplicates.
 */
export async function exerciseKeys(ctx: Ctx): Promise<Set<string>> {
  const docs = await ctx.db
    .query("exercises")
    .withIndex("by_archived_and_name")
    .take(EXERCISE_LIMIT);
  return new Set(docs.map((doc) => searchKey(doc.name).trim()));
}

/**
 * Non-archived exercises, alphabetical.
 *
 * `by_archived_and_name` is read rather than filtered, so the archived rows —
 * which stay for the sake of workout history — never enter the scan. Ordering
 * is redone in JS with a Portuguese collator: the index sorts raw strings, which
 * puts "Águia" after "Zebra", and this list is read by a human.
 */
export async function liveExercises(ctx: Ctx): Promise<Doc<"exercises">[]> {
  const docs = await ctx.db
    .query("exercises")
    .withIndex("by_archived_and_name", (q) => q.eq("archived", false))
    .take(EXERCISE_LIMIT);
  return byName(docs);
}

/**
 * Free-text lookup by name, through the search index.
 *
 * The SQL this replaces also matched `cues` and `cues_en` with a `LIKE`, which a
 * Convex search index cannot do in one query — an index covers one field. Name
 * is what the search box is for, and the cues of two thousand exercises are
 * exactly the text a full-table `LIKE` had to read to answer.
 */
export async function searchExercises(ctx: Ctx, search: string): Promise<Doc<"exercises">[]> {
  const docs = await ctx.db
    .query("exercises")
    .withSearchIndex("search_name", (q) => q.search("name", search).eq("archived", false))
    .take(EXERCISE_SEARCH_LIMIT);
  return byName(docs);
}

function byName(docs: Doc<"exercises">[]): Doc<"exercises">[] {
  return [...docs].sort((a, b) => a.name.localeCompare(b.name, "pt", { sensitivity: "base" }));
}

/* -------------------------------------------------------------- workouts */

/**
 * The ceiling on a library listing. Templates are counted in dozens — a coach
 * writes them one at a time — so this is a guardrail, not pagination.
 */
const WORKOUT_LIMIT = 1000;

/** Workout metadata without its blocks. Shared with `convex/phases.ts`. */
export function workoutMeta(doc: Doc<"workouts">): Omit<Workout, "blocks"> {
  return {
    id: doc._id,
    name: doc.name,
    focus: doc.focus,
    instructions: doc.instructions,
    workoutType: doc.workoutType,
    coachId: doc.coachId,
    clientId: doc.clientId,
    phaseId: doc.phaseId,
    sourceWorkoutId: doc.sourceWorkoutId,
    position: doc.position,
    archived: doc.archived,
    createdAt: doc._creationTime,
    updatedAt: doc.updatedAt,
    estimatedMinutes: doc.estimatedMinutes ?? null,
    scheduleMode: doc.scheduleMode ?? null,
    scheduleWeekday: doc.scheduleWeekday ?? null,
    // Both default rather than being required, so a row written before either
    // field existed reads as the state it was in: on the master shelf, and
    // visible to the client it belongs to.
    libraryCategory: doc.libraryCategory ?? "master",
    hiddenFromClient: doc.hiddenFromClient ?? false,
    programPhaseId: (doc.programPhaseId as string | null | undefined) ?? null,
  };
}

function mapRestItem(doc: Doc<"workoutItems">): WorkoutItem {
  return {
    id: doc._id,
    position: doc.position,
    kind: "rest",
    exerciseId: "",
    exerciseName: "Rest",
    tracking: "time",
    videoUrl: null,
    cues: "",
    cuesEn: "",
    sets: 1,
    reps: "",
    seconds: doc.seconds ?? 60,
    tempo: "",
    restSeconds: 0,
    rpe: "",
    notes: doc.notes,
  };
}

function mapItem(doc: Doc<"workoutItems">, exercise: Doc<"exercises">): WorkoutItem {
  return {
    id: doc._id,
    position: doc.position,
    kind: "exercise",
    exerciseId: doc.exerciseId ?? "",
    exerciseName: exercise.name,
    tracking: exercise.tracking,
    videoUrl: exercise.videoUrl,
    cues: exercise.cues,
    cuesEn: exercise.cuesEn,
    sets: doc.sets,
    reps: doc.reps,
    seconds: doc.seconds,
    tempo: doc.tempo,
    restSeconds: doc.restSeconds,
    rpe: doc.rpe,
    notes: doc.notes,
  };
}

/**
 * Blocks with their items, ordered, for one workout.
 *
 * Both `.collect()` calls are bounded by the parent document rather than by the
 * table: a workout has a handful of blocks and a block a handful of exercises,
 * because a coach types them in one at a time.
 *
 * Exercises are cached across the workout — the same movement appearing in a
 * warm-up and again in a superset is one read, not two — and an item whose
 * exercise has gone is dropped, which is what the `JOIN exercises` in the SQL
 * did.
 */
export async function blocksFor(ctx: Ctx, workoutId: Id<"workouts">): Promise<WorkoutBlock[]> {
  const blocks = await ctx.db
    .query("workoutBlocks")
    .withIndex("by_workout_and_position", (q) => q.eq("workoutId", workoutId))
    .collect();

  const exercises = new Map<Id<"exercises">, Doc<"exercises"> | null>();
  const out: WorkoutBlock[] = [];

  for (const block of blocks) {
    const items = await ctx.db
      .query("workoutItems")
      .withIndex("by_block_and_position", (q) => q.eq("blockId", block._id))
      .collect();

    const mapped: WorkoutItem[] = [];
    for (const item of items) {
      if (item.kind === "rest" || item.exerciseId === null) {
        mapped.push(mapRestItem(item));
        continue;
      }
      let exercise = exercises.get(item.exerciseId);
      if (exercise === undefined) {
        exercise = await ctx.db.get("exercises", item.exerciseId);
        exercises.set(item.exerciseId, exercise);
      }
      if (exercise) mapped.push(mapItem(item, exercise));
    }

    out.push({
      id: block._id,
      position: block.position,
      kind: block.kind,
      label: block.label,
      rounds: block.rounds,
      restSeconds: block.restSeconds,
      items: mapped,
    });
  }

  return out;
}

/** One workout, blocks and items included. `undefined` when there is no such row. */
export async function workoutWithBlocks(
  ctx: Ctx,
  workoutId: Id<"workouts">,
): Promise<Workout | undefined> {
  const doc = await ctx.db.get("workouts", workoutId);
  if (!doc) return undefined;
  return { ...workoutMeta(doc), blocks: await blocksFor(ctx, workoutId) };
}

/**
 * How big a workout is: how many exercises it holds, and how many blocks they
 * sit in. Rest rows are not exercises and are not counted.
 *
 * One index read per block and nothing about the movements themselves — the
 * lists that draw a card want the size, never the cues or the video.
 */
export async function workoutSize(
  ctx: Ctx,
  workoutId: Id<"workouts">,
): Promise<{ itemCount: number; blockCount: number }> {
  const blocks = await ctx.db
    .query("workoutBlocks")
    .withIndex("by_workout_and_position", (q) => q.eq("workoutId", workoutId))
    .collect();

  let itemCount = 0;
  for (const block of blocks) {
    const items = await ctx.db
      .query("workoutItems")
      .withIndex("by_block_and_position", (q) => q.eq("blockId", block._id))
      .collect();
    itemCount += items.filter((item) => item.kind !== "rest").length;
  }

  return { itemCount, blockCount: blocks.length };
}

/**
 * Workout metadata plus how many exercises it holds — the shape every list
 * renders. The count is the `SELECT count(*)` subquery the SQL carried, and it
 * costs one index read per block, which is why lists use this and not
 * `workoutWithBlocks`: no exercise, cue or video is fetched to draw a card.
 */
export async function workoutSummary(ctx: Ctx, doc: Doc<"workouts">): Promise<WorkoutSummary> {
  const { itemCount } = await workoutSize(ctx, doc._id);
  return { ...workoutMeta(doc), itemCount };
}

/**
 * Everything a `workouts` row needs, with nothing defaulted: a caller that
 * forgets `clientId` would be writing a library template by accident, and the
 * difference between a template and one client's copy is the whole point of the
 * table. `convex/library.ts` and `convex/phases.ts` each apply their own
 * defaults before calling.
 */
export type WorkoutInput = {
  name: string;
  focus: string;
  instructions: string;
  workoutType: WorkoutType;
  /** Owning coach. Null only on rows written before phases existed. */
  coachId: Id<"users"> | null;
  /** Null for a library template; set on a copy that belongs to one client. */
  clientId: Id<"users"> | null;
  phaseId: Id<"trainingPhases"> | null;
  /** Provenance, not a reference: the template it came from may go. */
  sourceWorkoutId: string | null;
  /** Order inside a phase. Meaningless for library templates. */
  position: number;
  estimatedMinutes?: number | null;
  /**
   * Which library shelf the template lands on. Defaults to `master`: a workout
   * nobody has been given yet is a draft, and every caller that knows better
   * says so.
   */
  libraryCategory?: LibraryCategory;
  /** The program phase this template belongs to, when it belongs to one. */
  programPhaseId?: Id<"programPhases"> | null;
};

export async function insertWorkout(
  ctx: MutationCtx,
  input: WorkoutInput,
): Promise<Id<"workouts">> {
  return ctx.db.insert("workouts", {
    name: input.name.trim(),
    focus: input.focus,
    instructions: input.instructions,
    workoutType: input.workoutType,
    coachId: input.coachId,
    clientId: input.clientId,
    phaseId: input.phaseId,
    sourceWorkoutId: input.sourceWorkoutId,
    position: input.position,
    archived: false,
    updatedAt: Date.now(),
    estimatedMinutes: input.estimatedMinutes ?? null,
    libraryCategory: input.libraryCategory ?? "master",
    programPhaseId: input.programPhaseId ?? null,
  });
}

/**
 * Where a copy lands. The four required fields are the ones that decide whose
 * workout it is; `name` and `sourceWorkoutId` are overrides with sensible
 * defaults — the source's name, and the source itself, so that adding a
 * template to a phase records its provenance without being asked. The library's
 * own "duplicate" passes `sourceWorkoutId: null`, because a copy of a template
 * that stays in the library did not come *from* anywhere the coach cares about.
 */
export type CopyTarget = {
  coachId: Id<"users"> | null;
  clientId: Id<"users"> | null;
  phaseId: Id<"trainingPhases"> | null;
  position: number;
  name?: string;
  sourceWorkoutId?: string | null;
  /** Which shelf the copy is filed on. Defaults to the source's own. */
  libraryCategory?: LibraryCategory;
  /** The program phase the copy joins, when the copy is going into a program. */
  programPhaseId?: Id<"programPhases"> | null;
};

/**
 * Deep-copy a workout, blocks and items included.
 *
 * This is what keeps the library safe: adding a template to a training phase
 * copies it here and now, so every later edit the coach makes lands on the
 * client's copy and the template is never touched.
 */
export async function copyWorkout(
  ctx: MutationCtx,
  sourceWorkoutId: Id<"workouts">,
  target: CopyTarget,
): Promise<Id<"workouts">> {
  const source = await ctx.db.get("workouts", sourceWorkoutId);
  if (!source) throw new Error("No such workout");

  const copyId = await insertWorkout(ctx, {
    name: target.name ?? source.name,
    focus: source.focus,
    instructions: source.instructions,
    workoutType: source.workoutType,
    coachId: target.coachId,
    clientId: target.clientId,
    phaseId: target.phaseId,
    sourceWorkoutId:
      target.sourceWorkoutId === undefined ? sourceWorkoutId : target.sourceWorkoutId,
    position: target.position,
    estimatedMinutes: source.estimatedMinutes ?? null,
    libraryCategory: target.libraryCategory ?? source.libraryCategory ?? "master",
    programPhaseId: target.programPhaseId ?? null,
  });

  const blocks = await ctx.db
    .query("workoutBlocks")
    .withIndex("by_workout_and_position", (q) => q.eq("workoutId", sourceWorkoutId))
    .collect();

  await Promise.all(
    blocks.map(async (block) => {
      const blockId = await ctx.db.insert("workoutBlocks", {
        workoutId: copyId,
        position: block.position,
        kind: block.kind,
        label: block.label,
        rounds: block.rounds,
        restSeconds: block.restSeconds,
      });

      const items = await ctx.db
        .query("workoutItems")
        .withIndex("by_block_and_position", (q) => q.eq("blockId", block._id))
        .collect();

      await Promise.all(
        items.map((item) =>
          ctx.db.insert("workoutItems", {
            blockId,
            position: item.position,
            kind: item.kind,
            exerciseId: item.exerciseId,
            sets: item.sets,
            reps: item.reps,
            seconds: item.seconds,
            tempo: item.tempo,
            restSeconds: item.restSeconds,
            rpe: item.rpe,
            notes: item.notes,
          }),
        ),
      );
    }),
  );

  return copyId;
}

/**
 * Everything that hangs off a workout, gone: its blocks, their items, and the
 * `workoutId` of any assignment built from it. The `workouts` row itself is the
 * caller's to delete — the library archives instead of deleting, a phase
 * deletes outright, and only the caller knows which.
 *
 * SQLite did all three with `ON DELETE CASCADE` on the children and
 * `ON DELETE SET NULL` on `assignments.workout_id`. Convex has neither, so this
 * function is the whole of it and every delete path goes through it. Nulling the
 * assignment rather than deleting it is deliberate and was the old DDL's choice
 * too: a session the client already trained keeps its own frozen snapshot, and
 * deleting the workout must not delete their history.
 */
export async function deleteWorkoutCascade(
  ctx: MutationCtx,
  workoutId: Id<"workouts">,
): Promise<void> {
  const blocks = await ctx.db
    .query("workoutBlocks")
    .withIndex("by_workout_and_position", (q) => q.eq("workoutId", workoutId))
    .collect();

  const itemsByBlock = await Promise.all(
    blocks.map((block) =>
      ctx.db
        .query("workoutItems")
        .withIndex("by_block_and_position", (q) => q.eq("blockId", block._id))
        .collect(),
    ),
  );
  await Promise.all(itemsByBlock.flat().map((item) => ctx.db.delete("workoutItems", item._id)));
  await Promise.all(blocks.map((block) => ctx.db.delete("workoutBlocks", block._id)));

  const assignments = await ctx.db
    .query("assignments")
    .withIndex("by_workout", (q) => q.eq("workoutId", workoutId))
    .collect();
  await Promise.all(assignments.map((assignment) => ctx.db.patch("assignments", assignment._id, { workoutId: null })));
}

/**
 * Stamps the parent workout as edited. Called after any block or item mutation,
 * exactly where the SQL called it: the workout card shows when a workout was
 * last touched, and adding an exercise to it is touching it.
 */
export async function touchWorkout(ctx: MutationCtx, workoutId: Id<"workouts">): Promise<void> {
  await ctx.db.patch("workouts", workoutId, { updatedAt: Date.now() });
}

/**
 * The loose templates of one builder's workout library, newest first — see
 * `listWorkouts` in `convex/library.ts`.
 *
 * A workout that belongs to a program phase is a template too and also has a
 * null `clientId`, so it comes back from the same index; it is dropped here.
 * The program is where it is read, and listing it in both places would make one
 * session look like two.
 */
export async function libraryWorkouts(ctx: Ctx, ownerId: Id<"users">): Promise<Doc<"workouts">[]> {
  const docs = await ctx.db
    .query("workouts")
    .withIndex("by_owner_and_client", (q) => q.eq("coachId", ownerId).eq("clientId", null))
    .order("desc")
    .take(WORKOUT_LIMIT);
  return docs.filter((doc) => !doc.archived && !doc.programPhaseId);
}

/**
 * The workouts of one client's plan that the coach has hidden, as a set of ids.
 *
 * Every client-facing read goes through this instead of checking the flag on
 * whatever row it happens to have in hand: an assignment carries a frozen
 * snapshot and not the workout, so the only way to know a session belongs to a
 * hidden workout is to have looked the client's workouts up. One indexed read
 * of one person's plan — dozens of rows — answers it for a whole page.
 *
 * Empty for the coach: hiding is about the client's app, and a coach who could
 * not see what she hid could not unhide it.
 */
export async function hiddenWorkoutIds(
  ctx: Ctx,
  clientId: Id<"users">,
): Promise<Set<string>> {
  const docs = await ctx.db
    .query("workouts")
    .withIndex("by_client", (q) => q.eq("clientId", clientId))
    .collect();
  const hidden = new Set<string>();
  for (const doc of docs) if (doc.hiddenFromClient) hidden.add(doc._id as string);
  return hidden;
}
