import { findCheckin, listCheckins, listSubmissions, measurements, messagesFor } from "./coaching";
import { dayKey, shiftDay, weekKey } from "./db";
import { assignmentsBetween, assignmentsOn } from "./plan";
import type { AssignmentStatus, ScheduledAssignment } from "./types";

/**
 * The aluna's side of the console — the mirror of `coachAlerts` /
 * `recentActivity` in `coaching.ts`, from the other end of the relationship.
 *
 * Everything here composes the already-exported reads rather than opening new
 * SQL. One aluna is a handful of rows in every table involved, so the extra
 * round trips cost nothing and the coaching module stays the single place that
 * knows the schema.
 */

/** How far back the library and the feed look. A year of training is plenty of history to browse. */
const HISTORY_DAYS = 365;
/** How far ahead. Sara plans in weeks, never in seasons. */
const HORIZON_DAYS = 120;
/** A reviewed clip stops being news after this long. */
const FEEDBACK_FRESH_DAYS = 21;
/** A missed session older than this is history, not a nudge. */
const MISSED_WINDOW_DAYS = 14;

/** One row of the aluna's "Precisa de ti" — everything still waiting on her. */
export type ClientAlert =
  | { kind: "session"; at: number; assignmentId: string; name: string }
  | { kind: "checkin"; at: number; weekOf: string }
  | { kind: "feedback"; at: number; submissionId: string; subject: string }
  | { kind: "message"; at: number; count: number }
  | { kind: "missed"; at: number; assignmentId: string; date: string; name: string };

/** Noon UTC, so a `YYYY-MM-DD` key never sorts into the wrong day. */
function atNoon(key: string): number {
  return Date.parse(`${key}T12:00:00Z`);
}

/**
 * What is waiting on the aluna, newest first.
 *
 * Deliberately not "everything about you": a finished session and a video that
 * already has feedback she has seen are both *news*, and news belongs in the
 * feed. This list is only what she still has to do something about, which is
 * what makes the bell worth opening.
 */
export function clientAlerts(clientId: string): ClientAlert[] {
  const alerts: ClientAlert[] = [];
  const today = dayKey();

  for (const assignment of assignmentsOn(clientId, today)) {
    if (assignment.status !== "scheduled") continue;
    alerts.push({
      kind: "session",
      at: atNoon(today),
      assignmentId: assignment.id,
      name: assignment.snapshot.name,
    });
  }

  const week = weekKey();
  if (findCheckin(clientId, week)?.submittedAt == null) {
    alerts.push({ kind: "checkin", at: atNoon(week), weekOf: week });
  }

  const freshFrom = Date.now() - FEEDBACK_FRESH_DAYS * 86_400_000;
  for (const submission of listSubmissions({ clientId, status: "reviewed", limit: 20 })) {
    if (submission.reviewedAt == null || submission.reviewedAt < freshFrom) continue;
    alerts.push({
      kind: "feedback",
      at: submission.reviewedAt,
      submissionId: submission.id,
      subject: submission.exerciseName ?? "",
    });
  }

  const unread = messagesFor(clientId).filter(
    (message) => message.authorRole === "coach" && message.readAt == null,
  );
  if (unread.length > 0) {
    alerts.push({
      kind: "message",
      at: unread[unread.length - 1].createdAt,
      count: unread.length,
    });
  }

  for (const assignment of assignmentsBetween(
    clientId,
    shiftDay(today, -MISSED_WINDOW_DAYS),
    shiftDay(today, -1),
  )) {
    if (assignment.status !== "scheduled") continue;
    alerts.push({
      kind: "missed",
      at: atNoon(assignment.date),
      assignmentId: assignment.id,
      date: assignment.date,
      name: assignment.snapshot.name,
    });
  }

  return alerts.sort((a, b) => b.at - a.at);
}

/** One line of the aluna's feed — what *happened*, in her own second person. */
export type ClientActivityItem = {
  id: string;
  kind:
    | "session"
    | "skipped"
    | "submission"
    | "review"
    | "checkin"
    | "checkinReply"
    | "message"
    | "coachMessage";
  /** The thing the line is about: a workout name, an exercise, a week. May be absent. */
  subject: string | null;
  href: string;
  /** Who did it — drives whether the row reads as hers or as Sara's. */
  actor: "client" | "coach";
  at: number;
};

/** What has happened to this aluna lately, newest first. */
export function clientActivity(clientId: string, limit = 12): ClientActivityItem[] {
  const items: ClientActivityItem[] = [];
  const today = dayKey();

  for (const assignment of assignmentsBetween(clientId, shiftDay(today, -HISTORY_DAYS), today)) {
    if (assignment.status === "scheduled") continue;
    items.push({
      id: `session-${assignment.id}`,
      kind: assignment.status === "done" ? "session" : "skipped",
      subject: assignment.snapshot.name,
      href: `/app/aluno/treino/${assignment.id}`,
      actor: "client",
      at: assignment.doneAt ?? atNoon(assignment.date),
    });
  }

  for (const submission of listSubmissions({ clientId, limit: 30 })) {
    items.push({
      id: `submission-${submission.id}`,
      kind: "submission",
      subject: submission.exerciseName,
      href: "/app/aluno/videos",
      actor: "client",
      at: submission.createdAt,
    });
    if (submission.reviewedAt != null) {
      items.push({
        id: `review-${submission.id}`,
        kind: "review",
        subject: submission.exerciseName,
        href: "/app/aluno/videos",
        actor: "coach",
        at: submission.reviewedAt,
      });
    }
  }

  for (const checkin of listCheckins(clientId, 12)) {
    if (checkin.submittedAt != null) {
      items.push({
        id: `checkin-${checkin.id}`,
        kind: "checkin",
        subject: checkin.weekOf,
        href: "/app/aluno/checkin",
        actor: "client",
        at: checkin.submittedAt,
      });
    }
    if (checkin.repliedAt != null) {
      items.push({
        id: `checkin-reply-${checkin.id}`,
        kind: "checkinReply",
        subject: checkin.weekOf,
        href: "/app/aluno/checkin",
        actor: "coach",
        at: checkin.repliedAt,
      });
    }
  }

  for (const message of messagesFor(clientId, 30)) {
    items.push({
      id: `message-${message.id}`,
      kind: message.authorRole === "coach" ? "coachMessage" : "message",
      subject: null,
      href: "/app/aluno/mensagens",
      actor: message.authorRole === "coach" ? "coach" : "client",
      at: message.createdAt,
    });
  }

  return items.sort((a, b) => b.at - a.at).slice(0, limit);
}

/**
 * One assigned session, flattened for lists.
 *
 * Never the whole `Assignment`: its `snapshot` carries every block and every
 * set, and a year of those crossing the server/client boundary to draw a grid
 * of cards would be absurd.
 */
export type ClientSession = {
  id: string;
  date: string;
  status: AssignmentStatus;
  name: string;
  focus: string;
  /** Total exercises across every block — the card's one honest measure of size. */
  itemCount: number;
  blockCount: number;
  startedAt: number | null;
};

function toSession(assignment: ScheduledAssignment): ClientSession {
  const blocks = assignment.snapshot.blocks;
  return {
    id: assignment.id,
    date: assignment.date,
    status: assignment.status,
    name: assignment.snapshot.name,
    focus: assignment.snapshot.focus,
    itemCount: blocks.reduce((total, block) => total + block.items.length, 0),
    blockCount: blocks.length,
    startedAt: assignment.startedAt,
  };
}

/**
 * Every session on this aluna's calendar, newest first — a year back and the
 * planned weeks ahead. The library page browses this; the calendar reads the
 * raw assignments for the month it is drawing.
 */
export function clientSessions(clientId: string): ClientSession[] {
  const today = dayKey();
  return assignmentsBetween(clientId, shiftDay(today, -HISTORY_DAYS), shiftDay(today, HORIZON_DAYS))
    .map(toSession)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

/** Distinct focuses across a session list, with counts — the library's category filter. */
export function sessionFocuses(sessions: ClientSession[]): { tag: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const session of sessions) {
    const focus = session.focus.trim();
    if (!focus) continue;
    counts.set(focus, (counts.get(focus) ?? 0) + 1);
  }
  return [...counts]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => a.tag.localeCompare(b.tag));
}

/* ------------------------------------------------------------- the overview */

/**
 * One day of the aluna's week, as the seven rings on the overview draw it.
 * `status` is `null` for a rest day — a day with nothing scheduled is not a
 * failure, and drawing it in the missed colour would say it was.
 */
export type OverviewDay = {
  date: string;
  status: AssignmentStatus | null;
  total: number;
  done: number;
};

/** One slice of the focus ring: a `focus` value and how many sessions carry it. */
export type OverviewFocus = { tag: string; count: number };

/**
 * An upcoming session, flattened for the "a seguir" list. `mediaId` is the
 * first clip anywhere in the session — enough to give the row a plate without
 * shipping the whole snapshot to the client.
 */
export type OverviewSession = {
  id: string;
  date: string;
  name: string;
  focus: string;
  itemCount: number;
  mediaId: string | null;
  startedAt: number | null;
};

export type OverviewWeight = {
  latest: number;
  /** Change against the oldest reading in `series`. `null` with a single reading. */
  delta: number | null;
  /** Oldest first, so a sparkline can render it straight. */
  series: number[];
};

/** Everything the aluna's landing grid draws, in one read. */
export type ClientOverview = {
  /** Seven entries, Monday first. */
  week: OverviewDay[];
  adherenceDone: number;
  adherenceTotal: number;
  adherencePct: number;
  /** Every session of the adherence window, oldest first — the dot grid. */
  dots: AssignmentStatus[];
  /** This week's sessions grouped by focus, biggest slice first. */
  focus: OverviewFocus[];
  /** Scheduled sessions after today, soonest first. */
  upcoming: OverviewSession[];
  weight: OverviewWeight | null;
  /** Whole weeks back-to-back with every scheduled session done. */
  streakWeeks: number;
};

/** The window behind the adherence headline. Same span as `adherence()` in `plan.ts`. */
const ADHERENCE_DAYS = 28;
/** How many sessions the "a seguir" list can ever need — hero plus three rows. */
const UPCOMING_LIMIT = 4;
/** Readings behind the weight sparkline. Roughly three months of weekly check-ins. */
const WEIGHT_POINTS = 12;
/** Nobody needs to be told they are on a 300-week streak; the walk stops here. */
const STREAK_LIMIT = 52;

/**
 * The day's ring: done only when nothing is left, missed only when nothing is
 * still pending.
 *
 * A day already behind us with a session nobody ever marked reads as missed
 * rather than as pending — the same rule `clientAlerts` applies, so the ring
 * and the bell can never say different things about the same Tuesday.
 */
function dayStatus(
  sessions: ScheduledAssignment[],
  date: string,
  today: string,
): AssignmentStatus | null {
  if (sessions.length === 0) return null;
  if (sessions.every((session) => session.status === "done")) return "done";
  if (date < today) return "skipped";
  if (sessions.some((session) => session.status === "scheduled")) return "scheduled";
  return "skipped";
}

/** First clip anywhere in a session — the plate for its row. */
function firstMediaId(assignment: ScheduledAssignment): string | null {
  for (const block of assignment.snapshot.blocks) {
    for (const item of block.items) {
      if (item.mediaId) return item.mediaId;
    }
  }
  return null;
}

function toOverviewSession(assignment: ScheduledAssignment): OverviewSession {
  return {
    id: assignment.id,
    date: assignment.date,
    name: assignment.snapshot.name,
    focus: assignment.snapshot.focus.trim(),
    itemCount: assignment.snapshot.blocks.reduce((total, block) => total + block.items.length, 0),
    mediaId: firstMediaId(assignment),
    startedAt: assignment.startedAt,
  };
}

/**
 * Weeks in a row, ending last week, where every scheduled session got done.
 *
 * The current week is excluded on purpose: it is still being lived, and a
 * streak that resets every Monday morning and climbs back by Sunday is noise
 * rather than a measure. A week with nothing scheduled ends the walk — a
 * streak has to be built out of training, not out of empty calendars.
 */
function weekStreak(clientId: string, thisMonday: string): number {
  let streak = 0;
  for (let back = 1; back <= STREAK_LIMIT; back += 1) {
    const monday = shiftDay(thisMonday, -7 * back);
    const week = assignmentsBetween(clientId, monday, shiftDay(monday, 6));
    if (week.length === 0) break;
    if (!week.every((assignment) => assignment.status === "done")) break;
    streak += 1;
  }
  return streak;
}

/**
 * The aluna's landing grid, in one place.
 *
 * The adherence count and its dot grid come out of the same query on purpose:
 * computed apart they drift by a day at the window's edge, and a headline that
 * disagrees with the dots beside it is worse than either one alone.
 */
export function clientOverview(clientId: string): ClientOverview {
  const today = dayKey();
  const monday = weekKey();

  const days = Array.from({ length: 7 }, (_, offset) => shiftDay(monday, offset));
  const thisWeek = assignmentsBetween(clientId, monday, days[6]);
  const byDate = new Map<string, ScheduledAssignment[]>();
  for (const assignment of thisWeek) {
    byDate.set(assignment.date, [...(byDate.get(assignment.date) ?? []), assignment]);
  }

  const week: OverviewDay[] = days.map((date) => {
    const sessions = byDate.get(date) ?? [];
    return {
      date,
      status: dayStatus(sessions, date, today),
      total: sessions.length,
      done: sessions.filter((session) => session.status === "done").length,
    };
  });

  const window = assignmentsBetween(clientId, shiftDay(today, -ADHERENCE_DAYS), today);
  const adherenceDone = window.filter((assignment) => assignment.status === "done").length;

  const focusCounts = new Map<string, number>();
  for (const assignment of thisWeek) {
    const tag = assignment.snapshot.focus.trim();
    if (!tag) continue;
    focusCounts.set(tag, (focusCounts.get(tag) ?? 0) + 1);
  }

  const upcoming = assignmentsBetween(clientId, shiftDay(today, 1), shiftDay(today, HORIZON_DAYS))
    .filter((assignment) => assignment.status === "scheduled")
    .slice(0, UPCOMING_LIMIT)
    .map(toOverviewSession);

  const readings = measurements(clientId, "weight", WEIGHT_POINTS)
    .slice()
    .reverse()
    .map((measurement) => measurement.value);
  const latest = readings[readings.length - 1];

  return {
    week,
    adherenceDone,
    adherenceTotal: window.length,
    adherencePct: window.length > 0 ? Math.round((adherenceDone / window.length) * 100) : 0,
    dots: window.map((assignment) => assignment.status),
    focus: [...focusCounts]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag)),
    upcoming,
    weight:
      latest == null
        ? null
        : {
            latest,
            delta: readings.length > 1 ? Number((latest - readings[0]).toFixed(1)) : null,
            series: readings,
          },
    streakWeeks: weekStreak(clientId, monday),
  };
}
