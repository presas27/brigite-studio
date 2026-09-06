import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { saveNotes } from "@/app/app/coach/actions";
import { Icon } from "@/components/studio/coach/icons";
import { formatDayKey, formatMonthYear } from "@/components/studio/format";
import { Empty } from "@/components/studio/Empty";
import { SubmitButton } from "@/components/studio/SubmitButton";
import {
  buttonGhost,
  buttonOnAccent,
  chip,
  chipAccent,
  eyebrow,
  eyebrowOnAccent,
  field,
  heading,
  muted,
  mutedOnAccent,
  surface,
  surfaceAccent,
  surfaceLink,
} from "@/components/studio/theme";
import { requireClientAccess } from "@/lib/studio/auth";
import { weekKey } from "@/lib/studio/dates";
import { intakeResponseForClient } from "@/lib/studio/intake";
import { adherence, assignmentHistory, nextAssignment } from "@/lib/studio/plan";
import { cn } from "@/lib/utils";

/**
 * Value-over-label tile. Numbers get the display face, words get the body
 * face — Anton is drawn for short shouted things, and "Ago. de 2026" set in it
 * reads as a headline that happens to be a date.
 */
function Stat({ label, value, text }: { label: string; value: string; text?: boolean }) {
  return (
    <div className={cn(surface, "p-4")}>
      <p
        className={cn(
          "text-cream",
          text
            ? "font-sans text-base leading-snug font-semibold"
            : cn(heading, "text-[1.75rem] leading-none"),
        )}
      >
        {value}
      </p>
      <p className={cn(eyebrow, "mt-2 leading-snug")}>{label}</p>
    </div>
  );
}

/**
 * Overview tab — the answer to "where is this person at" without opening
 * anything else: what is next, how they are keeping up, what they came for,
 * what to be careful with, and Sara's own notes.
 */
export default async function ClientOverviewPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const { viewer, client } = await requireClientAccess(clientId);
  if (viewer.role !== "coach") redirect("/app/aluno");

  const [t, common, tPlan, tProgress, tIntake, locale, next, history, { done, total }, intake] = await Promise.all([
    getTranslations("Studio.clients"),
    getTranslations("Studio.common"),
    getTranslations("Studio.plan"),
    getTranslations("Studio.progress"),
    getTranslations("Studio.intake"),
    getLocale(),
    nextAssignment(client.id),
    assignmentHistory(client.id, 5),
    adherence(client.id),
    intakeResponseForClient(client.id),
  ]);
  const [lastSession] = history;
  const planHref = `/app/coach/alunos/${client.id}/plano`;
  const sessionsHref = `/app/coach/alunos/${client.id}/treinos`;
  const intakeHref = `/app/coach/alunos/${client.id}/inscricao`;

  return (
    <div className="space-y-6">
      {intake?.hasSensitiveAlerts && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.25rem] bg-silk/15 p-4 sm:p-5 ring-1 ring-silk/40 text-cream">
          <div className="flex items-start gap-3">
            <Icon name="alert" className="h-5 w-5 shrink-0 text-silk mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-sans text-sm font-semibold text-silk">
                {tIntake("healthAlertBadge")}
              </p>
              <p className="text-xs sm:text-sm text-cream/80 leading-relaxed">
                {tIntake("healthAlertBanner")}
              </p>
            </div>
          </div>
          <Link
            href={intakeHref}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-silk/20 px-3.5 py-1.5 font-sans text-xs font-semibold text-silk hover:bg-silk/30 transition-colors"
          >
            {tIntake("viewFull")}
            <Icon name="chevron" className="h-3 w-3" />
          </Link>
        </div>
      )}

      {/* The one gold surface here: what this client does next, or the nudge to book it. */}
      <section className={cn(surfaceAccent, "p-5 sm:p-6")}>
        <h2 className={eyebrowOnAccent}>{t("nextSession")}</h2>
        <p className={cn(heading, "mt-3 text-[1.75rem] sm:text-[2rem]")}>
          {next ? next.name : t("noNextSession")}
        </p>
        <p className={cn(mutedOnAccent, "mt-1")}>
          {next
            ? [formatDayKey(next.date, locale), next.focus].filter(Boolean).join(" · ")
            : t("noNextSessionHint")}
        </p>
        <Link
          href={next ? `${planHref}?semana=${weekKey(new Date(`${next.date}T12:00:00Z`))}` : planHref}
          className={cn(buttonOnAccent, "mt-5 px-5 py-2.5 text-xs")}
        >
          {t("openPlan")}
        </Link>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={tProgress("adherence")} value={`${done}/${total}`} />
        <Stat
          label={t("lastSession")}
          value={lastSession?.date ? formatDayKey(lastSession.date, locale) : t("never")}
          text={!lastSession}
        />
        <Stat label={t("planLabel")} value={t(`plan.${client.profile.plan}`)} text />
        {client.profile.plan === "personal" ? (
          <Stat label={t("sessionsLeft")} value={String(client.profile.sessionsLeft)} />
        ) : (
          <Stat
            label={t("memberSince")}
            value={
              client.profile.startedAt
                ? formatMonthYear(client.profile.startedAt, locale)
                : common("none")
            }
            text
          />
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <article className={cn(surface, "space-y-2 p-5")}>
          <h2 className={eyebrow}>{t("goalsLabel")}</h2>
          <p
            className={cn(
              "text-sm leading-relaxed whitespace-pre-line",
              client.profile.goals ? "text-cream/80" : "text-cream/40",
            )}
          >
            {client.profile.goals || t("goalsEmpty")}
          </p>
        </article>
        <article className={cn(surface, "space-y-2 p-5")}>
          <h2 className={eyebrow}>{t("injuriesLabel")}</h2>
          <p
            className={cn(
              "text-sm leading-relaxed whitespace-pre-line",
              client.profile.injuries ? "text-cream/80" : "text-cream/40",
            )}
          >
            {client.profile.injuries || t("injuriesEmpty")}
          </p>
        </article>
      </div>

      <section className={cn(surface, "space-y-4 p-5 sm:p-6")}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className={eyebrow}>{tIntake("responseTitle")}</h2>
            {intake && (
              <p className={cn(muted, "mt-0.5 text-xs")}>
                {tIntake("submittedAt", {
                  date: formatDayKey(new Date(intake.submittedAt).toISOString().slice(0, 10), locale),
                })}
              </p>
            )}
          </div>
          {intake?.hasSensitiveAlerts && (
            <span className="rounded-full bg-silk/20 px-2.5 py-0.5 font-sans text-xs font-semibold text-silk ring-1 ring-silk/30">
              {tIntake("healthAlertBadge")}
            </span>
          )}
        </div>

        {intake ? (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[0.9rem] bg-cream/[0.03] p-3.5 ring-1 ring-cream/10">
                <p className="font-sans text-xs font-medium text-cream/50">{tIntake("secGoals")}</p>
                <p className="mt-1 line-clamp-2 font-sans text-sm font-semibold text-cream">
                  {intake.answers.find((a) => a.fieldId === "fitness_goals")?.value.replace(/\n/g, ", ") || common("none")}
                </p>
              </div>
              <div className="rounded-[0.9rem] bg-cream/[0.03] p-3.5 ring-1 ring-cream/10">
                <p className="font-sans text-xs font-medium text-cream/50">{tIntake("secHealth")}</p>
                <p className={cn("mt-1 font-sans text-sm font-semibold", intake.hasSensitiveAlerts ? "text-silk" : "text-cream")}>
                  {intake.hasSensitiveAlerts
                    ? `${intake.sensitiveCount} ${tIntake("healthAlertBadge").toLowerCase()}`
                    : common("none")}
                </p>
              </div>
              <div className="rounded-[0.9rem] bg-cream/[0.03] p-3.5 ring-1 ring-cream/10">
                <p className="font-sans text-xs font-medium text-cream/50">{tIntake("secConsent")}</p>
                <p className="mt-1 font-sans text-sm font-semibold text-accent-ink flex items-center gap-1.5">
                  <Icon name="check" className="h-4 w-4" />
                  {tIntake("consentConfirmed")}
                </p>
              </div>
            </div>

            <div className="pt-1">
              <Link
                href={intakeHref}
                className={cn(buttonGhost, "inline-flex items-center gap-1.5 text-xs px-4 py-2")}
              >
                {tIntake("viewAnswers", { count: intake.answers.length })}
                <Icon name="chevron" className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        ) : (
          <p className="text-sm text-cream/40">{tIntake("responseEmpty")}</p>
        )}
      </section>

      <section className={cn(surface, "space-y-3 p-5 ring-1 ring-caramel/25 sm:p-6")}>
        <div>
          <h2 className={eyebrow}>{t("notesLabel")}</h2>
          <p className={muted}>{t("notesHint")}</p>
        </div>
        <form action={saveNotes} className="space-y-3">
          <input type="hidden" name="clientId" value={client.id} />
          <textarea
            name="notes"
            rows={4}
            defaultValue={client.profile.notes}
            className={field}
            aria-label={t("notesLabel")}
          />
          <SubmitButton variant="ghost" className="px-5 py-2.5 text-xs" pendingLabel={common("saving")}>
            {common("save")}
          </SubmitButton>
        </form>
      </section>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className={eyebrow}>{tProgress("history")}</h2>
          {history.length > 0 && (
            <Link href={sessionsHref} className="font-sans text-xs text-accent-ink hover:underline">
              {tProgress("openSessions")}
            </Link>
          )}
        </div>
        {history.length === 0 ? (
          <Empty title={tProgress("empty")} hint={tProgress("emptyHint")} />
        ) : (
          <ul className="space-y-2">
            {history.map((assignment) => (
              <li key={assignment.id}>
                {/* Every row opens that session's report — a list of past
                    workouts you cannot open is a list of things you have to
                    take on trust. */}
                <Link
                  href={`${sessionsHref}/${assignment.id}`}
                  className={cn(surfaceLink, "flex items-center justify-between gap-4 p-4")}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-sans text-sm text-cream">
                      {assignment.name}
                    </span>
                    {assignment.date && (
                      <span className={cn(muted, "block")}>
                        {formatDayKey(assignment.date, locale)}
                      </span>
                    )}
                  </span>
                  <span className={assignment.status === "done" ? chipAccent : chip}>
                    {tPlan(`status.${assignment.status}`)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
