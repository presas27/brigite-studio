import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { DATA_DIR, DB_PATH } from "./paths";

/**
 * Storage for the studio app (`/app`).
 *
 * Deliberately boring: one local SQLite file driven by plain SQL through
 * Node's built-in driver, so the app runs with zero provisioning and zero
 * dependencies. Every query in `src/lib/studio/*` is hand-written SQL, which
 * means the swap to a durable Postgres/libSQL host later is mechanical —
 * replace `all`/`get`/`run` below and nothing else changes.
 *
 * Honest limitation: a file on disk does not survive a serverless deploy, and
 * on Vercel the file lives in `/tmp` (see `paths.ts`) — rebuilt from the seed on
 * every cold start. This is the right shape for building and for a
 * single-trainer install on a persistent host; it is NOT production-durable on
 * Vercel. See `docs/studio-app/plano.md` §9.
 */

/** Rows come back as null-prototype objects; normalise to plain records. */
export type Row = Record<string, string | number | bigint | null | Uint8Array>;

type Params = ReadonlyArray<string | number | bigint | null | Uint8Array>;

/**
 * Dev keeps the handle on `globalThis` so Next's module reloading does not
 * open a new connection (and a new WAL lock) on every edit.
 */
const cache = globalThis as unknown as { __studioDb?: DatabaseSync };

const SCHEMA = `
-- Bookkeeping the app writes about itself. One row so far: the fingerprint of
-- the seeded library, which is what lets a request-path seed check cost one
-- indexed read instead of a scan of every exercise.
CREATE TABLE IF NOT EXISTS meta (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL
);

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

CREATE TABLE IF NOT EXISTS exercises (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  cues          TEXT NOT NULL DEFAULT '',
  video_url     TEXT,
  tags          TEXT NOT NULL DEFAULT '[]',
  tracking      TEXT NOT NULL DEFAULT 'reps'
                CHECK (tracking IN ('reps', 'time', 'hold', 'distance')),
  regression_of TEXT REFERENCES exercises(id) ON DELETE SET NULL,
  archived      INTEGER NOT NULL DEFAULT 0,
  created_at    INTEGER NOT NULL
);

-- A block of training weeks for one client: "Phase 1 - Base building". The
-- coach's plan is a sequence of these, and every workout the client trains
-- hangs off one of them. Duration is either two calendar dates or a plain
-- number of weeks; the other pair of columns stays NULL.
CREATE TABLE IF NOT EXISTS training_phases (
  id            TEXT PRIMARY KEY,
  coach_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  position      INTEGER NOT NULL DEFAULT 0,
  duration_type TEXT NOT NULL DEFAULT 'calendar'
                CHECK (duration_type IN ('calendar', 'weeks')),
  start_date    TEXT,
  end_date      TEXT,
  weeks         INTEGER,
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL
);

-- Workouts are library templates when \`client_id\` is NULL. A workout with a
-- \`client_id\` and a \`phase_id\` is a client-scoped copy living inside one
-- training phase: it never shows in the library, and editing it cannot reach
-- back into the template it was copied from (\`source_workout_id\`).
CREATE TABLE IF NOT EXISTS workouts (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  focus         TEXT NOT NULL DEFAULT '',
  notes         TEXT NOT NULL DEFAULT '',
  instructions  TEXT NOT NULL DEFAULT '',
  workout_type  TEXT NOT NULL DEFAULT 'regular'
                CHECK (workout_type IN ('regular', 'circuit', 'interval')),
  coach_id      TEXT REFERENCES users(id) ON DELETE CASCADE,
  client_id     TEXT REFERENCES users(id) ON DELETE CASCADE,
  phase_id      TEXT REFERENCES training_phases(id) ON DELETE CASCADE,
  source_workout_id TEXT,
  position      INTEGER NOT NULL DEFAULT 0,
  archived      INTEGER NOT NULL DEFAULT 0,
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL DEFAULT 0
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
  date        TEXT,
  status      TEXT NOT NULL DEFAULT 'scheduled'
              CHECK (status IN ('scheduled', 'done', 'skipped')),
  snapshot    TEXT NOT NULL,
  note        TEXT NOT NULL DEFAULT '',
  started_at  INTEGER,
  done_at     INTEGER,
  effort      INTEGER CHECK (effort IS NULL OR effort BETWEEN 1 AND 10),
  extra_rest_seconds INTEGER NOT NULL DEFAULT 0,
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

CREATE TABLE IF NOT EXISTS messages (
  id          TEXT PRIMARY KEY,
  client_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  author_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body        TEXT NOT NULL,
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
CREATE INDEX IF NOT EXISTS idx_blocks_workout ON workout_blocks (workout_id, position);
CREATE INDEX IF NOT EXISTS idx_items_block ON workout_items (block_id, position);
CREATE INDEX IF NOT EXISTS idx_measurements_client ON measurements (client_id, date);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads (status, created_at);
CREATE INDEX IF NOT EXISTS idx_phases_client ON training_phases (client_id, position);
`;

/**
 * `assignments.date` used to be `NOT NULL`; assigning a workout with no day
 * needs it nullable. `CREATE TABLE IF NOT EXISTS` above no-ops on a database
 * that already has the old constraint, so a database created before this
 * change needs the column rebuilt by hand — SQLite has no `ALTER COLUMN`.
 */
function migrateAssignmentsNullableDate(handle: DatabaseSync): void {
  const dateCol = (handle.prepare("PRAGMA table_info(assignments)").all() as { name: string; notnull: number }[]).find(
    (col) => col.name === "date",
  );
  if (!dateCol || dateCol.notnull === 0) return;

  handle.exec(`
    BEGIN;
    CREATE TABLE assignments_new (
      id          TEXT PRIMARY KEY,
      client_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      workout_id  TEXT REFERENCES workouts(id) ON DELETE SET NULL,
      date        TEXT,
      status      TEXT NOT NULL DEFAULT 'scheduled'
                  CHECK (status IN ('scheduled', 'done', 'skipped')),
      snapshot    TEXT NOT NULL,
      note        TEXT NOT NULL DEFAULT '',
      started_at  INTEGER,
      done_at     INTEGER,
      effort      INTEGER CHECK (effort IS NULL OR effort BETWEEN 1 AND 10),
      extra_rest_seconds INTEGER NOT NULL DEFAULT 0,
      created_at  INTEGER NOT NULL
    );
    INSERT INTO assignments_new
      SELECT id, client_id, workout_id, date, status, snapshot, note, started_at, done_at, NULL, 0, created_at
      FROM assignments;
    DROP TABLE assignments;
    ALTER TABLE assignments_new RENAME TO assignments;
    COMMIT;
  `);
  // The index above lived on the dropped table; recreate it (and anything else idempotent).
  handle.exec(SCHEMA);
}

/**
 * Two things the session player records that the original table had no room
 * for: the effort score (1-10) it asks for on the way out, and how much rest
 * the client added to the coach's prescribed rests — a number Sara reads as a
 * signal about whether the session was pitched right.
 *
 * `CREATE TABLE IF NOT EXISTS` above no-ops on a database that predates either
 * column, so they go in by hand. SQLite takes `ADD COLUMN` in place, unlike the
 * `date` rebuild above.
 */
function migrateAssignmentsColumns(handle: DatabaseSync): void {
  const columns = (handle.prepare("PRAGMA table_info(assignments)").all() as { name: string }[]).map(
    (col) => col.name,
  );
  if (!columns.includes("effort")) {
    handle.exec(
      "ALTER TABLE assignments ADD COLUMN effort INTEGER CHECK (effort IS NULL OR effort BETWEEN 1 AND 10)",
    );
  }
  if (!columns.includes("extra_rest_seconds")) {
    handle.exec("ALTER TABLE assignments ADD COLUMN extra_rest_seconds INTEGER NOT NULL DEFAULT 0");
  }
}

/**
 * The workout card shows when a workout was last touched — not just created —
 * so `CREATE TABLE IF NOT EXISTS` above no-ops on a database that predates the
 * column, same shape as `migrateAssignmentsEffort`. Existing rows backfill from
 * `created_at`, the closest honest answer for a workout nobody has edited yet.
 */
function migrateWorkoutsUpdatedAt(handle: DatabaseSync): void {
  const columns = handle.prepare("PRAGMA table_info(workouts)").all() as { name: string }[];
  if (!columns.some((col) => col.name === "updated_at")) {
    handle.exec("ALTER TABLE workouts ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0");
  }
  handle.exec("UPDATE workouts SET updated_at = created_at WHERE updated_at = 0");
}

/**
 * Cues in two languages. The library carried over from Trainerize arrives in
 * English while Sara writes Portuguese, so `cues` stopped being the whole
 * story — see `Exercise.cuesEn`. Existing rows keep their Portuguese and start
 * with no English, which is exactly true of everything she wrote herself.
 */
function migrateExercisesCuesEn(handle: DatabaseSync): void {
  const columns = handle.prepare("PRAGMA table_info(exercises)").all() as { name: string }[];
  if (columns.some((column) => column.name === "cues_en")) return;
  handle.exec("ALTER TABLE exercises ADD COLUMN cues_en TEXT NOT NULL DEFAULT ''");
}

/**
 * Training phases. A workout used to be a library template and nothing else;
 * it can now also be a client-scoped copy inside one phase, which needs the
 * ownership columns below. `CREATE TABLE IF NOT EXISTS` no-ops on a database
 * that predates them, so they go in by hand — and so does the index over
 * them, which `SCHEMA` cannot carry: it runs before this function, when the
 * column it indexes may not exist yet.
 *
 * `coach_id` backfills to the one coach the database was built around — exact
 * while there is a single coach, and the column the plan is scoped by once
 * there are several.
 */
function migrateWorkoutsPhaseColumns(handle: DatabaseSync): void {
  const columns = (handle.prepare("PRAGMA table_info(workouts)").all() as { name: string }[]).map(
    (column) => column.name,
  );
  const add = (name: string, ddl: string) => {
    if (!columns.includes(name)) handle.exec(`ALTER TABLE workouts ADD COLUMN ${ddl}`);
  };
  add("instructions", "instructions TEXT NOT NULL DEFAULT ''");
  add("workout_type", "workout_type TEXT NOT NULL DEFAULT 'regular'");
  add("coach_id", "coach_id TEXT REFERENCES users(id) ON DELETE CASCADE");
  add("client_id", "client_id TEXT REFERENCES users(id) ON DELETE CASCADE");
  add("phase_id", "phase_id TEXT REFERENCES training_phases(id) ON DELETE CASCADE");
  add("source_workout_id", "source_workout_id TEXT");
  add("position", "position INTEGER NOT NULL DEFAULT 0");

  handle.exec(`
    UPDATE workouts
       SET coach_id = (SELECT id FROM users WHERE role = 'coach' ORDER BY created_at LIMIT 1)
     WHERE coach_id IS NULL;
    CREATE INDEX IF NOT EXISTS idx_workouts_phase ON workouts (phase_id, position);
  `);
}

function open(): DatabaseSync {
  mkdirSync(DATA_DIR, { recursive: true });
  const db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(SCHEMA);
  migrateAssignmentsNullableDate(db);
  migrateAssignmentsColumns(db);
  migrateWorkoutsUpdatedAt(db);
  migrateExercisesCuesEn(db);
  migrateWorkoutsPhaseColumns(db);
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

/**
 * Run `fn` inside a transaction, rolling back on throw.
 *
 * Re-entrant: a repository function that already wraps its writes stays usable
 * inside a larger one. SQLite refuses a nested `BEGIN`, so anything below the
 * outermost call uses a savepoint instead and only its own writes unwind.
 */
let txDepth = 0;

export function tx<T>(fn: () => T): T {
  const handle = db();
  const savepoint = txDepth > 0 ? `tx_${txDepth}` : null;
  handle.exec(savepoint ? `SAVEPOINT ${savepoint}` : "BEGIN");
  txDepth += 1;
  try {
    const result = fn();
    handle.exec(savepoint ? `RELEASE ${savepoint}` : "COMMIT");
    return result;
  } catch (err) {
    handle.exec(savepoint ? `ROLLBACK TO ${savepoint}; RELEASE ${savepoint}` : "ROLLBACK");
    throw err;
  } finally {
    txDepth -= 1;
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
