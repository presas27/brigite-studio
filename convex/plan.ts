import { v, type Infer } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { requireClientAccess, requireCoach, requireViewer, type Ctx } from "./model/authz";
import { workoutWithBlocks } from "./model/library";
import schema from "./schema";
import { dayKey, shiftDay } from "../src/lib/studio/dates";
import { buildSessionQueue } from "../src/lib/studio/session-queue";
import type { Assignment, ScheduledAssignment, SetLog } from "../src/lib/studio/types";

/**
 * The training plan: workouts placed on a client's calendar, and what the
 * client actually logged against them.
 *
 * Two invariants matter here and are easy to get wrong:
 *  1. An assignment stores a frozen `snapshot` of the workout. Editing the
 *     template later never rewrites a session the client already saw — so the
 *     snapshot is built once, at assign time, and never read back from the
 *     live workout afterwards.
 *  2. Logs are keyed by `itemId` from that snapshot, so re-ordering the
 *     template cannot scramble past numbers. `itemId` and `exerciseId` on a
 *     set log are plain strings for exactly that reason: they are copies, not
 *     references, and nothing here resolves them against a live row.
 *
 * Two things SQLite did for us that this module now does by hand:
 * `ON DELETE CASCADE` from an assignment to its set logs, and the
 * `CHECK (effort BETWEEN 1 AND 10)` on the effort a client reports.
 */

/* ------------------------------------------------------------- validators */

// The snapshot and status shapes come from the schema rather than being
// re-typed here: `schema.ts` owns them, and a second copy would drift the
// first time a field is added to a frozen workout.
const assignmentColumns = schema.tables.assignments.validator.fields;

/**
 * The domain `Assignment`: `_id` flattened to `id`, `_creationTime` to
 * `createdAt`. Ids are plain strings on this side of the wire because that is
 * what `src/lib/studio/types.ts` says they are.
 */
const assignmentFields = {
  id: v.string(),
  clientId: v.string(),
  workoutId: v.union(v.null(), v.string()),
  status: assignmentColumns.status,
  note: v.string(),
  startedAt: v.union(v.null(), v.number()),
  doneAt: v.union(v.null(), v.number()),
  effort: v.union(v.null(), v.number()),
  extraRestSeconds: v.number(),
  createdAt: v.number(),
  snapshot: assignmentColumns.snapshot,
};

const assignmentShape = v.object({
  ...assignmentFields,
  date: v.union(v.null(), v.string()),
});

/** `ScheduledAssignment`: the same row, but the date is known to be there. */
const scheduledShape = v.object({ ...assignmentFields, date: v.string() });

const studioShape = v.object({
  ...assignmentFields,
  date: v.string(),
  clientName: v.string(),
});

const setLogShape = v.object({
  id: v.string(),
  assignmentId: v.string(),
  itemId: v.string(),
  exerciseId: v.string(),
  setIndex: v.number(),
  reps: v.union(v.null(), v.number()),
  loadKg: v.union(v.null(), v.number()),
  seconds: v.union(v.null(), v.number()),
  rpe: v.union(v.null(), v.number()),
  notes: v.string(),
  loggedAt: v.number(),
});

/** One row of the coach's session history. Mirrors `SessionRow` in `report.ts`. */
const sessionRowShape = v.object({
  id: v.string(),
  date: v.union(v.null(), v.string()),
  name: v.string(),
  focus: v.string(),
  status: assignmentColumns.status,
  effort: v.union(v.null(), v.number()),
  extraRestSeconds: v.number(),
  plannedSets: v.number(),
  loggedSets: v.number(),
  durationMinutes: v.union(v.null(), v.number()),
  volumeKg: v.number(),
});

const personalRecordShape = v.object({
  exerciseId: v.string(),
  exerciseName: v.string(),
  bestLoadKg: v.union(v.null(), v.number()),
  bestSeconds: v.union(v.null(), v.number()),
  bestReps: v.union(v.null(), v.number()),
});

/* ----------------------------------------------------------------- mapping */

function mapAssignment(doc: Doc<"assignments">): Assignment {
  return {
    id: doc._id,
    clientId: doc.clientId,
    workoutId: doc.workoutId,
    date: doc.date,
    status: doc.status,
    note: doc.note,
    startedAt: doc.startedAt,
    doneAt: doc.doneAt,
    effort: doc.effort,
    extraRestSeconds: doc.extraRestSeconds,
    createdAt: doc._creationTime,
    snapshot: doc.snapshot,
  };
}

/**
 * `loggedAt` is `_creationTime`: a set that is logged again is a patch of the
 * same row, and the order the sets first came in is the order every reader
 * here wants.
 */
function mapLog(doc: Doc<"setLogs">): SetLog {
  return {
    id: doc._id,
    assignmentId: doc.assignmentId,
    itemId: doc.itemId,
    exerciseId: doc.exerciseId,
    setIndex: doc.setIndex,
    reps: doc.reps,
    loadKg: doc.loadKg,
    seconds: doc.seconds,
    rpe: doc.rpe,
    notes: doc.notes,
    loggedAt: doc._creationTime,
  };
}

/**
 * Keep only the rows that have a day, and say so in the type.
 *
 * SQL got this for free: `date BETWEEN ? AND ?` and `date = ?` both drop
 * `NULL` rows, which is why `ScheduledAssignment` can promise a `string`. A
 * Convex index range does the same thing — `null` sorts before every string,
 * so a range bounded by two date keys can never contain one — but that is a
 * property of the collation and not something a reader of this file can see.
 * Every date-ranged query below therefore runs its result through here, and
 * the promise the type makes is one the code actually keeps.
 */
function scheduledOnly(docs: Doc<"assignments">[]): ScheduledAssignment[] {
  const rows: ScheduledAssignment[] = [];
  for (const doc of docs) {
    if (doc.date === null) continue;
    rows.push({ ...mapAssignment(doc), date: doc.date });
  }
  return rows;
}

/* -------------------------------------------------------------------- gates */

/**
 * The assignment behind an id, with the client gate already applied: the coach
 * reaches any of hers, a client only their own. `null` when there is no such
 * row — but only for someone who is signed in, so an anonymous caller cannot
 * use a 404 to tell an id apart from a real one.
 */
async function readable(
  ctx: Ctx,
  assignmentId: Id<"assignments">,
): Promise<Doc<"assignments"> | null> {
  const doc = await ctx.db.get("assignments", assignmentId);
  if (!doc) {
    await requireViewer(ctx);
    return null;
  }
  await requireClientAccess(ctx, doc.clientId);
  return doc;
}

/** The same gate for a write, where a missing row is an error and not an answer. */
async function writable(ctx: Ctx, assignmentId: Id<"assignments">): Promise<Doc<"assignments">> {
  const doc = await readable(ctx, assignmentId);
  if (!doc) throw new Error("No such assignment");
  return doc;
}

/** Coach-only, for the three things only she does: assign, reschedule, delete. */
async function coachAssignment(
  ctx: Ctx,
  assignmentId: Id<"assignments">,
): Promise<Doc<"assignments">> {
  await requireCoach(ctx);
  const doc = await ctx.db.get("assignments", assignmentId);
  if (!doc) throw new Error("No such assignment");
  return doc;
}

/* ------------------------------------------------------------------ numbers */

/** Clamp a client-supplied count into something a query can safely be sized by. */
function bounded(value: number | undefined, fallback: number, max: number): number {
  if (value == null || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(1, Math.round(value)));
}

/**
 * A logged number, or nothing. `NaN` and `Infinity` are refused rather than
 * stored: they are valid float64s as far as the validator is concerned, and
 * one of them poisons every volume total the report adds up afterwards.
 */
function metric(value: number | null | undefined): number | null {
  if (value == null) return null;
  if (!Number.isFinite(value)) throw new Error("Not a finite number");
  return value;
}

/* -------------------------------------------------------------- assignments */

/**
 * Place a workout on a client's calendar, freezing the template as it is now.
 * `date: null` leaves it unscheduled — it lands in the "sem dia" bucket until
 * the coach assigns it a day.
 *
 * Returns `null` when the workout is gone, which is the caller's cue that
 * nothing was written.
 */
export const assignWorkout = mutation({
  args: {
    clientId: v.id("users"),
    workoutId: v.id("workouts"),
    date: v.union(v.null(), v.string()),
    note: v.optional(v.string()),
  },
  returns: v.union(v.null(), v.id("assignments")),
  handler: async (ctx, args) => {
    await requireCoach(ctx);
    // Also proves the subject is a real, non-archived client before anything
    // is frozen against them.
    await requireClientAccess(ctx, args.clientId);

    const workout = await workoutWithBlocks(ctx, args.workoutId);
    if (!workout) return null;

    return await ctx.db.insert("assignments", {
      clientId: args.clientId,
      workoutId: args.workoutId,
      date: args.date,
      status: "scheduled",
      snapshot: {
        name: workout.name,
        focus: workout.focus,
        notes: workout.notes,
        instructions: workout.instructions,
        estimatedMinutes: workout.estimatedMinutes,
        blocks: workout.blocks,
      },
      note: args.note ?? "",
      startedAt: null,
      doneAt: null,
      effort: null,
      extraRestSeconds: 0,
    });
  },
});

/**
 * Replace a phase workout's calendar placement: weekly repeats, specific dates,
 * or no day at all. Finished sessions stay; unfinished ones are rewritten to
 * match the new method.
 */
export const rescheduleWorkout = mutation({
  args: {
    clientId: v.id("users"),
    workoutId: v.id("workouts"),
    mode: v.union(v.literal("weekly"), v.literal("custom"), v.literal("none")),
    weekday: v.optional(v.union(v.null(), v.number())),
    dates: v.optional(v.array(v.string())),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireCoach(ctx);
    await requireClientAccess(ctx, args.clientId);

    const workout = await workoutWithBlocks(ctx, args.workoutId);
    if (!workout) return null;

    await ctx.db.patch("workouts", args.workoutId, {
      scheduleMode: args.mode,
      scheduleWeekday: args.mode === "weekly" ? (args.weekday ?? null) : null,
      updatedAt: Date.now(),
    });

    const existing = await ctx.db
      .query("assignments")
      .withIndex("by_workout", (q) => q.eq("workoutId", args.workoutId))
      .collect();

    const desired = args.mode === "none" ? [] : [...new Set(args.dates ?? [])];
    const occupied = new Set<string>();

    for (const doc of existing) {
      const locked = doc.status !== "scheduled" || doc.startedAt != null;
      if (locked) {
        if (doc.date) occupied.add(doc.date);
        continue;
      }
      if (args.mode !== "none" && doc.date && desired.includes(doc.date)) {
        occupied.add(doc.date);
        continue;
      }
      await ctx.db.delete("assignments", doc._id);
    }

    const snapshot = {
      name: workout.name,
      focus: workout.focus,
      notes: workout.notes,
      instructions: workout.instructions,
      estimatedMinutes: workout.estimatedMinutes,
      blocks: workout.blocks,
    };

    if (args.mode === "none") {
      const stillOpen = await ctx.db
        .query("assignments")
        .withIndex("by_workout", (q) => q.eq("workoutId", args.workoutId))
        .collect();
      if (!stillOpen.some((doc) => doc.date == null && doc.status === "scheduled")) {
        await ctx.db.insert("assignments", {
          clientId: args.clientId,
          workoutId: args.workoutId,
          date: null,
          status: "scheduled",
          snapshot,
          note: "",
          startedAt: null,
          doneAt: null,
          effort: null,
          extraRestSeconds: 0,
        });
      }
      return null;
    }

    for (const date of desired) {
      if (occupied.has(date)) continue;
      await ctx.db.insert("assignments", {
        clientId: args.clientId,
        workoutId: args.workoutId,
        date,
        status: "scheduled",
        snapshot,
        note: "",
        startedAt: null,
        doneAt: null,
        effort: null,
        extraRestSeconds: 0,
      });
    }
    return null;
  },
});

export const findAssignment = query({
  args: { assignmentId: v.id("assignments") },
  returns: v.union(v.null(), assignmentShape),
  handler: async (ctx, args) => {
    const doc = await readable(ctx, args.assignmentId);
    return doc && mapAssignment(doc);
  },
});

/** Assignments for a client between two `YYYY-MM-DD` keys, inclusive. */
export const assignmentsBetween = query({
  args: { clientId: v.id("users"), from: v.string(), to: v.string() },
  returns: v.array(scheduledShape),
  handler: async (ctx, args) => {
    await requireClientAccess(ctx, args.clientId);
    const docs = await ctx.db
      .query("assignments")
      .withIndex("by_client_and_date", (q) =>
        q.eq("clientId", args.clientId).gte("date", args.from).lte("date", args.to),
      )
      .collect();
    // The index orders by (clientId, date, _creationTime), which is the
    // `ORDER BY date, created_at` the calendar reads.
    return scheduledOnly(docs);
  },
});

/** A client's workouts assigned with no day yet, oldest first. */
export const unscheduledAssignments = query({
  args: { clientId: v.id("users") },
  returns: v.array(assignmentShape),
  handler: async (ctx, args) => {
    await requireClientAccess(ctx, args.clientId);
    const docs = await ctx.db
      .query("assignments")
      .withIndex("by_client_and_date", (q) => q.eq("clientId", args.clientId).eq("date", null))
      .collect();
    return docs.map(mapAssignment);
  },
});

/**
 * Every active client's assignments in a date range, with the client's name
 * already attached — the studio-wide calendar draws a whole month from one
 * call.
 *
 * SQL joined; here we walk the clients and read each one's range through
 * `by_client_and_date`. There is one coach and a handful of clients, so a
 * handful of indexed range reads is cheaper than a scan of every assignment in
 * the studio, and it stays cheap as history grows.
 */
export const studioAssignmentsBetween = query({
  args: { from: v.string(), to: v.string() },
  returns: v.array(studioShape),
  handler: async (ctx, args) => {
    await requireCoach(ctx);

    const clients = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "client"))
      .collect();

    const rows: (ScheduledAssignment & { clientName: string })[] = [];
    for (const client of clients) {
      if (client.status === "archived") continue;
      const docs = await ctx.db
        .query("assignments")
        .withIndex("by_client_and_date", (q) =>
          q.eq("clientId", client._id).gte("date", args.from).lte("date", args.to),
        )
        .collect();
      for (const assignment of scheduledOnly(docs)) {
        rows.push({ ...assignment, clientName: client.name });
      }
    }

    // `ORDER BY a.date, u.name COLLATE NOCASE, a.created_at`.
    rows.sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        a.clientName.localeCompare(b.clientName, "pt", { sensitivity: "base" }) ||
        a.createdAt - b.createdAt,
    );
    return rows;
  },
});

export const assignmentsOn = query({
  args: { clientId: v.id("users"), date: v.string() },
  returns: v.array(scheduledShape),
  handler: async (ctx, args) => {
    await requireClientAccess(ctx, args.clientId);
    const docs = await ctx.db
      .query("assignments")
      .withIndex("by_client_and_date", (q) =>
        q.eq("clientId", args.clientId).eq("date", args.date),
      )
      .collect();
    return scheduledOnly(docs);
  },
});

/** The client's next unfinished session — today's if there is one, else the soonest ahead. */
export const nextAssignment = query({
  args: { clientId: v.id("users"), from: v.optional(v.string()) },
  returns: v.union(v.null(), scheduledShape),
  handler: async (ctx, args) => {
    await requireClientAccess(ctx, args.clientId);
    const from = args.from ?? dayKey();

    // Streamed rather than collected: the answer is almost always the first
    // row, and the index already has it in (date, created_at) order.
    for await (const doc of ctx.db
      .query("assignments")
      .withIndex("by_client_and_date", (q) =>
        q.eq("clientId", args.clientId).gte("date", from),
      )) {
      if (doc.date === null || doc.status !== "scheduled") continue;
      return { ...mapAssignment(doc), date: doc.date };
    }
    return null;
  },
});

/**
 * Finished or missed sessions, newest first.
 *
 * `by_client_and_status` is read once per closed status and the two lists are
 * merged, because the index orders inside a status by creation and the history
 * is read by day. `ORDER BY date DESC` in SQLite puts the undated rows last,
 * which is what the comparator below reproduces.
 */
async function historyDocs(
  ctx: Ctx,
  clientId: Id<"users">,
  limit: number,
): Promise<Doc<"assignments">[]> {
  const closed = await Promise.all(
    (["done", "skipped"] as const).map((status) =>
      ctx.db
        .query("assignments")
        .withIndex("by_client_and_status", (q) =>
          q.eq("clientId", clientId).eq("status", status),
        )
        .collect(),
    ),
  );

  return closed
    .flat()
    .sort((a, b) => {
      if (a.date !== b.date) {
        if (a.date === null) return 1;
        if (b.date === null) return -1;
        return a.date < b.date ? 1 : -1;
      }
      return b._creationTime - a._creationTime;
    })
    .slice(0, limit);
}

export const assignmentHistory = query({
  args: { clientId: v.id("users"), limit: v.optional(v.number()) },
  returns: v.array(assignmentShape),
  handler: async (ctx, args) => {
    await requireClientAccess(ctx, args.clientId);
    const docs = await historyDocs(ctx, args.clientId, bounded(args.limit, 30, 500));
    return docs.map(mapAssignment);
  },
});

export const moveAssignment = mutation({
  args: { assignmentId: v.id("assignments"), date: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await coachAssignment(ctx, args.assignmentId);
    await ctx.db.patch("assignments", args.assignmentId, { date: args.date });
    return null;
  },
});

/**
 * Delete an assignment and everything logged against it. SQLite cascaded from
 * `set_logs.assignment_id`; here the mutation is the cascade, and forgetting it
 * would leave logs pointing at a row that no longer exists.
 */
export const removeAssignment = mutation({
  args: { assignmentId: v.id("assignments") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await coachAssignment(ctx, args.assignmentId);
    await deleteLogs(ctx, args.assignmentId);
    await ctx.db.delete("assignments", args.assignmentId);
    return null;
  },
});

export const startAssignment = mutation({
  args: { assignmentId: v.id("assignments") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const doc = await writable(ctx, args.assignmentId);
    // Only the first open counts: re-entering a session mid-way must not reset
    // the clock the report measures duration with.
    if (doc.startedAt == null) {
      await ctx.db.patch("assignments", doc._id, { startedAt: Date.now() });
    }
    return null;
  },
});

/**
 * `at` overrides when the session was finished. The app never passes it — a
 * session is done at the moment it is marked done — but the demo seed builds a
 * month of history in one go, and stamping all of it with `Date.now()` would
 * put four weeks of training in the same second of the activity feed.
 */
export const setAssignmentStatus = mutation({
  args: {
    assignmentId: v.id("assignments"),
    status: assignmentColumns.status,
    at: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Both sides reach this one: the coach marks a session skipped from the
    // week grid, the client skips her own from the player.
    const doc = await writable(ctx, args.assignmentId);
    const at = args.at ?? Date.now();
    await ctx.db.patch("assignments", doc._id, {
      status: args.status,
      doneAt: args.status === "done" ? at : null,
    });
    return null;
  },
});

/**
 * Close a session and record what it cost her: the effort she reported, and how
 * much rest she took beyond what Sara prescribed. Separate from
 * `setAssignmentStatus` because only this path has those two answers — marking
 * a session skipped from the week grid never does.
 *
 * Effort is 1-10. SQLite enforced that with a `CHECK` and the old code rounded
 * into range before it ever got there; the rounding is now the whole guard, so
 * it stays, and a number that is not a number is refused outright.
 */
export const completeAssignment = mutation({
  args: {
    assignmentId: v.id("assignments"),
    effort: v.union(v.null(), v.number()),
    extraRestSeconds: v.number(),
    at: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const doc = await writable(ctx, args.assignmentId);
    const effort = metric(args.effort);
    const extraRest = metric(args.extraRestSeconds) ?? 0;
    await ctx.db.patch("assignments", doc._id, {
      status: "done",
      doneAt: args.at ?? Date.now(),
      effort: effort == null ? null : Math.min(10, Math.max(1, Math.round(effort))),
      extraRestSeconds: Math.max(0, Math.round(extraRest)),
    });
    return null;
  },
});

/**
 * Throw away everything logged against a session and put it back the way it was
 * before it was ever opened. This is the client discarding a workout she started
 * by mistake or abandoned — not the same as skipping it, which is a fact about
 * the week that Sara needs to see.
 */
export const discardAssignment = mutation({
  args: { assignmentId: v.id("assignments") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const doc = await writable(ctx, args.assignmentId);
    await deleteLogs(ctx, doc._id);
    await ctx.db.patch("assignments", doc._id, {
      status: "scheduled",
      startedAt: null,
      doneAt: null,
      effort: null,
      extraRestSeconds: 0,
    });
    return null;
  },
});

/**
 * Copy a whole week of assignments forward by `weeks`. Returns how many landed.
 *
 * The copies carry the source's frozen snapshot rather than re-reading the
 * workout: repeating a week must repeat the week that happened, not whatever
 * the template says today.
 */
export const repeatWeek = mutation({
  args: { clientId: v.id("users"), mondayKey: v.string(), weeks: v.optional(v.number()) },
  returns: v.number(),
  handler: async (ctx, args) => {
    await requireCoach(ctx);
    await requireClientAccess(ctx, args.clientId);

    // A year at a time is already far more than the plan screen offers, and the
    // bound is what keeps one call from writing an unbounded number of rows.
    const weeks = bounded(args.weeks, 1, 52);

    // The source rows are read as documents rather than through
    // `scheduledOnly`: the copy is written straight back into the table, so
    // there is no reason to take it through the domain shape and back.
    const source = (
      await ctx.db
        .query("assignments")
        .withIndex("by_client_and_date", (q) =>
          q
            .eq("clientId", args.clientId)
            .gte("date", args.mondayKey)
            .lte("date", shiftDay(args.mondayKey, 6)),
        )
        .collect()
    ).filter((doc): doc is Doc<"assignments"> & { date: string } => doc.date !== null);
    if (source.length === 0) return 0;

    let created = 0;
    for (let week = 1; week <= weeks; week += 1) {
      for (const doc of source) {
        await ctx.db.insert("assignments", {
          clientId: args.clientId,
          workoutId: doc.workoutId,
          date: shiftDay(doc.date, week * 7),
          status: "scheduled",
          snapshot: doc.snapshot,
          note: doc.note,
          startedAt: null,
          doneAt: null,
          effort: null,
          extraRestSeconds: 0,
        });
        created += 1;
      }
    }
    return created;
  },
});

/* ---------------------------------------------------------------- set logs */

async function logDocs(ctx: Ctx, assignmentId: Id<"assignments">): Promise<Doc<"setLogs">[]> {
  return await ctx.db
    .query("setLogs")
    .withIndex("by_assignment", (q) => q.eq("assignmentId", assignmentId))
    .collect();
}

async function deleteLogs(ctx: MutationCtx, assignmentId: Id<"assignments">): Promise<void> {
  for (const log of await logDocs(ctx, assignmentId)) {
    await ctx.db.delete("setLogs", log._id);
  }
}

export const logsFor = query({
  args: { assignmentId: v.id("assignments") },
  returns: v.array(setLogShape),
  handler: async (ctx, args) => {
    const doc = await readable(ctx, args.assignmentId);
    if (!doc) return [];
    const logs = await logDocs(ctx, doc._id);
    // `ORDER BY item_id, set_index`: the player looks a step up by key, so the
    // order only has to be stable, but the report reads it straight through.
    logs.sort((a, b) => a.itemId.localeCompare(b.itemId) || a.setIndex - b.setIndex);
    return logs.map(mapLog);
  },
});

/**
 * Record one set. Idempotent per (assignment, item, set) so a flaky connection
 * re-sending the same set does not duplicate it — this is what makes the
 * offline queue on the client safe to replay. SQLite had the uniqueness; here
 * the mutation looks the row up first and patches it.
 */
export const recordSet = mutation({
  args: {
    assignmentId: v.id("assignments"),
    itemId: v.string(),
    exerciseId: v.string(),
    setIndex: v.number(),
    reps: v.optional(v.union(v.null(), v.number())),
    loadKg: v.optional(v.union(v.null(), v.number())),
    seconds: v.optional(v.union(v.null(), v.number())),
    rpe: v.optional(v.union(v.null(), v.number())),
    notes: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const doc = await writable(ctx, args.assignmentId);
    const values = {
      reps: metric(args.reps),
      loadKg: metric(args.loadKg),
      seconds: metric(args.seconds),
      rpe: metric(args.rpe),
      notes: args.notes ?? "",
    };

    const existing = (await logDocs(ctx, doc._id)).find(
      (log) => log.itemId === args.itemId && log.setIndex === args.setIndex,
    );
    if (existing) {
      await ctx.db.patch("setLogs", existing._id, values);
      return null;
    }

    await ctx.db.insert("setLogs", {
      assignmentId: doc._id,
      itemId: args.itemId,
      exerciseId: args.exerciseId,
      setIndex: args.setIndex,
      ...values,
    });
    return null;
  },
});

export const clearSet = mutation({
  args: { assignmentId: v.id("assignments"), itemId: v.string(), setIndex: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const doc = await writable(ctx, args.assignmentId);
    for (const log of await logDocs(ctx, doc._id)) {
      if (log.itemId === args.itemId && log.setIndex === args.setIndex) {
        await ctx.db.delete("setLogs", log._id);
      }
    }
    return null;
  },
});

/**
 * The client's previous numbers for an exercise, so the logger can pre-fill
 * instead of asking them to remember. Excludes the session in progress.
 *
 * `by_exercise` narrows to the one movement across the studio, which is a much
 * smaller set than everything this client has ever logged; the walk stops at
 * the first log that belongs to her, newest first, and that log's session is
 * the one to read in full.
 */
export const lastLogsForExercise = query({
  args: {
    clientId: v.id("users"),
    exerciseId: v.string(),
    excludeAssignmentId: v.optional(v.id("assignments")),
  },
  returns: v.array(setLogShape),
  handler: async (ctx, args) => {
    await requireClientAccess(ctx, args.clientId);

    const logs = await ctx.db
      .query("setLogs")
      .withIndex("by_exercise", (q) => q.eq("exerciseId", args.exerciseId))
      .order("desc")
      .collect();

    const owners = new Map<string, boolean>();
    let previousId: Id<"assignments"> | null = null;
    for (const log of logs) {
      if (log.assignmentId === args.excludeAssignmentId) continue;
      let mine = owners.get(log.assignmentId);
      if (mine === undefined) {
        const assignment = await ctx.db.get("assignments", log.assignmentId);
        mine = assignment?.clientId === args.clientId;
        owners.set(log.assignmentId, mine);
      }
      if (mine) {
        previousId = log.assignmentId;
        break;
      }
    }
    if (!previousId) return [];

    return logs
      .filter((log) => log.assignmentId === previousId)
      .sort((a, b) => a.setIndex - b.setIndex)
      .map(mapLog);
  },
});

/* ------------------------------------------------------------- aggregations */

/** Reps × load over every set that had both. A plank contributes nothing, which is correct. */
function volumeOf(logs: Doc<"setLogs">[]): number {
  return logs.reduce(
    (total, log) => (log.reps != null && log.loadKg != null ? total + log.reps * log.loadKg : total),
    0,
  );
}

function durationOf(doc: Doc<"assignments">): number | null {
  if (doc.startedAt == null || doc.doneAt == null) return null;
  return Math.max(1, Math.round((doc.doneAt - doc.startedAt) / 60_000));
}

/**
 * Heaviest set and longest hold ever logged, per exercise.
 *
 * Set logs are reachable by assignment or by exercise and never by client, so
 * "everything she has logged" means her assignments and then their logs. That
 * is a few thousand documents after years of training in a studio with a
 * handful of clients, comfortably inside a query's read budget, and a record
 * is by definition a question about all of them.
 *
 * The exercise's name comes from the snapshots she trained rather than from
 * the library: the log holds a copied `exerciseId` on purpose, and a record
 * set against an exercise Sara has since deleted is still a record. A log no
 * snapshot can name is dropped instead of listed blank — the same rows the
 * old inner join left out.
 */
export const personalRecords = query({
  args: { clientId: v.id("users") },
  returns: v.array(personalRecordShape),
  handler: async (ctx, args) => {
    await requireClientAccess(ctx, args.clientId);

    const assignments = await ctx.db
      .query("assignments")
      .withIndex("by_client_and_date", (q) => q.eq("clientId", args.clientId))
      .collect();

    const names = new Map<string, string>();
    for (const assignment of assignments) {
      for (const block of assignment.snapshot.blocks) {
        for (const item of block.items) names.set(item.exerciseId, item.exerciseName);
      }
    }

    const best = new Map<
      string,
      { bestLoadKg: number | null; bestSeconds: number | null; bestReps: number | null }
    >();
    for (const assignment of assignments) {
      for (const log of await logDocs(ctx, assignment._id)) {
        const current = best.get(log.exerciseId) ?? {
          bestLoadKg: null,
          bestSeconds: null,
          bestReps: null,
        };
        // `max()` ignores NULLs and yields NULL when every row was one.
        best.set(log.exerciseId, {
          bestLoadKg: highest(current.bestLoadKg, log.loadKg),
          bestSeconds: highest(current.bestSeconds, log.seconds),
          bestReps: highest(current.bestReps, log.reps),
        });
      }
    }

    return [...best.entries()]
      .map(([exerciseId, records]) => ({
        exerciseId,
        exerciseName: names.get(exerciseId) ?? "",
        ...records,
      }))
      .filter((record) => record.exerciseName !== "")
      .sort((a, b) => a.exerciseName.localeCompare(b.exerciseName, "pt", { sensitivity: "base" }));
  },
});

function highest(current: number | null, candidate: number | null): number | null {
  if (candidate == null) return current;
  return current == null ? candidate : Math.max(current, candidate);
}

/**
 * Every session this client has finished or missed, newest first — the coach's
 * training log.
 *
 * The counting used to be a `GROUP BY` in `report.ts`; it lives here now
 * because the logs it sums never leave the database otherwise. `plannedSets`
 * walks the frozen snapshot through `buildSessionQueue`, the same function the
 * player walks, so the report lists exactly the sets the client was asked for.
 */
export const sessionHistory = query({
  args: { clientId: v.id("users"), limit: v.optional(v.number()) },
  returns: v.array(sessionRowShape),
  handler: async (ctx, args) => {
    await requireClientAccess(ctx, args.clientId);
    const docs = await historyDocs(ctx, args.clientId, bounded(args.limit, 60, 500));

    const rows: Infer<typeof sessionRowShape>[] = [];
    for (const doc of docs) {
      const logs = await logDocs(ctx, doc._id);
      rows.push({
        id: doc._id,
        date: doc.date,
        name: doc.snapshot.name,
        focus: doc.snapshot.focus,
        status: doc.status,
        effort: doc.effort,
        extraRestSeconds: doc.extraRestSeconds,
        plannedSets: buildSessionQueue(doc.snapshot).length,
        loggedSets: logs.length,
        durationMinutes: durationOf(doc),
        volumeKg: volumeOf(logs),
      });
    }
    return rows;
  },
});

/**
 * Share of scheduled sessions completed over the last `days` days.
 *
 * Undated assignments are outside the question — an unscheduled workout was
 * never due — and the date range drops them, both through the index bounds and
 * explicitly below.
 */
export const adherence = query({
  args: { clientId: v.id("users"), days: v.optional(v.number()) },
  returns: v.object({ done: v.number(), total: v.number() }),
  handler: async (ctx, args) => {
    await requireClientAccess(ctx, args.clientId);
    const today = dayKey();
    const from = shiftDay(today, -bounded(args.days, 28, 365));

    const docs = await ctx.db
      .query("assignments")
      .withIndex("by_client_and_date", (q) =>
        q.eq("clientId", args.clientId).gte("date", from).lte("date", today),
      )
      .collect();

    let done = 0;
    let total = 0;
    for (const doc of docs) {
      if (doc.date === null) continue;
      total += 1;
      if (doc.status === "done") done += 1;
    }
    return { done, total };
  },
});

/* ---------------------------------------------------- one workout's history */

const progressionPointShape = v.object({
  date: v.string(),
  loadKg: v.union(v.null(), v.number()),
  reps: v.union(v.null(), v.number()),
  seconds: v.union(v.null(), v.number()),
});

/**
 * What one client logged against one workout, session by session, inside a date
 * range — the numbers behind the coach's progression report.
 *
 * Matched on `workoutId`, never on the workout's name: a client's plan can hold
 * two copies of "Força A" in different phases, and a coach printing one of them
 * is asking about that one. `by_workout` reads exactly this workout's
 * assignments and nothing else; the client and the range are then checked on
 * the handful of rows it returns.
 *
 * One point per exercise per session, and that point is the session's best set:
 * a session logs three sets and a trend line wants one number, so the heaviest
 * load, the longest hold and the most reps are what carry forward. Which of the
 * three a chart plots is the caller's decision, because only the workout knows
 * how each exercise is measured.
 */
export const workoutProgression = query({
  args: {
    clientId: v.id("users"),
    workoutId: v.id("workouts"),
    from: v.string(),
    to: v.string(),
  },
  returns: v.object({
    sessions: v.array(v.object({ id: v.string(), date: v.string() })),
    series: v.array(
      v.object({ exerciseId: v.string(), points: v.array(progressionPointShape) }),
    ),
  }),
  handler: async (ctx, args) => {
    await requireClientAccess(ctx, args.clientId);

    const docs = await ctx.db
      .query("assignments")
      .withIndex("by_workout", (q) => q.eq("workoutId", args.workoutId))
      .collect();

    // Only finished sessions: a scheduled or skipped day has nothing logged
    // against it, and counting it would put a gap in the line that reads as a
    // bad session rather than as no session.
    const sessions: { id: Id<"assignments">; date: string }[] = [];
    for (const doc of docs) {
      if (doc.clientId !== args.clientId || doc.status !== "done") continue;
      const date = doc.date;
      if (date === null || date < args.from || date > args.to) continue;
      sessions.push({ id: doc._id, date });
    }
    sessions.sort((a, b) => a.date.localeCompare(b.date));

    const points = new Map<string, Infer<typeof progressionPointShape>[]>();
    for (const session of sessions) {
      const best = new Map<string, { loadKg: number | null; reps: number | null; seconds: number | null }>();
      for (const log of await logDocs(ctx, session.id)) {
        const current = best.get(log.exerciseId) ?? { loadKg: null, reps: null, seconds: null };
        best.set(log.exerciseId, {
          loadKg: highest(current.loadKg, log.loadKg),
          reps: highest(current.reps, log.reps),
          seconds: highest(current.seconds, log.seconds),
        });
      }
      for (const [exerciseId, values] of best) {
        const list = points.get(exerciseId) ?? [];
        list.push({ date: session.date, ...values });
        points.set(exerciseId, list);
      }
    }

    return {
      sessions,
      series: [...points.entries()].map(([exerciseId, list]) => ({ exerciseId, points: list })),
    };
  },
});
