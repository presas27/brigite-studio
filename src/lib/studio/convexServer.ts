import "server-only";

import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import type {
  FunctionArgs,
  FunctionReference,
  FunctionReturnType,
  OptionalRestArgs,
} from "convex/server";

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

/** Read. Returns whatever the query returns, already validated by Convex. */
export async function sq<Query extends FunctionReference<"query">>(
  query: Query,
  ...args: OptionalRestArgs<Query>
): Promise<FunctionReturnType<Query>> {
  return fetchQuery(query, args[0] ?? ({} as FunctionArgs<Query>), {
    token: await convexAuthNextjsToken(),
  });
}

/** Write. */
export async function sm<Mutation extends FunctionReference<"mutation">>(
  mutation: Mutation,
  ...args: OptionalRestArgs<Mutation>
): Promise<FunctionReturnType<Mutation>> {
  return fetchMutation(mutation, args[0] ?? ({} as FunctionArgs<Mutation>), {
    token: await convexAuthNextjsToken(),
  });
}
