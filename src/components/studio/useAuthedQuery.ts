"use client";

import { useConvexAuth, useQuery } from "convex/react";
import type { FunctionReference } from "convex/server";

/**
 * Like `useQuery`, but idle until the Convex socket has a session.
 *
 * The chrome already painted from the server token. Subscribing on the first
 * client frame — before Better Auth has handed the same token to the socket —
 * throws `Not signed in` and blows the overlay. Reload works because the
 * token is then already in the client. Skip until `isAuthenticated`.
 */
export function useAuthedQuery<Query extends FunctionReference<"query">>(
  query: Query,
  args: Parameters<typeof useQuery<Query>>[1],
) {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(query, isAuthenticated ? args : ("skip" as typeof args));
}
