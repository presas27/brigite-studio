import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { requireCoach } from "./model/authz";
import type { Lead, LeadSource, LeadStatus, PlanId } from "../src/lib/studio/types";

/**
 * Leads — people who asked about training and are not clients yet.
 *
 * The table is real; what fills it is not, yet. Today the contact form on
 * brigitestudio.com only emails `hello@`, so `seed` below puts a handful of
 * plausible enquiries in so the screen can be designed against something. The
 * wiring is one call: the contact action runs `capture` alongside the mail it
 * already sends, and `seed` gets deleted.
 *
 * Everything here is coach-only except `capture`, which is deliberately open —
 * see the comment on it, which is the important one in this file.
 *
 * Two things the SQLite DDL did that the mutations now have to remember:
 *
 * - `client_id TEXT REFERENCES users(id) ON DELETE SET NULL`. Nothing in the
 *   studio deletes a user (clients are archived, never removed), so there is no
 *   cleanup to run today. Whoever adds real deletion has to null `clientId` on
 *   any lead pointing at the account, or the row keeps a dangling id.
 * - `DEFAULT ''` on `phone`, `message` and `notes`. Convex has no defaults, so
 *   every insert writes the empty string explicitly rather than leaving the
 *   field absent — the domain type says `string`, not `string | undefined`.
 */

const statusValidator = v.union(
  v.literal("new"),
  v.literal("talking"),
  v.literal("won"),
  v.literal("lost"),
);

/** The three offers on the marketing site. The form sends one of these or nothing. */
const interestValidator = v.union(
  v.null(),
  v.literal("personal"),
  v.literal("online"),
  v.literal("specialty"),
);

const sourceValidator = v.union(
  v.literal("site"),
  v.literal("instagram"),
  v.literal("referral"),
  v.literal("walkin"),
);

/**
 * The shape `src/lib/studio/types.ts` calls `Lead`, field for field, so the
 * wrappers on the Next side need no mapping and no cast.
 *
 * `interest` and `source` are narrower here than in the schema, which stores
 * both as strings: the only writers are `capture` and `seed` below and both are
 * restricted to the lists above, so a row that fails this validator on the way
 * out is a bug worth hearing about rather than a row to paper over.
 */
const leadValidator = v.object({
  id: v.string(),
  name: v.string(),
  email: v.string(),
  phone: v.string(),
  message: v.string(),
  interest: interestValidator,
  source: sourceValidator,
  status: statusValidator,
  notes: v.string(),
  clientId: v.union(v.null(), v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
});

function mapLead(doc: Doc<"leads">): Lead {
  return {
    id: doc._id,
    name: doc.name,
    email: doc.email,
    phone: doc.phone,
    message: doc.message,
    interest: doc.interest as PlanId | null,
    source: doc.source as LeadSource,
    status: doc.status,
    notes: doc.notes,
    clientId: doc.clientId,
    createdAt: doc._creationTime,
    updatedAt: doc.updatedAt,
  };
}

/**
 * Newest first, optionally narrowed to one column of the pipeline.
 *
 * `by_status` is implicitly suffixed with `_creationTime`, so it gives exactly
 * the ordering `idx_leads_status (status, created_at)` gave; the unfiltered
 * branch reads the creation-time index directly.
 *
 * Unpaginated, like the screen it feeds: this is one studio's inbound enquiries,
 * a table measured in hundreds. If it ever grows past a few thousand rows the
 * page has to learn to paginate — the read limit will say so long before the
 * coach notices.
 */
export const list = query({
  args: { status: v.optional(statusValidator) },
  returns: v.array(leadValidator),
  handler: async (ctx, args) => {
    await requireCoach(ctx);

    const status = args.status;
    const docs = status
      ? await ctx.db
          .query("leads")
          .withIndex("by_status", (q) => q.eq("status", status))
          .order("desc")
          .collect()
      : await ctx.db.query("leads").order("desc").collect();

    return docs.map(mapLead);
  },
});

/**
 * A lead by id, or `null`.
 *
 * `v.string()` rather than `v.id("leads")`, and this is the one place that
 * trade is worth making: the id arrives from a form field, so a stale or
 * tampered value has to read as a miss — which is what the `WHERE id = ?` this
 * replaces did — and `v.id` would instead reject the call before the handler
 * runs. `normalizeId` is the check, and it returns null rather than throwing.
 * The mutations below keep `v.id`: for a write, a bad id is worth an error.
 */
export const find = query({
  args: { leadId: v.string() },
  returns: v.union(v.null(), leadValidator),
  handler: async (ctx, args) => {
    await requireCoach(ctx);

    const leadId = ctx.db.normalizeId("leads", args.leadId);
    if (!leadId) return null;

    const doc = await ctx.db.get("leads", leadId);
    return doc ? mapLead(doc) : null;
  },
});

/**
 * One count per status, zeros included, for the filter row.
 *
 * `GROUP BY status` becomes one pass over the table: four indexed reads would
 * touch the same rows, and there is no counting primitive short of keeping
 * running totals (`@convex-dev/aggregate`), which this table is far too small to
 * earn. Same size assumption as `list` above, and the same thing to revisit.
 */
export const counts = query({
  args: {},
  returns: v.object({
    new: v.number(),
    talking: v.number(),
    won: v.number(),
    lost: v.number(),
  }),
  handler: async (ctx) => {
    await requireCoach(ctx);

    const totals: Record<LeadStatus, number> = { new: 0, talking: 0, won: 0, lost: 0 };
    for (const doc of await ctx.db.query("leads").collect()) {
      totals[doc.status] += 1;
    }
    return totals;
  },
});

/** Bounds on what a stranger can put in the table. Same numbers the form enforces. */
const LIMITS = { name: 200, email: 320, phone: 30, message: 5_000 } as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Capture an enquiry from the marketing site. **Deliberately unauthenticated.**
 *
 * This is the one function in `convex/` without a gate, and it has to be: the
 * contact form on brigitestudio.com is public, the visitor filling it in has no
 * account, and the whole point of a lead is that it arrives before there is a
 * session to authorize. `requireCoach` here would mean the form never writes.
 *
 * What keeps that safe is the shape of the endpoint rather than a gate:
 *
 * - It is **write-only and returns nothing but the new id.** There is no read
 *   path here, so an anonymous caller can never see a lead — theirs or anyone
 *   else's. `list`, `find` and `counts` above are all `requireCoach`.
 * - It **cannot set the fields that matter.** `status` is always `new`, `notes`
 *   is always empty and `clientId` is always null; the coach side owns those.
 *   The worst an abuser writes is a row in the "new" column.
 * - Every field is **bounded and validated**, which is the check the Convex
 *   deployment URL being public makes necessary. The Server Action in
 *   `src/app/actions/contact.ts` has a honeypot, a timing token, a per-IP rate
 *   limit and content moderation in front of it — but the deployment URL is
 *   reachable without going through the action at all, so the limits below are
 *   repeated here rather than trusted from the caller. They are the same
 *   numbers: name 1–200, email ≤320 and shaped like an address, phone ≤30,
 *   message ≤5000, interest one of the three plans, source one of four.
 *
 * What is *not* here: a rate limit. The abuse it cannot stop is volume — a
 * script posting valid-looking enquiries straight at the deployment fills the
 * "new" column with junk the coach has to sweep. Bounded in blast radius (rows,
 * not data loss) but worth closing with `@convex-dev/rate-limiter` keyed on
 * email once the form is actually wired to this.
 */
export const capture = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    message: v.optional(v.string()),
    interest: v.optional(interestValidator),
    source: v.optional(sourceValidator),
  },
  returns: v.id("leads"),
  handler: async (ctx, args) => {
    const name = args.name.trim();
    const email = args.email.trim();
    const phone = (args.phone ?? "").trim();
    const message = (args.message ?? "").trim();

    if (!name || name.length > LIMITS.name) throw new Error("Invalid name");
    if (!EMAIL_RE.test(email) || email.length > LIMITS.email) throw new Error("Invalid email");
    if (phone.length > LIMITS.phone) throw new Error("Invalid phone");
    if (message.length > LIMITS.message) throw new Error("Invalid message");

    return await ctx.db.insert("leads", {
      name,
      email,
      phone,
      message,
      interest: args.interest ?? null,
      source: args.source ?? "site",
      status: "new",
      notes: "",
      clientId: null,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Move a lead along the pipeline.
 *
 * A lead that is no longer there is a no-op rather than an error, the way the
 * `UPDATE ... WHERE id = ?` this replaces was: the id comes from a form the
 * coach had open, and a stale one is not worth an error page.
 */
export const setStatus = mutation({
  args: { leadId: v.id("leads"), status: statusValidator },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireCoach(ctx);
    const lead = await ctx.db.get("leads", args.leadId);
    if (!lead) return null;

    await ctx.db.patch("leads", args.leadId, { status: args.status, updatedAt: Date.now() });
    return null;
  },
});

/**
 * Save the coach's private notes on a lead.
 *
 * Note what this does *not* write: `updatedAt`. That field means "last time the
 * status moved" (`types.ts`) and it drives the "waiting since" reading on the
 * screen — bumping it here would reset that clock every time Sara typed a note,
 * which is the opposite of what it is for. The SQLite version left it alone for
 * the same reason.
 */
export const setNotes = mutation({
  args: { leadId: v.id("leads"), notes: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireCoach(ctx);
    const lead = await ctx.db.get("leads", args.leadId);
    if (!lead) return null;

    await ctx.db.patch("leads", args.leadId, { notes: args.notes });
    return null;
  },
});

/**
 * Mark a lead as converted and remember which account it became.
 *
 * The target is checked to be a real client row, which SQLite's foreign key did
 * for free: a lead pointing at a deleted or non-client id is a link the coach
 * clicks and lands nowhere.
 */
export const linkToClient = mutation({
  args: { leadId: v.id("leads"), clientId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireCoach(ctx);

    const lead = await ctx.db.get("leads", args.leadId);
    if (!lead) return null;

    const client = await ctx.db.get("users", args.clientId);
    if (!client || client.role !== "client") throw new Error("No such client");

    await ctx.db.patch("leads", args.leadId, {
      status: "won",
      clientId: args.clientId,
      updatedAt: Date.now(),
    });
    return null;
  },
});
