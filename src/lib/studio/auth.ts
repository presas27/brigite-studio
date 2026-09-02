import { redirect } from "next/navigation";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { sq } from "./convexServer";
import type { Client, User } from "./types";

/**
 * Who is signed in, and where to send them when they should not be here.
 *
 * Sign-in itself is Better Auth's. The session lives in a cookie, every Convex
 * function reads the identity out of the token minted from it — which is the
 * whole point — and nothing in this file is a security boundary;
 * `convex/model/authz.ts` is. What these functions decide is which screen a
 * visitor lands on.
 *
 * A session can exist a moment before its studio account does: Better Auth
 * creates the login, `users.completeSignup` writes the account. `/app/comecar`
 * is where a session in that gap is sent to finish, and every gate here knows
 * to send it there rather than back to the sign-in page it just left.
 */

export type Session =
  | { state: "anonymous" }
  | { state: "new"; email: string; name: string }
  | { state: "ready"; user: User };

export async function session(): Promise<Session> {
  return sq(api.users.me);
}

/** The signed-in user, or `undefined`. Safe to call from any server context. */
export async function currentUser(): Promise<User | undefined> {
  const current = await session();
  return current.state === "ready" ? current.user : undefined;
}

/** Where a session with no account yet goes, and where anonymous visitors go. */
function bounce(current: Session): never {
  redirect(current.state === "new" ? "/app/comecar" : "/app/entrar");
}

/** Gate for coach-only routes and actions. Redirects when not a coach. */
export async function requireCoach(): Promise<User> {
  const current = await session();
  if (current.state !== "ready") bounce(current);
  if (current.user.role !== "coach") redirect("/app/aluno");
  return current.user;
}

/** Gate for client-only routes and actions. */
export async function requireClient(): Promise<Client> {
  const current = await session();
  if (current.state !== "ready") bounce(current);
  if (current.user.role === "coach") redirect("/app/coach");
  const client = await sq(api.users.meAsClient);
  if (!client) redirect("/app/entrar");
  return client;
}

/**
 * Gate for the workout builder: a coach, or a client training alone — who
 * writes their own sessions. A coached client is sent to their plan instead.
 * Mirrors `requireBuilder` in `convex/model/authz.ts`.
 */
export async function requireBuilder(): Promise<User> {
  const current = await session();
  if (current.state !== "ready") bounce(current);
  if (current.user.role === "coach") return current.user;
  const client = await sq(api.users.meAsClient);
  if (!client || client.profile.coachId !== null) redirect("/app/aluno");
  return current.user;
}

/**
 * Gate for anything scoped to one client that either side may open: the
 * client's own coach, or the client themselves.
 */
export async function requireClientAccess(clientId: string): Promise<{
  viewer: User;
  client: Client;
}> {
  const current = await session();
  if (current.state !== "ready") bounce(current);
  const viewer = current.user;
  if (viewer.role === "client" && viewer.id !== clientId) redirect("/app/aluno");

  // A refusal from the deployment ("Not your data") is a redirect here, not an
  // error page: the id came from a URL somebody may simply have mistyped.
  const client = await sq(api.users.findClient, { clientId: clientId as Id<"users"> }).catch(
    () => null,
  );
  if (!client) redirect(viewer.role === "coach" ? "/app/coach/alunos" : "/app/aluno");
  return { viewer, client };
}
