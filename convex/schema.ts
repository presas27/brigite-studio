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
  /** `"rest"` marks a rest row. Absent on snapshots frozen before rest items. */
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

/**
 * Which library shelf a template sits on, workout or program alike.
 *
 *  - `master` is the untested shelf: what the coach wrote as a starting point
 *    and has not handed to anybody yet.
 *  - `shared` is the shelf of templates at least one client has been given.
 *
 * The distinction is the coach's filing system and nothing else — it never
 * decides who may read a template.
 */
const libraryCategory = v.union(v.literal("master"), v.literal("shared"));

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
    /**
     * Transitional, and read by nothing. The workout's one free-text preamble
     * is `instructions`; this column stays declared only until
     * `library:collapseWorkoutNotes` has stripped it from every row, after
     * which the line goes.
     */
    notes: v.optional(v.string()),
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
    /** Coach's estimate of how long the session takes. */
    estimatedMinutes: v.optional(v.union(v.null(), v.number())),
    /** How this phase workout is placed on the calendar. */
    scheduleMode: v.optional(
      v.union(v.literal("weekly"), v.literal("custom"), v.literal("none")),
    ),
    /** Monday=0 … Sunday=6. Only meaningful when `scheduleMode` is `weekly`. */
    scheduleWeekday: v.optional(v.union(v.null(), v.number())),
    /**
     * Which library shelf a template sits on. Absent reads as `master`, so the
     * field could be added without rewriting every existing row first.
     *
     * Only meaningful while `clientId` is null: a client's phase copy is not in
     * anybody's library and its value is ignored.
     */
    libraryCategory: v.optional(libraryCategory),
    /**
     * Hidden from the client's app without being deleted. The coach still sees
     * the workout in the plan; the client sees neither it nor the sessions it
     * was scheduled for.
     *
     * Absent reads as visible, which is what every row written before the flag
     * existed means.
     */
    hiddenFromClient: v.optional(v.boolean()),
    /**
     * The program phase this template belongs to, when it belongs to one. Set
     * means the workout is part of a program and is not loose in the workout
     * library — `libraryWorkouts` filters those out, or a program's sessions
     * would be listed twice.
     */
    programPhaseId: v.optional(v.union(v.null(), v.id("programPhases"))),
  })
    .index("by_archived_and_updated", ["archived", "updatedAt"])
    .index("by_phase_and_position", ["phaseId", "position"])
    .index("by_client", ["clientId"])
    // Only used to find the templates a phase copy came from, which is how the
    // one-off backfill decides which of them are already shared with a client.
    .index("by_source", ["sourceWorkoutId"])
    .index("by_program_phase_and_position", ["programPhaseId", "position"]),

  /**
   * A reusable training program: the multi-week, multi-phase shape of a block
   * of training, kept as a template rather than built into one client's plan.
   *
   * It is the phase-level twin of a library workout, and it files itself on the
   * same two shelves (`libraryCategory`) for the same reason: a coach needs to
   * tell what she has only drafted from what a client is actually running.
   */
  trainingPrograms: defineTable({
    coachId: v.id("users"),
    name: v.string(),
    /** What the program trains. Free text, same role as a workout's focus. */
    focus: v.string(),
    notes: v.string(),
    libraryCategory,
    archived: v.boolean(),
    updatedAt: v.number(),
  })
    .index("by_coach_and_category", ["coachId", "libraryCategory"])
    .index("by_coach", ["coachId"]),

  /**
   * One block of weeks inside a program template. The counterpart of
   * `trainingPhases`, minus the client and minus the calendar: a template has a
   * length in weeks and no dates, because the dates only exist once the program
   * is given to somebody.
   */
  programPhases: defineTable({
    programId: v.id("trainingPrograms"),
    name: v.string(),
    position: v.number(),
    /** How long this phase runs. Null means the coach has not decided. */
    weeks: v.union(v.null(), v.number()),
    notes: v.string(),
  }).index("by_program_and_position", ["programId", "position"]),

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
    /** `"rest"` is a rest row, not a library exercise. Absent = exercise. */
    kind: v.optional(v.union(v.literal("exercise"), v.literal("rest"))),
    exerciseId: v.union(v.null(), v.id("exercises")),
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
      /** Transitional twin of `notes` on `workouts`. See the note there. */
      notes: v.optional(v.string()),
      /** The preamble the client reads before starting, frozen with the rest. */
      instructions: v.string(),
      estimatedMinutes: v.optional(v.union(v.null(), v.number())),
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
   * A note the client wrote about one exercise while training it — "shoulder
   * twinged on the third set", "band was too light". The coach reads it in the
   * session report, so context like that arrives without having to be asked
   * for.
   *
   * Keyed by `(assignmentId, itemId)`: one note per exercise per *session*.
   * That is deliberate and is why this is not a field on the workout item or on
   * the assignment — the same exercise trained next week is a different note,
   * and last week's must still say what it said. `itemId` is a plain string
   * copied from the assignment's snapshot, for the same reason `setLogs` keys
   * on one: it is a copy, not a reference.
   *
   * A note is not a set log either. Clearing a set must not delete what the
   * client said about the exercise, and a note can exist for an exercise whose
   * sets were never filled in.
   *
   * Uniqueness of `(assignmentId, itemId)` has no engine behind it: `saveNote`
   * reads `by_assignment_and_item` and patches rather than inserting.
   */
  exerciseNotes: defineTable({
    assignmentId: v.id("assignments"),
    itemId: v.string(),
    exerciseId: v.string(),
    body: v.string(),
    updatedAt: v.number(),
  })
    .index("by_assignment", ["assignmentId"])
    .index("by_assignment_and_item", ["assignmentId", "itemId"]),

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

  /**
   * Progress photos: up to three angles (front, back, side) per weekly
   * check-in, every one of them optional.
   *
   * One row per angle rather than three fields on the check-in, so re-shooting
   * one angle touches one row and one file. The bytes themselves never go near
   * a document: `fileId`/`thumbId` point into file storage, which costs
   * $0.03/GB-month against a document's $0.20 and has no 1 MiB ceiling. The
   * browser downscales and re-encodes to WebP before uploading — see
   * `PhotoAngleField` — which also strips the EXIF block, and with it the GPS
   * tag a phone writes into a photo taken at home.
   *
   * `(clientId, weekOf, angle)` is unique; `savePhoto` enforces it and deletes
   * the files the replaced row pointed at.
   */
  progressPhotos: defineTable({
    clientId: v.id("users"),
    /** Monday of the check-in's week, `YYYY-MM-DD`. The photo's date. */
    weekOf: v.string(),
    angle: v.union(v.literal("front"), v.literal("back"), v.literal("side")),
    /** Long edge 1280, WebP. What the compare view shows. */
    fileId: v.id("_storage"),
    /** Long edge 320, WebP. What the list shows, so a year's log stays light. */
    thumbId: v.id("_storage"),
    width: v.number(),
    height: v.number(),
    /** Bytes of `fileId` and `thumbId` together, for the storage read-out. */
    bytes: v.number(),
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
