import { hasLocale, type Locale } from "@/i18n/config";
import { all, get, run, type Row } from "./db";
import { newId } from "./id";
import type { Client, ClientProfile, PlanId, User, UserStatus } from "./types";

/**
 * Users and client profiles. There is exactly one coach (Sara); everyone else
 * is a client. Access control lives in `auth.ts` — these functions assume the
 * caller has already been authorised.
 */

const USER_COLUMNS = "id, email, name, role, locale, status, created_at";

function mapUser(row: Row): User {
  const locale = String(row.locale);
  return {
    id: String(row.id),
    email: String(row.email),
    name: String(row.name),
    role: row.role === "coach" ? "coach" : "client",
    locale: hasLocale(locale) ? locale : "pt",
    status: String(row.status) as UserStatus,
    createdAt: Number(row.created_at),
  };
}

function mapProfile(row: Row): ClientProfile {
  let tags: string[] = [];
  try {
    const parsed: unknown = JSON.parse(String(row.tags ?? "[]"));
    if (Array.isArray(parsed)) tags = parsed.map(String);
  } catch {
    tags = [];
  }
  return {
    plan: String(row.plan) as PlanId,
    goals: String(row.goals ?? ""),
    injuries: String(row.injuries ?? ""),
    notes: String(row.notes ?? ""),
    tags,
    sessionsLeft: Number(row.sessions_left ?? 0),
    startedAt: row.started_at == null ? null : Number(row.started_at),
  };
}

export function findUserByEmail(email: string): User | undefined {
  const row = get<Row>(
    `SELECT ${USER_COLUMNS} FROM users WHERE lower(email) = lower(?)`,
    email.trim(),
  );
  return row && mapUser(row);
}

export function findUser(userId: string): User | undefined {
  const row = get<Row>(`SELECT ${USER_COLUMNS} FROM users WHERE id = ?`, userId);
  return row && mapUser(row);
}

/** The single coach account. Created by the seed on first boot. */
export function coach(): User | undefined {
  const row = get<Row>(
    `SELECT ${USER_COLUMNS} FROM users WHERE role = 'coach' ORDER BY created_at LIMIT 1`,
  );
  return row && mapUser(row);
}

export function createUser(input: {
  email: string;
  name: string;
  role: "coach" | "client";
  locale?: Locale;
  status?: UserStatus;
}): User {
  const user: User = {
    id: newId(),
    email: input.email.trim(),
    name: input.name.trim(),
    role: input.role,
    locale: input.locale ?? "pt",
    status: input.status ?? "invited",
    createdAt: Date.now(),
  };
  run(
    `INSERT INTO users (id, email, name, role, locale, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    user.id,
    user.email,
    user.name,
    user.role,
    user.locale,
    user.status,
    user.createdAt,
  );
  return user;
}

/** Flip an invited account to active — called on first successful sign-in. */
export function activateUser(userId: string): void {
  run("UPDATE users SET status = 'active' WHERE id = ? AND status = 'invited'", userId);
}

/** Rename any user. Both roles edit their own name from the account page. */
export function setUserName(userId: string, name: string): void {
  run("UPDATE users SET name = ? WHERE id = ?", name.trim(), userId);
}

export function setUserLocalePreference(userId: string, locale: Locale): void {
  run("UPDATE users SET locale = ? WHERE id = ?", locale, userId);
}

/** Create a client plus its profile row. Throws if the email already exists. */
export function createClient(input: {
  email: string;
  name: string;
  plan: PlanId;
  goals?: string;
  injuries?: string;
  locale?: Locale;
}): Client {
  const user = createUser({
    email: input.email,
    name: input.name,
    role: "client",
    locale: input.locale,
  });
  run(
    `INSERT INTO client_profiles (user_id, plan, goals, injuries, notes, tags, sessions_left, started_at)
     VALUES (?, ?, ?, ?, '', '[]', 0, ?)`,
    user.id,
    input.plan,
    input.goals ?? "",
    input.injuries ?? "",
    Date.now(),
  );
  return {
    ...user,
    profile: {
      plan: input.plan,
      goals: input.goals ?? "",
      injuries: input.injuries ?? "",
      notes: "",
      tags: [],
      sessionsLeft: 0,
      startedAt: Date.now(),
    },
  };
}

export function findClient(clientId: string): Client | undefined {
  const row = get<Row>(
    `SELECT u.id, u.email, u.name, u.role, u.locale, u.status, u.created_at,
            p.plan, p.goals, p.injuries, p.notes, p.tags, p.sessions_left, p.started_at
       FROM users u
       JOIN client_profiles p ON p.user_id = u.id
      WHERE u.id = ? AND u.role = 'client'`,
    clientId,
  );
  if (!row) return undefined;
  return { ...mapUser(row), profile: mapProfile(row) };
}

/** Active and invited clients, alphabetical. Archived are excluded. */
export function listClients(includeArchived = false): Client[] {
  const rows = all<Row>(
    `SELECT u.id, u.email, u.name, u.role, u.locale, u.status, u.created_at,
            p.plan, p.goals, p.injuries, p.notes, p.tags, p.sessions_left, p.started_at
       FROM users u
       JOIN client_profiles p ON p.user_id = u.id
      WHERE u.role = 'client' ${includeArchived ? "" : "AND u.status != 'archived'"}
      ORDER BY u.name COLLATE NOCASE`,
  );
  return rows.map((row) => ({ ...mapUser(row), profile: mapProfile(row) }));
}

export function updateClient(
  clientId: string,
  patch: {
    name?: string;
    plan?: PlanId;
    goals?: string;
    injuries?: string;
    notes?: string;
    tags?: string[];
    sessionsLeft?: number;
  },
): void {
  if (patch.name !== undefined) {
    run("UPDATE users SET name = ? WHERE id = ?", patch.name.trim(), clientId);
  }
  const fields: string[] = [];
  const values: (string | number)[] = [];
  if (patch.plan !== undefined) {
    fields.push("plan = ?");
    values.push(patch.plan);
  }
  if (patch.goals !== undefined) {
    fields.push("goals = ?");
    values.push(patch.goals);
  }
  if (patch.injuries !== undefined) {
    fields.push("injuries = ?");
    values.push(patch.injuries);
  }
  if (patch.notes !== undefined) {
    fields.push("notes = ?");
    values.push(patch.notes);
  }
  if (patch.tags !== undefined) {
    fields.push("tags = ?");
    values.push(JSON.stringify(patch.tags));
  }
  if (patch.sessionsLeft !== undefined) {
    fields.push("sessions_left = ?");
    values.push(Math.max(0, Math.trunc(patch.sessionsLeft)));
  }
  if (fields.length === 0) return;
  run(`UPDATE client_profiles SET ${fields.join(", ")} WHERE user_id = ?`, ...values, clientId);
}

export function setClientStatus(clientId: string, status: UserStatus): void {
  run("UPDATE users SET status = ? WHERE id = ? AND role = 'client'", status, clientId);
}

/** Burn one in-person session credit. Returns the remaining balance. */
export function consumeSession(clientId: string): number {
  run(
    `UPDATE client_profiles SET sessions_left = max(0, sessions_left - 1)
      WHERE user_id = ?`,
    clientId,
  );
  const row = get<Row>("SELECT sessions_left FROM client_profiles WHERE user_id = ?", clientId);
  return Number(row?.sessions_left ?? 0);
}
