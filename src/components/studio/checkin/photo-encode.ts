/**
 * Turning a phone photo into something worth storing.
 *
 * A modern phone shoots 8–12 MP JPEGs at 3–5 MB. Nothing in this app ever
 * shows one at more than a few hundred pixels wide, so uploading the original
 * would be paying — in the client's data plan, in storage, in every later read
 * — for pixels that are thrown away on arrival. Two variants are encoded in the
 * browser instead:
 *
 *   full   long edge 1280, WebP q0.78  — the compare view, ~90–180 KB
 *   thumb  long edge  320, WebP q0.72  — the log list,     ~12–25 KB
 *
 * WebP rather than AVIF because `canvas.toBlob` can encode it everywhere the
 * app runs (Safari 14+), and AVIF encoding is not offered by any browser's
 * canvas — the smaller format would mean shipping an encoder.
 *
 * Re-encoding has a second effect worth as much as the bytes: the EXIF block
 * does not survive it. A photo taken at home carries a GPS tag, and none of
 * this needs to know where the client lives. Orientation is read before it is
 * dropped, via `imageOrientation: "from-image"`, so a portrait shot does not
 * arrive on its side.
 */

export type EncodedImage = { blob: Blob; width: number; height: number };

/** Long edge, in pixels, of each variant. */
const FULL_EDGE = 1280;
const THUMB_EDGE = 320;

const FULL_QUALITY = 0.78;
const THUMB_QUALITY = 0.72;

/** Anything bigger than this is not a photo of a person. */
export const MAX_SOURCE_BYTES = 25 * 1024 * 1024;

async function encode(
  bitmap: ImageBitmap,
  maxEdge: number,
  quality: number,
): Promise<EncodedImage> {
  // Never upscale: a 600px photo stays 600px rather than being blown up to
  // 1280 and re-encoded into a bigger, blurrier file.
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  // `alpha: false` — a photo has no transparency, and an opaque canvas lets the
  // encoder skip the alpha channel.
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("canvas 2d context unavailable");
  context.drawImage(bitmap, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/webp", quality);
  });
  if (!blob) throw new Error("webp encoding failed");
  return { blob, width, height };
}

/** The two variants of one picked file, ready to upload. */
export async function encodeVariants(file: File): Promise<{
  full: EncodedImage;
  thumb: EncodedImage;
}> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const full = await encode(bitmap, FULL_EDGE, FULL_QUALITY);
    const thumb = await encode(bitmap, THUMB_EDGE, THUMB_QUALITY);
    return { full, thumb };
  } finally {
    // The bitmap holds the decoded frame — several megabytes of it.
    bitmap.close();
  }
}
