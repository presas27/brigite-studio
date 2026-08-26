import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * The studio's data model, moved off SQLite.
 *
 * Three rules were applied translating the DDL, and they explain most of the
 * differences from the tables it replaces:
 *
 * 1. **`_creationTime` replaces every `created_at`.** Convex stamps it, and
 *    every index is implicitly suffixed with it — so `by_client` on messages
 *    gives exactly the ordering `idx_messages_client (client_id, created_at)`
 *    gave. Timestamps that mean something other than "when this row appeared"
 *    (`startedAt`, `doneAt`, `reviewedAt`, `updatedAt`…) stay as fields.
 *
 * 2. **`CHECK (x IN (…))` becomes `v.union(v.literal(…))`.** The constraint
 *    moves from the engine into the validator, where it is also the TypeScript
 *    type.
 *
 * 3. **Nullable columns stay `v.union(v.null(), …)` rather than becoming
 *    optional.** The domain types in `src/lib/studio/types.ts` already say
 *    `string | null`; keeping null explicit means the mapping is one-to-one and
 *    there is never a question of whether a field is absent or empty.
 *
 * Two things SQLite enforced that Convex cannot, and which the mutations must
 * therefore enforce themselves — they are called out again at each table:
 * uniqueness (`users.email`, `checkins (clientId, weekOf)`) and referential
 * cleanup (`ON DELETE CASCADE` / `SET NULL`).
 */

/** How a set is measured. Decides which input the logger shows. */
const tracking = v.union(
  v.literal("reps"),
  v.literal("time"),
  v.literal("hold"),
  v.literal("distance"),
);

/**
 * One exercise as it was when a workout was assigned.
 *
 * The ids inside are `v.string()` and not `v.id(...)` on purpose: this is a
 * frozen copy, not a reference. Editing or deleting the exercise afterwards
 * must not change a session the client already saw, and `setLogs` are keyed by
 * the `itemId` in here so reordering the template cannot scramble past numbers.
 */
const snapshotItem = v.object({
  id: v.string(),
  position: v.number(),
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

const snapshotBlock = v.object({
  id: v.string(),
  position: v.number(),
  kind: v.union(
    v.literal("normal"),
    v.literal("superset"),
    v.literal("circuit"),
    v.literal("interval"),
  ),
  label: v.string(),
  rounds: v.number(),
  restSeconds: v.number(),
  items: v.array(snapshotItem),
});

export default defineSchema({
  ...authTables,

  /**
   * Bookkeeping the app writes about itself. One row so far: the fingerprint of
   * the seeded library, so a re-import inserts only what is new.
   */
  meta: defineTable({
    key: v.string(),
    value: v.string(),
  }).index("by_key", ["key"]),

  /**
   * One row per sign-in link asked for, so asking again too often can be
   * refused.
   *
   * The old code rate-limited per IP in the Next process, which a serverless
   * host makes meaningless — the counter died with the instance. Convex Auth
   * sends the mail from the deployment, so the budget belongs here, and it is
   * keyed on the address: what needs protecting is a client's mailbox and the
   * studio's sending reputation, not a request count.
   *
   * Rows are swept by the same mutation that reads them; nothing accumulates.
   */
  signInAttempts: defineTable({
    email: v.string(),
    at: v.number(),
  }).index("by_email", ["email"]),

  /**
   * Every account, coach and client alike.
   *
   * This overrides the `users` table that `authTables` brings, because Convex
   * Auth owns the table and the studio needs three fields of its own on it. The
   * `email` and `phone` index names are the library's — it queries them by
   * those exact names, so they are not ours to rename.
   *
   * `role`, `locale` and `status` stay required even though the library creates
   * users, because `createOrUpdateUser` in `convex/auth.ts` is what does the
   * creating and it always supplies them. That callback is also what keeps the
   * studio closed: an address Sara has not added gets no account.
   */
  users: defineTable({
    /** Read and written by Convex Auth. */
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    image: v.optional(v.string()),
    isAnonymous: v.optional(v.boolean()),
    /** The studio's own. */
    name: v.string(),
    role: v.union(v.literal("coach"), v.literal("client")),
    locale: v.union(v.literal("pt"), v.literal("en")),
    status: v.union(v.literal("invited"), v.literal("active"), v.literal("archived")),
  })
    .index("email", ["email"])
    .index("phone", ["phone"])
    .index("by_role", ["role"]),

  /**
   * The coaching side of a client account. One per user, which is why the
   * `by_user` index is a lookup and not a list. Deleting a user must delete
   * this row: SQLite did it with `ON DELETE CASCADE`.
   */
  clientProfiles: defineTable({
    userId: v.id("users"),
    plan: v.union(v.literal("personal"), v.literal("online"), v.literal("specialty")),
    goals: v.string(),
    injuries: v.string(),
    /** Coach-only. Never rendered in the client area. */
    notes: v.string(),
    tags: v.array(v.string()),
    /** Remaining credits for in-person session packs. */
    sessionsLeft: v.number(),
    startedAt: v.union(v.null(), v.number()),
  }).index("by_user", ["userId"]),

  // The hand-rolled `magic_tokens` table is gone: Convex Auth owns verification
  // codes now, in `authVerificationCodes` from `authTables`.

  /**
   * Sara's library. `videoUrl` is a link and nothing else — a YouTube address
   * costs 43 characters here and the video streams from YouTube, never
   * uploaded and served by the app itself.
   *
   * `archived` is a soft delete: workout history keeps pointing at the row.
   */
  exercises: defineTable({
    name: v.string(),
    /** Technique cues in Portuguese, one per line. */
    cues: v.string(),
    /** The same cues in English. Either side may be empty. */
    cuesEn: v.string(),
    videoUrl: v.union(v.null(), v.string()),
    tags: v.array(v.string()),
    tracking,
    /** The harder exercise this one regresses from, if any. */
    regressionOf: v.union(v.null(), v.id("exercises")),
    archived: v.boolean(),
  })
    .index("by_archived_and_name", ["archived", "name"])
    .searchIndex("search_name", { searchField: "name", filterFields: ["archived"] }),

  /**
   * A block of training weeks for one client: "Phase 1 — Base building". The
   * coach's plan is a sequence of these, and every workout the client trains
   * hangs off one of them.
   *
   * Duration is either two calendar dates or a plain number of weeks the coach
   * has not dated yet — never both, which the mutation enforces since Convex
   * has no `CHECK`.
   */
  trainingPhases: defineTable({
    coachId: v.id("users"),
    clientId: v.id("users"),
    name: v.string(),
    position: v.number(),
    durationType: v.union(v.literal("calendar"), v.literal("weeks")),
    /** `YYYY-MM-DD`, both set or both null. */
    startDate: v.union(v.null(), v.string()),
    endDate: v.union(v.null(), v.string()),
    weeks: v.union(v.null(), v.number()),
    updatedAt: v.number(),
  }).index("by_client_and_position", ["clientId", "position"]),

  /**
   * A workout is a library template while `clientId` is null. One with a
   * `clientId` and a `phaseId` is a client-scoped copy living inside a training
   * phase: it never shows in the library, and editing it cannot reach back into
   * the template it was copied from (`sourceWorkoutId`).
   */
  workouts: defineTable({
    name: v.string(),
    focus: v.string(),
    notes: v.string(),
    /** Free-text preamble the client reads before starting. */
    instructions: v.string(),
    /** Which construction screen the workout uses. */
    workoutType: v.union(v.literal("regular"), v.literal("circuit"), v.literal("interval")),
    coachId: v.union(v.null(), v.id("users")),
    clientId: v.union(v.null(), v.id("users")),
    phaseId: v.union(v.null(), v.id("trainingPhases")),
    /** The template this copy came from. Not a reference: the template may go. */
    sourceWorkoutId: v.union(v.null(), v.string()),
    /** Order inside a phase. Meaningless for library templates. */
    position: v.number(),
    archived: v.boolean(),
    /** Last edit, not creation — the card shows when a workout was touched. */
    updatedAt: v.number(),
  })
    .index("by_archived_and_updated", ["archived", "updatedAt"])
    .index("by_phase_and_position", ["phaseId", "position"])
    .index("by_client", ["clientId"]),

  workoutBlocks: defineTable({
    workoutId: v.id("workouts"),
    position: v.number(),
    kind: v.union(
      v.literal("normal"),
      v.literal("superset"),
      v.literal("circuit"),
      v.literal("interval"),
    ),
    label: v.string(),
    rounds: v.number(),
    restSeconds: v.number(),
  }).index("by_workout_and_position", ["workoutId", "position"]),

  workoutItems: defineTable({
    blockId: v.id("workoutBlocks"),
    position: v.number(),
    exerciseId: v.id("exercises"),
    sets: v.number(),
    /** Free text so ranges ("8-10") and ladders ("5/3/1") both work. */
    reps: v.string(),
    seconds: v.union(v.null(), v.number()),
    tempo: v.string(),
    restSeconds: v.number(),
    rpe: v.string(),
    notes: v.string(),
  }).index("by_block_and_position", ["blockId", "position"]),

  /**
   * A workout placed on a client's calendar, with the template frozen into
   * `snapshot`. `date` is nullable: a workout can be assigned with no day.
   */
  assignments: defineTable({
    clientId: v.id("users"),
    workoutId: v.union(v.null(), v.id("workouts")),
    /** `YYYY-MM-DD` in Lisbon time, or null for "no day yet". */
    date: v.union(v.null(), v.string()),
    status: v.union(v.literal("scheduled"), v.literal("done"), v.literal("skipped")),
    snapshot: v.object({
      name: v.string(),
      focus: v.string(),
      notes: v.string(),
      /** The preamble the client reads before starting, frozen with the rest. */
      instructions: v.string(),
      blocks: v.array(snapshotBlock),
    }),
    note: v.string(),
    startedAt: v.union(v.null(), v.number()),
    doneAt: v.union(v.null(), v.number()),
    /** 1–10, checked in the mutation: Convex has no BETWEEN constraint. */
    effort: v.union(v.null(), v.number()),
    extraRestSeconds: v.number(),
  })
    .index("by_client_and_date", ["clientId", "date"])
    .index("by_client_and_status", ["clientId", "status"])
    // Deleting a workout has to find every assignment that points at it, so it
    // can null the reference the way `ON DELETE SET NULL` did. There is no
    // client to scope that by: a library template is assigned to several.
    .index("by_workout", ["workoutId"]),

  /**
   * One logged set. `itemId` and `exerciseId` are plain strings, copied from the
   * assignment's snapshot rather than pointing at live rows — the same reason
   * the snapshot exists.
   */
  setLogs: defineTable({
    assignmentId: v.id("assignments"),
    itemId: v.string(),
    exerciseId: v.string(),
    setIndex: v.number(),
    reps: v.union(v.null(), v.number()),
    loadKg: v.union(v.null(), v.number()),
    seconds: v.union(v.null(), v.number()),
    rpe: v.union(v.null(), v.number()),
    notes: v.string(),
  })
    .index("by_assignment", ["assignmentId"])
    .index("by_exercise", ["exerciseId"]),

  /**
   * One thread per client. `authorId` says who wrote it; `readAt` is null until
   * the other side opens the thread.
   */
  messages: defineTable({
    clientId: v.id("users"),
    authorId: v.id("users"),
    body: v.string(),
    readAt: v.union(v.null(), v.number()),
  }).index("by_client", ["clientId"]),

  /**
   * The weekly check-in. One per client per week, which SQLite enforced with
   * `UNIQUE (client_id, week_of)` — here the mutation checks `by_client_and_week`
   * before inserting.
   */
  checkins: defineTable({
    clientId: v.id("users"),
    /** Monday of the week, `YYYY-MM-DD`. */
    weekOf: v.string(),
    energy: v.union(v.null(), v.number()),
    sleep: v.union(v.null(), v.number()),
    soreness: v.union(v.null(), v.number()),
    weightKg: v.union(v.null(), v.number()),
    wins: v.string(),
    blockers: v.string(),
    submittedAt: v.union(v.null(), v.number()),
    reply: v.string(),
    repliedAt: v.union(v.null(), v.number()),
  }).index("by_client_and_week", ["clientId", "weekOf"]),

  /** A body measurement on a day. `kind` is open text: weight, waist, whatever. */
  measurements: defineTable({
    clientId: v.id("users"),
    /** `YYYY-MM-DD`. */
    date: v.string(),
    kind: v.string(),
    value: v.number(),
  })
    .index("by_client_and_date", ["clientId", "date"])
    .index("by_client_and_kind", ["clientId", "kind"]),

  /** An enquiry from the marketing site, and where it went. */
  leads: defineTable({
    name: v.string(),
    email: v.string(),
    phone: v.string(),
    message: v.string(),
    interest: v.union(v.null(), v.string()),
    source: v.string(),
    status: v.union(
      v.literal("new"),
      v.literal("talking"),
      v.literal("won"),
      v.literal("lost"),
    ),
    notes: v.string(),
    /** Set once a lead becomes a client. */
    clientId: v.union(v.null(), v.id("users")),
    updatedAt: v.number(),
  }).index("by_status", ["status"]),
});
