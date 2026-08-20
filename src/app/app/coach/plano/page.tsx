import { getLocale, getTranslations } from "next-intl/server";
import { parseDayKey } from "@/components/studio/plan/date";
import { Empty } from "@/components/studio/Empty";
import { PageHeader } from "@/components/studio/PageHeader";
import { PlanMatrix, type PlanMatrixRow } from "@/components/studio/week/PlanMatrix";
import { WeekNav } from "@/components/studio/week/WeekNav";
import { requireCoach } from "@/lib/studio/auth";
import { dayKey, shiftDay, weekKey } from "@/lib/studio/db";
import { adherence, assignmentsBetween } from "@/lib/studio/plan";
import { listClients } from "@/lib/studio/users";
import type { Assignment } from "@/lib/studio/types";

const WEEK_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The whole studio's week, at a glance — every aluna, Monday to Sunday, in
 * one scrollable board. Read-only: assigning and moving workouts still
 * happens on the per-client plan, this is just "who has what, who has
 * nothing".
 */
export default async function CoachPlanOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ semana?: string }>;
}) {
  await requireCoach();

  const { semana } = await searchParams;
  // Noon UTC never rolls to a different Lisbon calendar day, so this stays
  // stable regardless of the server's local timezone. `parsed` still guards
  // against a regex-matching but calendrically invalid value like 2026-13-40.
  const parsed = semana && WEEK_KEY_RE.test(semana) ? new Date(`${semana}T12:00:00Z`) : null;
  const monday = parsed && !Number.isNaN(parsed.getTime()) ? weekKey(parsed) : weekKey();
  const sunday = shiftDay(monday, 6);
  const today = dayKey();
  const days = Array.from({ length: 7 }, (_, i) => shiftDay(monday, i));

  const [t, locale] = await Promise.all([getTranslations("Studio.plan"), getLocale()]);

  const rows: PlanMatrixRow[] = listClients().map((client) => {
    const assignments = assignmentsBetween(client.id, monday, sunday);
    const byDate: Record<string, Assignment[]> = {};
    for (const assignment of assignments) {
      (byDate[assignment.date] ??= []).push(assignment);
    }
    return { client, byDate, adherence: adherence(client.id) };
  });

  const totalAssignments = rows.reduce(
    (sum, row) => sum + Object.values(row.byDate).reduce((n, list) => n + list.length, 0),
    0,
  );

  const rangeLabel = `${new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(parseDayKey(monday))} – ${new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(parseDayKey(sunday))}`;

  return (
    <div className="space-y-8">
      <PageHeader title={t("title")} lead={t("studioLead")} />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <WeekNav basePath="/app/coach/plano" monday={monday} t={t} />
        <p className="font-mono text-sm text-cream/55">{rangeLabel}</p>
      </div>

      {totalAssignments === 0 ? (
        <Empty title={t("empty")} hint={t("emptyHint")} />
      ) : (
        <PlanMatrix rows={rows} days={days} today={today} locale={locale} t={t} />
      )}
    </div>
  );
}
