import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/studio/PageHeader";
import { WorkoutBuilder } from "@/components/studio/workout/WorkoutBuilder";
import { WorkoutSettings } from "@/components/studio/workout/WorkoutSettings";
import { requireBuilder } from "@/lib/studio/auth";
import { findWorkout, listExercises } from "@/lib/studio/library";

export const metadata: Metadata = {
  title: "Treino",
  robots: { index: false, follow: false },
};

/**
 * The workout builder, in a solo client's own chair: the same construction
 * screen the coach uses, on a template this person owns. `findWorkout` answers
 * only for the owner, so a coach's template or another client's copy reads as
 * not found rather than as something to edit.
 */
export default async function OwnWorkoutBuilderPage({
  params,
}: {
  params: Promise<{ workoutId: string }>;
}) {
  const builder = await requireBuilder();
  const { workoutId } = await params;

  const [workout, exercises, t] = await Promise.all([
    findWorkout(workoutId),
    listExercises(),
    getTranslations("Studio.workouts"),
  ]);
  if (!workout || workout.coachId !== builder.id || workout.clientId) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        backHref="/app/aluno/treinos"
        title={`${workout.name} · ${t(`type.${workout.workoutType}`)}`}
        action={<WorkoutSettings workout={workout} />}
      />
      <WorkoutBuilder workout={workout} exercises={exercises} />
    </div>
  );
}
