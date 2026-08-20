import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Empty } from "@/components/studio/Empty";
import { PageHeader } from "@/components/studio/PageHeader";
import { SubmitButton } from "@/components/studio/SubmitButton";
import { AssignPanel } from "@/components/studio/plan/AssignPanel";
import { DayColumn } from "@/components/studio/plan/DayColumn";
import { buttonGhost, surface } from "@/components/studio/theme";
import { cn } from "@/lib/utils";
import { requireClientAccess } from "@/lib/studio/auth";
import { dayKey, shiftDay, weekKey } from "@/lib/studio/db";
import { listWorkouts } from "@/lib/studio/library";
import { assignmentsBetween } from "@/lib/studio/plan";
import type { Assignment } from "@/lib/studio/types";
import { assign, markSkipped, move, remove, repeat } from "./actions";

const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

export default async function CoachPlanPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<{ semana?: string; repetido?: string }>;
}) {
  const { clientId } = await params;
  const { viewer, client } = await requireClientAccess(clientId);
  if (viewer.role !== "coach") redirect("/app/aluno");

  const sp = await searchParams;
  // Noon UTC never rolls to a different Lisbon calendar day, so this stays
  // stable regardless of the server's local timezone. `parsed` still guards
  // against a regex-matching but calendrically invalid value like 2026-13-40.
  const parsed = sp.semana && DAY_KEY_RE.test(sp.semana) ? new Date(`${sp.semana}T12:00:00Z`) : null;
  const monday = parsed && !Number.isNaN(parsed.getTime()) ? weekKey(parsed) : weekKey();
  const sunday = shiftDay(monday, 6);
  const today = dayKey();
  const repeated = sp.repetido ? Number(sp.repetido) : undefined;

  const [t, tWorkouts, locale] = await Promise.all([
    getTranslations("Studio.plan"),
    getTranslations("Studio.workouts"),
    getLocale(),
  ]);

  const workouts = listWorkouts();
  const assignments = assignmentsBetween(clientId, monday, sunday);

  const byDate: Record<string, Assignment[]> = {};
  for (const assignment of assignments) {
    (byDate[assignment.date] ??= []).push(assignment);
  }
  const days = Array.from({ length: 7 }, (_, i) => shiftDay(monday, i));

  const assignAction = assign.bind(null, clientId);
  const removeAction = remove.bind(null, clientId);
  const markSkippedAction = markSkipped.bind(null, clientId);
  const moveAction = move.bind(null, clientId);
  const repeatAction = repeat.bind(null, clientId);

  const basePath = `/app/coach/alunos/${clientId}/plano`;

  return (
    <div className="space-y-8">
      <PageHeader
        kicker={client.name}
        title={t("title")}
        lead={t("lead", { name: client.name })}
        backHref={`/app/coach/alunos/${clientId}`}
      />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <nav className="flex flex-wrap items-center gap-2">
          <Link href={`${basePath}?semana=${shiftDay(monday, -7)}`} className={buttonGhost}>
            {t("prevWeek")}
          </Link>
          <Link href={`${basePath}?semana=${weekKey()}`} className={buttonGhost}>
            {t("thisWeek")}
          </Link>
          <Link href={`${basePath}?semana=${shiftDay(monday, 7)}`} className={buttonGhost}>
            {t("nextWeek")}
          </Link>
        </nav>
        <div className="flex flex-wrap items-center gap-2">
          <form action={repeatAction}>
            <input type="hidden" name="monday" value={monday} />
            <SubmitButton variant="ghost" pendingLabel={t("repeatWeek")}>
              {t("repeatWeek")}
            </SubmitButton>
          </form>
          <AssignPanel workouts={workouts} defaultDate={monday} assignAction={assignAction} />
        </div>
      </div>

      {repeated != null && repeated > 0 && (
        <p className={cn(surface, "px-4 py-3 text-sm text-cream/80")}>{t("repeated", { count: repeated })}</p>
      )}

      {assignments.length === 0 ? (
        <Empty title={t("empty")} hint={t("emptyHint")} />
      ) : (
        <div className="space-y-3">
          {days.map((date) => (
            <DayColumn
              key={date}
              date={date}
              assignments={byDate[date] ?? []}
              locale={locale}
              isToday={date === today}
              t={t}
              tWorkouts={tWorkouts}
              removeAction={removeAction}
              markSkippedAction={markSkippedAction}
              moveAction={moveAction}
            />
          ))}
        </div>
      )}
    </div>
  );
}
