import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { resendInvite, saveClient, saveNotes, setStatus } from "@/app/app/coach/actions";
import { formatDayKey } from "@/components/studio/coach/format";
import { Empty } from "@/components/studio/Empty";
import { Field } from "@/components/studio/Field";
import { PageHeader } from "@/components/studio/PageHeader";
import { SubmitButton } from "@/components/studio/SubmitButton";
import {
  buttonDanger,
  buttonGhost,
  chip,
  chipAccent,
  eyebrow,
  field,
  muted,
  surface,
} from "@/components/studio/theme";
import { requireClientAccess } from "@/lib/studio/auth";
import { assignmentHistory } from "@/lib/studio/plan";
import { cn } from "@/lib/utils";

const PLANS = ["personal", "online", "specialty"] as const;

/**
 * Client detail — the coach's working page for one aluna: editable profile,
 * private notes she never sees, and the doors out to plan/checkins/messages/
 * videos, which each live in their own owned route.
 */
export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const { viewer, client } = await requireClientAccess(clientId);
  if (viewer.role !== "coach") redirect("/app/aluno");

  const [t, common, tPlan, tProgress, locale] = await Promise.all([
    getTranslations("Studio.clients"),
    getTranslations("Studio.common"),
    getTranslations("Studio.plan"),
    getTranslations("Studio.progress"),
    getLocale(),
  ]);

  const history = assignmentHistory(client.id, 5);

  return (
    <div className="space-y-8">
      <PageHeader
        backHref="/app/coach/alunos"
        backLabel={t("title")}
        kicker={client.email}
        title={client.name}
      />

      <section className={cn(surface, "space-y-5 p-6")}>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className={eyebrow}>{t("profile")}</h2>
          <span className={client.status === "active" ? chipAccent : chip}>
            {t(`status.${client.status}`)}
          </span>
        </div>

        <form action={saveClient} className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="clientId" value={client.id} />
          <Field label={t("nameLabel")} htmlFor="name" required className="sm:col-span-2">
            <input id="name" name="name" defaultValue={client.name} required className={field} />
          </Field>
          <Field label={t("planLabel")} htmlFor="plan" required>
            <select id="plan" name="plan" defaultValue={client.profile.plan} className={field}>
              {PLANS.map((plan) => (
                <option key={plan} value={plan}>
                  {t(`plan.${plan}`)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("sessionsLeft")} htmlFor="sessionsLeft">
            <input
              id="sessionsLeft"
              name="sessionsLeft"
              type="number"
              min={0}
              step={1}
              defaultValue={client.profile.sessionsLeft}
              className={field}
            />
          </Field>
          <Field label={t("goalsLabel")} htmlFor="goals" className="sm:col-span-2">
            <textarea
              id="goals"
              name="goals"
              rows={2}
              defaultValue={client.profile.goals}
              className={field}
            />
          </Field>
          <Field label={t("injuriesLabel")} htmlFor="injuries" className="sm:col-span-2">
            <textarea
              id="injuries"
              name="injuries"
              rows={2}
              defaultValue={client.profile.injuries}
              className={field}
            />
          </Field>
          <div className="sm:col-span-2">
            <SubmitButton pendingLabel={common("saving")}>{common("save")}</SubmitButton>
          </div>
        </form>

        <div className="flex flex-wrap gap-2 border-t border-cream/10 pt-4">
          <form action={resendInvite}>
            <input type="hidden" name="clientId" value={client.id} />
            <SubmitButton variant="ghost" pendingLabel={common("sending")}>
              {t("resendInvite")}
            </SubmitButton>
          </form>
          <form action={setStatus}>
            <input type="hidden" name="clientId" value={client.id} />
            <input
              type="hidden"
              name="status"
              value={client.status === "archived" ? "active" : "archived"}
            />
            {client.status === "archived" ? (
              <SubmitButton variant="ghost">{t("restore")}</SubmitButton>
            ) : (
              <button type="submit" className={buttonDanger}>
                {t("archive")}
              </button>
            )}
          </form>
        </div>
      </section>

      <section className={cn(surface, "space-y-3 p-6 ring-1 ring-caramel/25")}>
        <div>
          <h2 className={eyebrow}>{t("notesLabel")}</h2>
          <p className={muted}>{t("notesHint")}</p>
        </div>
        <form action={saveNotes} className="space-y-3">
          <input type="hidden" name="clientId" value={client.id} />
          <textarea
            name="notes"
            rows={5}
            defaultValue={client.profile.notes}
            className={field}
            aria-label={t("notesLabel")}
          />
          <SubmitButton variant="ghost" pendingLabel={common("saving")}>
            {common("save")}
          </SubmitButton>
        </form>
      </section>

      <nav className="flex flex-wrap gap-2" aria-label={t("profile")}>
        <Link href={`/app/coach/alunos/${client.id}/plano`} className={buttonGhost}>
          {t("goToPlan")}
        </Link>
        <Link href={`/app/coach/alunos/${client.id}/checkins`} className={buttonGhost}>
          {t("goToCheckins")}
        </Link>
        <Link href={`/app/coach/mensagens/${client.id}`} className={buttonGhost}>
          {t("goToMessages")}
        </Link>
        <Link href={`/app/coach/videos?aluno=${client.id}`} className={buttonGhost}>
          {t("goToVideos")}
        </Link>
      </nav>

      <section className="space-y-3">
        <h2 className={eyebrow}>{tProgress("history")}</h2>
        {history.length === 0 ? (
          <Empty title={tProgress("empty")} hint={tProgress("emptyHint")} />
        ) : (
          <ul className="space-y-2">
            {history.map((assignment) => (
              <li
                key={assignment.id}
                className={cn(surface, "flex items-center justify-between gap-4 p-4")}
              >
                <div className="min-w-0">
                  <p className="truncate font-sans text-sm text-cream">
                    {assignment.snapshot.name}
                  </p>
                  <p className={muted}>{formatDayKey(assignment.date, locale)}</p>
                </div>
                <span className={assignment.status === "done" ? chipAccent : chip}>
                  {tPlan(`status.${assignment.status}`)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
