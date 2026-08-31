import { getTranslations } from "next-intl/server";
import { requireClient } from "@/lib/studio/auth";
import { measurements } from "@/lib/studio/coaching";
import { progressPhotoWeeks } from "@/lib/studio/photos";
import { seriesFromMeasurements } from "@/lib/studio/analytics";
import { mockExerciseOptions } from "@/lib/studio/analyticsMock";
import { ProgressChart } from "@/components/studio/analytics/ProgressChart";
import { PageHeader } from "@/components/studio/PageHeader";

export default async function AlunoEvolucaoPage() {
  const client = await requireClient();
  const t = await getTranslations("Studio.evolucao");

  const [weightEntries, photoWeeks] = await Promise.all([
    measurements(client.id, "weight", 24),
    progressPhotoWeeks(client.id),
  ]);
  const weightSeries =
    weightEntries.length > 0
      ? seriesFromMeasurements(weightEntries, { id: "weight", unit: "kg", direction: "lower-is-better" })
      : null;

  return (
    <div className="space-y-8">
      <PageHeader title={t("title")} lead={t("lead")} />
      <ProgressChart
        weightSeries={weightSeries}
        exercises={mockExerciseOptions()}
        photoWeeks={photoWeeks}
      />
    </div>
  );
}
