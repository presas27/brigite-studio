import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Empty } from "@/components/studio/Empty";
import { AssignPhaseModal } from "@/components/studio/plan/AssignPhaseModal";
import { AssignWorkoutModal } from "@/components/studio/plan/AssignWorkoutModal";
import { PhaseList } from "@/components/studio/plan/PhaseList";
import { UnscheduledList } from "@/components/studio/plan/UnscheduledList";
import { WeekGrid } from "@/components/studio/plan/WeekGrid";
import { Icon } from "@/components/studio/coach/icons";
import { heading } from "@/components/studio/theme";
import { requireClientAccess } from "@/lib/studio/auth";
import { dayKey, shiftDay, weekKey } from "@/lib/studio/dates";
import { listWorkouts } from "@/lib/studio/library";
import { listPhases } from "@/lib/studio/phases";
import { assignmentsBetween, unscheduledAssignments } from "@/lib/studio/plan";
import type { Assignment } from "@/lib/studio/types";
import { cn } from "@/lib/utils";
import { assign, createPhaseAction, markSkipped, move, remove } from "./actions";

const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** The day-range label in the period-nav pill — not interactive, just orientation. */
const weekRangeLabel = "rounded-full px-3 py-1.5 font-sans text-xs font-semibold text-cream/70";

/** Round prev/next icon button in the period-nav pill. */
const weekStepButton =
  "inline-flex h-8 w-8 items-center justify-center rounded-full text-cream/70 transition-colors hover:bg-cream/10 hover:text-cream";

export default async function CoachPlanPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<{ semana?: string }>;
}) {
  const { clientId } = await params;
  const { viewer } = await requireClientAccess(clientId);
  if (viewer.role !== "coach") redirect("/app/aluno");

  const sp = await searchParams;
  // Noon UTC never rolls to a different Lisbon calendar day, so this stays
  // stable regardless of the server's local timezone. `parsed` still guards
  // against a regex-matching but calendrically invalid value like 2026-13-40.
  const parsed = sp.semana && DAY_KEY_RE.test(sp.semana) ? new Date(`${sp.semana}T12:00:00Z`) : null;
  const monday = parsed && !Number.isNaN(parsed.getTime()) ? weekKey(parsed) : weekKey();
  const sunday = shiftDay(monday, 6);
  const today = dayKey();

  const [t, tPhases, tWorkouts, locale, workouts, phases, assignments, unscheduled] =
    await Promise.all([
      getTranslations("Studio.plan"),
      getTranslations("Studio.plan.phases"),
      getTranslations("Studio.workouts"),
      getLocale(),
      listWorkouts(),
      listPhases(clientId),
      assignmentsBetween(clientId, monday, sunday),
      unscheduledAssignments(clientId),
    ]);

  const byDate: Record<string, Assignment[]> = {};
  for (const assignment of assignments) {
    (byDate[assignment.date as string] ??= []).push(assignment);
  }
  const days = Array.from({ length: 7 }, (_, i) => shiftDay(monday, i));
  // Fixed dd/mm, not locale-formatted — this pill reads as a date stamp, not prose.
  const asDdMm = (key: string) => `${key.slice(8, 10)}/${key.slice(5, 7)}`;
  const weekRange = `${asDdMm(monday)} - ${asDdMm(sunday)}`;

  const assignAction = assign.bind(null, clientId);
  const removeAction = remove.bind(null, clientId);
  const markSkippedAction = markSkipped.bind(null, clientId);
  const moveAction = move.bind(null, clientId);
  const createPhase = createPhaseAction.bind(null, clientId);

  const basePath = `/app/coach/alunos/${clientId}/plano`;
  const weekHref = (key: string) => `${basePath}?semana=${key}`;

  return (
    <div className="space-y-6">
      {/* Phases say *what* the client trains right now; the week calendar
          below still says *when*. Phases lead the tab because a coach opens
          this page to see the plan's shape before its schedule. */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className={cn(heading, "text-lg")}>{tPhases("sectionTitle")}</h2>
          <AssignPhaseModal createAction={createPhase} compact />
        </div>
        {phases.length === 0 ? (
          <Empty title={tPhases("empty")} hint={tPhases("emptyHint")} />
        ) : (
          <PhaseList phases={phases} basePath={basePath} />
        )}
      </section>

      <hr className="border-cream/10" />

      {/* Week nav and the one action that changes the week, on the same row —
          the assign button used to head the tab on a line of its own, which on
          a phone meant a full screen width spent on one pill. */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-full bg-cream/5 p-1 ring-1 ring-cream/10">
          <Link href={weekHref(shiftDay(monday, -7))} aria-label={t("prevWeek")} className={weekStepButton}>
            <Icon name="chevron" className="h-4 w-4 rotate-180" />
          </Link>
          <span className={weekRangeLabel}>{weekRange}</span>
          <Link href={weekHref(shiftDay(monday, 7))} aria-label={t("nextWeek")} className={weekStepButton}>
            <Icon name="chevron" className="h-4 w-4" />
          </Link>
        </div>

        <AssignWorkoutModal
          workouts={workouts}
          defaultDate={monday}
          assignAction={assignAction}
          compact
        />
      </div>

      <UnscheduledList
        assignments={unscheduled}
        t={t}
        tWorkouts={tWorkouts}
        removeAction={removeAction}
        moveAction={moveAction}
      />

      {assignments.length === 0 ? (
        <Empty title={t("empty")} hint={t("emptyHint")} />
      ) : (
        <WeekGrid
          days={days}
          byDate={byDate}
          locale={locale}
          today={today}
          t={t}
          tWorkouts={tWorkouts}
          removeAction={removeAction}
          markSkippedAction={markSkippedAction}
          moveAction={moveAction}
        />
      )}
    </div>
  );
}
