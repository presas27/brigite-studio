import { redirect } from "next/navigation";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { sq } from "./convexServer";
import type { Client, User } from "./types";

/**
 * Who is signed in, and where to send them when they should not be here.
 *
 * Sign-in itself is Convex Auth's: an emailed link, and nothing else. The token
 * lives in a cookie the proxy (`src/proxy.ts`) refreshes, and every Convex
 * function reads the identity out of it — which is the whole point of the move.
 * Nothing in this file is a security boundary; `convex/model/authz.ts` is. What
 * these functions decide is which screen a visitor lands on.
 *
 * There is no `startSession`/`endSession` any more: minting and dropping the
 * session is `signIn`/`signOut` in `src/app/app/actions.ts`, over the auth
 * proxy route.
 */

/** The signed-in user, or `undefined`. Safe to call from any server context. */
export async function currentUser(): Promise<User | undefined> {
  return (await sq(api.users.me)) ?? undefined;
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
  const client = await sq(api.users.meAsClient);
  if (!client) {
    const user = await currentUser();
    if (!user) redirect("/app/entrar");
    redirect(user.role === "coach" ? "/app/coach" : "/app/entrar");
  }
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

  const client = await sq(api.users.findClient, { clientId: clientId as Id<"users"> });
  if (!client) redirect(viewer.role === "coach" ? "/app/coach/alunos" : "/app/aluno");
  return { viewer, client };
}
