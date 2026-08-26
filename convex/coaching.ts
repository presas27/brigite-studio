import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import type { Ctx } from "./model/authz";
import { requireClientAccess, requireCoach } from "./model/authz";
import { dayKey, shiftDay, weekKey } from "../src/lib/studio/dates";
import { clampScale } from "../src/lib/studio/scale";
import type {
  ActivityItem,
  Checkin,
  CoachAlert,
  Measurement,
  Message,
  Role,
} from "../src/lib/studio/types";

/**
 * The coaching loop: the 1:1 thread, weekly check-ins, body readings, and the
 * aggregation behind the coach's "Hoje" console.
 *
 * Two things changed moving off SQLite, and they shape most of this file.
 *
 * **Nobody says who they are any more.** The SQL versions took a `readerId` /
 * `authorId` / `coachId` argument, which was fine while the only caller was a
 * server action that had already checked the session. A Convex deployment URL
 * is public, so an argument is only ever a suggestion: the actor comes from
 * `ctx.auth` through `convex/model/authz.ts`, and those parameters are gone
 * from the signatures rather than accepted and ignored.
 *
 * **The console reads across every client in one query.** `coachAlerts` and
 * `recentActivity` used to be a handful of joins with a `GROUP BY`; Convex has
 * neither, so they walk the client roster and fan in. That is a deliberate
 * trade — one round trip from the server component instead of one per client,
 * paid for with a bounded scan per client (the caps below). Every walk is
 * capped, so the total stays far under the 16k-document read ceiling for the
 * roster of a single trainer, which is what this app is.
 */

/** How much of the newest message a console alert quotes. */
const MESSAGE_PREVIEW_LENGTH = 120;

/**
 * How far back the unread walk and the mark-read sweep will go in one thread.
 * A safety rail, not an expected length — see `unreadTail`.
 *
 * Both of them use this same number, and that matters: the count trusts unread
 * messages to be the tail of the thread, and a sweep that stopped earlier than
 * the count walks would leave older unread messages stranded behind read ones
 * and quietly report a badge of zero over them. Sized to stay clear of both
 * Convex ceilings — 16k documents read, 8k written — while being far past any
 * conversation two people have actually had between one read and the next.
 */
const UNREAD_TAIL_CAP = 4000;

/** Rows one source can contribute to the console, as the old `LIMIT 30` did. */
const ALERTS_PER_SOURCE = 30;

/**
 * Weeks of check-ins the console looks back over per client. The SQL needed no
 * horizon because it could order the whole table by `submitted_at`; there is no
 * index for that here, so the walk stops after half a year — an unanswered
 * check-in older than that is not a nudge any more.
 */
const CHECKIN_ALERT_SCAN = 26;

/** A scheduled session older than this is history, not something to chase. */
const MISSED_WINDOW_DAYS = 14;

/** Days without a completed session before the console says so. */
const INACTIVE_DAYS = 10;

/**
 * Completed sessions read per client to find the latest `doneAt`. It cannot
 * just be the newest row: a session can be marked done long after it was
 * assigned, so the most recent completion is *near* the end of the list rather
 * than being its first entry. Four months of training is enough slack to find it.
 */
const DONE_SCAN = 60;

/** Rows walked looking for one kind of measurement before giving up. */
const MEASUREMENT_SCAN_CAP = 600;

/** Milliseconds in a day. */
const DAY_MS = 86_400_000;

/** A day key at noon UTC, so a `YYYY-MM-DD` never sorts into the wrong day. */
function atNoon(key: string): number {
  return Date.parse(`${key}T12:00:00Z`);
}

/**
 * A limit that arrived from outside: finite, whole, positive, capped. Every one
 * of these reaches a `.take()`, where an unbounded or `NaN` limit is either a
 * crash or a scan of the whole table.
 */
function clampLimit(raw: number | undefined, fallback: number, max: number): number {
  if (raw == null || !Number.isFinite(raw)) return fallback;
  return Math.min(Math.max(1, Math.floor(raw)), max);
}

/* ------------------------------------------------------------------ messages */

/**
 * Who wrote a message, without a lookup: a thread has exactly two sides, so an
 * author who is not the client is the coach. The SQL joined `users` for this and
 * silently dropped any message whose author row had gone; the rule here needs no
 * join at all, which is part of what keeps the console's walks cheap.
 */
function authorRole(doc: Doc<"messages">, clientId: Id<"users">): Role {
  return doc.authorId === clientId ? "client" : "coach";
}

function mapMessage(doc: Doc<"messages">, clientId: Id<"users">): Message {
  return {
    id: doc._id,
    clientId: doc.clientId,
    authorId: doc.authorId,
    authorRole: authorRole(doc, clientId),
    body: doc.body,
    readAt: doc.readAt,
    createdAt: doc._creationTime,
  };
}

/**
 * The messages in this thread the reader has not seen — everything the *other*
 * side wrote while `readAt` is still null. Newest first.
 *
 * Walked backwards from the end rather than counted over the whole thread,
 * because `markThreadRead` is the only writer of `readAt` and it sweeps
 * everything the other side wrote in one go. So a message from the other side
 * that is *already* read means every older one from that side was read in the
 * same sweep, and the walk can stop there: unread messages are always the tail
 * of a thread. Reading a badge therefore costs a handful of documents rather
 * than the length of the conversation.
 */
async function unreadTail(
  ctx: Ctx,
  clientId: Id<"users">,
  readerId: Id<"users">,
): Promise<Doc<"messages">[]> {
  const unread: Doc<"messages">[] = [];
  const thread = ctx.db
    .query("messages")
    .withIndex("by_client", (q) => q.eq("clientId", clientId))
    .order("desc");

  for await (const doc of thread) {
    if (doc.authorId === readerId) continue;
    if (doc.readAt !== null) break;
    unread.push(doc);
    if (unread.length >= UNREAD_TAIL_CAP) break;
  }
  return unread;
}

/** The whole thread for one client, oldest first. */
export const messagesFor = query({
  args: { clientId: v.id("users"), limit: v.optional(v.number()) },
  handler: async (ctx, args): Promise<Message[]> => {
    await requireClientAccess(ctx, args.clientId);

    // Newest first out of the index, reversed in memory: the page reads the
    // thread top to bottom, but a `limit` has to keep the *latest* messages.
    const docs = await ctx.db
      .query("messages")
      .withIndex("by_client", (q) => q.eq("clientId", args.clientId))
      .order("desc")
      .take(clampLimit(args.limit, 200, 500));

    return docs.map((doc) => mapMessage(doc, args.clientId)).reverse();
  },
});

/**
 * Write one message into a client's thread. The author is the session, never an
 * argument — this is the function a client could otherwise call to post as Sara.
 */
export const sendMessage = mutation({
  args: { clientId: v.id("users"), body: v.string() },
  handler: async (ctx, args): Promise<null> => {
    const { viewer } = await requireClientAccess(ctx, args.clientId);

    await ctx.db.insert("messages", {
      clientId: args.clientId,
      authorId: viewer._id,
      body: args.body.trim(),
      readAt: null,
    });
    return null;
  },
});

/** Mark everything the other party wrote in this thread as read. */
export const markThreadRead = mutation({
  args: { clientId: v.id("users") },
  handler: async (ctx, args): Promise<null> => {
    const { viewer } = await requireClientAccess(ctx, args.clientId);

    const now = Date.now();
    for (const doc of await unreadTail(ctx, args.clientId, viewer._id)) {
      await ctx.db.patch("messages", doc._id, { readAt: now });
    }
    return null;
  },
});

/** How many messages in this thread are waiting on whoever is asking. */
export const unreadCount = query({
  args: { clientId: v.id("users") },
  handler: async (ctx, args): Promise<number> => {
    const { viewer } = await requireClientAccess(ctx, args.clientId);
    return (await unreadTail(ctx, args.clientId, viewer._id)).length;
  },
});

/**
 * Everything waiting on the coach across every thread, as one number.
 *
 * The nav badge and the "Hoje" console both want this, and both used to build it
 * by calling `unreadCount` once per client — which over Convex is a round trip
 * per client for a single integer. Coach-only: it is a fact about the whole
 * studio, not about one thread.
 */
export const unreadTotal = query({
  args: {},
  handler: async (ctx): Promise<number> => {
    const coach = await requireCoach(ctx);

    let total = 0;
    for (const client of await roster(ctx)) {
      total += (await unreadTail(ctx, client._id, coach._id)).length;
    }
    return total;
  },
});

/* ------------------------------------------------------------------ checkins */

function mapCheckin(doc: Doc<"checkins">): Checkin {
  return {
    id: doc._id,
    clientId: doc.clientId,
    weekOf: doc.weekOf,
    energy: doc.energy,
    sleep: doc.sleep,
    soreness: doc.soreness,
    weightKg: doc.weightKg,
    wins: doc.wins,
    blockers: doc.blockers,
    submittedAt: doc.submittedAt,
    reply: doc.reply,
    repliedAt: doc.repliedAt,
    createdAt: doc._creationTime,
  };
}

/** A self-report dial as it arrives from outside: on the scale, or absent. */
function scaleOrNull(raw: number | null | undefined): number | null {
  if (raw == null || !Number.isFinite(raw)) return null;
  return clampScale(raw);
}

/** A body reading: a real, positive number, or absent. Never `NaN`, never negative. */
function positiveOrNull(raw: number | null | undefined): number | null {
  if (raw == null || !Number.isFinite(raw) || raw <= 0) return null;
  return raw;
}

/**
 * One week's check-in for one client, or `null`.
 *
 * `.first()` rather than `.unique()`: `submitCheckin` is the only writer and it
 * keeps one row per week, so a second one would be a bug — and a bug should not
 * become a thrown exception in the middle of rendering the aluna's layout.
 */
export const findCheckin = query({
  args: { clientId: v.id("users"), week: v.string() },
  handler: async (ctx, args): Promise<Checkin | null> => {
    await requireClientAccess(ctx, args.clientId);

    const doc = await ctx.db
      .query("checkins")
      .withIndex("by_client_and_week", (q) =>
        q.eq("clientId", args.clientId).eq("weekOf", args.week),
      )
      .first();

    return doc && mapCheckin(doc);
  },
});

/** The client's check-in history, most recent week first. */
export const listCheckins = query({
  args: { clientId: v.id("users"), limit: v.optional(v.number()) },
  handler: async (ctx, args): Promise<Checkin[]> => {
    await requireClientAccess(ctx, args.clientId);

    const docs = await ctx.db
      .query("checkins")
      .withIndex("by_client_and_week", (q) => q.eq("clientId", args.clientId))
      .order("desc")
      .take(clampLimit(args.limit, 12, 104));

    return docs.map(mapCheckin);
  },
});

/**
 * Insert-or-update this week's check-in and mark it submitted.
 *
 * SQLite had `UNIQUE (client_id, week_of)` and an `ON CONFLICT DO UPDATE`;
 * Convex has neither, so the uniqueness the rest of the app relies on lives
 * here: look the week up on `by_client_and_week` first, patch it if it is
 * already there, insert only if it is not. Patching rather than replacing is
 * also what keeps the coach's `reply` alive when a client edits her answers
 * after being answered.
 */
export const submitCheckin = mutation({
  args: {
    clientId: v.id("users"),
    weekOf: v.optional(v.string()),
    energy: v.optional(v.union(v.null(), v.number())),
    sleep: v.optional(v.union(v.null(), v.number())),
    soreness: v.optional(v.union(v.null(), v.number())),
    weightKg: v.optional(v.union(v.null(), v.number())),
    wins: v.optional(v.string()),
    blockers: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<null> => {
    await requireClientAccess(ctx, args.clientId);

    const weekOf = args.weekOf ?? weekKey();
    const weightKg = positiveOrNull(args.weightKg);
    const answers = {
      energy: scaleOrNull(args.energy),
      sleep: scaleOrNull(args.sleep),
      soreness: scaleOrNull(args.soreness),
      weightKg,
      wins: args.wins ?? "",
      blockers: args.blockers ?? "",
      submittedAt: Date.now(),
    };

    const existing = await ctx.db
      .query("checkins")
      .withIndex("by_client_and_week", (q) =>
        q.eq("clientId", args.clientId).eq("weekOf", weekOf),
      )
      .first();

    if (existing) {
      await ctx.db.patch("checkins", existing._id, answers);
    } else {
      await ctx.db.insert("checkins", {
        clientId: args.clientId,
        weekOf,
        ...answers,
        reply: "",
        repliedAt: null,
      });
    }

    // A weight typed into the check-in is the same reading as one typed into
    // "medidas", and the progress chart reads only measurements.
    if (weightKg != null) {
      await ctx.db.insert("measurements", {
        clientId: args.clientId,
        date: dayKey(),
        kind: "weight",
        value: weightKg,
      });
    }
    return null;
  },
});

/**
 * The coach's answer to one check-in.
 *
 * `requireCoach` rather than `requireClientAccess`: replying is Sara's half of
 * the exchange in both places it is offered, and a client answering her own
 * check-in was never something the UI meant to allow.
 */
export const replyToCheckin = mutation({
  args: { checkinId: v.id("checkins"), reply: v.string() },
  handler: async (ctx, args): Promise<null> => {
    await requireCoach(ctx);

    const checkin = await ctx.db.get("checkins", args.checkinId);
    if (!checkin) throw new Error("No such check-in");

    await ctx.db.patch("checkins", args.checkinId, {
      reply: args.reply.trim(),
      repliedAt: Date.now(),
    });
    return null;
  },
});

/* -------------------------------------------------------------- measurements */

function mapMeasurement(doc: Doc<"measurements">): Measurement {
  return {
    id: doc._id,
    clientId: doc.clientId,
    date: doc.date,
    kind: doc.kind,
    value: doc.value,
    createdAt: doc._creationTime,
  };
}

export const recordMeasurement = mutation({
  args: {
    clientId: v.id("users"),
    kind: v.string(),
    value: v.number(),
    date: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<null> => {
    await requireClientAccess(ctx, args.clientId);

    // A reading is a measurement of a body, so it is a positive, finite number.
    // Refusing it here is the difference between one rejected form submission
    // and a chart with an `Infinity` in it that can never be drawn again.
    const value = positiveOrNull(args.value);
    if (value == null) throw new Error("A measurement must be a positive number");

    await ctx.db.insert("measurements", {
      clientId: args.clientId,
      date: args.date ?? dayKey(),
      kind: args.kind.trim(),
      value,
    });
    return null;
  },
});

/**
 * A client's readings, newest day first, optionally of one kind.
 *
 * Walked over `by_client_and_date` even when a `kind` is given, rather than over
 * `by_client_and_kind`: the order the charts and `mergeBodyMetrics` expect is by
 * *date*, and a reading can be recorded for a day other than the one it was
 * typed on. The walk stops as soon as it has `limit` matches, so the ordinary
 * case reads little more than it returns.
 */
export const measurements = query({
  args: {
    clientId: v.id("users"),
    kind: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<Measurement[]> => {
    await requireClientAccess(ctx, args.clientId);

    const limit = clampLimit(args.limit, 60, 500);
    const found: Measurement[] = [];
    let scanned = 0;

    const readings = ctx.db
      .query("measurements")
      .withIndex("by_client_and_date", (q) => q.eq("clientId", args.clientId))
      .order("desc");

    for await (const doc of readings) {
      scanned += 1;
      if (args.kind == null || doc.kind === args.kind) found.push(mapMeasurement(doc));
      if (found.length >= limit || scanned >= MEASUREMENT_SCAN_CAP) break;
    }
    return found;
  },
});

/* ------------------------------------------------------------ coach console */

/**
 * Every client account that still counts, archived ones excluded — the spine
 * both console queries walk. `.collect()` is deliberate and safe here: this is
 * the studio's roster, the one list in the schema whose size is the number of
 * people Sara trains.
 */
async function roster(ctx: Ctx): Promise<Doc<"users">[]> {
  const clients = await ctx.db
    .query("users")
    .withIndex("by_role", (q) => q.eq("role", "client"))
    .collect();

  return clients.filter((client) => client.status !== "archived");
}

/**
 * Everything that needs Sara's attention, newest first. Four sources, one list
 * — the whole point is that she never has to go looking. Ordering is by
 * timestamp so the console reads like an inbox, not a dashboard.
 *
 * The missed-session and inactivity sources read `assignments` directly rather
 * than going through the plan module. That crosses an ownership boundary on
 * purpose: it is a single cross-cutting read for a console whose entire job is
 * to flatten the studio into one list, and routing it through the plan API would
 * mean either a round trip per client or a plan function that knows about
 * alerts. Nothing here writes to `assignments`.
 */
export const coachAlerts = query({
  args: {},
  handler: async (ctx): Promise<CoachAlert[]> => {
    const coach = await requireCoach(ctx);

    const today = dayKey();
    const missedFrom = shiftDay(today, -MISSED_WINDOW_DAYS);
    const now = Date.now();

    const checkins: CoachAlert[] = [];
    const messages: CoachAlert[] = [];
    const missed: CoachAlert[] = [];
    const inactive: CoachAlert[] = [];

    for (const client of await roster(ctx)) {
      const clientName = client.name;

      // Submitted and still unanswered.
      const recentCheckins = await ctx.db
        .query("checkins")
        .withIndex("by_client_and_week", (q) => q.eq("clientId", client._id))
        .order("desc")
        .take(CHECKIN_ALERT_SCAN);

      for (const checkin of recentCheckins) {
        if (checkin.submittedAt == null || checkin.repliedAt != null) continue;
        checkins.push({
          kind: "checkin",
          clientId: client._id,
          clientName,
          weekOf: checkin.weekOf,
          at: checkin.submittedAt,
        });
      }

      // Unread from the client's side, quoting whatever the thread ends with —
      // which may well be Sara's own last message, exactly as the old
      // correlated subquery had it.
      const unread = await unreadTail(ctx, client._id, coach._id);
      if (unread.length > 0) {
        const latest = await ctx.db
          .query("messages")
          .withIndex("by_client", (q) => q.eq("clientId", client._id))
          .order("desc")
          .first();

        messages.push({
          kind: "message",
          clientId: client._id,
          clientName,
          preview: (latest?.body ?? "").slice(0, MESSAGE_PREVIEW_LENGTH),
          at: unread[0]._creationTime,
        });
      }

      // Still scheduled, the day has passed, and it was recent enough to chase.
      // The range is what keeps this cheap; `status` is filtered afterwards
      // because the index that has the date is the one scoped to a client.
      const overdue = await ctx.db
        .query("assignments")
        .withIndex("by_client_and_date", (q) =>
          q.eq("clientId", client._id).gte("date", missedFrom).lt("date", today),
        )
        .order("desc")
        .take(ALERTS_PER_SOURCE);

      for (const assignment of overdue) {
        if (assignment.status !== "scheduled" || assignment.date == null) continue;
        missed.push({
          kind: "missed",
          clientId: client._id,
          clientName,
          date: assignment.date,
          at: atNoon(assignment.date),
        });
      }

      // Nothing completed in a week and a half. Only for accounts that are
      // actually training: an invited client has not gone quiet, she has simply
      // not started.
      if (client.status !== "active") continue;

      const completed = await ctx.db
        .query("assignments")
        .withIndex("by_client_and_status", (q) =>
          q.eq("clientId", client._id).eq("status", "done"),
        )
        .order("desc")
        .take(DONE_SCAN);

      let lastDone: number | null = null;
      for (const assignment of completed) {
        if (assignment.doneAt != null && (lastDone == null || assignment.doneAt > lastDone)) {
          lastDone = assignment.doneAt;
        }
      }
      if (lastDone == null) continue;

      const days = Math.floor((now - lastDone) / DAY_MS);
      if (days >= INACTIVE_DAYS) {
        inactive.push({
          kind: "inactive",
          clientId: client._id,
          clientName,
          days,
          at: lastDone,
        });
      }
    }

    // Each source capped on its own before the merge, as the four `LIMIT 30`s
    // did: one client with a long backlog must not crowd the others out.
    const byNewest = (a: CoachAlert, b: CoachAlert) => b.at - a.at;
    return [
      ...checkins.sort(byNewest).slice(0, ALERTS_PER_SOURCE),
      ...messages.sort(byNewest).slice(0, ALERTS_PER_SOURCE),
      ...missed.sort(byNewest).slice(0, ALERTS_PER_SOURCE),
      ...inactive,
    ].sort(byNewest);
  },
});

/* ---------------------------------------------------------- activity feed */

/**
 * What has *happened*, newest first — the counterpart to `coachAlerts`, which is
 * only what still needs doing. Five sources merged in memory rather than UNIONed
 * in SQL: each one has a different subject and a different link, and at one
 * trainer's scale the readability is worth more than the round trips.
 *
 * The sixth source the SQL version had is gone, not lost: it read the `snapshot`
 * column with `JSON.parse` and a try/catch, because a snapshot was text. It is a
 * real object in the schema now, so `snapshot.name` is just a field and the
 * parsing helper that guarded it has nothing left to guard.
 *
 * The take is `limit` per client per source, so the read cost is the roster times
 * the page size. That is the price of the whole feed being one query; the
 * alternative is the coach's landing page waiting on a Convex call per client per
 * source.
 */
export const recentActivity = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args): Promise<ActivityItem[]> => {
    await requireCoach(ctx);

    const limit = clampLimit(args.limit, 40, 100);
    const items: ActivityItem[] = [];
    const clients = await roster(ctx);

    for (const client of clients) {
      const clientId = client._id;
      const clientName = client.name;
      const clientHref = `/app/coach/alunos/${clientId}`;

      // Sessions the client closed out, done and skipped alike. `doneAt` is when
      // she closed it, which is not the order the rows were created in — an old
      // session can be logged today — so the merge below sorts on it.
      for (const status of ["done", "skipped"] as const) {
        const sessions = await ctx.db
          .query("assignments")
          .withIndex("by_client_and_status", (q) =>
            q.eq("clientId", clientId).eq("status", status),
          )
          .order("desc")
          .take(limit);

        for (const session of sessions) {
          if (session.doneAt == null) continue;
          items.push({
            id: `${status}-${session._id}`,
            kind: status === "done" ? "session" : "skipped",
            clientId,
            clientName,
            subject: session.snapshot.name,
            href: clientHref,
            actor: "client",
            at: session.doneAt,
          });
        }
      }

      // A check-in is up to two lines in the feed: hers, and Sara's answer.
      const checkins = await ctx.db
        .query("checkins")
        .withIndex("by_client_and_week", (q) => q.eq("clientId", clientId))
        .order("desc")
        .take(limit);

      for (const checkin of checkins) {
        if (checkin.submittedAt == null) continue;
        const base = {
          clientId,
          clientName,
          subject: checkin.weekOf,
          href: `${clientHref}/checkins`,
        };
        items.push({
          ...base,
          id: `chk-${checkin._id}`,
          kind: "checkin",
          actor: "client",
          at: checkin.submittedAt,
        });
        if (checkin.repliedAt != null) {
          items.push({
            ...base,
            id: `chkr-${checkin._id}`,
            kind: "checkinReply",
            actor: "coach",
            at: checkin.repliedAt,
          });
        }
      }

      const messages = await ctx.db
        .query("messages")
        .withIndex("by_client", (q) => q.eq("clientId", clientId))
        .order("desc")
        .take(limit);

      for (const message of messages) {
        items.push({
          id: `msg-${message._id}`,
          kind: "message",
          clientId,
          clientName,
          subject: null,
          href: `${clientHref}/mensagens`,
          actor: authorRole(message, clientId),
          at: message._creationTime,
        });
      }
    }

    // Accounts opening. No query of its own: the roster is already loaded, and
    // "joined" is only ever about a client who went on to become active.
    for (const client of clients) {
      if (client.status !== "active") continue;
      items.push({
        id: `join-${client._id}`,
        kind: "joined",
        clientId: client._id,
        clientName: client.name,
        subject: null,
        href: `/app/coach/alunos/${client._id}`,
        actor: "client",
        at: client._creationTime,
      });
    }

    return items.sort((a, b) => b.at - a.at).slice(0, limit);
  },
});
