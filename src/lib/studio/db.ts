import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Storage for the studio app (`/app`).
 *
 * Deliberately boring: one local SQLite file driven by plain SQL through
 * Node's built-in driver, so the app runs with zero provisioning and zero
 * dependencies. Every query in `src/lib/studio/*` is hand-written SQL, which
 * means the swap to a durable Postgres/libSQL host later is mechanical —
 * replace `all`/`get`/`run` below and nothing else changes.
 *
 * Honest limitation: a file on disk does not survive a serverless deploy.
 * This is the right shape for building and for a single-trainer install on a
 * persistent host; it is NOT production-durable on Vercel. See
 * `docs/studio-app/plano.md` §9.
 */

const DATA_DIR = join(process.cwd(), ".data");
const DB_PATH = join(DATA_DIR, "studio.db");

/** Rows come back as null-prototype objects; normalise to plain records. */
export type Row = Record<string, string | number | bigint | null | Uint8Array>;

type Params = ReadonlyArray<string | number | bigint | null | Uint8Array>;

/**
 * Dev keeps the handle on `globalThis` so Next's module reloading does not
 * open a new connection (and a new WAL lock) on every edit.
 */
const cache = globalThis as unknown as { __studioDb?: DatabaseSync };

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,
  email       TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('coach', 'client')),
  locale      TEXT NOT NULL DEFAULT 'pt',
  status      TEXT NOT NULL DEFAULT 'invited'
              CHECK (status IN ('invited', 'active', 'archived')),
  created_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS client_profiles (
  user_id     TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  plan        TEXT NOT NULL DEFAULT 'online'
              CHECK (plan IN ('personal', 'online', 'specialty')),
  goals       TEXT NOT NULL DEFAULT '',
  injuries    TEXT NOT NULL DEFAULT '',
  notes       TEXT NOT NULL DEFAULT '',
  tags        TEXT NOT NULL DEFAULT '[]',
  sessions_left INTEGER NOT NULL DEFAULT 0,
  started_at  INTEGER
);

CREATE TABLE IF NOT EXISTS magic_tokens (
  token_hash  TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  INTEGER NOT NULL,
  used_at     INTEGER
);

CREATE TABLE IF NOT EXISTS media (
  id          TEXT PRIMARY KEY,
  owner_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename    TEXT NOT NULL,
  mime        TEXT NOT NULL,
  bytes       INTEGER NOT NULL,
  created_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS exercises (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  cues          TEXT NOT NULL DEFAULT '',
  video_url     TEXT,
  media_id      TEXT REFERENCES media(id) ON DELETE SET NULL,
  tags          TEXT NOT NULL DEFAULT '[]',
  tracking      TEXT NOT NULL DEFAULT 'reps'
                CHECK (tracking IN ('reps', 'time', 'hold', 'distance')),
  regression_of TEXT REFERENCES exercises(id) ON DELETE SET NULL,
  archived      INTEGER NOT NULL DEFAULT 0,
  created_at    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS workouts (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  focus       TEXT NOT NULL DEFAULT '',
  notes       TEXT NOT NULL DEFAULT '',
  archived    INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS workout_blocks (
  id            TEXT PRIMARY KEY,
  workout_id    TEXT NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  position      INTEGER NOT NULL,
  kind          TEXT NOT NULL DEFAULT 'normal'
                CHECK (kind IN ('normal', 'superset', 'circuit', 'interval')),
  label         TEXT NOT NULL DEFAULT '',
  rounds        INTEGER NOT NULL DEFAULT 1,
  rest_seconds  INTEGER NOT NULL DEFAULT 60
);

CREATE TABLE IF NOT EXISTS workout_items (
  id            TEXT PRIMARY KEY,
  block_id      TEXT NOT NULL REFERENCES workout_blocks(id) ON DELETE CASCADE,
  position      INTEGER NOT NULL,
  exercise_id   TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  sets          INTEGER NOT NULL DEFAULT 3,
  reps          TEXT NOT NULL DEFAULT '',
  seconds       INTEGER,
  tempo         TEXT NOT NULL DEFAULT '',
  rest_seconds  INTEGER NOT NULL DEFAULT 60,
  rpe           TEXT NOT NULL DEFAULT '',
  notes         TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS assignments (
  id          TEXT PRIMARY KEY,
  client_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workout_id  TEXT REFERENCES workouts(id) ON DELETE SET NULL,
  date        TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'scheduled'
              CHECK (status IN ('scheduled', 'done', 'skipped')),
  snapshot    TEXT NOT NULL,
  note        TEXT NOT NULL DEFAULT '',
  started_at  INTEGER,
  done_at     INTEGER,
  created_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS set_logs (
  id            TEXT PRIMARY KEY,
  assignment_id TEXT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  item_id       TEXT NOT NULL,
  exercise_id   TEXT NOT NULL,
  set_index     INTEGER NOT NULL,
  reps          INTEGER,
  load_kg       REAL,
  seconds       INTEGER,
  rpe           REAL,
  notes         TEXT NOT NULL DEFAULT '',
  logged_at     INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS submissions (
  id            TEXT PRIMARY KEY,
  client_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assignment_id TEXT REFERENCES assignments(id) ON DELETE SET NULL,
  exercise_id   TEXT REFERENCES exercises(id) ON DELETE SET NULL,
  media_id      TEXT REFERENCES media(id) ON DELETE SET NULL,
  video_url     TEXT,
  note          TEXT NOT NULL DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'reviewed')),
  verdict       TEXT CHECK (verdict IN ('ok', 'adjust', 'regress')),
  reply         TEXT NOT NULL DEFAULT '',
  reviewed_at   INTEGER,
  created_at    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS review_comments (
  id            TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  t_ms          INTEGER NOT NULL,
  body          TEXT NOT NULL,
  created_at    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id          TEXT PRIMARY KEY,
  client_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  author_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body        TEXT NOT NULL,
  media_id    TEXT REFERENCES media(id) ON DELETE SET NULL,
  read_at     INTEGER,
  created_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS checkins (
  id            TEXT PRIMARY KEY,
  client_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_of       TEXT NOT NULL,
  energy        INTEGER,
  sleep         INTEGER,
  soreness      INTEGER,
  weight_kg     REAL,
  wins          TEXT NOT NULL DEFAULT '',
  blockers      TEXT NOT NULL DEFAULT '',
  submitted_at  INTEGER,
  reply         TEXT NOT NULL DEFAULT '',
  replied_at    INTEGER,
  created_at    INTEGER NOT NULL,
  UNIQUE (client_id, week_of)
);

CREATE TABLE IF NOT EXISTS measurements (
  id          TEXT PRIMARY KEY,
  client_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date        TEXT NOT NULL,
  kind        TEXT NOT NULL,
  value       REAL NOT NULL,
  created_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS leads (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  phone       TEXT NOT NULL DEFAULT '',
  message     TEXT NOT NULL DEFAULT '',
  interest    TEXT,
  source      TEXT NOT NULL DEFAULT 'site',
  status      TEXT NOT NULL DEFAULT 'new'
              CHECK (status IN ('new', 'talking', 'won', 'lost')),
  notes       TEXT NOT NULL DEFAULT '',
  client_id   TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_assignments_client_date
  ON assignments (client_id, date);
CREATE INDEX IF NOT EXISTS idx_set_logs_assignment ON set_logs (assignment_id);
CREATE INDEX IF NOT EXISTS idx_set_logs_exercise ON set_logs (exercise_id, logged_at);
CREATE INDEX IF NOT EXISTS idx_messages_client ON messages (client_id, created_at);
CREATE INDEX IF NOT EXISTS idx_submissions_client ON submissions (client_id, created_at);
CREATE INDEX IF NOT EXISTS idx_blocks_workout ON workout_blocks (workout_id, position);
CREATE INDEX IF NOT EXISTS idx_items_block ON workout_items (block_id, position);
CREATE INDEX IF NOT EXISTS idx_measurements_client ON measurements (client_id, date);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads (status, created_at);
`;

function open(): DatabaseSync {
  mkdirSync(DATA_DIR, { recursive: true });
  const db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(SCHEMA);
  return db;
}

/** The shared connection. Opens (and migrates) on first use. */
export function db(): DatabaseSync {
  cache.__studioDb ??= open();
  return cache.__studioDb;
}

/** All matching rows. */
export function all<T = Row>(sql: string, ...params: Params): T[] {
  return db().prepare(sql).all(...params) as T[];
}

/** First matching row, or `undefined`. */
export function get<T = Row>(sql: string, ...params: Params): T | undefined {
  return db().prepare(sql).get(...params) as T | undefined;
}

/** Write. Returns rows-changed so callers can detect no-ops. */
export function run(sql: string, ...params: Params): number {
  return Number(db().prepare(sql).run(...params).changes);
}

/** Run `fn` inside a transaction, rolling back on throw. */
export function tx<T>(fn: () => T): T {
  const handle = db();
  handle.exec("BEGIN");
  try {
    const result = fn();
    handle.exec("COMMIT");
    return result;
  } catch (err) {
    handle.exec("ROLLBACK");
    throw err;
  }
}

/** `YYYY-MM-DD` for a date (today by default), in Lisbon time. */
export function dayKey(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Lisbon",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Monday of the week containing `date`, as `YYYY-MM-DD`. */
export function weekKey(date: Date = new Date()): string {
  const key = dayKey(date);
  const [y, m, d] = key.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d));
  const shift = (utc.getUTCDay() + 6) % 7; // Monday = 0
  utc.setUTCDate(utc.getUTCDate() - shift);
  return utc.toISOString().slice(0, 10);
}

/** Shift a `YYYY-MM-DD` key by whole days. */
export function shiftDay(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d));
  utc.setUTCDate(utc.getUTCDate() + days);
  return utc.toISOString().slice(0, 10);
}

/** `YYYY-MM` for a date (today by default), in Lisbon time. */
export function monthKey(date: Date = new Date()): string {
  return dayKey(date).slice(0, 7);
}

/** Shift a `YYYY-MM` key by whole months. */
export function shiftMonth(key: string, months: number): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + months, 1)).toISOString().slice(0, 7);
}

/**
 * Every day key a Monday-first calendar page for `YYYY-MM` has to render —
 * the month plus the leading and trailing days that complete its first and
 * last weeks. Always a whole number of weeks, never a fixed six: padding a
 * 28-day February to six rows hangs two empty March weeks off the bottom.
 */
export function monthGrid(key: string): string[] {
  const [y, m] = key.split("-").map(Number);
  const offset = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7; // Monday = 0
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const start = shiftDay(`${key}-01`, -offset);
  const cells = Math.ceil((offset + daysInMonth) / 7) * 7;
  return Array.from({ length: cells }, (_, i) => shiftDay(start, i));
}
