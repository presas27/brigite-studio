import { randomUUID } from "node:crypto";

/**
 * Id source for every row the studio writes.
 *
 * Normally a random UUID. Inside `withStableIds` ids become a deterministic
 * sequence instead, which is what makes the seeded data usable on a host where
 * the database is ephemeral: every instance rebuilds the same rows with the same
 * ids, so a link one instance printed (`/app/coach/alunos/<id>`) still resolves
 * on the instance that serves the click. Rows created by a real user keep random
 * ids — the sequence only ever wraps the seed.
 *
 * Seeding is fully synchronous, so a request cannot interleave and pick up a
 * sequential id by accident.
 */
let sequence: number | undefined;

export function newId(): string {
  if (sequence === undefined) return randomUUID();
  sequence += 1;
  return `seed-${sequence.toString().padStart(4, "0")}`;
}

/** Run `fn` with deterministic ids. Restores the previous mode on the way out. */
export function withStableIds<T>(fn: () => T): T {
  const outer = sequence;
  sequence = outer ?? 0;
  try {
    return fn();
  } finally {
    sequence = outer;
  }
}
