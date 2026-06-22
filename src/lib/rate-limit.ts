/**
 * In-memory sliding-window rate limiter, keyed by IP. Zero dependencies, zero
 * setup — it just caps bursts from a single source.
 *
 * Honest limitations (accepted trade-off for a portfolio site): the window
 * lives in the function instance's memory, so it resets on cold start and is
 * NOT shared across instances/regions. It blunts floods; it is not a hard
 * guarantee. Swapping in Upstash Redis later is a drop-in replacement for this
 * one function — the call site in the contact action stays the same.
 */

type Options = { limit: number; windowMs: number };

const hits = new Map<string, number[]>();

// Bound memory: drop keys whose newest hit is older than this on each sweep.
const PRUNE_AFTER_MS = 60 * 60 * 1_000;

function prune(now: number) {
  for (const [key, times] of hits) {
    const last = times[times.length - 1];
    if (last === undefined || now - last > PRUNE_AFTER_MS) hits.delete(key);
  }
}

/**
 * Record a hit for `key` and report whether it is still within budget.
 * Returns `true` when allowed, `false` once the limit is exceeded.
 */
export function rateLimit(
  key: string,
  { limit, windowMs }: Options,
  now: number = Date.now(),
): boolean {
  if (hits.size > 5_000) prune(now);

  const cutoff = now - windowMs;
  const recent = (hits.get(key) ?? []).filter((t) => t > cutoff);
  recent.push(now);
  hits.set(key, recent);

  return recent.length <= limit;
}
