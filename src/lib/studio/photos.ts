import "server-only";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { sq } from "@/lib/studio/convexServer";
import type { PhotoAngle, ProgressPhoto, ProgressPhotoWeek } from "./types";

/**
 * Progress photos, server side.
 *
 * The mutations are not here: the browser talks to `convex/photos.ts` directly
 * for those, because it is the browser that holds the compressed bytes and a
 * round trip through the Next server would double the upload for nothing.
 */

/** Angles in the order they are always shown — the same order a coach shoots them. */
export const PHOTO_ANGLES: readonly PhotoAngle[] = ["front", "back", "side"] as const;

/**
 * One client's photos grouped by check-in week, newest first.
 *
 * Grouping here rather than in Convex keeps the query a flat index read; the
 * rows come back newest-first and a week holds at most three of them, so this
 * is a fold over a short list, not a sort.
 */
export async function progressPhotoWeeks(
  clientId: string,
  limit?: number,
): Promise<ProgressPhotoWeek[]> {
  const photos: ProgressPhoto[] = await sq(api.photos.listPhotos, {
    clientId: clientId as Id<"users">,
    limit,
  });

  const weeks: ProgressPhotoWeek[] = [];
  const byWeek = new Map<string, ProgressPhotoWeek>();
  for (const photo of photos) {
    let week = byWeek.get(photo.weekOf);
    if (!week) {
      week = { weekOf: photo.weekOf, photos: [] };
      byWeek.set(photo.weekOf, week);
      weeks.push(week);
    }
    week.photos.push(photo);
  }
  for (const week of weeks) {
    week.photos.sort((a, b) => PHOTO_ANGLES.indexOf(a.angle) - PHOTO_ANGLES.indexOf(b.angle));
  }
  return weeks.sort((a, b) => b.weekOf.localeCompare(a.weekOf));
}

/** The storage URL behind one photo, or null when it is gone or not the caller's. */
export async function progressPhotoUrl(
  photoId: string,
  variant: "full" | "thumb",
): Promise<string | null> {
  return sq(api.photos.photoUrl, {
    photoId: photoId as Id<"progressPhotos">,
    variant,
  });
}
