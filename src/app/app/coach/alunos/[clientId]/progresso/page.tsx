import { redirect } from "next/navigation";
import { ProgressChart } from "@/components/studio/analytics/ProgressChart";
import { exerciseOptions, seriesFromMeasurements } from "@/lib/studio/analytics";
import { requireClientAccess } from "@/lib/studio/auth";
import { measurements } from "@/lib/studio/coaching";
import { progressPhotoWeeks } from "@/lib/studio/photos";
import { exerciseProgression } from "@/lib/studio/plan";

/**
 * Read-only view of one client's progress — the same chart the client sees on
 * their Evolução page: weight, any exercise they have logged, their photos.
 * Records and history live on the client's overview and sessions tabs.
 */
export default async function ClientProgressoPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const { viewer } = await requireClientAccess(clientId);
  if (viewer.role !== "coach") redirect("/app/aluno/evolucao");

  const [weightEntries, photoWeeks, progression] = await Promise.all([
    measurements(clientId, "weight", 52),
    progressPhotoWeeks(clientId),
    exerciseProgression(clientId),
  ]);
  const weightSeries =
    weightEntries.length > 0
      ? seriesFromMeasurements(weightEntries, { id: "weight", unit: "kg", direction: "neutral" })
      : null;

  return (
    <ProgressChart
      weightSeries={weightSeries}
      exercises={exerciseOptions(progression)}
      photoWeeks={photoWeeks}
    />
  );
}
