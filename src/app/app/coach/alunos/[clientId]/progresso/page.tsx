import { redirect } from "next/navigation";
import { measurements } from "@/lib/studio/coaching";
import { seriesFromMeasurements } from "@/lib/studio/analytics";
import { mockExerciseOptions } from "@/lib/studio/analyticsMock";
import { ProgressChart } from "@/components/studio/analytics/ProgressChart";
import { progressPhotoWeeks } from "@/lib/studio/photos";
import { requireClientAccess } from "@/lib/studio/auth";

/**
 * Read-only view of one client's progress — one filterable card (weight, an
 * exercise's reps/effort, or her progress photos) instead of a fixed
 * dashboard. Weight and photos are real data; exercise reps/effort are still
 * mock, same as the aluno's own tab.
 */
export default async function ClientProgressoPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const { viewer } = await requireClientAccess(clientId);
  if (viewer.role !== "coach") redirect("/app/aluno/evolucao");

  const [weightEntries, photoWeeks] = await Promise.all([
    measurements(clientId, "weight", 24),
    progressPhotoWeeks(clientId),
  ]);
  const weightSeries =
    weightEntries.length > 0
      ? seriesFromMeasurements(weightEntries, { id: "weight", unit: "kg", direction: "lower-is-better" })
      : null;

  return (
    <ProgressChart
      weightSeries={weightSeries}
      exercises={mockExerciseOptions()}
      photoWeeks={photoWeeks}
    />
  );
}
