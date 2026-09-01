import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { action, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { requireCoach } from "./model/authz";
import {
  exerciseVideoQuery,
  parseIsoDuration,
  pickBestVideo,
  type VideoCandidate,
} from "../src/lib/youtube";

/**
 * Finding a demo video for an exercise, so 2,200 imported movements do not have
 * to be looked up by hand.
 *
 * **This suggests, it does not decide.** The result is written into
 * `exercises.videoUrl` and the coach corrects it as she builds plans — which is
 * the only workable arrangement, because a search cannot tell a Bulgarian split
 * squat from a rear-foot-elevated lunge filmed badly. `pickBestVideo` refuses
 * rather than guessing when nothing matches the name well enough: an empty field
 * is a gap the coach will notice, a wrong video is a mistake she will not.
 *
 * **Quota is the binding constraint.** A `search.list` call costs 100 units
 * against a default 10,000-a-day project quota, so a deployment can look up
 * about 95 exercises a day and no more — `videos.list` costs 1 and is free by
 * comparison. That is why `backfill` takes a `limit`, skips anything that
 * already has a link, and is written to be run again tomorrow rather than to
 * finish in one go. It reports the units it spent so the next run can be sized.
 *
 * The key lives in the deployment's environment (`YOUTUBE_API_KEY`), not in the
 * Next app: nothing in the browser ever holds it, and the same code path serves
 * the button in the exercise editor and the bulk run from the CLI.
 */

/** What one `search.list` call costs against the daily project quota. */
const SEARCH_QUOTA_COST = 100;

/** How many candidates to rank per exercise. More costs nothing extra. */
const CANDIDATES = 10;

/** Default for a bulk run: half a day's quota, so one run cannot exhaust it. */
const DEFAULT_BACKFILL_LIMIT = 45;

/** A demo video the search settled on, as both callers receive it. */
export type FoundVideo = {
  videoId: string;
  title: string;
  channelTitle: string;
  /** Canonical watch URL — what `youtubeId` parses and what a coach recognises. */
  url: string;
  viewCount: number;
  seconds: number | null;
};

const foundShape = v.object({
  videoId: v.string(),
  title: v.string(),
  channelTitle: v.string(),
  url: v.string(),
  viewCount: v.number(),
  seconds: v.union(v.null(), v.number()),
});

type SearchItem = { id?: { videoId?: string } };
type VideoItem = {
  id?: string;
  snippet?: { title?: string; channelTitle?: string };
  statistics?: { viewCount?: string };
  contentDetails?: { duration?: string };
};

function apiKey(): string {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) {
    throw new Error(
      "YOUTUBE_API_KEY is not set on this deployment. Add it with `bunx convex env set YOUTUBE_API_KEY <key>`.",
    );
  }
  return key;
}

/**
 * Search YouTube for a demo of `name` and return the best candidate, or `null`.
 *
 * Two calls, in this order and for this reason: `search.list` knows how to match
 * a phrase but does not return view counts, and `videos.list` returns view
 * counts but cannot search. So the first narrows the whole of YouTube to ten
 * short, embeddable videos and the second prices them.
 */
async function findVideoFor(name: string): Promise<FoundVideo | null> {
  const key = apiKey();

  const search = new URL("https://www.googleapis.com/youtube/v3/search");
  search.searchParams.set("part", "snippet");
  search.searchParams.set("type", "video");
  search.searchParams.set("q", exerciseVideoQuery(name));
  // Under four minutes. A demo is a demo; a fifteen-minute video is a lesson,
  // and the client watching it mid-set will not get past the intro.
  search.searchParams.set("videoDuration", "short");
  // Only videos that can actually play in the app's iframe. A link that opens a
  // "watch on YouTube" placeholder is worse than no link.
  search.searchParams.set("videoEmbeddable", "true");
  search.searchParams.set("safeSearch", "strict");
  search.searchParams.set("maxResults", String(CANDIDATES));
  search.searchParams.set("key", key);

  const searchResponse = await fetch(search);
  if (!searchResponse.ok) {
    throw new Error(
      `YouTube search failed: ${searchResponse.status} ${await searchResponse.text()}`,
    );
  }
  const searchBody = (await searchResponse.json()) as { items?: SearchItem[] };
  const ids = (searchBody.items ?? [])
    .map((item) => item.id?.videoId)
    .filter((id): id is string => Boolean(id));
  if (ids.length === 0) return null;

  const details = new URL("https://www.googleapis.com/youtube/v3/videos");
  details.searchParams.set("part", "snippet,statistics,contentDetails");
  details.searchParams.set("id", ids.join(","));
  details.searchParams.set("key", key);

  const detailsResponse = await fetch(details);
  if (!detailsResponse.ok) {
    throw new Error(
      `YouTube lookup failed: ${detailsResponse.status} ${await detailsResponse.text()}`,
    );
  }
  const detailsBody = (await detailsResponse.json()) as { items?: VideoItem[] };

  const candidates: VideoCandidate[] = (detailsBody.items ?? [])
    .filter((item): item is VideoItem & { id: string } => Boolean(item.id))
    .map((item) => ({
      id: item.id,
      title: item.snippet?.title ?? "",
      channelTitle: item.snippet?.channelTitle ?? "",
      viewCount: Number(item.statistics?.viewCount ?? 0) || 0,
      seconds: parseIsoDuration(item.contentDetails?.duration ?? ""),
    }));

  const best = pickBestVideo(candidates, name);
  return best ? shapeOf(best) : null;
}

function shapeOf(candidate: VideoCandidate): FoundVideo {
  return {
    videoId: candidate.id,
    title: candidate.title,
    channelTitle: candidate.channelTitle,
    // The canonical watch URL, which is what `youtubeId` in `src/lib/youtube.ts`
    // parses and what a coach recognises if she opens the field.
    url: `https://www.youtube.com/watch?v=${candidate.id}`,
    viewCount: candidate.viewCount,
    seconds: candidate.seconds,
  };
}

/* ------------------------------------------------------------ the coach's button */

/**
 * Look a demo up for one exercise and write it in. Returns what was found, so
 * the editor can name the video it just linked instead of only saying "done".
 *
 * Coach-only, and it costs 100 quota units per press — which is the reason it is
 * a button she chooses to press rather than something that runs on save.
 */
export const fillExerciseVideo = action({
  args: { exerciseId: v.id("exercises") },
  returns: v.union(v.null(), foundShape),
  handler: async (ctx, args): Promise<FoundVideo | null> => {
    // An action has no `ctx.db`, so the gate cannot run here. `runQuery` from a
    // public action forwards the caller's identity, so the check still happens
    // against the coach who pressed the button — one hop away, same guarantee.
    await ctx.runQuery(internal.youtube.assertCoach, {});

    const exercise = await ctx.runQuery(internal.youtube.exerciseName, {
      exerciseId: args.exerciseId,
    });
    if (!exercise) return null;

    const found = await findVideoFor(exercise.name);
    if (!found) return null;

    await ctx.runMutation(internal.youtube.setVideoUrl, {
      exerciseId: args.exerciseId,
      videoUrl: found.url,
    });
    return found;
  },
});

/* --------------------------------------------------------------- the bulk run */

/**
 * What one bulk run did, and what it costs to finish.
 *
 * `quotaUnitsSpent` and `remainingWithoutVideo` are the two the operator acts
 * on: together they say how many more days of runs the library needs.
 */
export type BackfillReport = {
  considered: number;
  filled: number;
  notFound: number;
  failed: number;
  quotaUnitsSpent: number;
  remainingWithoutVideo: number;
};

/**
 * Fill in demo links for exercises that have none, up to `limit`.
 *
 * Internal and run from the CLI, because it is a background chore measured in
 * days rather than something a page waits for:
 *
 * ```
 * bunx convex run youtube:backfill '{"limit": 45}'
 * ```
 *
 * Run it again tomorrow. It skips anything already linked, so re-running is how
 * it is meant to be used and never re-spends quota on an exercise it has already
 * answered. `overwrite` exists for a deliberate re-run over links a coach has
 * since decided were wrong; it is off by default, because the whole point of the
 * arrangement is that her corrections outrank the search.
 */
export const backfill = internalAction({
  args: {
    limit: v.optional(v.number()),
    overwrite: v.optional(v.boolean()),
  },
  returns: v.object({
    considered: v.number(),
    filled: v.number(),
    notFound: v.number(),
    failed: v.number(),
    quotaUnitsSpent: v.number(),
    remainingWithoutVideo: v.number(),
  }),
  handler: async (ctx, args): Promise<BackfillReport> => {
    const limit = Math.max(1, Math.min(Math.round(args.limit ?? DEFAULT_BACKFILL_LIMIT), 500));
    const overwrite = args.overwrite ?? false;

    const { targets, remaining } = await ctx.runQuery(internal.youtube.needingVideo, {
      limit,
      overwrite,
    });

    let filled = 0;
    let notFound = 0;
    let failed = 0;
    let searches = 0;

    for (const target of targets) {
      try {
        searches += 1;
        const found = await findVideoFor(target.name);
        if (!found) {
          notFound += 1;
          continue;
        }
        await ctx.runMutation(internal.youtube.setVideoUrl, {
          exerciseId: target.id as Id<"exercises">,
          videoUrl: found.url,
        });
        filled += 1;
      } catch (error) {
        // One exercise failing must not abandon the other forty-four; the run
        // reports the count and the next run picks the survivors back up.
        failed += 1;
        console.error(`YouTube backfill failed for "${target.name}":`, error);
      }
    }

    return {
      considered: targets.length,
      filled,
      notFound,
      failed,
      quotaUnitsSpent: searches * SEARCH_QUOTA_COST,
      // What is left after this run, so the operator knows how many days remain.
      remainingWithoutVideo: Math.max(0, remaining - filled),
    };
  },
});

/* ------------------------------------------------------------------ internals */

/**
 * The coach gate for `fillExerciseVideo`, as a query because that is the only
 * kind of function with a `ctx.db` to resolve the viewer against. Throws for a
 * client and for a signed-out caller, exactly as `requireCoach` does everywhere
 * else — the extra hop is a limitation of actions, not a softer check.
 */
export const assertCoach = internalQuery({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    await requireCoach(ctx);
    return null;
  },
});

export const exerciseName = internalQuery({
  args: { exerciseId: v.id("exercises") },
  returns: v.union(v.null(), v.object({ name: v.string() })),
  handler: async (ctx, args) => {
    const doc = await ctx.db.get("exercises", args.exerciseId);
    return doc ? { name: doc.name } : null;
  },
});

/**
 * The exercises to look up next, and how many are left after them.
 *
 * Ordered by name through `by_archived_and_name`, so consecutive runs walk the
 * library in a stable order and the same exercise is not retried every day while
 * another is never reached.
 */
export const needingVideo = internalQuery({
  args: { limit: v.number(), overwrite: v.boolean() },
  returns: v.object({
    targets: v.array(v.object({ id: v.string(), name: v.string() })),
    remaining: v.number(),
  }),
  handler: async (ctx, args) => {
    const docs = await ctx.db
      .query("exercises")
      .withIndex("by_archived_and_name", (q) => q.eq("archived", false))
      .collect();

    const open = docs.filter((doc) => args.overwrite || !doc.videoUrl);
    return {
      targets: open
        .slice(0, args.limit)
        .map((doc) => ({ id: doc._id as string, name: doc.name })),
      remaining: open.length,
    };
  },
});

export const setVideoUrl = internalMutation({
  args: { exerciseId: v.id("exercises"), videoUrl: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch("exercises", args.exerciseId, { videoUrl: args.videoUrl });
    return null;
  },
});
