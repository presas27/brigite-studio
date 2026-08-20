import { getLocale, getTranslations } from "next-intl/server";
import { PlanCalendar } from "@/components/studio/calendar/PlanCalendar";
import type { SessionsByDay } from "@/components/studio/calendar/types";
import { requireClient } from "@/lib/studio/auth";
import { dayKey, monthGrid, shiftDay, shiftMonth, weekKey } from "@/lib/studio/db";
import { assignmentsBetween } from "@/lib/studio/plan";

const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;
const BASE = "/app/aluno/plano";

/**
 * The aluna's own calendar — her month, or her week, on the same grid Sara
 * uses for the whole studio.
 *
 * Read-only, and named differently: the studio's calendar answers "who is
 * training", so a cell carries a name; this one is one person's month, so a
 * cell carries the workout. Every session links straight into its logger.
 */
export default async function AlunoPlanoPage({
  searchParams,
}: {
  searchParams: Promise<{ vista?: string; dia?: string; semana?: string }>;
}) {
  const client = await requireClient();
  const [t, locale] = await Promise.all([getTranslations("Studio.aluno"), getLocale()]);

  const { vista, dia, semana } = await searchParams;
  const view = vista === "semana" ? "week" : "month";

  // `?semana=` is what the old week-list plan used; keeping it as an alias
  // means an emailed or bookmarked link still lands on the right week.
  const anchorKey = dia ?? semana;
  // Noon UTC never rolls to a different Lisbon calendar day, so the anchor
  // stays stable regardless of the server's timezone. The NaN check still
  // guards a regex-matching but calendrically impossible value like 2026-02-31.
  const parsed = anchorKey && DAY_KEY_RE.test(anchorKey) ? new Date(`${anchorKey}T12:00:00Z`) : null;
  const anchorDate = parsed && !Number.isNaN(parsed.getTime()) ? parsed : new Date();
  const anchor = dayKey(anchorDate);
  const month = anchor.slice(0, 7);
  const monday = weekKey(anchorDate);
  const today = dayKey();

  const days =
    view === "month" ? monthGrid(month) : Array.from({ length: 7 }, (_, i) => shiftDay(monday, i));

  const sessions: SessionsByDay = {};
  for (const assignment of assignmentsBetween(client.id, days[0], days[days.length - 1])) {
    (sessions[assignment.date] ??= []).push({
      id: assignment.id,
      clientId: client.id,
      clientName: client.name,
      date: assignment.date,
      status: assignment.status,
      workoutName: assignment.snapshot.name,
      focus: assignment.snapshot.focus,
      href: `/app/aluno/treino/${assignment.id}`,
    });
  }

  // Switching month -> week lands on the week you are most likely to want:
  // this one if it is in the month on screen, otherwise the month's first.
  const weekAnchor = view === "month" ? (today.startsWith(month) ? today : `${month}-01`) : monday;

  const hrefs = {
    prev:
      view === "month"
        ? `${BASE}?dia=${shiftMonth(month, -1)}-01`
        : `${BASE}?vista=semana&dia=${shiftDay(monday, -7)}`,
    next:
      view === "month"
        ? `${BASE}?dia=${shiftMonth(month, 1)}-01`
        : `${BASE}?vista=semana&dia=${shiftDay(monday, 7)}`,
    today: view === "month" ? BASE : `${BASE}?vista=semana`,
    month: `${BASE}?dia=${view === "month" ? `${month}-01` : monday}`,
    week: `${BASE}?vista=semana&dia=${weekAnchor}`,
  };

  return (
    <PlanCalendar
      // Remounting on a period change resets the selected day and replays the
      // grid's entrance, which is what makes paging read as a page turn.
      key={`${view}-${days[0]}`}
      view={view}
      subject="workout"
      eyebrowLabel={t("planTitle")}
      dayEmptyTitle={t("planDayEmpty")}
      dayEmptyHint={t("planDayEmptyHint")}
      days={days}
      month={view === "month" ? month : monday.slice(0, 7)}
      today={today}
      sessions={sessions}
      locale={locale}
      hrefs={hrefs}
    />
  );
}
