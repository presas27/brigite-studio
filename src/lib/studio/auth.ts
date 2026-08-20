import { createHmac, randomBytes, createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { get, run } from "./db";
import { activateUser, findClient, findUser } from "./users";
import type { Client, User } from "./types";

/**
 * Authentication for `/app`. Passwordless by design: the only way in is a
 * one-time link mailed to an address Sara has already added. There is no
 * self-registration and no password to leak.
 *
 * Two secrets-free pieces:
 *  - the sign-in link carries a random token whose SHA-256 hash is what we
 *    store, so a database read cannot mint a login;
 *  - the session is a stateless HMAC cookie, so there is no session table to
 *    grow or clean up.
 */

const SESSION_COOKIE = "studio_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1_000; // 30 days
const LINK_TTL_MS = 20 * 60 * 1_000; // 20 minutes

function secret(): string {
  return (
    process.env.STUDIO_SECRET ??
    process.env.CONTACT_FORM_SECRET ??
    process.env.RESEND_API_KEY ??
    "brigite-studio-dev-fallback-secret"
  );
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

/* ------------------------------------------------------------ sign-in links */

/**
 * Mint a one-time sign-in token for a user. Returns the raw token to put in
 * the emailed URL; only its hash is persisted.
 */
export function createSignInToken(userId: string): string {
  const token = randomBytes(32).toString("base64url");
  const hash = createHash("sha256").update(token).digest("hex");
  run(
    "INSERT INTO magic_tokens (token_hash, user_id, expires_at) VALUES (?, ?, ?)",
    hash,
    userId,
    Date.now() + LINK_TTL_MS,
  );
  return token;
}

/**
 * Burn a sign-in token and return the user it belonged to. Expired, unknown or
 * already-used tokens all return `undefined` — the caller must not distinguish
 * between them in what it shows the visitor.
 */
export function consumeSignInToken(token: string): User | undefined {
  const hash = createHash("sha256").update(token).digest("hex");
  const row = get<{ user_id: string; expires_at: number; used_at: number | null }>(
    "SELECT user_id, expires_at, used_at FROM magic_tokens WHERE token_hash = ?",
    hash,
  );
  if (!row || row.used_at != null || Number(row.expires_at) < Date.now()) return undefined;

  run("UPDATE magic_tokens SET used_at = ? WHERE token_hash = ?", Date.now(), hash);
  run("DELETE FROM magic_tokens WHERE expires_at < ?", Date.now());

  const user = findUser(String(row.user_id));
  if (!user || user.status === "archived") return undefined;
  activateUser(user.id);
  return user;
}

/* ----------------------------------------------------------------- sessions */

export async function startSession(userId: string): Promise<void> {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const payload = `${userId}.${expiresAt}`;
  (await cookies()).set(SESSION_COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/app",
    maxAge: Math.floor(SESSION_TTL_MS / 1_000),
  });
}

export async function endSession(): Promise<void> {
  (await cookies()).delete({ name: SESSION_COOKIE, path: "/app" });
}

/** The signed-in user, or `undefined`. Safe to call from any server context. */
export async function currentUser(): Promise<User | undefined> {
  const raw = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!raw) return undefined;

  const parts = raw.split(".");
  if (parts.length !== 3) return undefined;
  const [userId, expiresAt, provided] = parts;

  const expected = sign(`${userId}.${expiresAt}`);
  const a = Buffer.from(provided, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return undefined;
  if (!/^\d+$/.test(expiresAt) || Number(expiresAt) < Date.now()) return undefined;

  const user = findUser(userId);
  return user && user.status !== "archived" ? user : undefined;
}

/** Gate for coach-only routes and actions. Redirects when not the coach. */
export async function requireCoach(): Promise<User> {
  const user = await currentUser();
  if (!user) redirect("/app/entrar");
  if (user.role !== "coach") redirect("/app/aluno");
  return user;
}

/** Gate for client-only routes and actions. */
export async function requireClient(): Promise<Client> {
  const user = await currentUser();
  if (!user) redirect("/app/entrar");
  if (user.role !== "client") redirect("/app/coach");
  const client = findClient(user.id);
  if (!client) redirect("/app/entrar");
  return client;
}

/**
 * Gate for anything scoped to one client that either side may open: the coach
 * for any of her clients, a client only for themselves.
 */
export async function requireClientAccess(clientId: string): Promise<{
  viewer: User;
  client: Client;
}> {
  const viewer = await currentUser();
  if (!viewer) redirect("/app/entrar");
  if (viewer.role === "client" && viewer.id !== clientId) redirect("/app/aluno");
  const client = findClient(clientId);
  if (!client) redirect(viewer.role === "coach" ? "/app/coach/alunos" : "/app/aluno");
  return { viewer, client };
}
