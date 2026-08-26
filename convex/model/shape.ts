import type { Doc } from "../_generated/dataModel";
import type { Client, ClientProfile, User } from "../../src/lib/studio/types";

/**
 * Documents in, domain objects out.
 *
 * The pages and components of the studio were written against the types in
 * `src/lib/studio/types.ts` and they are not the ones that should move because
 * the database did. So every Convex function returns those shapes, and the
 * translation happens here: `_id` becomes `id`, `_creationTime` becomes
 * `createdAt`, and the fields Convex Auth owns on `users` (which are optional
 * because the library creates the row) are resolved to the non-optional domain
 * ones.
 */

export function mapUser(doc: Doc<"users">): User {
  return {
    id: doc._id,
    email: doc.email ?? "",
    name: doc.name,
    role: doc.role,
    locale: doc.locale,
    status: doc.status,
    createdAt: doc._creationTime,
  };
}

export function mapProfile(doc: Doc<"clientProfiles">): ClientProfile {
  return {
    plan: doc.plan,
    goals: doc.goals,
    injuries: doc.injuries,
    notes: doc.notes,
    tags: doc.tags,
    sessionsLeft: doc.sessionsLeft,
    startedAt: doc.startedAt,
  };
}

export function mapClient(user: Doc<"users">, profile: Doc<"clientProfiles">): Client {
  return { ...mapUser(user), profile: mapProfile(profile) };
}
