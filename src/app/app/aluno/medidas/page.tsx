import { getTranslations } from "next-intl/server";
import { requireClient } from "@/lib/studio/auth";
import { measurements } from "@/lib/studio/coaching";
import { BodyMetricsPanel } from "@/components/studio/body-metrics/BodyMetricsPanel";
import { Field } from "@/components/studio/Field";
import { PageHeader } from "@/components/studio/PageHeader";
import { SubmitButton } from "@/components/studio/SubmitButton";
import { field, surface } from "@/components/studio/theme";
import { cn } from "@/lib/utils";
import { submit } from "./actions";

export default async function AlunoMedidasPage() {
  const client = await requireClient();
  const t = await getTranslations("Studio.medidas");
  const common = await getTranslations("Studio.common");

  const lastWeight = measurements(client.id, "weight", 1)[0]?.value ?? "";
  const lastHeight = measurements(client.id, "height", 1)[0]?.value ?? "";

  return (
    <div className="space-y-8">
      <PageHeader title={t("title")} lead={t("lead")} />

      <form action={submit} className={cn(surface, "space-y-6 p-5 sm:p-6")}>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={t("weightLabel")} htmlFor="medidas-weight" required>
            <input
              id="medidas-weight"
              name="weightKg"
              type="number"
              step="0.1"
              min="0"
              inputMode="decimal"
              required
              defaultValue={lastWeight}
              className={field}
            />
          </Field>
          <Field label={t("heightLabel")} htmlFor="medidas-height" required>
            <input
              id="medidas-height"
              name="heightCm"
              type="number"
              step="0.1"
              min="0"
              inputMode="decimal"
              required
              defaultValue={lastHeight}
              className={field}
            />
          </Field>
        </div>
        <SubmitButton pendingLabel={common("saving")}>{t("submit")}</SubmitButton>
      </form>

      <BodyMetricsPanel clientId={client.id} />
    </div>
  );
}
