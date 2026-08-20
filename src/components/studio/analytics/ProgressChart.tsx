"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { MockExerciseOption } from "@/lib/studio/analyticsMock";
import type { MetricSeries } from "@/lib/studio/analytics";
import { formatSigned } from "@/lib/studio/bodyMetrics";
import { Empty } from "@/components/studio/Empty";
import { chip, field, heading, surface } from "@/components/studio/theme";
import { cn } from "@/lib/utils";
import { MetricChart } from "./MetricChart";

type MetricKind = "weight" | "exercise";
type ExerciseMeasure = "reps" | "effort";
type ChartType = "line" | "bar";

function Pill<T extends string>({
  value,
  options,
  onChangeAction,
  groupLabel,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChangeAction: (value: T) => void;
  groupLabel: string;
}) {
  return (
    <div
      role="group"
      aria-label={groupLabel}
      className="inline-flex items-center gap-1 rounded-full bg-cream/5 p-1 ring-1 ring-cream/10"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChangeAction(option.value)}
          className={cn(
            "rounded-full px-3 py-1.5 font-sans text-xs font-semibold whitespace-nowrap transition-colors",
            value === option.value ? "bg-caramel/20 text-accent-ink" : "text-cream/50 hover:text-cream",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/**
 * One chart, filtered instead of three fixed cards: pick the metric (weight,
 * or an exercise's reps/effort), then how to draw it (line or bar). Weight is
 * real per-client data (`seriesFromMeasurements`, passed in from the server);
 * exercise reps/effort are still `analyticsMock` until that's wired up too.
 */
export function ProgressChart({
  weightSeries,
  exercises,
}: {
  weightSeries: MetricSeries | null;
  exercises: MockExerciseOption[];
}) {
  const t = useTranslations("Studio.evolucao");
  const tProgress = useTranslations("Studio.progress");
  const locale = useLocale();

  const [metric, setMetric] = useState<MetricKind>("weight");
  const [exerciseId, setExerciseId] = useState(exercises[0]?.id ?? "");
  const [measure, setMeasure] = useState<ExerciseMeasure>("reps");
  const [chartType, setChartType] = useState<ChartType>("line");

  const exercise = exercises.find((option) => option.id === exerciseId) ?? exercises[0];
  const series = metric === "weight" ? weightSeries : (exercise?.[measure] ?? null);
  const title =
    metric === "weight"
      ? t("weightMetric")
      : `${exercise?.name ?? ""} — ${t(measure === "reps" ? "measureReps" : "measureEffort")}`;

  const points = series?.points ?? [];
  const latest = points[points.length - 1];
  const previous = points.length > 1 ? points[points.length - 2] : undefined;
  const delta = latest && previous ? latest.value - previous.value : null;
  const deltaIsGood =
    delta == null || !series || series.direction === "neutral"
      ? null
      : series.direction === "lower-is-better"
        ? delta <= 0
        : delta >= 0;

  return (
    <section className={cn(surface, "space-y-5 p-5 sm:p-6")}>
      <div className="flex flex-wrap items-center gap-2.5">
        <Pill
          value={metric}
          onChangeAction={setMetric}
          groupLabel={t("metricLabel")}
          options={[
            { value: "weight", label: t("weightMetric") },
            { value: "exercise", label: t("exerciseMetric") },
          ]}
        />
        {metric === "exercise" && exercises.length > 0 && (
          <>
            <label>
              <span className="sr-only">{t("selectExercise")}</span>
              <select
                value={exerciseId}
                onChange={(event) => setExerciseId(event.target.value)}
                className={cn(field, "w-auto py-2 text-sm")}
              >
                {exercises.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </label>
            <Pill
              value={measure}
              onChangeAction={setMeasure}
              groupLabel={t("measureLabel")}
              options={[
                { value: "reps", label: t("measureReps") },
                { value: "effort", label: t("measureEffort") },
              ]}
            />
          </>
        )}
        <Pill
          value={chartType}
          onChangeAction={setChartType}
          groupLabel={t("chartTypeLabel")}
          options={[
            { value: "line", label: t("chartLine") },
            { value: "bar", label: t("chartBar") },
          ]}
        />
      </div>

      {!series || points.length === 0 ? (
        <Empty title={tProgress("weightEmpty")} hint={tProgress("weightEmptyHint")} />
      ) : (
        <>
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h3 className={cn(heading, "text-lg")}>{title}</h3>
            <div className="flex items-baseline gap-2">
              <p className={cn(heading, "text-xl text-cream")}>
                {latest.value} {series.unit}
              </p>
              {delta != null && (
                <span className={cn(chip, deltaIsGood === false && "text-silk")}>
                  {formatSigned(delta)} {series.unit}
                </span>
              )}
            </div>
          </div>
          <MetricChart series={series} label={title} locale={locale} type={chartType} />
        </>
      )}
    </section>
  );
}
