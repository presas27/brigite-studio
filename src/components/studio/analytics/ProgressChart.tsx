"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { ExerciseMeasure, ExerciseOption, MetricSeries } from "@/lib/studio/analytics";
import { formatSigned } from "@/lib/studio/bodyMetrics";
import { Empty } from "@/components/studio/Empty";
import { MorphHeight } from "@/components/studio/MorphHeight";
import { SegmentedTrack } from "@/components/studio/SegmentedTrack";
import type { ProgressPhotoWeek } from "@/lib/studio/types";
import { chip, field, heading, surface } from "@/components/studio/theme";
import { cn } from "@/lib/utils";
import { PhotoLog } from "./PhotoLog";
import { MetricChart } from "./MetricChart";

type MetricKind = "weight" | "exercise" | "photos";
type ChartType = "line" | "bar";

const MEASURE_ORDER: ExerciseMeasure[] = ["loadKg", "reps", "seconds", "rpe"];

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
    <SegmentedTrack value={value} groupLabel={groupLabel}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChangeAction(option.value)}
          className={cn(
            "relative z-10 rounded-full px-3 py-1.5 font-sans text-xs font-semibold whitespace-nowrap transition-colors",
            value === option.value ? "text-accent-ink" : "text-cream/50 hover:text-cream",
          )}
        >
          {option.label}
        </button>
      ))}
    </SegmentedTrack>
  );
}

/**
 * One chart, filtered instead of three fixed cards: pick the metric (weight,
 * an exercise, or the progress photos), then how to draw it (line or bar).
 * Everything is this person's own rows — weight from `measurements`, an
 * exercise's load / reps / hold / effort from what they logged session by
 * session (`exerciseProgression`). Only measures with data are offered, so a
 * plank never shows a kilo pill and a squat never shows a hold.
 *
 * Photos are not a chart, so choosing them replaces the plot rather than
 * feeding it: same card, same toggle, a different thing inside. The chart-type
 * pill goes away with it — there is no line or bar to pick.
 */
export function ProgressChart({
  weightSeries,
  exercises,
  photoWeeks,
}: {
  weightSeries: MetricSeries | null;
  exercises: ExerciseOption[];
  photoWeeks: ProgressPhotoWeek[];
}) {
  const t = useTranslations("Studio.evolucao");
  const tProgress = useTranslations("Studio.progress");
  const tPhotos = useTranslations("Studio.photos");
  const locale = useLocale();

  const [metric, setMetric] = useState<MetricKind>("weight");
  const [exerciseId, setExerciseId] = useState(exercises[0]?.id ?? "");
  const [chosenMeasure, setChosenMeasure] = useState<ExerciseMeasure | null>(null);
  const [chartType, setChartType] = useState<ChartType>("line");

  const exercise = exercises.find((option) => option.id === exerciseId) ?? exercises[0];
  const measures = exercise ? MEASURE_ORDER.filter((key) => exercise.series[key]) : [];
  // The chosen measure carries across exercises when both have it; otherwise
  // the first one this exercise has.
  const measure = chosenMeasure && measures.includes(chosenMeasure) ? chosenMeasure : measures[0];
  const series = metric === "weight" ? weightSeries : (exercise && measure ? exercise.series[measure] : null) ?? null;
  const title =
    metric === "weight"
      ? t("weightMetric")
      : `${exercise?.name ?? ""} — ${measure ? t(`measure.${measure}`) : ""}`;

  const points = series?.points ?? [];
  const latest = points[points.length - 1];
  const previous = points.length > 1 ? points[points.length - 2] : undefined;
  const delta = latest && previous ? Number((latest.value - previous.value).toFixed(1)) : null;
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
            { value: "photos", label: tPhotos("metric") },
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
              value={measure ?? "reps"}
              onChangeAction={setChosenMeasure}
              groupLabel={t("measureLabel")}
              options={measures.map((key) => ({ value: key, label: t(`measure.${key}`) }))}
            />
          </>
        )}
        {metric !== "photos" && (
          <Pill
            value={chartType}
            onChangeAction={setChartType}
            groupLabel={t("chartTypeLabel")}
            options={[
              { value: "line", label: t("chartLine") },
              { value: "bar", label: t("chartBar") },
            ]}
          />
        )}
      </div>

      <MorphHeight contentKey={`${metric}:${exerciseId}:${measure ?? ""}:${chartType}`}>
        {metric === "photos" ? (
          <PhotoLog weeks={photoWeeks} />
        ) : !series || points.length === 0 ? (
          <Empty
            title={metric === "weight" ? tProgress("weightEmpty") : t("exerciseEmpty")}
            hint={metric === "weight" ? tProgress("weightEmptyHint") : t("exerciseEmptyHint")}
            className="bg-transparent ring-0 px-1 py-2"
          />
        ) : (
          <div className="space-y-5">
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
          </div>
        )}
      </MorphHeight>
    </section>
  );
}
