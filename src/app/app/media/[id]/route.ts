import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/lib/studio/auth";
import { isExerciseDemo } from "@/lib/studio/library";
import { findMedia, load } from "@/lib/studio/media";

/**
 * Authenticated media delivery.
 *
 * Client videos are health-adjacent personal data, so they never live in
 * `public/`. Every byte goes through this handler: the coach may read anything,
 * a client only their own uploads. `no-store` keeps clips out of shared caches.
 *
 * Range requests are not optional here. Without `Accept-Ranges` and 206
 * responses a browser cannot seek a video at all — assigning `currentTime`
 * silently does nothing — which breaks the frame-by-frame review the whole
 * video-feedback feature is built on.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const viewer = await currentUser();
  if (!viewer) return new NextResponse(null, { status: 401 });

  const { id } = await params;
  const media = findMedia(id);
  if (!media) return new NextResponse(null, { status: 404 });

  // Clients see only what they uploaded, plus the coach's exercise demos —
  // which are coach-owned but exist precisely to be watched by clients.
  if (
    viewer.role === "client" &&
    media.ownerId !== viewer.id &&
    !isExerciseDemo(media.id)
  ) {
    return new NextResponse(null, { status: 403 });
  }

  const bytes = await load(media);
  if (!bytes) return new NextResponse(null, { status: 404 });

  const total = bytes.byteLength;
  const headers: Record<string, string> = {
    "content-type": media.mime,
    "accept-ranges": "bytes",
    "cache-control": "private, no-store",
    "content-disposition": `inline; filename="${encodeURIComponent(media.filename)}"`,
  };

  const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get("range") ?? "");
  if (!range) {
    return new NextResponse(new Uint8Array(bytes), {
      headers: { ...headers, "content-length": String(total) },
    });
  }

  // An open-ended suffix range (`bytes=-500`) asks for the last N bytes.
  const [, startRaw, endRaw] = range;
  const start = startRaw === "" ? Math.max(0, total - Number(endRaw)) : Number(startRaw);
  const end = startRaw === "" || endRaw === "" ? total - 1 : Math.min(Number(endRaw), total - 1);

  if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= total) {
    return new NextResponse(null, {
      status: 416,
      headers: { ...headers, "content-range": `bytes */${total}` },
    });
  }

  return new NextResponse(new Uint8Array(bytes.subarray(start, end + 1)), {
    status: 206,
    headers: {
      ...headers,
      "content-range": `bytes ${start}-${end}/${total}`,
      "content-length": String(end - start + 1),
    },
  });
}
