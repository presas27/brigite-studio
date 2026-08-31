import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireClientAccess } from "./model/authz";

/**
 * Progress photos — the three angles a client shoots with her weekly check-in.
 *
 * The bytes never pass through a Convex function: the browser downscales and
 * re-encodes the photo, asks for an upload URL, and PUTs it straight to file
 * storage. What crosses this module is ids and dimensions. That is what keeps
 * a 4 MB phone photo out of a 16 MiB function argument, and out of the
 * function's execution time.
 *
 * Photos are saved the moment they are picked rather than when the check-in is
 * submitted. A file uploaded to storage that no row points at is a byte nobody
 * can see and everybody pays for, and the alternative — hold the ids in the
 * form and write them on submit — leaks exactly those bytes every time a client
 * changes her mind and closes the tab.
 */

const angle = v.union(v.literal("front"), v.literal("back"), v.literal("side"));

const photoShape = v.object({
  id: v.string(),
  weekOf: v.string(),
  angle,
  width: v.number(),
  height: v.number(),
  bytes: v.number(),
});

/** A short-lived URL to PUT one file to. The caller must be the client or her coach. */
export const uploadUrl = mutation({
  args: { clientId: v.id("users") },
  returns: v.string(),
  handler: async (ctx, args) => {
    await requireClientAccess(ctx, args.clientId);
    return ctx.storage.generateUploadUrl();
  },
});

/**
 * Attach one angle to one week, replacing whatever was there.
 *
 * The replaced row's files are deleted in the same mutation: storage is billed
 * by the byte and an orphan is invisible, so nothing else would ever collect
 * them.
 */
export const savePhoto = mutation({
  args: {
    clientId: v.id("users"),
    weekOf: v.string(),
    angle,
    fileId: v.id("_storage"),
    thumbId: v.id("_storage"),
    width: v.number(),
    height: v.number(),
    bytes: v.number(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    await requireClientAccess(ctx, args.clientId);

    const existing = await ctx.db
      .query("progressPhotos")
      .withIndex("by_client_and_week", (q) =>
        q.eq("clientId", args.clientId).eq("weekOf", args.weekOf),
      )
      .collect();

    for (const doc of existing) {
      if (doc.angle !== args.angle) continue;
      await ctx.storage.delete(doc.fileId);
      await ctx.storage.delete(doc.thumbId);
      await ctx.db.delete("progressPhotos", doc._id);
    }

    return ctx.db.insert("progressPhotos", {
      clientId: args.clientId,
      weekOf: args.weekOf,
      angle: args.angle,
      fileId: args.fileId,
      thumbId: args.thumbId,
      width: Math.max(1, Math.trunc(args.width)),
      height: Math.max(1, Math.trunc(args.height)),
      bytes: Math.max(0, Math.trunc(args.bytes)),
    });
  },
});

/** Drop one angle, files included. */
export const removePhoto = mutation({
  args: { photoId: v.id("progressPhotos") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const doc = await ctx.db.get("progressPhotos", args.photoId);
    if (!doc) return null;
    await requireClientAccess(ctx, doc.clientId);
    await ctx.storage.delete(doc.fileId);
    await ctx.storage.delete(doc.thumbId);
    await ctx.db.delete("progressPhotos", args.photoId);
    return null;
  },
});

/**
 * One client's photos, newest week first.
 *
 * No URLs: those are minted per request behind the app's own session, in
 * `/app/api/foto/[photoId]`. A `storage.getUrl` link is a capability — whoever
 * holds it can read the file, signed in or not, forever — and body photos are
 * not something to hand out on those terms.
 */
export const listPhotos = query({
  args: { clientId: v.id("users"), limit: v.optional(v.number()) },
  returns: v.array(photoShape),
  handler: async (ctx, args) => {
    await requireClientAccess(ctx, args.clientId);

    const docs = await ctx.db
      .query("progressPhotos")
      .withIndex("by_client_and_week", (q) => q.eq("clientId", args.clientId))
      .order("desc")
      .take(Math.max(3, Math.min(args.limit ?? 156, 520)));

    return docs.map((doc) => ({
      id: doc._id as string,
      weekOf: doc.weekOf,
      angle: doc.angle,
      width: doc.width,
      height: doc.height,
      bytes: doc.bytes,
    }));
  },
});

/**
 * The storage URL for one photo, for the route handler that streams it. The
 * gate is the point: the id is checked against the client it belongs to before
 * any URL exists.
 */
export const photoUrl = query({
  args: {
    photoId: v.id("progressPhotos"),
    variant: v.union(v.literal("full"), v.literal("thumb")),
  },
  returns: v.union(v.null(), v.string()),
  handler: async (ctx, args) => {
    const doc = await ctx.db.get("progressPhotos", args.photoId);
    if (!doc) return null;
    await requireClientAccess(ctx, doc.clientId);
    return ctx.storage.getUrl(args.variant === "full" ? doc.fileId : doc.thumbId);
  },
});
