import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { profileOf, requireClientAccess, requireCoach, requireViewer, viewer } from "./model/authz";

const fieldType = v.union(
  v.literal("text"),
  v.literal("textarea"),
  v.literal("number"),
  v.literal("date"),
  v.literal("yesno"),
  v.literal("select"),
  v.literal("multiselect"),
);

const fieldShape = v.object({
  id: v.string(),
  position: v.number(),
  type: fieldType,
  label: v.string(),
  hint: v.string(),
  required: v.boolean(),
  options: v.array(v.string()),
});

const formShape = v.object({
  id: v.string(),
  title: v.string(),
  intro: v.string(),
  published: v.boolean(),
  updatedAt: v.number(),
  fields: v.array(fieldShape),
});

async function formOfCoach(ctx: QueryCtx | MutationCtx, coachId: Id<"users">) {
  return ctx.db
    .query("intakeForms")
    .withIndex("by_coach", (q) => q.eq("coachId", coachId))
    .unique();
}

function mapForm(doc: NonNullable<Awaited<ReturnType<typeof formOfCoach>>>) {
  return {
    id: doc._id as string,
    title: doc.title,
    intro: doc.intro,
    published: doc.published,
    updatedAt: doc.updatedAt,
    fields: [...doc.fields].sort((a, b) => a.position - b.position),
  };
}

function validateAnswers(
  fields: { id: string; type: string; required: boolean; options: string[] }[],
  answers: { fieldId: string; value: string }[],
) {
  const byId = new Map(answers.map((answer) => [answer.fieldId, answer.value.trim()]));
  for (const field of fields) {
    const value = byId.get(field.id) ?? "";
    if (field.required && !value) throw new ConvexError({ code: "INTAKE_INCOMPLETE" });
    if (!value) continue;
    if (field.type === "yesno" && value !== "yes" && value !== "no") {
      throw new ConvexError({ code: "INTAKE_INCOMPLETE" });
    }
    if (field.type === "select" && field.options.length > 0 && !field.options.includes(value)) {
      throw new ConvexError({ code: "INTAKE_INCOMPLETE" });
    }
  }
}

/** The coach's own form, created empty the first time they open the builder. */
export const myForm = query({
  args: {},
  returns: formShape,
  handler: async (ctx) => {
    const coach = await requireCoach(ctx);
    const existing = await formOfCoach(ctx, coach._id);
    if (!existing) {
      return {
        id: "",
        title: "",
        intro: "",
        published: false,
        updatedAt: 0,
        fields: [],
      };
    }
    return mapForm(existing);
  },
});

/** Public enough for the invite page: the published form of the coach on this token. */
export const formForInvite = query({
  args: { token: v.string() },
  returns: v.union(v.null(), formShape),
  handler: async (ctx, { token }) => {
    const invite = await ctx.db
      .query("invites")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (!invite || invite.status !== "pending") return null;
    const form = await formOfCoach(ctx, invite.coachId);
    if (!form || !form.published || form.fields.length === 0) return null;
    return mapForm(form);
  },
});

/** Whether the signed-in client still owes this coach a form on a pending invite. */
export const myPendingIntake = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      token: v.string(),
      coachName: v.string(),
      form: formShape,
    }),
  ),
  handler: async (ctx) => {
    const user = await viewer(ctx);
    if (!user || user.role !== "client") return null;

    const invites = await ctx.db
      .query("invites")
      .withIndex("by_client", (q) => q.eq("clientId", user._id))
      .collect();
    const pending = invites.find((invite) => invite.status === "pending" && invite.expiresAt > Date.now());
    if (!pending) return null;

    const form = await formOfCoach(ctx, pending.coachId);
    if (!form || !form.published || form.fields.length === 0) return null;

    const existing = await ctx.db
      .query("intakeResponses")
      .withIndex("by_form_and_client", (q) => q.eq("formId", form._id).eq("clientId", user._id))
      .unique();
    if (existing) return null;

    const coach = await ctx.db.get("users", pending.coachId);
    return {
      token: pending.token,
      coachName: coach?.name ?? "",
      form: mapForm(form),
    };
  },
});

export const saveForm = mutation({
  args: {
    title: v.string(),
    intro: v.string(),
    published: v.boolean(),
    fields: v.array(fieldShape),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const coach = await requireCoach(ctx);
    const title = args.title.trim().slice(0, 80) || "Formulário de entrada";
    const intro = args.intro.trim().slice(0, 2000);
    const fields = args.fields
      .map((field, index) => ({
        ...field,
        id: field.id.trim() || `f${index}`,
        label: field.label.trim().slice(0, 120),
        hint: field.hint.trim().slice(0, 240),
        options: field.options.map((option) => option.trim()).filter(Boolean).slice(0, 20),
        position: index,
      }))
      .filter((field) => field.label.length > 0)
      .slice(0, 30);

    const existing = await formOfCoach(ctx, coach._id);
    const now = Date.now();
    if (existing) {
      await ctx.db.patch("intakeForms", existing._id, {
        title,
        intro,
        published: args.published,
        fields,
        updatedAt: now,
      });
      return null;
    }
    await ctx.db.insert("intakeForms", {
      coachId: coach._id,
      title,
      intro,
      published: args.published,
      fields,
      updatedAt: now,
    });
    return null;
  },
});

/**
 * Save the answers and accept the invite in the same write. A published form
 * with fields is what makes this the only door into the coaching relationship.
 */
export const submitAndAccept = mutation({
  args: {
    token: v.string(),
    answers: v.array(v.object({ fieldId: v.string(), value: v.string() })),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireViewer(ctx);
    if (user.role !== "client") throw new ConvexError({ code: "COACH_CANNOT_ACCEPT" });

    const invite = await ctx.db
      .query("invites")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!invite || invite.status !== "pending" || invite.expiresAt < Date.now()) {
      throw new ConvexError({ code: "INVITE_INVALID" });
    }
    if (invite.clientId !== user._id && invite.email !== user.email) {
      throw new ConvexError({ code: "INVITE_EMAIL_MISMATCH" });
    }

    const form = await formOfCoach(ctx, invite.coachId);
    if (form && form.published && form.fields.length > 0) {
      validateAnswers(form.fields, args.answers);
      const existing = await ctx.db
        .query("intakeResponses")
        .withIndex("by_form_and_client", (q) => q.eq("formId", form._id).eq("clientId", user._id))
        .unique();
      const answers = args.answers.map((answer) => ({
        fieldId: answer.fieldId,
        value: answer.value.trim().slice(0, 4000),
      }));
      if (existing) {
        await ctx.db.patch("intakeResponses", existing._id, { answers, submittedAt: Date.now() });
      } else {
        await ctx.db.insert("intakeResponses", {
          formId: form._id,
          coachId: invite.coachId,
          clientId: user._id,
          inviteId: invite._id,
          answers,
          submittedAt: Date.now(),
        });
      }
    }

    const profile = await profileOf(ctx, user._id);
    if (!profile) throw new Error("No profile");
    if (profile.coachId && profile.coachId !== invite.coachId) {
      throw new ConvexError({ code: "ALREADY_COACHED" });
    }

    await ctx.db.patch("clientProfiles", profile._id, { coachId: invite.coachId });
    await ctx.db.patch("invites", invite._id, { status: "accepted" });
    if (user.status === "invited") {
      await ctx.db.patch("users", user._id, { status: "active" });
    }
    return null;
  },
});

/** What this client answered, for the coach's overview. */
export const responseForClient = query({
  args: { clientId: v.id("users") },
  returns: v.union(
    v.null(),
    v.object({
      title: v.string(),
      submittedAt: v.number(),
      answers: v.array(
        v.object({
          label: v.string(),
          value: v.string(),
        }),
      ),
    }),
  ),
  handler: async (ctx, { clientId }) => {
    await requireClientAccess(ctx, clientId);
    const rows = await ctx.db
      .query("intakeResponses")
      .withIndex("by_client", (q) => q.eq("clientId", clientId))
      .collect();
    const latest = rows.sort((a, b) => b.submittedAt - a.submittedAt)[0];
    if (!latest) return null;
    const form = await ctx.db.get("intakeForms", latest.formId);
    const labels = new Map((form?.fields ?? []).map((field) => [field.id, field.label]));
    return {
      title: form?.title || "",
      submittedAt: latest.submittedAt,
      answers: latest.answers.map((answer) => ({
        label: labels.get(answer.fieldId) ?? answer.fieldId,
        value: answer.value,
      })),
    };
  },
});
