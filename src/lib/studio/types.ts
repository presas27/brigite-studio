import type { Locale } from "@/i18n/config";

/**
 * Domain types for the studio app. These are the shapes the repositories
 * return — already parsed (JSON columns decoded, integers coerced to booleans),
 * so no page or component ever touches a raw SQL row.
 */

export type Role = "coach" | "client";
export type UserStatus = "invited" | "active" | "archived";

/** Mirrors the three offers on the marketing site (`src/lib/plans.ts`). */
export type PlanId = "personal" | "online" | "specialty";

export type User = {
  id: string;
  email: string;
  name: string;
  role: Role;
  locale: Locale;
  status: UserStatus;
  createdAt: number;
};

export type ClientProfile = {
  plan: PlanId;
  goals: string;
  injuries: string;
  /** Coach-only. Never rendered in the client area. */
  notes: string;
  tags: string[];
  /** Remaining credits for in-person session packs. */
  sessionsLeft: number;
  startedAt: number | null;
};

export type Client = User & { profile: ClientProfile };

/** How a set is measured — decides which input the logger shows. */
export type Tracking = "reps" | "time" | "hold" | "distance";

export type Exercise = {
  id: string;
  name: string;
  /**
   * Technique cues in Portuguese, one per line. Sara's own language, and the
   * one her clients read.
   */
  cues: string;
  /**
   * The same cues in English. Two columns rather than one translated field:
   * the library carried over from Trainerize arrives in English, Sara writes in
   * Portuguese, and a client reads whichever their locale asks for. Either side
   * may be empty — `cuesFor` falls back to the other rather than showing a
   * movement with no instructions at all.
   */
  cuesEn: string;
  videoUrl: string | null;
  tags: string[];
  tracking: Tracking;
  /** The harder exercise this one regresses from, if any. */
  regressionOf: string | null;
  archived: boolean;
  createdAt: number;
};

/**
 * One row of the seeded library: what a library entry looks like before it has
 * an id, a demo or a history. Hand-written entries live in `seed.ts`; the ones
 * carried over from Trainerize are generated into `library-trainerize.ts`.
 */
export type ExerciseSeed = {
  name: string;
  cues: string;
  cuesEn?: string;
  tags: string[];
  tracking: Tracking;
  /** A demo hosted elsewhere (YouTube, Vimeo, Trainerize) — a link, not an upload. */
  videoUrl?: string;
};

export type BlockKind = "normal" | "superset" | "circuit" | "interval";

/** A rest row in a workout, as opposed to a library exercise. */
export type WorkoutItemKind = "exercise" | "rest";

export type WorkoutItem = {
  id: string;
  position: number;
  /** Absent on snapshots frozen before rest rows existed. */
  kind?: WorkoutItemKind;
  exerciseId: string;
  exerciseName: string;
  tracking: Tracking;
  videoUrl: string | null;
  cues: string;
  cuesEn: string;
  sets: number;
  /** Free text so ranges ("8-10") and ladders ("5/3/1") both work. */
  reps: string;
  seconds: number | null;
  tempo: string;
  restSeconds: number;
  rpe: string;
  notes: string;
};

export function isRestItem(item: { kind?: string | null }): item is { kind: "rest" } {
  return item.kind === "rest";
}

export type WorkoutBlock = {
  id: string;
  position: number;
  kind: BlockKind;
  label: string;
  rounds: number;
  restSeconds: number;
  items: WorkoutItem[];
};

/**
 * Which construction screen a workout uses. Only `regular` — instructions plus
 * a list of exercises that can be grouped into supersets and circuits — has a
 * builder of its own; `circuit` and `interval` are recorded on the workout and
 * shown in its header.
 */
export type WorkoutType = "regular" | "circuit" | "interval";

export type Workout = {
  id: string;
  name: string;
  focus: string;
  /** Shown to the client with the workout. */
  notes: string;
  /** The coach's description of how the session is structured. */
  instructions: string;
  workoutType: WorkoutType;
  /** Owning coach. NULL only on rows written before phases existed. */
  coachId: string | null;
  /** NULL for a library template; set on a copy that belongs to one client. */
  clientId: string | null;
  /** The training phase a client-scoped copy lives in. */
  phaseId: string | null;
  /** The library workout this copy came from, when it came from one. */
  sourceWorkoutId: string | null;
  /** Running order inside its phase. Meaningless for library templates. */
  position: number;
  archived: boolean;
  createdAt: number;
  updatedAt: number;
  /** Coach's estimate of session length. */
  estimatedMinutes: number | null;
  /** How this phase workout is placed on the calendar. */
  scheduleMode: "weekly" | "custom" | "none" | null;
  /** Monday=0 … Sunday=6. Only set when repeating weekly. */
  scheduleWeekday: number | null;
  blocks: WorkoutBlock[];
};

/** Workout metadata without blocks — for lists. */
export type WorkoutSummary = Omit<Workout, "blocks"> & { itemCount: number };

/**
 * A workout as it appears inside a training phase: the summary plus the days it
 * currently occupies on the client's calendar, ascending.
 *
 * The dates are read from the assignments rather than stored on the workout,
 * because the calendar is the truth — a session dragged to another day or
 * deleted on the week grid has to be what the phase row and the date picker
 * show. Only the phase view pays for that read; library lists never do.
 */
export type PhaseWorkout = WorkoutSummary & { scheduleDates: string[] };

/**
 * One workout of a client's plan, as the client's own workout list draws it.
 *
 * Not a `PhaseWorkout`: that shape is the coach's, and carries the provenance
 * and the calendar placement she manages. This one carries what the person
 * training needs in order to pick a session right now — how big it is, whether
 * today already has one open for it, and when they last finished it.
 *
 * The day the coach suggested is deliberately reduced to `scheduleWeekday`: the
 * plan page is where the calendar lives, and a workout with a day is still
 * something the client may train whenever they feel like it.
 */
export type ClientWorkout = {
  id: string;
  name: string;
  focus: string;
  workoutType: WorkoutType;
  estimatedMinutes: number | null;
  /** Exercises across every block. Rest rows are not counted. */
  itemCount: number;
  blockCount: number;
  phaseId: string | null;
  phaseName: string | null;
  /** Monday=0 … Sunday=6, only when the coach repeats it weekly. */
  scheduleWeekday: number | null;
  /** Today's unfinished session for this workout, when there is one. */
  openAssignmentId: string | null;
  startedToday: boolean;
  /** `YYYY-MM-DD` of the last finished session, or null for never trained. */
  lastDoneDate: string | null;
  doneCount: number;
};

/** The three angles a progress photo can be shot from. */
export type PhotoAngle = "front" | "back" | "side";

/**
 * One progress photo. No URL: the bytes are served per request behind the
 * session, so a photo is an id until something asks for it.
 */
export type ProgressPhoto = {
  id: string;
  /** Monday of the check-in's week, `YYYY-MM-DD`. */
  weekOf: string;
  angle: PhotoAngle;
  width: number;
  height: number;
  /** Stored bytes, full size and thumbnail together. */
  bytes: number;
};

/** One check-in's photos, however many of the three angles it has. */
export type ProgressPhotoWeek = { weekOf: string; photos: ProgressPhoto[] };

/** Two ways to say how long a phase runs. See `TrainingPhase`. */
export type PhaseDurationType = "calendar" | "weeks";

/**
 * One block of the client's plan: "Phase 1 - Base building". Either it sits on
 * the calendar (`startDate`/`endDate`) or it is a bare number of `weeks` the
 * coach has not dated yet — never both.
 */
export type TrainingPhase = {
  id: string;
  coachId: string;
  clientId: string;
  name: string;
  position: number;
  durationType: PhaseDurationType;
  startDate: string | null;
  endDate: string | null;
  weeks: number | null;
  createdAt: number;
  updatedAt: number;
};

/** A phase with the size of its workout list — for the plan tab. */
export type TrainingPhaseSummary = TrainingPhase & { workoutCount: number };

export type AssignmentStatus = "scheduled" | "done" | "skipped";

/**
 * A workout placed on a client's calendar. `snapshot` is the frozen workout as
 * it existed when assigned — editing the template never rewrites history.
 * `date` is `null` for a workout assigned with no day yet — it sits in the
 * "sem dia" bucket until the coach schedules it.
 */
export type Assignment = {
  id: string;
  clientId: string;
  workoutId: string | null;
  date: string | null;
  status: AssignmentStatus;
  note: string;
  startedAt: number | null;
  doneAt: number | null;
  /** Session-level effort, 1-10, answered once when the workout is submitted. */
  effort: number | null;
  /** Seconds of rest the client added on top of the prescribed rests. */
  extraRestSeconds: number;
  createdAt: number;
  snapshot: WorkoutSnapshot;
};

/** An assignment that has a day. Every query scoped by a date range returns
 * only these — SQL excludes `NULL` from a `BETWEEN`/`=` comparison — so
 * callers that read from one of those don't have to null-check the date. */
export type ScheduledAssignment = Assignment & { date: string };

export type WorkoutSnapshot = {
  name: string;
  focus: string;
  notes: string;
  /** The preamble the client reads before starting, frozen with the rest. */
  instructions: string;
  estimatedMinutes?: number | null;
  blocks: WorkoutBlock[];
};

export type SetLog = {
  id: string;
  assignmentId: string;
  itemId: string;
  exerciseId: string;
  setIndex: number;
  reps: number | null;
  loadKg: number | null;
  seconds: number | null;
  rpe: number | null;
  notes: string;
  loggedAt: number;
};

export type Message = {
  id: string;
  clientId: string;
  authorId: string;
  authorRole: Role;
  body: string;
  readAt: number | null;
  createdAt: number;
};

/**
 * One line in the coach's activity feed — what *happened*, as opposed to
 * `CoachAlert`, which is what still needs doing. `subject` is the linked thing
 * (workout name, exercise name, check-in week) and may be absent.
 */
export type ActivityItem = {
  id: string;
  kind:
    | "session"
    | "skipped"
    | "checkin"
    | "checkinReply"
    | "message"
    | "joined";
  clientId: string;
  clientName: string;
  subject: string | null;
  href: string;
  actor: Role;
  at: number;
};

export type Checkin = {
  id: string;
  clientId: string;
  weekOf: string;
  energy: number | null;
  sleep: number | null;
  soreness: number | null;
  weightKg: number | null;
  wins: string;
  blockers: string;
  submittedAt: number | null;
  reply: string;
  repliedAt: number | null;
  createdAt: number;
};

export type Measurement = {
  id: string;
  clientId: string;
  date: string;
  kind: string;
  value: number;
  createdAt: number;
};

/** One row of the coach's "Hoje" console — everything needing attention. */
export type CoachAlert =
  | { kind: "checkin"; clientId: string; clientName: string; weekOf: string; at: number }
  | { kind: "message"; clientId: string; clientName: string; preview: string; at: number }
  | { kind: "inactive"; clientId: string; clientName: string; days: number; at: number }
  | { kind: "missed"; clientId: string; clientName: string; date: string; at: number };

/* ------------------------------------------------------------------- leads */

/** Where a lead came in from. `site` is the contact form on brigitestudio.com. */
export type LeadSource = "site" | "instagram" | "referral" | "walkin";

/** The four states a lead can be in. Won means it became a client. */
export type LeadStatus = "new" | "talking" | "won" | "lost";

export type Lead = {
  id: string;
  name: string;
  email: string;
  phone: string;
  /** What they wrote in the form, in their words. */
  message: string;
  /** The plan they came in asking about, when the form knows it. */
  interest: PlanId | null;
  source: LeadSource;
  status: LeadStatus;
  /** Coach-only. The lead never sees this. */
  notes: string;
  /** Set when the lead was turned into a client account. */
  clientId: string | null;
  createdAt: number;
  /** Last time the status moved. Drives "waiting since". */
  updatedAt: number;
};
