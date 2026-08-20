import { findCheckin, listCheckins, listSubmissions, measurements, messagesFor } from "./coaching";
import { dayKey, shiftDay, weekKey } from "./db";
import { adherence, assignmentsBetween, assignmentsOn, nextAssignment } from "./plan";
import type { Assignment, AssignmentStatus } from "./types";

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

function toSession(assignment: Assignment): ClientSession {
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

/** The four numbers on the aluna's landing screen. */
export type ClientStats = {
  weekDone: number;
  weekTotal: number;
  adherenceDone: number;
  adherenceTotal: number;
  awaitingFeedback: number;
  unreadMessages: number;
  latestWeightKg: number | null;
  next: { id: string; name: string; date: string } | null;
};

export function clientStats(clientId: string): ClientStats {
  const monday = weekKey();
  const week = assignmentsBetween(clientId, monday, shiftDay(monday, 6));
  const { done, total } = adherence(clientId);
  const upcoming = nextAssignment(clientId);
  const [weight] = measurements(clientId, "weight", 1);

  return {
    weekDone: week.filter((assignment) => assignment.status === "done").length,
    weekTotal: week.length,
    adherenceDone: done,
    adherenceTotal: total,
    awaitingFeedback: listSubmissions({ clientId, status: "pending", limit: 50 }).length,
    unreadMessages: messagesFor(clientId).filter(
      (message) => message.authorRole === "coach" && message.readAt == null,
    ).length,
    latestWeightKg: weight?.value ?? null,
    next: upcoming
      ? { id: upcoming.id, name: upcoming.snapshot.name, date: upcoming.date }
      : null,
  };
}
