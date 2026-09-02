import "server-only";

import type { FunctionArgs, FunctionReference, FunctionReturnType, OptionalRestArgs } from "convex/server";
import { fetchAuthAction, fetchAuthMutation, fetchAuthQuery } from "./auth-server";

/**
 * How the studio's server code talks to its database.
 *
 * Every read and write from a Server Component, Server Action or Route Handler
 * goes through here so that exactly one thing happens in exactly one place: the
 * caller's session token is attached to the call. Convex then resolves
 * `ctx.auth` on the other side and the function authorizes itself — see
 * `convex/model/authz.ts`.
 *
 * Forget the token and a function does not fail open, it fails closed (the
 * viewer is `null`, the gate throws), which is the right way round.
 */

type Args<F extends FunctionReference<"query" | "mutation" | "action">> = FunctionArgs<F> extends
  Record<string, never>
  ? [args?: Record<string, never>]
  : [args: FunctionArgs<F>];

/** Read. Returns whatever the query returns, already validated by Convex. */
export async function sq<Query extends FunctionReference<"query">>(
  query: Query,
  ...args: OptionalRestArgs<Query>
): Promise<FunctionReturnType<Query>> {
  return fetchAuthQuery(query, ...((args.length ? args : [{}]) as Args<Query>));
}

/** Write. */
export async function sm<Mutation extends FunctionReference<"mutation">>(
  mutation: Mutation,
  ...args: OptionalRestArgs<Mutation>
): Promise<FunctionReturnType<Mutation>> {
  return fetchAuthMutation(mutation, ...((args.length ? args : [{}]) as Args<Mutation>));
}

/**
 * Run an action. Separate from `sm` because an action is not a mutation: it runs
 * outside the transaction, may call the outside world, and is therefore neither
 * atomic nor retried for you. Everything the studio uses this for talks to a
 * third-party API — see `convex/youtube.ts`.
 */
export async function sa<Action extends FunctionReference<"action">>(
  action: Action,
  ...args: OptionalRestArgs<Action>
): Promise<FunctionReturnType<Action>> {
  return fetchAuthAction(action, ...((args.length ? args : [{}]) as Args<Action>));
}
