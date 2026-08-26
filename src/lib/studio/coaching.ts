import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { sm, sq } from "@/lib/studio/convexServer";
import type { ActivityItem, Checkin, CoachAlert, Measurement, Message } from "./types";

/**
 * The coaching loop: the 1:1 thread, weekly check-ins, and the aggregation
 * behind the coach's "Hoje" console.
 *
 * Every function here is now a thin call into `convex/coaching.ts`, which is
 * where the queries and the reasoning behind them live. What stayed behind is
 * the shape of the module: the same names, returning the same domain objects, so
 * that no page had to learn a new vocabulary because the database changed.
 *
 * Two signatures did change, and only by losing an argument. The SQL versions
 * took a `readerId` / `authorId` / `coachId`, which was safe while the only
 * caller was a server action that had already checked the session. A Convex
 * deployment URL is public, so the actor is taken from the verified session
 * instead — and the parameter is gone rather than accepted and ignored, because
 * an argument that does nothing reads like an argument that does something.
 */

/* ------------------------------------------------------------------ messages */

/** The whole thread for one client, oldest first. */
export async function messagesFor(clientId: string, limit = 200): Promise<Message[]> {
  return sq(api.coaching.messagesFor, { clientId: clientId as Id<"users">, limit });
}

/** Write one message into a client's thread. The author is the caller's session. */
export async function sendMessage(input: { clientId: string; body: string }): Promise<void> {
  await sm(api.coaching.sendMessage, {
    clientId: input.clientId as Id<"users">,
    body: input.body,
  });
}

/** Mark everything the other party wrote in this thread as read. */
export async function markThreadRead(clientId: string): Promise<void> {
  await sm(api.coaching.markThreadRead, { clientId: clientId as Id<"users"> });
}

/** How many messages in this thread are waiting on the caller. */
export async function unreadCount(clientId: string): Promise<number> {
  return sq(api.coaching.unreadCount, { clientId: clientId as Id<"users"> });
}

/**
 * Everything waiting on the coach across every thread, as one number — the nav
 * badge and the console headline. Coach-only, and one call rather than one per
 * client, which is what it used to cost when the sum was added up out here.
 */
export async function unreadTotal(): Promise<number> {
  return sq(api.coaching.unreadTotal, {});
}

/* ------------------------------------------------------------------ checkins */

export async function findCheckin(clientId: string, week: string): Promise<Checkin | undefined> {
  // Convex has no `undefined`, so the query answers `null` for "no such week";
  // the callers were written against `undefined` and there is no reason to make
  // them care about the difference.
  return (
    (await sq(api.coaching.findCheckin, { clientId: clientId as Id<"users">, week })) ?? undefined
  );
}

export async function listCheckins(clientId: string, limit = 12): Promise<Checkin[]> {
  return sq(api.coaching.listCheckins, { clientId: clientId as Id<"users">, limit });
}

/** Insert-or-update this week's check-in and mark it submitted. */
export async function submitCheckin(input: {
  clientId: string;
  weekOf?: string;
  energy?: number | null;
  sleep?: number | null;
  soreness?: number | null;
  weightKg?: number | null;
  wins?: string;
  blockers?: string;
}): Promise<void> {
  await sm(api.coaching.submitCheckin, {
    ...input,
    clientId: input.clientId as Id<"users">,
  });
}

export async function replyToCheckin(checkinId: string, reply: string): Promise<void> {
  await sm(api.coaching.replyToCheckin, {
    checkinId: checkinId as Id<"checkins">,
    reply,
  });
}

/* -------------------------------------------------------------- measurements */

export async function recordMeasurement(input: {
  clientId: string;
  kind: string;
  value: number;
  date?: string;
}): Promise<void> {
  await sm(api.coaching.recordMeasurement, {
    ...input,
    clientId: input.clientId as Id<"users">,
  });
}

export async function measurements(
  clientId: string,
  kind?: string,
  limit = 60,
): Promise<Measurement[]> {
  return sq(api.coaching.measurements, {
    clientId: clientId as Id<"users">,
    kind,
    limit,
  });
}

/* ------------------------------------------------------------ coach console */

/**
 * Everything that needs Sara's attention, newest first. Four sources, one list
 * — the whole point is that she never has to go looking. Ordering is by
 * timestamp so the console reads like an inbox, not a dashboard.
 */
export async function coachAlerts(): Promise<CoachAlert[]> {
  return sq(api.coaching.coachAlerts, {});
}

/**
 * What has *happened*, newest first — the counterpart to `coachAlerts`, which
 * is only what still needs doing. Still one read, not one per client: the
 * merging happens inside Convex, where the rows are.
 */
export async function recentActivity(limit = 40): Promise<ActivityItem[]> {
  return sq(api.coaching.recentActivity, { limit });
}
