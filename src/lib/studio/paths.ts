import { join, resolve } from "node:path";

/**
 * Where the studio keeps its data root (`studio.db` plus `uploads/`).
 *
 * A local checkout writes into `.data/` next to the source, which is what makes
 * a fresh clone runnable with zero provisioning. A serverless host cannot: the
 * bundle at `/var/task` is read-only and only `/tmp` is writable, per-instance
 * and for the lifetime of that instance.
 *
 * So on Vercel the root moves to `/tmp`, which is per-instance: a write lands
 * in the filesystem of the one lambda that served it, and the next request may
 * be routed to another instance whose database was just rebuilt from the seed.
 * Saving therefore appears to work and then unwinds, request by request — not
 * on a cold start hours later. Durable storage arrives with Convex; until then
 * `/app` is a prototype, not a product.
 *
 * `STUDIO_DATA_DIR` overrides both, so a persistent host can point at a volume.
 */
export const DATA_DIR = process.env.STUDIO_DATA_DIR
  ? resolve(process.env.STUDIO_DATA_DIR)
  : process.env.VERCEL
    ? "/tmp/brigite-studio"
    : join(process.cwd(), ".data");

export const DB_PATH = join(DATA_DIR, "studio.db");
export const UPLOAD_DIR = join(DATA_DIR, "uploads");

/**
 * True when writes cannot be trusted to outlive the request that made them.
 *
 * The app says so on screen rather than letting a coach build a week of plans
 * on top of a database that forgets. Set `STUDIO_DATA_DIR` to a real volume and
 * this goes quiet on its own.
 */
export const EPHEMERAL_DATA = !process.env.STUDIO_DATA_DIR && Boolean(process.env.VERCEL);
