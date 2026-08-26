import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
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
 * The workout builder: instructions, then a flat exercise list the coach
 * groups into supersets and circuits. The page holds no editing chrome of its
 * own — every field lives on the row or group it belongs to, so what you read
 * is the workout and not the form that produces it.
 */
export default async function WorkoutBuilderPage({
  params,
}: {
  params: Promise<{ workoutId: string }>;
}) {
  await requireCoach();
  const { workoutId } = await params;

  const [workout, exercises, t] = await Promise.all([
    findWorkout(workoutId),
    listExercises(),
    getTranslations("Studio.workouts"),
  ]);
  if (!workout) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        backHref="/app/coach/treinos"
        title={`${workout.name} · ${t(`type.${workout.workoutType}`)}`}
        lead={workout.notes || undefined}
        action={<WorkoutSettings workout={workout} />}
      />
      <WorkoutBuilder workout={workout} exercises={exercises} />
    </div>
  );
}
