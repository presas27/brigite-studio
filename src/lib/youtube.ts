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

/* ------------------------------------------------- finding a demo to link to */

/**
 * What to ask YouTube for, given an exercise name.
 *
 * The library's names are English — they came across from Trainerize — so the
 * qualifier is too, and `"how to"` is left out on purpose: it pulls in
 * ten-minute talking-head videos, where a coach linking a demo wants somebody
 * performing the movement. `videoDuration=short` on the request does the rest.
 *
 * Quoting the name keeps "Bulgarian Split Squat" from matching every video with
 * the word "squat" in it.
 */
export function exerciseVideoQuery(name: string): string {
  return `"${name.trim()}" exercise tutorial`;
}

/** A candidate straight off the API, reduced to what the ranking looks at. */
export type VideoCandidate = {
  id: string;
  title: string;
  channelTitle: string;
  viewCount: number;
  seconds: number | null;
};

/** Words too common in an exercise name to be evidence a title is the right one. */
const STOPWORDS = new Set(["to", "with", "and", "the", "a", "of", "on", "in", "for"]);

/**
 * How well a candidate answers the exercise, higher is better.
 *
 * Two things decide it and the order matters. **Title match dominates**: a video
 * of the wrong movement is useless however many people watched it, so name
 * coverage is worth up to 100 while views are worth about 7 at a million.
 * **Views break ties**, on a log scale — the difference between 1k and 10k views
 * says something, the difference between 1.0M and 1.4M does not.
 *
 * Views enter as `log10`, so the whole of YouTube spans roughly 0-8 points and
 * cannot outrank a genuinely better title match. A candidate whose title shares
 * no significant word with the exercise scores zero for coverage and loses to
 * any that does.
 */
export function scoreVideo(candidate: VideoCandidate, exerciseName: string): number {
  const words = exerciseName
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 1 && !STOPWORDS.has(word));

  const title = candidate.title.toLowerCase();
  const hits = words.filter((word) => title.includes(word)).length;
  const coverage = words.length > 0 ? hits / words.length : 0;

  const views = candidate.viewCount > 0 ? Math.log10(candidate.viewCount) : 0;
  return coverage * 100 + views;
}

/**
 * The candidate to link, or `null` when none of them is plausible.
 *
 * The floor is deliberate: a search for an exercise nobody has filmed still
 * returns ten videos, and filling the field with the best of ten wrong answers
 * is worse than leaving it empty — the coach would have to notice the mistake
 * instead of noticing the gap. Half the significant words of the name must
 * appear in the title, which is what a coverage of 50 means here.
 */
export function pickBestVideo(
  candidates: VideoCandidate[],
  exerciseName: string,
): VideoCandidate | null {
  let best: VideoCandidate | null = null;
  let bestScore = 50;

  for (const candidate of candidates) {
    const score = scoreVideo(candidate, exerciseName);
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }
  return best;
}

/**
 * Seconds from an ISO 8601 duration, as `contentDetails.duration` gives it —
 * `PT4M13S`, `PT58S`, `PT1H2M3S`. `null` for anything unparseable, including the
 * `P0D` YouTube returns for a live stream.
 */
export function parseIsoDuration(value: string): number | null {
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(value.trim());
  if (!match) return null;
  const [, hours, minutes, seconds] = match;
  if (!hours && !minutes && !seconds) return null;
  return Number(hours ?? 0) * 3600 + Number(minutes ?? 0) * 60 + Number(seconds ?? 0);
}
