import { progressPhotoUrl } from "@/lib/studio/photos";

/**
 * Progress photos, streamed behind the app's own session.
 *
 * Convex's `storage.getUrl` hands out a capability: whoever holds the link can
 * read the file, signed in or not, until it is deleted. For a workout video
 * that is a feature; for a client's body photos it is a leak waiting for a
 * copy-pasted URL, so the link never reaches the browser. This route asks
 * Convex for it — the query re-checks that the caller is that client or her
 * coach — fetches the bytes and passes them on.
 *
 * `no-store` rather than a private cache window: these are body photos, and a
 * shared laptop should not still be able to produce them from disk after the
 * client signs out. It costs one small fetch per view — a thumbnail is ~12 KB
 * — which is the right trade at this size.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ photoId: string }> },
): Promise<Response> {
  const { photoId } = await params;
  const variant =
    new URL(request.url).searchParams.get("v") === "full" ? ("full" as const) : ("thumb" as const);

  let url: string | null = null;
  try {
    url = await progressPhotoUrl(photoId, variant);
  } catch {
    // The gate throws for a caller who may not see this client; a 404 says the
    // same thing as a 403 without confirming the photo exists.
    return new Response(null, { status: 404 });
  }
  if (!url) return new Response(null, { status: 404 });

  const upstream = await fetch(url);
  if (!upstream.ok || !upstream.body) return new Response(null, { status: 502 });

  return new Response(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "image/webp",
      "Content-Length": upstream.headers.get("content-length") ?? "",
      "Cache-Control": "private, no-store",
    },
  });
}
