import { getLocale } from "next-intl/server";
import { PlanCalendar } from "@/components/studio/calendar/PlanCalendar";
import type { SessionsByDay } from "@/components/studio/calendar/types";
import { requireCoach } from "@/lib/studio/auth";
import { dayKey, monthGrid, shiftDay, shiftMonth, weekKey } from "@/lib/studio/db";
import { studioAssignmentsBetween } from "@/lib/studio/plan";

const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;
const BASE = "/app/coach/calendario";

/**
 * The studio's calendar — every aluna's sessions on one grid, a month or a
 * week at a time.
 *
 * Read-only by design: assigning, moving and removing a workout all happen on
 * the aluna's own plan, and every session here links straight into that week.
 * This screen answers "when is the studio busy, and who slipped", which no
 * per-client page can.
 */
export default async function CoachCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ vista?: string; dia?: string }>;
}) {
  await requireCoach();

  const { vista, dia } = await searchParams;
  const view = vista === "semana" ? "week" : "month";

  // Noon UTC never rolls to a different Lisbon calendar day, so the anchor
  // stays stable regardless of the server's timezone. The NaN check still
  // guards a regex-matching but calendrically impossible value like 2026-02-31.
  const parsed = dia && DAY_KEY_RE.test(dia) ? new Date(`${dia}T12:00:00Z`) : null;
  const anchorDate = parsed && !Number.isNaN(parsed.getTime()) ? parsed : new Date();
  const anchor = dayKey(anchorDate);
  const month = anchor.slice(0, 7);
  const monday = weekKey(anchorDate);
  const today = dayKey();

  const days =
    view === "month" ? monthGrid(month) : Array.from({ length: 7 }, (_, i) => shiftDay(monday, i));

  const sessions: SessionsByDay = {};
  for (const assignment of studioAssignmentsBetween(days[0], days[days.length - 1])) {
    (sessions[assignment.date] ??= []).push({
      id: assignment.id,
      clientId: assignment.clientId,
      clientName: assignment.clientName,
      date: assignment.date,
      status: assignment.status,
      workoutName: assignment.snapshot.name,
      focus: assignment.snapshot.focus,
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
      days={days}
      month={view === "month" ? month : monday.slice(0, 7)}
      today={today}
      sessions={sessions}
      locale={await getLocale()}
      hrefs={hrefs}
    />
  );
}
