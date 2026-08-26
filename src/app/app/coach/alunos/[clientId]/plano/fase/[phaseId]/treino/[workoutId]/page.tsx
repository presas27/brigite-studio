import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/studio/PageHeader";
import { WorkoutBuilder } from "@/components/studio/workout/WorkoutBuilder";
import { WorkoutSettings } from "@/components/studio/workout/WorkoutSettings";
import { requireClientAccess } from "@/lib/studio/auth";
import { findWorkout, listExercises } from "@/lib/studio/library";

export const metadata: Metadata = {
  title: "Treino",
  robots: { index: false, follow: false },
};

/**
 * The same builder as the library, pointed at one client's own copy of a
 * workout. The lead line says out loud what the model already guarantees:
 * nothing edited here can reach back into the template it came from.
 */
export default async function PhaseWorkoutPage({
  params,
}: {
  params: Promise<{ clientId: string; phaseId: string; workoutId: string }>;
}) {
  const { clientId, phaseId, workoutId } = await params;
  const { viewer } = await requireClientAccess(clientId);
  if (viewer.role !== "coach") redirect("/app/aluno");

  const workout = findWorkout(workoutId);
  if (!workout || workout.clientId !== clientId || workout.phaseId !== phaseId) notFound();

  const exercises = listExercises();
  const [t, tPhases] = await Promise.all([
    getTranslations("Studio.workouts"),
    getTranslations("Studio.plan.phases"),
  ]);

  const phasePath = `/app/coach/alunos/${clientId}/plano/fase/${phaseId}`;

  return (
    <div className="space-y-6">
      <PageHeader
        backHref={phasePath}
        title={`${workout.name} · ${t(`type.${workout.workoutType}`)}`}
        lead={tPhases("clientCopyHint")}
        action={<WorkoutSettings workout={workout} />}
      />
      <WorkoutBuilder workout={workout} exercises={exercises} />
    </div>
  );
}
