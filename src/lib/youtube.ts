/**
 * YouTube links, reduced to the one thing the player needs: the video id.
 *
 * The exercise library leans on YouTube deliberately. Sara's demos are already
 * there — the account carried over from Trainerize stores her own footage as
 * YouTube ids, everything else as Vimeo assets that are not hers — and a link
 * costs no storage, no bandwidth and no transcoding, where a few hundred
 * uploaded clips cost all three.
 */

/** The eleven characters YouTube gives a video. */
const ID = /^[A-Za-z0-9_-]{11}$/;

/**
 * The video id in a YouTube URL, or `null` for anything else.
 *
 * Handles the four shapes a coach actually pastes: `watch?v=`, `youtu.be/`,
 * `/shorts/` and an already-built `/embed/`. Anything else — a Vimeo link, a
 * blog post, a bare word — returns null, and the caller falls back to showing a
 * plain outbound link rather than an iframe that would render as a grey box.
 */
export function youtubeId(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;

  const host = parsed.hostname.replace(/^www\./, "");
  if (host === "youtu.be") {
    const id = parsed.pathname.slice(1);
    return ID.test(id) ? id : null;
  }
  if (host !== "youtube.com" && host !== "m.youtube.com" && host !== "youtube-nocookie.com") {
    return null;
  }

  const watch = parsed.searchParams.get("v");
  if (watch && ID.test(watch)) return watch;

  const path = parsed.pathname.split("/").filter(Boolean);
  const id = path[0] === "shorts" || path[0] === "embed" || path[0] === "v" ? path[1] : null;
  return id && ID.test(id) ? id : null;
}

/**
 * Poster frame for an id. The library grid is scanned by picture, not by
 * title, and a still YouTube already generated costs us no storage and no
 * bandwidth — the same reasoning that keeps the player itself a link.
 */
export function youtubeThumb(id: string): string {
  return `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;
}

/**
 * Player URL for an id. `youtube-nocookie.com` so a coach opening her own
 * library does not hand YouTube a tracking cookie for every exercise she reads,
 * and `rel=0` so the end card offers her own videos rather than a competitor's.
 */
export function youtubeEmbed(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}?rel=0`;
}
