import { cache } from "react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { sq } from "./convexServer";
import { listCheckins, messagesFor } from "./coaching";
import { dayKey, shiftDay } from "./dates";
import { assignmentsBetween } from "./plan";
import { type AssignmentStatus, type ScheduledSummary } from "./types";

/**
 * The aluna's side of the console — the mirror of `coachAlerts` /
 * `recentActivity` in `coaching.ts`, from the other end of the relationship.
 *
 * Chrome and the landing grid are Convex queries (`clientChrome`,
 * `clientOverview`). The activity feed still composes the already-exported
 * reads: it is not on the hot path of every page.
 */

/** How far back the feed looks. A year of training is plenty of history. */
const HISTORY_DAYS = 365;

/** One row of the aluna's "Precisa de ti" — everything still waiting on her. */
export type ClientAlert =
  | { kind: "session"; at: number; assignmentId: string; name: string }
  | { kind: "checkin"; at: number; weekOf: string }
  | { kind: "message"; at: number; count: number }
  | { kind: "missed"; at: number; assignmentId: string; date: string; name: string };

/** Noon UTC, so a `YYYY-MM-DD` key never sorts into the wrong day. */
function atNoon(key: string): number {
  return Date.parse(`${key}T12:00:00Z`);
}

export type ClientChrome = {
  unread: number;
  checkinPending: boolean;
  today: ScheduledSummary[];
  next: ScheduledSummary | null;
  alerts: ClientAlert[];
};

/** Rail badges, next session, and the bell — one Convex read. */
export const clientChrome = cache(async (clientId: string): Promise<ClientChrome> => {
  return sq(api.plan.clientChrome, { clientId: clientId as Id<"users"> });
});

/**
 * What is waiting on the aluna, newest first.
 *
 * Deliberately not "everything about you": a finished session and a check-in
 * Sara has already replied to are both *news*, and news belongs in the feed.
 * This list is only what she still has to do something about, which is what
 * makes the bell worth opening.
 */
export async function clientAlerts(clientId: string): Promise<ClientAlert[]> {
  return (await clientChrome(clientId)).alerts;
}

/** One line of the aluna's feed — what *happened*, in her own second person. */
export type ClientActivityItem = {
  id: string;
  kind: "session" | "skipped" | "checkin" | "checkinReply" | "message" | "coachMessage";
  /** The thing the line is about: a workout name, an exercise, a week. May be absent. */
  subject: string | null;
  href: string;
  /** Who did it — drives whether the row reads as hers or as Sara's. */
  actor: "client" | "coach";
  at: number;
};

/** What has happened to this aluna lately, newest first. */
export async function clientActivity(clientId: string, limit = 12): Promise<ClientActivityItem[]> {
  const items: ClientActivityItem[] = [];
  const today = dayKey();

  const [assignments, checkins, messages] = await Promise.all([
    assignmentsBetween(clientId, shiftDay(today, -HISTORY_DAYS), today),
    listCheckins(clientId, 12),
    messagesFor(clientId, 30),
  ]);

  for (const assignment of assignments) {
    if (assignment.status === "scheduled") continue;
    items.push({
      id: `session-${assignment.id}`,
      kind: assignment.status === "done" ? "session" : "skipped",
      subject: assignment.name,
      href: `/app/aluno/treino/${assignment.id}`,
      actor: "client",
      at: assignment.doneAt ?? atNoon(assignment.date),
    });
  }

  for (const checkin of checkins) {
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

  for (const message of messages) {
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

/**
 * An upcoming session, flattened for the "a seguir" list. `videoUrl` is the
 * first clip anywhere in the session — enough to give the row a plate without
 * shipping the whole snapshot to the client.
 */
export type OverviewSession = {
  id: string;
  date: string;
  name: string;
  focus: string;
  itemCount: number;
  estimatedMinutes: number | null;
  videoUrl: string | null;
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
  /** Scheduled sessions after today, soonest first. */
  upcoming: OverviewSession[];
  weight: OverviewWeight | null;
  /** Whole weeks back-to-back with every scheduled session done. */
  streakWeeks: number;
};

/**
 * The aluna's landing grid, in one Convex read: week rings, adherence, upcoming,
 * weight, and streak. Streak used to walk a query per week.
 */
export const clientOverview = cache(async (clientId: string): Promise<ClientOverview> => {
  return sq(api.plan.clientOverview, { clientId: clientId as Id<"users"> });
});
