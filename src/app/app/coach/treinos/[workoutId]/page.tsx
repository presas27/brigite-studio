import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/studio/PageHeader";
import { WorkoutBuilder } from "@/components/studio/workout/WorkoutBuilder";
import { WorkoutSettings } from "@/components/studio/workout/WorkoutSettings";
import { requireCoach } from "@/lib/studio/auth";
import { findWorkout, listExercises } from "@/lib/studio/library";

export const metadata: Metadata = {
  title: "Treino",
  robots: { index: false, follow: false },
};

/**
 * The workout builder: blocks of exercises, each block a grid you can drag
 * cards around in. The page holds no editing chrome of its own — every field
 * lives on the card or block it belongs to, so what you read is the workout
 * and not the form that produces it.
 */
export default async function WorkoutBuilderPage({
  params,
}: {
  params: Promise<{ workoutId: string }>;
}) {
  await requireCoach();
  const { workoutId } = await params;

  const workout = findWorkout(workoutId);
  if (!workout) notFound();

  const exercises = listExercises();

  return (
    <div className="space-y-6">
      <PageHeader
        backHref="/app/coach/treinos"
        title={workout.name}
        lead={workout.notes || undefined}
        action={<WorkoutSettings workout={workout} />}
      />
      <WorkoutBuilder workoutId={workout.id} blocks={workout.blocks} exercises={exercises} />
    </div>
  );
}
