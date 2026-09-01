import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { requireCoach } from "./model/authz";
import { copyWorkout, deleteWorkoutCascade, workoutSummary } from "./model/library";

/**
 * Training programs: the multi-week shape of a block of training, kept as a
 * template instead of being built straight into one client's plan.
 *
 * A program is to `trainingPhases` what a library workout is to a client's
 * phase copy. It has phases and those phases have workouts, but neither has a
 * client or a date — those only exist once the program is handed to somebody,
 * and handing it over copies it, exactly as `addLibraryWorkout` copies a
 * template into a phase. Nothing a coach later edits on the program can reach
 * into a plan a client is already running.
 *
 * Every function here is `requireCoach` and every one of them scopes by the
 * coach from the session rather than by a `coachId` argument, so a caller
 * hitting the deployment directly cannot read or write another coach's shelf.
 */

/* ------------------------------------------------------------- validators */

const libraryCategory = v.union(v.literal("master"), v.literal("shared"));

const programFields = {
  id: v.string(),
  coachId: v.string(),
  name: v.string(),
  focus: v.string(),
  notes: v.string(),
  libraryCategory,
  archived: v.boolean(),
  createdAt: v.number(),
  updatedAt: v.number(),
};

/**
 * A program as the list draws it: its own fields plus the two numbers that say
 * how big it is. Both are counted here rather than in the page, because the page
 * would otherwise have to fetch every phase of every program to print a total.
 */
const programSummaryShape = v.object({
  ...programFields,
  phaseCount: v.number(),
  /** Weeks across every phase. Phases with no length count as zero. */
  weekCount: v.number(),
  workoutCount: v.number(),
});

const programShape = v.object(programFields);

const programPhaseShape = v.object({
  id: v.string(),
  programId: v.string(),
  name: v.string(),
  position: v.number(),
  weeks: v.union(v.null(), v.number()),
  notes: v.string(),
});

/* ---------------------------------------------------------------- mapping */

function mapProgram(doc: Doc<"trainingPrograms">) {
  return {
    id: doc._id as string,
    coachId: doc.coachId as string,
    name: doc.name,
    focus: doc.focus,
    notes: doc.notes,
    libraryCategory: doc.libraryCategory,
    archived: doc.archived,
    createdAt: doc._creationTime,
    updatedAt: doc.updatedAt,
  };
}

function mapPhase(doc: Doc<"programPhases">) {
  return {
    id: doc._id as string,
    programId: doc.programId as string,
    name: doc.name,
    position: doc.position,
    weeks: doc.weeks,
    notes: doc.notes,
  };
}

/* --------------------------------------------------------------- internals */

/** A whole number of at least `min`, or `min` when the input is not a number. */
function whole(value: number | null | undefined, min: number): number {
  if (value == null || !Number.isFinite(value)) return min;
  return Math.max(min, Math.round(value));
}

async function phasesOf(
  ctx: QueryCtx | MutationCtx,
  programId: Id<"trainingPrograms">,
): Promise<Doc<"programPhases">[]> {
  return ctx.db
    .query("programPhases")
    .withIndex("by_program_and_position", (q) => q.eq("programId", programId))
    .collect();
}

async function workoutsOf(
  ctx: QueryCtx | MutationCtx,
  programPhaseId: Id<"programPhases">,
): Promise<Doc<"workouts">[]> {
  const docs = await ctx.db
    .query("workouts")
    .withIndex("by_program_phase_and_position", (q) => q.eq("programPhaseId", programPhaseId))
    .collect();
  return docs.filter((doc) => !doc.archived);
}

/**
 * The program behind an id, but only if it is this coach's. Returns `null`
 * rather than throwing so the callers can stay no-ops on a stale id, which is
 * what the rest of the app does — a page that redirects is better than a page
 * that shows an error for a program somebody just deleted.
 */
async function ownProgram(
  ctx: QueryCtx | MutationCtx,
  programId: Id<"trainingPrograms">,
): Promise<Doc<"trainingPrograms"> | null> {
  const coach = await requireCoach(ctx);
  const doc = await ctx.db.get("trainingPrograms", programId);
  if (!doc || doc.coachId !== coach._id) return null;
  return doc;
}

/** The phase behind an id, with its program checked against this coach. */
async function ownPhase(
  ctx: QueryCtx | MutationCtx,
  phaseId: Id<"programPhases">,
): Promise<{ phase: Doc<"programPhases">; program: Doc<"trainingPrograms"> } | null> {
  const phase = await ctx.db.get("programPhases", phaseId);
  if (!phase) {
    await requireCoach(ctx);
    return null;
  }
  const program = await ownProgram(ctx, phase.programId);
  return program ? { phase, program } : null;
}

/** Closes the gaps `position` is left with after a delete or a move. */
async function renumber(ctx: MutationCtx, docs: Doc<"programPhases">[]): Promise<void> {
  let position = 0;
  for (const doc of docs) {
    if (doc.position !== position) {
      await ctx.db.patch("programPhases", doc._id, { position });
    }
    position += 1;
  }
}

async function touch(ctx: MutationCtx, programId: Id<"trainingPrograms">): Promise<void> {
  await ctx.db.patch("trainingPrograms", programId, { updatedAt: Date.now() });
}

/* ------------------------------------------------------------------ reading */

/**
 * This coach's programs, newest edit first, optionally one shelf at a time.
 *
 * The counts cost one indexed read per phase, which is a handful per program —
 * a program is written a phase at a time by hand, so this is a guardrail rather
 * than pagination.
 */
export const list = query({
  args: { category: v.optional(libraryCategory) },
  returns: v.array(programSummaryShape),
  handler: async (ctx, args) => {
    const coach = await requireCoach(ctx);
    const docs = (
      args.category
        ? await ctx.db
            .query("trainingPrograms")
            .withIndex("by_coach_and_category", (q) =>
              q.eq("coachId", coach._id).eq("libraryCategory", args.category!),
            )
            .collect()
        : await ctx.db
            .query("trainingPrograms")
            .withIndex("by_coach", (q) => q.eq("coachId", coach._id))
            .collect()
    ).filter((doc) => !doc.archived);

    const rows = await Promise.all(
      docs.map(async (doc) => {
        const phases = await phasesOf(ctx, doc._id);
        let workoutCount = 0;
        let weekCount = 0;
        for (const phase of phases) {
          weekCount += phase.weeks ?? 0;
          workoutCount += (await workoutsOf(ctx, phase._id)).length;
        }
        return { ...mapProgram(doc), phaseCount: phases.length, weekCount, workoutCount };
      }),
    );

    return rows.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

/** One program, or `null` when the id names nothing of this coach's. */
export const find = query({
  args: { programId: v.id("trainingPrograms") },
  returns: v.union(v.null(), programShape),
  handler: async (ctx, args) => {
    const doc = await ownProgram(ctx, args.programId);
    return doc ? mapProgram(doc) : null;
  },
});

/** The phases of one program, in order, each with its workouts. */
export const phases = query({
  args: { programId: v.id("trainingPrograms") },
  returns: v.array(
    v.object({
      ...programPhaseShape.fields,
      workouts: v.array(
        v.object({
          id: v.string(),
          name: v.string(),
          focus: v.string(),
          workoutType: v.union(
            v.literal("regular"),
            v.literal("circuit"),
            v.literal("interval"),
          ),
          position: v.number(),
          itemCount: v.number(),
          estimatedMinutes: v.union(v.null(), v.number()),
        }),
      ),
    }),
  ),
  handler: async (ctx, args) => {
    if (!(await ownProgram(ctx, args.programId))) return [];

    return await Promise.all(
      (await phasesOf(ctx, args.programId)).map(async (phase) => ({
        ...mapPhase(phase),
        workouts: await Promise.all(
          (await workoutsOf(ctx, phase._id)).map(async (doc) => {
            const summary = await workoutSummary(ctx, doc);
            return {
              id: summary.id,
              name: summary.name,
              focus: summary.focus,
              workoutType: summary.workoutType,
              position: summary.position,
              itemCount: summary.itemCount,
              estimatedMinutes: summary.estimatedMinutes,
            };
          }),
        ),
      })),
    );
  },
});

/* ------------------------------------------------------------------ writing */

export const create = mutation({
  args: {
    name: v.string(),
    focus: v.optional(v.string()),
    notes: v.optional(v.string()),
    category: v.optional(libraryCategory),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const coach = await requireCoach(ctx);
    const id = await ctx.db.insert("trainingPrograms", {
      coachId: coach._id,
      name: args.name.trim(),
      focus: args.focus ?? "",
      notes: args.notes ?? "",
      // A new program is a draft: nobody has it yet, whatever the coach intends
      // to do with it.
      libraryCategory: args.category ?? "master",
      archived: false,
      updatedAt: Date.now(),
    });
    return id as string;
  },
});

export const update = mutation({
  args: {
    programId: v.id("trainingPrograms"),
    patch: v.object({
      name: v.optional(v.string()),
      focus: v.optional(v.string()),
      notes: v.optional(v.string()),
      category: v.optional(libraryCategory),
    }),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (!(await ownProgram(ctx, args.programId))) return null;

    const patch: Partial<Doc<"trainingPrograms">> = {};
    if (args.patch.name !== undefined) patch.name = args.patch.name.trim();
    if (args.patch.focus !== undefined) patch.focus = args.patch.focus;
    if (args.patch.notes !== undefined) patch.notes = args.patch.notes;
    if (args.patch.category !== undefined) patch.libraryCategory = args.patch.category;
    if (Object.keys(patch).length === 0) return null;

    patch.updatedAt = Date.now();
    await ctx.db.patch("trainingPrograms", args.programId, patch);
    return null;
  },
});

/**
 * Hard delete: the program, its phases, and the workout templates inside them.
 *
 * A program's workouts have no life outside it — they are not in the workout
 * library, which filters them out precisely because the program is where they
 * are read — so leaving them behind would leave rows nothing can reach. Any
 * client already running a copy of this program keeps their copy: that is what
 * copying on assignment bought.
 */
export const remove = mutation({
  args: { programId: v.id("trainingPrograms") },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (!(await ownProgram(ctx, args.programId))) return null;

    for (const phase of await phasesOf(ctx, args.programId)) {
      for (const workout of await workoutsOf(ctx, phase._id)) {
        await deleteWorkoutCascade(ctx, workout._id);
        await ctx.db.delete("workouts", workout._id);
      }
      await ctx.db.delete("programPhases", phase._id);
    }
    await ctx.db.delete("trainingPrograms", args.programId);
    return null;
  },
});

export const addPhase = mutation({
  args: {
    programId: v.id("trainingPrograms"),
    name: v.string(),
    weeks: v.optional(v.union(v.null(), v.number())),
    notes: v.optional(v.string()),
  },
  returns: v.union(v.null(), v.string()),
  handler: async (ctx, args) => {
    if (!(await ownProgram(ctx, args.programId))) return null;

    const existing = await phasesOf(ctx, args.programId);
    const id = await ctx.db.insert("programPhases", {
      programId: args.programId,
      name: args.name.trim(),
      position: existing.length,
      weeks: args.weeks == null ? null : whole(args.weeks, 1),
      notes: args.notes ?? "",
    });
    await touch(ctx, args.programId);
    return id as string;
  },
});

export const updatePhase = mutation({
  args: {
    phaseId: v.id("programPhases"),
    patch: v.object({
      name: v.optional(v.string()),
      weeks: v.optional(v.union(v.null(), v.number())),
      notes: v.optional(v.string()),
    }),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const owned = await ownPhase(ctx, args.phaseId);
    if (!owned) return null;

    const patch: Partial<Doc<"programPhases">> = {};
    if (args.patch.name !== undefined) patch.name = args.patch.name.trim();
    if (args.patch.weeks !== undefined) {
      patch.weeks = args.patch.weeks == null ? null : whole(args.patch.weeks, 1);
    }
    if (args.patch.notes !== undefined) patch.notes = args.patch.notes;
    if (Object.keys(patch).length === 0) return null;

    await ctx.db.patch("programPhases", args.phaseId, patch);
    await touch(ctx, owned.program._id);
    return null;
  },
});

export const removePhase = mutation({
  args: { phaseId: v.id("programPhases") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const owned = await ownPhase(ctx, args.phaseId);
    if (!owned) return null;

    for (const workout of await workoutsOf(ctx, args.phaseId)) {
      await deleteWorkoutCascade(ctx, workout._id);
      await ctx.db.delete("workouts", workout._id);
    }
    await ctx.db.delete("programPhases", args.phaseId);
    await renumber(ctx, await phasesOf(ctx, owned.program._id));
    await touch(ctx, owned.program._id);
    return null;
  },
});

/**
 * Copy a library workout into one of a program's phases.
 *
 * The same copy-on-add rule the client's plan follows: the program gets its own
 * row, so tuning the program's version of a session leaves the library's
 * template exactly as every other program sees it.
 */
export const addWorkout = mutation({
  args: { phaseId: v.id("programPhases"), libraryWorkoutId: v.id("workouts") },
  returns: v.union(v.null(), v.string()),
  handler: async (ctx, args) => {
    const owned = await ownPhase(ctx, args.phaseId);
    if (!owned) return null;
    if (!(await ctx.db.get("workouts", args.libraryWorkoutId))) return null;

    const existing = await workoutsOf(ctx, args.phaseId);
    const copyId = await copyWorkout(ctx, args.libraryWorkoutId, {
      coachId: owned.program.coachId,
      clientId: null,
      phaseId: null,
      programPhaseId: args.phaseId,
      position: existing.length,
      sourceWorkoutId: args.libraryWorkoutId,
      libraryCategory: owned.program.libraryCategory,
    });
    await touch(ctx, owned.program._id);
    return copyId as string;
  },
});

export const removeWorkout = mutation({
  args: { phaseId: v.id("programPhases"), workoutId: v.id("workouts") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const owned = await ownPhase(ctx, args.phaseId);
    if (!owned) return null;

    const workout = await ctx.db.get("workouts", args.workoutId);
    if (!workout || workout.programPhaseId !== args.phaseId) return null;

    await deleteWorkoutCascade(ctx, args.workoutId);
    await ctx.db.delete("workouts", args.workoutId);
    await touch(ctx, owned.program._id);
    return null;
  },
});

/**
 * Take a client's plan — its phases and every workout in them — and keep it as a
 * program template.
 *
 * This is where "shared with clients" programs come from, and why the shelf is
 * not something the coach has to remember to set: a program lifted off a plan
 * somebody is running is, by definition, one at least one client has.
 *
 * The client's plan is left untouched. Every workout is deep-copied, so the
 * template and the plan diverge from this moment on and neither can rewrite the
 * other.
 */
export const captureFromClient = mutation({
  args: { clientId: v.id("users"), name: v.string() },
  returns: v.string(),
  handler: async (ctx, args) => {
    const coach = await requireCoach(ctx);

    const programId = await ctx.db.insert("trainingPrograms", {
      coachId: coach._id,
      name: args.name.trim(),
      focus: "",
      notes: "",
      libraryCategory: "shared",
      archived: false,
      updatedAt: Date.now(),
    });

    const clientPhases = await ctx.db
      .query("trainingPhases")
      .withIndex("by_client_and_position", (q) => q.eq("clientId", args.clientId))
      .collect();

    for (const [index, phase] of clientPhases.entries()) {
      const phaseId = await ctx.db.insert("programPhases", {
        programId,
        name: phase.name,
        position: index,
        // A template has a length and no dates. A dated phase is converted to
        // the number of weeks it spanned, because that is the part of it that
        // means anything to the next client.
        weeks: phase.weeks ?? weeksBetween(phase.startDate, phase.endDate),
        notes: "",
      });

      const workouts = (
        await ctx.db
          .query("workouts")
          .withIndex("by_phase_and_position", (q) => q.eq("phaseId", phase._id))
          .collect()
      ).filter((doc) => !doc.archived);

      for (const [position, workout] of workouts.entries()) {
        await copyWorkout(ctx, workout._id, {
          coachId: coach._id,
          clientId: null,
          phaseId: null,
          programPhaseId: phaseId,
          position,
          sourceWorkoutId: workout._id,
          libraryCategory: "shared",
        });
      }
    }

    return programId as string;
  },
});

/**
 * Whole weeks between two `YYYY-MM-DD` keys, inclusive of both ends, or `null`
 * when either is missing. A phase the coach never dated has no length to carry
 * across, and inventing one would be worse than saying so.
 */
function weeksBetween(startDate: string | null, endDate: string | null): number | null {
  if (!startDate || !endDate) return null;
  const days = (Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)) / 86_400_000;
  if (!Number.isFinite(days) || days < 0) return null;
  return Math.max(1, Math.round((days + 1) / 7));
}
