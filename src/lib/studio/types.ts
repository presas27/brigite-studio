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
  /** Technique cues, one per line. */
  cues: string;
  videoUrl: string | null;
  mediaId: string | null;
  tags: string[];
  tracking: Tracking;
  /** The harder exercise this one regresses from, if any. */
  regressionOf: string | null;
  archived: boolean;
  createdAt: number;
};

export type BlockKind = "normal" | "superset" | "circuit" | "interval";

export type WorkoutItem = {
  id: string;
  position: number;
  exerciseId: string;
  exerciseName: string;
  tracking: Tracking;
  videoUrl: string | null;
  mediaId: string | null;
  cues: string;
  sets: number;
  /** Free text so ranges ("8-10") and ladders ("5/3/1") both work. */
  reps: string;
  seconds: number | null;
  tempo: string;
  restSeconds: number;
  rpe: string;
  notes: string;
};

export type WorkoutBlock = {
  id: string;
  position: number;
  kind: BlockKind;
  label: string;
  rounds: number;
  restSeconds: number;
  items: WorkoutItem[];
};

export type Workout = {
  id: string;
  name: string;
  focus: string;
  notes: string;
  archived: boolean;
  createdAt: number;
  updatedAt: number;
  blocks: WorkoutBlock[];
};

/** Workout metadata without blocks — for lists. */
export type WorkoutSummary = Omit<Workout, "blocks"> & { itemCount: number };

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

export type Verdict = "ok" | "adjust" | "regress";

export type ReviewComment = {
  id: string;
  tMs: number;
  body: string;
  createdAt: number;
};

export type Submission = {
  id: string;
  clientId: string;
  clientName: string;
  assignmentId: string | null;
  exerciseId: string | null;
  exerciseName: string | null;
  mediaId: string | null;
  videoUrl: string | null;
  note: string;
  status: "pending" | "reviewed";
  verdict: Verdict | null;
  reply: string;
  reviewedAt: number | null;
  createdAt: number;
  comments: ReviewComment[];
};

export type Message = {
  id: string;
  clientId: string;
  authorId: string;
  authorRole: Role;
  body: string;
  mediaId: string | null;
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
    | "submission"
    | "review"
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

export type Media = {
  id: string;
  ownerId: string;
  filename: string;
  mime: string;
  bytes: number;
  createdAt: number;
};

/** One row of the coach's "Hoje" console — everything needing attention. */
export type CoachAlert =
  | { kind: "submission"; clientId: string; clientName: string; submissionId: string; at: number }
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
