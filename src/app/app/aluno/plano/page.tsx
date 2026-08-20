import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { requireClient } from "@/lib/studio/auth";
import { dayKey, shiftDay, weekKey } from "@/lib/studio/db";
import { assignmentsBetween } from "@/lib/studio/plan";
import type { Assignment } from "@/lib/studio/types";
import { Empty } from "@/components/studio/Empty";
import { PageHeader } from "@/components/studio/PageHeader";
import { buttonGhost, chip, muted, surface, surfaceLink } from "@/components/studio/theme";
import { cn } from "@/lib/utils";

const WEEK_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The client's own week, read-only. Same `?semana=` week navigation as the
 * coach's plan view, minus anything that mutates — a client can look at their
 * plan, not edit it.
 */
export default async function AlunoPlanoPage({
  searchParams,
}: {
  searchParams: Promise<{ semana?: string }>;
}) {
  const client = await requireClient();
  const t = await getTranslations("Studio");
  const locale = await getLocale();
  const { semana } = await searchParams;

  const monday = semana && WEEK_KEY_RE.test(semana) ? semana : weekKey();
  const sunday = shiftDay(monday, 6);
  const assignments = assignmentsBetween(client.id, monday, sunday);

  const byDate = new Map<string, Assignment[]>();
  for (const assignment of assignments) {
    byDate.set(assignment.date, [...(byDate.get(assignment.date) ?? []), assignment]);
  }

  const today = dayKey();
  const days = Array.from({ length: 7 }, (_, offset) => shiftDay(monday, offset));
  const dayFormat = new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short" });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("plan.title")}
        action={
          <div className="flex items-center gap-2">
            <Link
              href={`/app/aluno/plano?semana=${shiftDay(monday, -7)}`}
              className={cn(buttonGhost, "px-4 py-2 text-xs")}
            >
              {t("plan.prevWeek")}
            </Link>
            {monday !== weekKey() && (
              <Link href="/app/aluno/plano" className={cn(buttonGhost, "px-4 py-2 text-xs")}>
                {t("plan.thisWeek")}
              </Link>
            )}
            <Link
              href={`/app/aluno/plano?semana=${shiftDay(monday, 7)}`}
              className={cn(buttonGhost, "px-4 py-2 text-xs")}
            >
              {t("plan.nextWeek")}
            </Link>
          </div>
        }
      />

      {assignments.length === 0 ? (
        <Empty title={t("session.planEmpty")} hint={t("session.planEmptyHint")} />
      ) : (
        <ul className="space-y-2">
          {days.map((date) => {
            const sessions = byDate.get(date) ?? [];
            return (
              <li key={date} className={cn(surface, "p-4", date === today && "ring-caramel/40")}>
                <p className={cn(muted, "mb-2 capitalize")}>
                  {dayFormat.format(new Date(`${date}T12:00:00`))}
                </p>
                {sessions.length === 0 ? (
                  <p className="text-sm text-cream/45">{t("plan.restDay")}</p>
                ) : (
                  <div className="space-y-2">
                    {sessions.map((assignment) => (
                      <Link
                        key={assignment.id}
                        href={`/app/aluno/treino/${assignment.id}`}
                        className={cn(surfaceLink, "flex items-center justify-between gap-3 p-3")}
                      >
                        <span className="text-sm text-cream/85">{assignment.snapshot.name}</span>
                        <span className={chip}>{t(`plan.status.${assignment.status}`)}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
