import { getLocale, getTranslations } from "next-intl/server";
import { measurements } from "@/lib/studio/coaching";
import { bmiCategory, formatSigned, mergeBodyMetrics } from "@/lib/studio/bodyMetrics";
import { Empty } from "@/components/studio/Empty";
import {
  chip,
  eyebrow,
  eyebrowOnAccent,
  heading,
  mutedOnAccent,
  surface,
  surfaceAccent,
} from "@/components/studio/theme";
import { cn } from "@/lib/utils";

const HISTORY_LIMIT = 24;

/** BMI headline + weight/height history for the aluno's own Medidas tab, below the entry form. */
export async function BodyMetricsPanel({ clientId }: { clientId: string }) {
  const t = await getTranslations("Studio.medidas");
  const common = await getTranslations("Studio.common");
  const locale = await getLocale();

  const weightEntries = measurements(clientId, "weight", HISTORY_LIMIT);
  const heightEntries = measurements(clientId, "height", HISTORY_LIMIT);
  const entries = mergeBodyMetrics(weightEntries, heightEntries);
  const dateFormat = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" });

  const latest = entries[0];
  const weightDeltaKg =
    weightEntries.length > 1 ? weightEntries[0].value - weightEntries[1].value : null;
  const weightDeltaPct =
    weightDeltaKg != null ? (weightDeltaKg / weightEntries[1].value) * 100 : null;

  return (
    <div className="space-y-8">
      {latest?.bmi != null && (
        <div className={cn(surfaceAccent, "p-6 sm:p-8")}>
          <p className={eyebrowOnAccent}>{t("bmiLabel")}</p>
          <p className={cn(heading, "mt-2 text-[2.5rem] sm:text-[3.25rem]")}>
            {latest.bmi.toFixed(1)}
          </p>
          <p className={mutedOnAccent}>{t(`bmiCategory.${bmiCategory(latest.bmi)}`)}</p>
          {weightDeltaKg != null && weightDeltaPct != null && (
            <p className={cn(mutedOnAccent, "mt-1")}>
              {t("weightDelta", {
                delta: `${formatSigned(weightDeltaKg)} ${common("kg")}`,
                pct: formatSigned(weightDeltaPct),
              })}
            </p>
          )}
        </div>
      )}

      <section className="space-y-3">
        <h2 className={eyebrow}>{t("history")}</h2>
        {entries.length === 0 ? (
          <Empty title={t("empty")} hint={t("emptyHint")} />
        ) : (
          <ul className="space-y-2">
            {entries.map((entry) => (
              <li
                key={entry.date}
                className={cn(surface, "flex flex-wrap items-center justify-between gap-3 p-4")}
              >
                <span className="font-sans text-sm font-semibold text-cream">
                  {dateFormat.format(new Date(`${entry.date}T12:00:00`))}
                </span>
                <div className="flex flex-wrap gap-2">
                  {entry.weightKg != null && (
                    <span className={chip}>
                      {entry.weightKg} {common("kg")}
                    </span>
                  )}
                  {entry.heightCm != null && (
                    <span className={chip}>
                      {entry.heightCm} {common("cm")}
                    </span>
                  )}
                  {entry.bmi != null && (
                    <span className={chip}>
                      {t("bmiShort")} {entry.bmi.toFixed(1)}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
