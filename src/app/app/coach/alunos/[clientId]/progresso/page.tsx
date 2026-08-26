import { redirect } from "next/navigation";
import { measurements } from "@/lib/studio/coaching";
import { seriesFromMeasurements } from "@/lib/studio/analytics";
import { mockExerciseOptions } from "@/lib/studio/analyticsMock";
import { ProgressChart } from "@/components/studio/analytics/ProgressChart";
import { requireClientAccess } from "@/lib/studio/auth";

/**
 * Read-only view of one client's numbers — one filterable chart (weight, or
 * an exercise's reps/effort) instead of a fixed dashboard. Weight is real
 * data; exercise reps/effort are still mock, same as the aluno's own tab.
 */
export default async function ClientProgressoPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const { viewer } = await requireClientAccess(clientId);
  if (viewer.role !== "coach") redirect("/app/aluno/evolucao");

  const weightEntries = await measurements(clientId, "weight", 24);
  const weightSeries =
    weightEntries.length > 0
      ? seriesFromMeasurements(weightEntries, { id: "weight", unit: "kg", direction: "lower-is-better" })
      : null;

  return <ProgressChart weightSeries={weightSeries} exercises={mockExerciseOptions()} />;
}
