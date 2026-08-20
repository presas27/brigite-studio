import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { readFile, writeFile, unlink } from "node:fs/promises";
import { extname, join } from "node:path";
import { all, get, run, type Row } from "./db";
import type { Media } from "./types";

/**
 * Media store for exercise demos and client technique clips.
 *
 * Files land on local disk under `.data/uploads`, never in `public/` — a
 * progress video is health-adjacent personal data and must only ever be
 * readable through the authenticated route at `/app/media/[id]`.
 *
 * Same trade-off as `db.ts`: correct shape, local durability. Swapping to
 * Vercel Blob / S3 means replacing `store` and `load` and nothing else.
 */

const UPLOAD_DIR = join(process.cwd(), ".data", "uploads");

/** 60 s of phone video comfortably fits; anything larger is a mistake. */
export const MAX_UPLOAD_BYTES = 80 * 1024 * 1024;

export const ALLOWED_MIME: Record<string, string> = {
  "video/mp4": ".mp4",
  "video/quicktime": ".mov",
  "video/webm": ".webm",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

function mapMedia(row: Row): Media {
  return {
    id: String(row.id),
    ownerId: String(row.owner_id),
    filename: String(row.filename),
    mime: String(row.mime),
    bytes: Number(row.bytes),
    createdAt: Number(row.created_at),
  };
}

/** Persist an uploaded file and register it. Returns the media id. */
export async function store(input: {
  ownerId: string;
  file: File;
}): Promise<{ ok: true; mediaId: string } | { ok: false; reason: "type" | "size" | "empty" }> {
  const { file, ownerId } = input;
  if (!file || file.size === 0) return { ok: false, reason: "empty" };
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, reason: "size" };

  const suffix = ALLOWED_MIME[file.type];
  if (!suffix) return { ok: false, reason: "type" };

  const mediaId = randomUUID();
  mkdirSync(UPLOAD_DIR, { recursive: true });
  await writeFile(join(UPLOAD_DIR, `${mediaId}${suffix}`), Buffer.from(await file.arrayBuffer()));

  run(
    "INSERT INTO media (id, owner_id, filename, mime, bytes, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    mediaId,
    ownerId,
    file.name.slice(0, 200) || `clip${suffix}`,
    file.type,
    file.size,
    Date.now(),
  );
  return { ok: true, mediaId };
}

export function findMedia(mediaId: string): Media | undefined {
  const row = get<Row>(
    "SELECT id, owner_id, filename, mime, bytes, created_at FROM media WHERE id = ?",
    mediaId,
  );
  return row && mapMedia(row);
}

/** Read the bytes back for the authenticated media route. */
export async function load(media: Media): Promise<Buffer | undefined> {
  const suffix = ALLOWED_MIME[media.mime] ?? extname(media.filename) ?? "";
  try {
    return await readFile(join(UPLOAD_DIR, `${media.id}${suffix}`));
  } catch {
    return undefined;
  }
}

export async function removeMedia(mediaId: string): Promise<void> {
  const media = findMedia(mediaId);
  if (!media) return;
  const suffix = ALLOWED_MIME[media.mime] ?? "";
  run("DELETE FROM media WHERE id = ?", mediaId);
  try {
    await unlink(join(UPLOAD_DIR, `${mediaId}${suffix}`));
  } catch {
    /* already gone — the row is what mattered */
  }
}

/** Everything a client uploaded, newest first. Used by the retention sweep. */
export function mediaByOwner(ownerId: string): Media[] {
  const rows = all<Row>(
    `SELECT id, owner_id, filename, mime, bytes, created_at FROM media
      WHERE owner_id = ? ORDER BY created_at DESC`,
    ownerId,
  );
  return rows.map(mapMedia);
}
