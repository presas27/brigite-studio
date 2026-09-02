import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import {
  copyWorkout,
  deleteWorkoutCascade,
  insertWorkout,
  workoutSummary,
} from "./model/library";
import { requireClientAccess, requireCoachOf, requireViewer } from "./model/authz";

/**
 * Training phases: the blocks a coach's plan is actually built from. A workout
 * is never assigned to a bare week — it belongs to a phase ("Phase 1 - Base
 * building"), and the phase says how long that stretch of training runs.
 *
 * Two invariants matter here:
 *  1. A phase is scoped by `coachId` as well as `clientId`. Nothing in this
 *     file assumes a single coach.
 *  2. Adding a library workout to a phase *copies* it. The coach then edits the
 *     copy, and the template stays exactly as every other client sees it. This
 *     is the same reasoning as the assignment snapshot in `plan.ts`, one level
 *     earlier: the moment work leaves the library it stops being shared.
 *
 * Who may call what: every write is the coach's (`requireCoach`), because the
 * plan is hers to build. The reads go through `requireClientAccess`, so the
 * client can see the phases of their own plan — the coach's screens under
 * `/app/coach/alunos/[clientId]/plano` and the client's `/app/aluno/plano` are
 * then the same data behind the same gate.
 *
 * The coach id is never an argument. It comes from the session, so a caller
 * hitting the deployment directly cannot write a phase into someone else's
 * plan by naming a different coach.
 */

/* ------------------------------------------------------------- return shapes */

/**
 * `TrainingPhase` from `src/lib/studio/types.ts`, spelled as a validator so the
 * pages keep receiving exactly what they received from SQLite: `id` is the
 * document id as a string and `createdAt` is `_creationTime`.
 */
const phaseFields = {
  id: v.string(),
  coachId: v.string(),
  clientId: v.string(),
  name: v.string(),
  position: v.number(),
  durationType: v.union(v.literal("calendar"), v.literal("weeks")),
  startDate: v.union(v.null(), v.string()),
  endDate: v.union(v.null(), v.string()),
  weeks: v.union(v.null(), v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
};

const phaseValidator = v.object(phaseFields);
const phaseSummaryValidator = v.object({ ...phaseFields, workoutCount: v.number() });

/**
 * `PhaseWorkout`: a workout's metadata, the size of its exercise list, and the
 * days it occupies on the client's calendar.
 */
const workoutSummaryValidator = v.object({
  id: v.string(),
  name: v.string(),
  focus: v.string(),
  instructions: v.string(),
  workoutType: v.union(v.literal("regular"), v.literal("circuit"), v.literal("interval")),
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
  itemCount: v.number(),
  libraryCategory: v.union(v.literal("master"), v.literal("shared")),
  /** Hidden from the client's app; the coach still sees the row. */
  hiddenFromClient: v.boolean(),
  programPhaseId: v.union(v.null(), v.string()),
  /** Ascending day keys, read from the assignments. Empty when unscheduled. */
  scheduleDates: v.array(v.string()),
});

function mapPhase(doc: Doc<"trainingPhases">) {
  return {
    id: doc._id as string,
    coachId: doc.coachId as string,
    clientId: doc.clientId as string,
    name: doc.name,
    position: doc.position,
    durationType: doc.durationType,
    startDate: doc.startDate,
    endDate: doc.endDate,
    weeks: doc.weeks,
    createdAt: doc._creationTime,
    updatedAt: doc.updatedAt,
  };
}

/* ------------------------------------------------------------------- reading */

/**
 * The phases of a client's plan, in the order the coach arranged them.
 *
 * `by_client_and_position` is implicitly suffixed with `_creationTime`, so this
 * is the `ORDER BY position, created_at` the SQL had, for free.
 *
 * The per-phase `collect()` is bounded by construction: it reads one client's
 * workouts one phase at a time, and a phase holds a handful of sessions, not a
 * table's worth.
 */
export const list = query({
  args: { clientId: v.id("users") },
  returns: v.array(phaseSummaryValidator),
  handler: async (ctx, args) => {
    await requireClientAccess(ctx, args.clientId);
    const phases = await ctx.db
      .query("trainingPhases")
      .withIndex("by_client_and_position", (q) => q.eq("clientId", args.clientId))
      .collect();

    return await Promise.all(
      phases.map(async (phase) => ({
        ...mapPhase(phase),
        workoutCount: (await phaseWorkoutDocs(ctx, phase._id)).length,
      })),
    );
  },
});

/** One phase, or `null` when the id names nothing. */
export const find = query({
  args: { phaseId: v.id("trainingPhases") },
  returns: v.union(v.null(), phaseValidator),
  handler: async (ctx, args) => {
    const phase = await ctx.db.get("trainingPhases", args.phaseId);
    // Nothing to authorize against when there is no row — but a signed-out
    // caller still learns nothing, so the gate stays on the way out too.
    if (!phase) {
      await requireViewer(ctx);
      return null;
    }
    await requireClientAccess(ctx, phase.clientId);
    return mapPhase(phase);
  },
});

/* ------------------------------------------------------------------- writing */

/**
 * Create a phase at the end of the client's plan.
 *
 * There is no `coachId` argument: the phase belongs to whoever is signed in,
 * which is also the only account allowed here.
 */
export const create = mutation({
  args: {
    clientId: v.id("users"),
    name: v.string(),
    durationType: v.union(v.literal("calendar"), v.literal("weeks")),
    startDate: v.optional(v.union(v.null(), v.string())),
    endDate: v.optional(v.union(v.null(), v.string())),
    weeks: v.optional(v.union(v.null(), v.number())),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const { coach } = await requireCoachOf(ctx, args.clientId);

    const duration = normaliseDuration(args);
    const now = Date.now();
    const phaseId = await ctx.db.insert("trainingPhases", {
      coachId: coach._id,
      clientId: args.clientId,
      name: args.name.trim(),
      position: await nextPhasePosition(ctx, args.clientId),
      durationType: duration.durationType,
      startDate: duration.startDate,
      endDate: duration.endDate,
      weeks: duration.weeks,
      updatedAt: now,
    });
    return phaseId as string;
  },
});

/**
 * Rename a phase and/or restate how long it runs. One mutation rather than two
 * because the form posts both at once and the duration has to be re-normalised
 * against whatever the other half of the phase already said.
 *
 * An absent field means "leave it"; an explicit `null` means "clear it".
 */
export const update = mutation({
  args: {
    phaseId: v.id("trainingPhases"),
    name: v.optional(v.string()),
    durationType: v.optional(v.union(v.literal("calendar"), v.literal("weeks"))),
    startDate: v.optional(v.union(v.null(), v.string())),
    endDate: v.optional(v.union(v.null(), v.string())),
    weeks: v.optional(v.union(v.null(), v.number())),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const current = await ctx.db.get("trainingPhases", args.phaseId);
    if (!current) return null;
    await requireCoachOf(ctx, current.clientId);

    const duration = normaliseDuration({
      durationType: args.durationType ?? current.durationType,
      startDate: args.startDate === undefined ? current.startDate : args.startDate,
      endDate: args.endDate === undefined ? current.endDate : args.endDate,
      weeks: args.weeks === undefined ? current.weeks : args.weeks,
    });

    await ctx.db.patch("trainingPhases", args.phaseId, {
      name: (args.name ?? current.name).trim() || current.name,
      durationType: duration.durationType,
      startDate: duration.startDate,
      endDate: duration.endDate,
      weeks: duration.weeks,
      updatedAt: Date.now(),
    });
    return null;
  },
});

/**
 * Delete the phase and the client-scoped workouts inside it.
 *
 * SQLite did this with `ON DELETE CASCADE` on `workouts.phase_id`; Convex has
 * no such thing, so the cascade is written out here. `deleteWorkoutCascade`
 * takes each workout's blocks and items and detaches any assignment built from
 * it; the `workouts` row itself is the caller's to delete, because the library
 * archives where a phase deletes outright.
 */
export const remove = mutation({
  args: { phaseId: v.id("trainingPhases") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const phase = await ctx.db.get("trainingPhases", args.phaseId);
    if (!phase) return null;
    await requireCoachOf(ctx, phase.clientId);

    for (const workout of await phaseWorkoutDocs(ctx, args.phaseId, { includeArchived: true })) {
      await deleteWorkoutCascade(ctx, workout._id);
      await ctx.db.delete("workouts", workout._id);
    }
    await ctx.db.delete("trainingPhases", args.phaseId);

    // Positions stay dense so the next phase created lands after the last one
    // rather than into the hole this delete just left.
    const rest = await ctx.db
      .query("trainingPhases")
      .withIndex("by_client_and_position", (q) => q.eq("clientId", phase.clientId))
      .collect();
    await renumber(ctx, rest);
    return null;
  },
});

/* ------------------------------------------------------ workouts in a phase */

/** The workouts of one phase, in the coach's order. */
export const workouts = query({
  args: { phaseId: v.id("trainingPhases") },
  returns: v.array(workoutSummaryValidator),
  handler: async (ctx, args) => {
    const phase = await ctx.db.get("trainingPhases", args.phaseId);
    if (!phase) {
      await requireViewer(ctx);
      return [];
    }
    await requireClientAccess(ctx, phase.clientId);

    const docs = await phaseWorkoutDocs(ctx, args.phaseId);
    return await Promise.all(
      docs.map(async (doc) => ({
        ...(await workoutSummary(ctx, doc)),
        scheduleDates: await scheduleDatesOf(ctx, doc._id),
      })),
    );
  },
});

/**
 * "Add from library". Copies the template into the phase there and then, so the
 * coach's first edit has nowhere to leak: the row they are editing was never
 * the library's. `sourceWorkoutId` keeps the provenance visible.
 *
 * Handing a template to a client is also what moves it off the master shelf and
 * onto the shared one. That is the whole definition of the two shelves — "not
 * given to anybody yet" versus "at least one client has it" — so it is recorded
 * here, at the one moment it becomes true, rather than recomputed later from
 * the copies that happen to still exist.
 */
export const addLibraryWorkout = mutation({
  args: { phaseId: v.id("trainingPhases"), libraryWorkoutId: v.id("workouts") },
  returns: v.union(v.null(), v.string()),
  handler: async (ctx, args) => {
    const phase = await ctx.db.get("trainingPhases", args.phaseId);
    if (!phase) return null;
    const { coach } = await requireCoachOf(ctx, phase.clientId);
    // A template that has since been deleted is a no-op, not an error: the
    // page redirects on a copy id and shows the phase unchanged without one.
    const template = await ctx.db.get("workouts", args.libraryWorkoutId);
    if (!template || template.coachId !== coach._id) return null;

    const copyId = await copyWorkout(ctx, args.libraryWorkoutId, {
      coachId: phase.coachId,
      clientId: phase.clientId,
      phaseId: phase._id,
      position: await nextWorkoutPosition(ctx, phase._id),
      // The copy lives in a plan, not in a library; it gets the neutral shelf so
      // that copying it back out later starts from a clean choice.
      libraryCategory: "master",
    });

    if (template.libraryCategory !== "shared") {
      await ctx.db.patch("workouts", args.libraryWorkoutId, { libraryCategory: "shared" });
    }
    return copyId as string;
  },
});

/**
 * Hide a phase workout from the client's app, or put it back.
 *
 * Not a delete and not an archive: the coach keeps the row, its exercises and
 * its calendar placement, and the client stops seeing both the workout and the
 * sessions it was placed on — see `hiddenWorkoutIds`, which every client-facing
 * read filters through.
 *
 * The phase id is checked rather than decoration, exactly as in `removeWorkout`:
 * it is what stops a workout id from another plan being reached through here.
 */
export const setWorkoutHidden = mutation({
  args: {
    phaseId: v.id("trainingPhases"),
    workoutId: v.id("workouts"),
    hidden: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const workout = await ctx.db.get("workouts", args.workoutId);
    if (!workout || workout.phaseId !== args.phaseId || !workout.clientId) return null;
    await requireCoachOf(ctx, workout.clientId);
    // Visibility is not editing: `updatedAt` stays where the last real edit
    // left it, so the card keeps telling the truth about when it changed.
    await ctx.db.patch("workouts", args.workoutId, { hiddenFromClient: args.hidden });
    return null;
  },
});

/** "Build workout": a new workout that exists only for this client's phase. */
export const createWorkout = mutation({
  args: {
    phaseId: v.id("trainingPhases"),
    name: v.string(),
    focus: v.optional(v.string()),
    instructions: v.optional(v.string()),
    workoutType: v.optional(
      v.union(v.literal("regular"), v.literal("circuit"), v.literal("interval")),
    ),
    estimatedMinutes: v.optional(v.union(v.null(), v.number())),
  },
  returns: v.union(v.null(), v.string()),
  handler: async (ctx, args) => {
    const phase = await ctx.db.get("trainingPhases", args.phaseId);
    if (!phase) return null;
    await requireCoachOf(ctx, phase.clientId);

    const workoutId = await insertWorkout(ctx, {
      name: args.name,
      focus: args.focus ?? "",
      instructions: args.instructions ?? "",
      workoutType: args.workoutType ?? "regular",
      coachId: phase.coachId,
      clientId: phase.clientId,
      phaseId: phase._id,
      sourceWorkoutId: null,
      position: await nextWorkoutPosition(ctx, phase._id),
      estimatedMinutes: args.estimatedMinutes ?? null,
    });
    return workoutId as string;
  },
});

/**
 * Hard delete, not archive: a client-scoped copy has no life outside its phase,
 * and any session already built from it kept its own snapshot.
 *
 * The phase id is part of the call and is checked, not decoration — it is what
 * stops a workout id from another plan being deleted through this route.
 */
export const removeWorkout = mutation({
  args: { phaseId: v.id("trainingPhases"), workoutId: v.id("workouts") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const workout = await ctx.db.get("workouts", args.workoutId);
    if (!workout || workout.phaseId !== args.phaseId || !workout.clientId) return null;
    await requireCoachOf(ctx, workout.clientId);
    await deleteWorkoutCascade(ctx, args.workoutId);
    await ctx.db.delete("workouts", args.workoutId);
    return null;
  },
});

/* ------------------------------------------------------------------ internals */

type PhaseDuration = {
  durationType: "calendar" | "weeks";
  startDate: string | null;
  endDate: string | null;
  weeks: number | null;
};

/**
 * The duration invariant, enforced rather than described: a phase carries one
 * of the two shapes and never a mixture of both.
 *
 *  - `calendar` keeps the dates the coach picked and has no week count. Either
 *    date may still be missing — a phase the coach has not dated yet is a
 *    legitimate state, and the plan list renders whichever end it has.
 *  - `weeks` keeps the count and has no dates. "Six weeks of hypertrophy,
 *    starting whenever the current phase ends" is the whole point of the shape;
 *    a date on it would be a calendar phase wearing the wrong label.
 *
 * SQLite had no `CHECK` for any of this and Convex has none either, so this
 * function is the only thing standing between the two shapes. It runs on both
 * `create` and `update`, which is why switching a dated calendar phase to weeks
 * drops its dates instead of leaving them behind as a second, contradictory
 * answer to how long the phase runs.
 *
 * The week count is coerced to a whole number of at least one; a count that is
 * not a finite number is discarded. `null` stays `null` — the form's week field
 * is not required, and storing "not decided yet" beats inventing a number.
 */
function normaliseDuration(input: {
  durationType: "calendar" | "weeks";
  startDate?: string | null;
  endDate?: string | null;
  weeks?: number | null;
}): PhaseDuration {
  if (input.durationType === "calendar") {
    return {
      durationType: "calendar",
      startDate: input.startDate?.trim() || null,
      endDate: input.endDate?.trim() || null,
      weeks: null,
    };
  }
  const raw = input.weeks;
  const weeks = raw == null || !Number.isFinite(raw) ? null : Math.max(1, Math.trunc(raw));
  return { durationType: "weeks", startDate: null, endDate: null, weeks };
}

/** The workouts of a phase, in position order. Archived ones are hidden. */
async function phaseWorkoutDocs(
  ctx: QueryCtx,
  phaseId: Id<"trainingPhases">,
  options: { includeArchived?: boolean } = {},
): Promise<Doc<"workouts">[]> {
  const docs = await ctx.db
    .query("workouts")
    .withIndex("by_phase_and_position", (q) => q.eq("phaseId", phaseId))
    .collect();
  return options.includeArchived ? docs : docs.filter((doc) => !doc.archived);
}

/**
 * The days a phase workout occupies on the client's calendar, ascending and
 * without repeats.
 *
 * Read from the assignments rather than from a field on the workout, because
 * they are what the calendar renders: a session the coach dragged to another
 * day, or deleted on the week grid, has to be what the phase row and the date
 * picker show. `scheduleMode` records the coach's *method*; this is the result.
 *
 * Bounded by the parent: one workout's assignments are a phase's worth of days,
 * a dozen at most, and the index reads only those.
 */
async function scheduleDatesOf(ctx: QueryCtx, workoutId: Id<"workouts">): Promise<string[]> {
  const assignments = await ctx.db
    .query("assignments")
    .withIndex("by_workout", (q) => q.eq("workoutId", workoutId))
    .collect();
  const dates = new Set<string>();
  for (const doc of assignments) if (doc.date) dates.add(doc.date);
  return [...dates].sort();
}

/** One past the last phase of this client's plan. */
async function nextPhasePosition(ctx: QueryCtx, clientId: Id<"users">): Promise<number> {
  const last = await ctx.db
    .query("trainingPhases")
    .withIndex("by_client_and_position", (q) => q.eq("clientId", clientId))
    .order("desc")
    .first();
  return last ? last.position + 1 : 0;
}

/**
 * One past the last workout of this phase — archived rows included, so that
 * unarchiving one can never collide with a position handed out since.
 */
async function nextWorkoutPosition(
  ctx: QueryCtx,
  phaseId: Id<"trainingPhases">,
): Promise<number> {
  const last = await ctx.db
    .query("workouts")
    .withIndex("by_phase_and_position", (q) => q.eq("phaseId", phaseId))
    .order("desc")
    .first();
  return last ? last.position + 1 : 0;
}

/** Writes `0, 1, 2…` onto the given phases, touching only the rows that move. */
async function renumber(ctx: MutationCtx, ordered: Doc<"trainingPhases">[]): Promise<void> {
  const now = Date.now();
  for (let position = 0; position < ordered.length; position += 1) {
    const phase = ordered[position];
    if (phase.position === position) continue;
    await ctx.db.patch("trainingPhases", phase._id, { position, updatedAt: now });
  }
}
