import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Empty } from "@/components/studio/Empty";
import { PageHeader } from "@/components/studio/PageHeader";
import { AddWorkoutToPhaseModal } from "@/components/studio/plan/AddWorkoutToPhaseModal";
import { PhaseSettings } from "@/components/studio/plan/PhaseSettings";
import { PhaseWorkoutList } from "@/components/studio/plan/PhaseWorkoutList";
import { requireClientAccess } from "@/lib/studio/auth";
import { listWorkouts } from "@/lib/studio/library";
import { findPhase, listPhases, phaseWorkouts } from "@/lib/studio/phases";
import {
  addFromLibraryAction,
  buildWorkoutAction,
  copyWorkoutToLibraryAction,
  removeWorkoutAction,
  scheduleWorkoutAction,
  setWorkoutHiddenAction,
} from "./actions";
import { deletePhaseAction, updatePhaseAction } from "../../actions";

export const metadata: Metadata = {
  title: "Fase",
  robots: { index: false, follow: false },
};

/**
 * One training phase: the workouts it's built from, in the coach's order.
 * Everything a coach does here — add from the library, build from scratch,
 * schedule, remove — stays scoped to this phase and this client; the actions
 * bound below enforce that on every write.
 */
export default async function PhasePage({
  params,
}: {
  params: Promise<{ clientId: string; phaseId: string }>;
}) {
  const { clientId, phaseId } = await params;
  const [{ viewer }, phase, workouts, libraryWorkouts, phases, tPhases, common, locale] =
    await Promise.all([
      requireClientAccess(clientId),
      findPhase(phaseId),
      phaseWorkouts(phaseId),
      listWorkouts(),
      listPhases(clientId),
      getTranslations("Studio.plan.phases"),
      getTranslations("Studio.common"),
      getLocale(),
    ]);
  if (viewer.role !== "coach") redirect("/app/aluno");
  if (!phase || phase.clientId !== clientId) notFound();

  const index = phases.findIndex((candidate) => candidate.id === phaseId) + 1;

  // Full, year-inclusive dates here — this is the one place a coach checks
  // exactly when a phase runs, unlike the dd/mm week-nav pill on the plan tab.
  const dateFormat = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const formatDate = (value: string) => dateFormat.format(new Date(`${value}T12:00:00Z`));

  const durationLine =
    phase.durationType === "calendar"
      ? `${phase.startDate ? formatDate(phase.startDate) : common("none")} - ${
          phase.endDate ? formatDate(phase.endDate) : common("none")
        } · ${tPhases("durationType.calendar")}`
      : `${tPhases("weeksValue", { count: phase.weeks ?? 0 })} · ${tPhases("durationType.weeks")}`;

  const phaseTitle = tPhases("phaseTitle", { index, name: phase.name });
  const planPath = `/app/coach/alunos/${clientId}/plano`;
  const basePath = `${planPath}/fase/${phaseId}`;

  return (
    <div className="space-y-6">
      <PageHeader
        backHref={planPath}
        title={phaseTitle}
        lead={durationLine}
        action={
          <>
            <PhaseSettings
              phase={phase}
              updateAction={updatePhaseAction.bind(null, clientId)}
              deleteAction={deletePhaseAction.bind(null, clientId)}
            />
            <AddWorkoutToPhaseModal
              phaseTitle={phaseTitle}
              workouts={libraryWorkouts}
              fromLibraryAction={addFromLibraryAction.bind(null, clientId, phaseId)}
              buildAction={buildWorkoutAction.bind(null, clientId, phaseId)}
            />
          </>
        }
      />
      {workouts.length === 0 ? (
        <Empty title={tPhases("workoutsEmpty")} hint={tPhases("workoutsEmptyHint")} />
      ) : (
        <PhaseWorkoutList
          workouts={workouts}
          basePath={basePath}
          removeAction={removeWorkoutAction.bind(null, clientId, phaseId)}
          copyAction={copyWorkoutToLibraryAction.bind(null, clientId, phaseId)}
          hideAction={setWorkoutHiddenAction.bind(null, clientId, phaseId)}
          scheduleAction={scheduleWorkoutAction.bind(null, clientId, phaseId)}
          canRepeatWeekly={
            Boolean(phase.startDate && phase.endDate) || Boolean(phase.weeks && phase.weeks > 0)
          }
        />
      )}
    </div>
  );
}
