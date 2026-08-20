import { all, dayKey, get, run, shiftDay, weekKey, type Row } from "./db";
import { newId } from "./id";
import type {
  ActivityItem,
  Checkin,
  CoachAlert,
  Measurement,
  Message,
  ReviewComment,
  Submission,
  Verdict,
} from "./types";

/**
 * The coaching loop: video submissions and Sara's annotated feedback, the 1:1
 * thread, weekly check-ins, and the aggregation behind the coach's "Hoje"
 * console.
 *
 * Video review is the point of difference. A submission carries comments
 * pinned to a millisecond offset in the clip, so "o ombro sobe aqui" lands on
 * the exact frame instead of somewhere in a paragraph.
 */

/* -------------------------------------------------------------- submissions */

function mapComment(row: Row): ReviewComment {
  return {
    id: String(row.id),
    tMs: Number(row.t_ms),
    body: String(row.body),
    createdAt: Number(row.created_at),
  };
}

function mapSubmission(row: Row, comments: ReviewComment[]): Submission {
  return {
    id: String(row.id),
    clientId: String(row.client_id),
    clientName: String(row.client_name ?? ""),
    assignmentId: row.assignment_id == null ? null : String(row.assignment_id),
    exerciseId: row.exercise_id == null ? null : String(row.exercise_id),
    exerciseName: row.exercise_name == null ? null : String(row.exercise_name),
    mediaId: row.media_id == null ? null : String(row.media_id),
    videoUrl: row.video_url == null ? null : String(row.video_url),
    note: String(row.note ?? ""),
    status: row.status === "reviewed" ? "reviewed" : "pending",
    verdict: row.verdict == null ? null : (String(row.verdict) as Verdict),
    reply: String(row.reply ?? ""),
    reviewedAt: row.reviewed_at == null ? null : Number(row.reviewed_at),
    createdAt: Number(row.created_at),
    comments,
  };
}

const SUBMISSION_SELECT = `
  SELECT s.id, s.client_id, s.assignment_id, s.exercise_id, s.media_id, s.video_url,
         s.note, s.status, s.verdict, s.reply, s.reviewed_at, s.created_at,
         u.name AS client_name, e.name AS exercise_name
    FROM submissions s
    JOIN users u ON u.id = s.client_id
    LEFT JOIN exercises e ON e.id = s.exercise_id`;

function commentsFor(submissionIds: string[]): Map<string, ReviewComment[]> {
  const grouped = new Map<string, ReviewComment[]>();
  if (submissionIds.length === 0) return grouped;
  const placeholders = submissionIds.map(() => "?").join(", ");
  const rows = all<Row>(
    `SELECT id, submission_id, t_ms, body, created_at FROM review_comments
      WHERE submission_id IN (${placeholders}) ORDER BY t_ms`,
    ...submissionIds,
  );
  for (const row of rows) {
    const key = String(row.submission_id);
    const list = grouped.get(key);
    if (list) list.push(mapComment(row));
    else grouped.set(key, [mapComment(row)]);
  }
  return grouped;
}

export function createSubmission(input: {
  clientId: string;
  assignmentId?: string | null;
  exerciseId?: string | null;
  mediaId?: string | null;
  videoUrl?: string | null;
  note?: string;
}): string {
  const submissionId = newId();
  run(
    `INSERT INTO submissions
       (id, client_id, assignment_id, exercise_id, media_id, video_url, note, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
    submissionId,
    input.clientId,
    input.assignmentId ?? null,
    input.exerciseId ?? null,
    input.mediaId ?? null,
    input.videoUrl?.trim() || null,
    input.note ?? "",
    Date.now(),
  );
  return submissionId;
}

export function findSubmission(submissionId: string): Submission | undefined {
  const row = get<Row>(`${SUBMISSION_SELECT} WHERE s.id = ?`, submissionId);
  if (!row) return undefined;
  return mapSubmission(row, commentsFor([submissionId]).get(submissionId) ?? []);
}

export function listSubmissions(
  options: { clientId?: string; status?: "pending" | "reviewed"; limit?: number } = {},
): Submission[] {
  const clauses: string[] = [];
  const params: (string | number)[] = [];
  if (options.clientId) {
    clauses.push("s.client_id = ?");
    params.push(options.clientId);
  }
  if (options.status) {
    clauses.push("s.status = ?");
    params.push(options.status);
  }
  const rows = all<Row>(
    `${SUBMISSION_SELECT}
      ${clauses.length ? `WHERE ${clauses.join(" AND ")}` : ""}
      ORDER BY s.created_at DESC LIMIT ?`,
    ...params,
    options.limit ?? 50,
  );
  const grouped = commentsFor(rows.map((row) => String(row.id)));
  return rows.map((row) => mapSubmission(row, grouped.get(String(row.id)) ?? []));
}

export function addReviewComment(submissionId: string, tMs: number, body: string): void {
  run(
    "INSERT INTO review_comments (id, submission_id, t_ms, body, created_at) VALUES (?, ?, ?, ?, ?)",
    newId(),
    submissionId,
    Math.max(0, Math.trunc(tMs)),
    body.trim(),
    Date.now(),
  );
}

export function removeReviewComment(commentId: string): void {
  run("DELETE FROM review_comments WHERE id = ?", commentId);
}

/** Close a review: overall verdict plus a written reply. */
export function finishReview(submissionId: string, verdict: Verdict, reply: string): void {
  run(
    `UPDATE submissions SET status = 'reviewed', verdict = ?, reply = ?, reviewed_at = ?
      WHERE id = ?`,
    verdict,
    reply,
    Date.now(),
    submissionId,
  );
}

/* ------------------------------------------------------------------ messages */

function mapMessage(row: Row): Message {
  return {
    id: String(row.id),
    clientId: String(row.client_id),
    authorId: String(row.author_id),
    authorRole: row.author_role === "coach" ? "coach" : "client",
    body: String(row.body),
    mediaId: row.media_id == null ? null : String(row.media_id),
    readAt: row.read_at == null ? null : Number(row.read_at),
    createdAt: Number(row.created_at),
  };
}

/** The whole thread for one client, oldest first. */
export function messagesFor(clientId: string, limit = 200): Message[] {
  const rows = all<Row>(
    `SELECT m.id, m.client_id, m.author_id, m.body, m.media_id, m.read_at, m.created_at,
            u.role AS author_role
       FROM messages m JOIN users u ON u.id = m.author_id
      WHERE m.client_id = ?
      ORDER BY m.created_at DESC LIMIT ?`,
    clientId,
    limit,
  );
  return rows.map(mapMessage).reverse();
}

export function sendMessage(input: {
  clientId: string;
  authorId: string;
  body: string;
  mediaId?: string | null;
}): void {
  run(
    `INSERT INTO messages (id, client_id, author_id, body, media_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    newId(),
    input.clientId,
    input.authorId,
    input.body.trim(),
    input.mediaId ?? null,
    Date.now(),
  );
}

/** Mark everything the other party wrote in this thread as read. */
export function markThreadRead(clientId: string, readerId: string): void {
  run(
    "UPDATE messages SET read_at = ? WHERE client_id = ? AND author_id != ? AND read_at IS NULL",
    Date.now(),
    clientId,
    readerId,
  );
}

export function unreadCount(clientId: string, readerId: string): number {
  const row = get<Row>(
    "SELECT count(*) AS n FROM messages WHERE client_id = ? AND author_id != ? AND read_at IS NULL",
    clientId,
    readerId,
  );
  return Number(row?.n ?? 0);
}

/* ------------------------------------------------------------------ checkins */

function mapCheckin(row: Row): Checkin {
  return {
    id: String(row.id),
    clientId: String(row.client_id),
    weekOf: String(row.week_of),
    energy: row.energy == null ? null : Number(row.energy),
    sleep: row.sleep == null ? null : Number(row.sleep),
    soreness: row.soreness == null ? null : Number(row.soreness),
    weightKg: row.weight_kg == null ? null : Number(row.weight_kg),
    wins: String(row.wins ?? ""),
    blockers: String(row.blockers ?? ""),
    submittedAt: row.submitted_at == null ? null : Number(row.submitted_at),
    reply: String(row.reply ?? ""),
    repliedAt: row.replied_at == null ? null : Number(row.replied_at),
    createdAt: Number(row.created_at),
  };
}

const CHECKIN_COLUMNS = `id, client_id, week_of, energy, sleep, soreness, weight_kg,
  wins, blockers, submitted_at, reply, replied_at, created_at`;

export function findCheckin(clientId: string, week: string): Checkin | undefined {
  const row = get<Row>(
    `SELECT ${CHECKIN_COLUMNS} FROM checkins WHERE client_id = ? AND week_of = ?`,
    clientId,
    week,
  );
  return row && mapCheckin(row);
}

export function listCheckins(clientId: string, limit = 12): Checkin[] {
  const rows = all<Row>(
    `SELECT ${CHECKIN_COLUMNS} FROM checkins WHERE client_id = ?
      ORDER BY week_of DESC LIMIT ?`,
    clientId,
    limit,
  );
  return rows.map(mapCheckin);
}

/** Insert-or-update this week's check-in and mark it submitted. */
export function submitCheckin(input: {
  clientId: string;
  weekOf?: string;
  energy?: number | null;
  sleep?: number | null;
  soreness?: number | null;
  weightKg?: number | null;
  wins?: string;
  blockers?: string;
}): void {
  const week = input.weekOf ?? weekKey();
  const now = Date.now();
  run(
    `INSERT INTO checkins
       (id, client_id, week_of, energy, sleep, soreness, weight_kg, wins, blockers,
        submitted_at, reply, replied_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', NULL, ?)
     ON CONFLICT (client_id, week_of) DO UPDATE SET
       energy = excluded.energy,
       sleep = excluded.sleep,
       soreness = excluded.soreness,
       weight_kg = excluded.weight_kg,
       wins = excluded.wins,
       blockers = excluded.blockers,
       submitted_at = excluded.submitted_at`,
    newId(),
    input.clientId,
    week,
    input.energy ?? null,
    input.sleep ?? null,
    input.soreness ?? null,
    input.weightKg ?? null,
    input.wins ?? "",
    input.blockers ?? "",
    now,
    now,
  );
  if (input.weightKg != null) {
    recordMeasurement({ clientId: input.clientId, kind: "weight", value: input.weightKg });
  }
}

export function replyToCheckin(checkinId: string, reply: string): void {
  run(
    "UPDATE checkins SET reply = ?, replied_at = ? WHERE id = ?",
    reply.trim(),
    Date.now(),
    checkinId,
  );
}

/* -------------------------------------------------------------- measurements */

export function recordMeasurement(input: {
  clientId: string;
  kind: string;
  value: number;
  date?: string;
}): void {
  run(
    "INSERT INTO measurements (id, client_id, date, kind, value, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    newId(),
    input.clientId,
    input.date ?? dayKey(),
    input.kind,
    input.value,
    Date.now(),
  );
}

export function measurements(clientId: string, kind?: string, limit = 60): Measurement[] {
  const rows = all<Row>(
    `SELECT id, client_id, date, kind, value, created_at FROM measurements
      WHERE client_id = ? ${kind ? "AND kind = ?" : ""}
      ORDER BY date DESC, created_at DESC LIMIT ?`,
    clientId,
    ...(kind ? [kind] : []),
    limit,
  );
  return rows.map((row) => ({
    id: String(row.id),
    clientId: String(row.client_id),
    date: String(row.date),
    kind: String(row.kind),
    value: Number(row.value),
    createdAt: Number(row.created_at),
  }));
}

/* ------------------------------------------------------------ coach console */

/**
 * Everything that needs Sara's attention, newest first. Five sources, one list
 * — the whole point is that she never has to go looking. Ordering is by
 * timestamp so the console reads like an inbox, not a dashboard.
 */
export function coachAlerts(coachId: string): CoachAlert[] {
  const alerts: CoachAlert[] = [];

  for (const row of all<Row>(
    `SELECT s.id, s.client_id, s.created_at, u.name
       FROM submissions s JOIN users u ON u.id = s.client_id
      WHERE s.status = 'pending' AND u.status != 'archived'
      ORDER BY s.created_at DESC LIMIT 30`,
  )) {
    alerts.push({
      kind: "submission",
      clientId: String(row.client_id),
      clientName: String(row.name),
      submissionId: String(row.id),
      at: Number(row.created_at),
    });
  }

  for (const row of all<Row>(
    `SELECT c.client_id, c.week_of, c.submitted_at, u.name
       FROM checkins c JOIN users u ON u.id = c.client_id
      WHERE c.submitted_at IS NOT NULL AND c.replied_at IS NULL AND u.status != 'archived'
      ORDER BY c.submitted_at DESC LIMIT 30`,
  )) {
    alerts.push({
      kind: "checkin",
      clientId: String(row.client_id),
      clientName: String(row.name),
      weekOf: String(row.week_of),
      at: Number(row.submitted_at),
    });
  }

  for (const row of all<Row>(
    `SELECT m.client_id, max(m.created_at) AS at, u.name,
            (SELECT body FROM messages WHERE client_id = m.client_id
              ORDER BY created_at DESC LIMIT 1) AS preview
       FROM messages m JOIN users u ON u.id = m.client_id
      WHERE m.author_id != ? AND m.read_at IS NULL AND u.status != 'archived'
      GROUP BY m.client_id
      ORDER BY at DESC LIMIT 30`,
    coachId,
  )) {
    alerts.push({
      kind: "message",
      clientId: String(row.client_id),
      clientName: String(row.name),
      preview: String(row.preview ?? "").slice(0, 120),
      at: Number(row.at),
    });
  }

  const today = dayKey();

  for (const row of all<Row>(
    `SELECT a.client_id, a.date, u.name
       FROM assignments a JOIN users u ON u.id = a.client_id
      WHERE a.status = 'scheduled' AND a.date < ? AND a.date >= ? AND u.status != 'archived'
      ORDER BY a.date DESC LIMIT 30`,
    today,
    shiftDay(today, -14),
  )) {
    alerts.push({
      kind: "missed",
      clientId: String(row.client_id),
      clientName: String(row.name),
      date: String(row.date),
      at: Date.parse(`${String(row.date)}T12:00:00Z`),
    });
  }

  for (const row of all<Row>(
    `SELECT u.id, u.name,
            (SELECT max(done_at) FROM assignments WHERE client_id = u.id AND status = 'done') AS last_done
       FROM users u
      WHERE u.role = 'client' AND u.status = 'active'`,
  )) {
    const lastDone = row.last_done == null ? null : Number(row.last_done);
    const days = lastDone == null ? null : Math.floor((Date.now() - lastDone) / 86_400_000);
    if (days != null && days >= 10) {
      alerts.push({
        kind: "inactive",
        clientId: String(row.id),
        clientName: String(row.name),
        days,
        at: lastDone!,
      });
    }
  }

  return alerts.sort((a, b) => b.at - a.at);
}

/* ---------------------------------------------------------- activity feed */

/**
 * What has *happened*, newest first — the counterpart to `coachAlerts`, which
 * is only what still needs doing. Seven sources merged in memory rather than
 * UNIONed in SQL: each one needs a different join and a different subject, and
 * at one trainer's scale the readability is worth more than the round trips.
 */
export function recentActivity(limit = 40): ActivityItem[] {
  const items: ActivityItem[] = [];

  const pushSessions = (status: "done" | "skipped") => {
    for (const row of all<Row>(
      `SELECT a.id, a.client_id, a.snapshot, a.done_at, u.name
         FROM assignments a JOIN users u ON u.id = a.client_id
        WHERE a.status = ? AND a.done_at IS NOT NULL AND u.status != 'archived'
        ORDER BY a.done_at DESC LIMIT ?`,
      status,
      limit,
    )) {
      items.push({
        id: `${status}-${String(row.id)}`,
        kind: status === "done" ? "session" : "skipped",
        clientId: String(row.client_id),
        clientName: String(row.name),
        subject: parseSnapshotName(row.snapshot),
        href: `/app/coach/alunos/${String(row.client_id)}`,
        actor: "client",
        at: Number(row.done_at),
      });
    }
  };
  pushSessions("done");
  pushSessions("skipped");

  for (const row of all<Row>(
    `SELECT s.id, s.client_id, s.created_at, s.status, s.verdict, s.reviewed_at,
            u.name, e.name AS exercise_name
       FROM submissions s
       JOIN users u ON u.id = s.client_id
       LEFT JOIN exercises e ON e.id = s.exercise_id
      WHERE u.status != 'archived'
      ORDER BY s.created_at DESC LIMIT ?`,
    limit,
  )) {
    const base = {
      clientId: String(row.client_id),
      clientName: String(row.name),
      subject: row.exercise_name == null ? null : String(row.exercise_name),
      href: `/app/coach/videos/${String(row.id)}`,
    };
    items.push({
      ...base,
      id: `sub-${String(row.id)}`,
      kind: "submission",
      actor: "client",
      at: Number(row.created_at),
    });
    if (row.reviewed_at != null) {
      items.push({
        ...base,
        id: `rev-${String(row.id)}`,
        kind: "review",
        actor: "coach",
        at: Number(row.reviewed_at),
      });
    }
  }

  for (const row of all<Row>(
    `SELECT c.id, c.client_id, c.week_of, c.submitted_at, c.replied_at, u.name
       FROM checkins c JOIN users u ON u.id = c.client_id
      WHERE c.submitted_at IS NOT NULL AND u.status != 'archived'
      ORDER BY c.submitted_at DESC LIMIT ?`,
    limit,
  )) {
    const base = {
      clientId: String(row.client_id),
      clientName: String(row.name),
      subject: String(row.week_of),
      href: `/app/coach/alunos/${String(row.client_id)}/checkins`,
    };
    items.push({
      ...base,
      id: `chk-${String(row.id)}`,
      kind: "checkin",
      actor: "client",
      at: Number(row.submitted_at),
    });
    if (row.replied_at != null) {
      items.push({
        ...base,
        id: `chkr-${String(row.id)}`,
        kind: "checkinReply",
        actor: "coach",
        at: Number(row.replied_at),
      });
    }
  }

  for (const row of all<Row>(
    `SELECT m.id, m.client_id, m.created_at, u.name, a.role AS author_role
       FROM messages m
       JOIN users u ON u.id = m.client_id
       JOIN users a ON a.id = m.author_id
      WHERE u.status != 'archived'
      ORDER BY m.created_at DESC LIMIT ?`,
    limit,
  )) {
    items.push({
      id: `msg-${String(row.id)}`,
      kind: "message",
      clientId: String(row.client_id),
      clientName: String(row.name),
      subject: null,
      href: `/app/coach/alunos/${String(row.client_id)}/mensagens`,
      actor: row.author_role === "coach" ? "coach" : "client",
      at: Number(row.created_at),
    });
  }

  for (const row of all<Row>(
    `SELECT id, name, created_at FROM users
      WHERE role = 'client' AND status = 'active'
      ORDER BY created_at DESC LIMIT ?`,
    limit,
  )) {
    items.push({
      id: `join-${String(row.id)}`,
      kind: "joined",
      clientId: String(row.id),
      clientName: String(row.name),
      subject: null,
      href: `/app/coach/alunos/${String(row.id)}`,
      actor: "client",
      at: Number(row.created_at),
    });
  }

  return items.sort((a, b) => b.at - a.at).slice(0, limit);
}

/** The frozen workout name inside an assignment snapshot, if it parses. */
function parseSnapshotName(raw: unknown): string | null {
  try {
    const parsed: unknown = JSON.parse(String(raw ?? ""));
    if (parsed && typeof parsed === "object" && "name" in parsed) {
      return typeof parsed.name === "string" ? parsed.name : null;
    }
  } catch {
    /* a snapshot we cannot read is not worth a broken feed row */
  }
  return null;
}
