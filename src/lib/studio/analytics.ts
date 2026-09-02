import type { ExerciseProgression } from "./plan";
import type { Measurement } from "./types";

/**
 * Shapes for the Evolução chart: one series per metric, built on the server
 * from real rows — weight from `measurements`, exercises from what was logged
 * session by session (`exerciseProgression`).
 */

export type MetricPoint = { date: string; value: number };

export type MetricDirection = "higher-is-better" | "lower-is-better" | "neutral";

export type MetricSeries = {
  id: string;
  unit: string;
  direction: MetricDirection;
  points: MetricPoint[];
};

/** Which of a set's numbers the chart plots. */
export type ExerciseMeasure = "loadKg" | "reps" | "seconds" | "rpe";

export type ExerciseOption = {
  id: string;
  name: string;
  /** Only the measures this exercise actually has points for. */
  series: Partial<Record<ExerciseMeasure, MetricSeries>>;
};

/** `measurements()` returns newest-first; a chart wants oldest-first. */
export function seriesFromMeasurements(
  entries: Measurement[],
  meta: { id: string; unit: string; direction: MetricDirection },
): MetricSeries {
  return {
    ...meta,
    points: entries
      .slice()
      .reverse()
      .map((entry) => ({ date: entry.date, value: entry.value })),
  };
}

const MEASURES: { key: ExerciseMeasure; unit: string; direction: MetricDirection }[] = [
  { key: "loadKg", unit: "kg", direction: "higher-is-better" },
  { key: "reps", unit: "reps", direction: "higher-is-better" },
  { key: "seconds", unit: "s", direction: "higher-is-better" },
  // Effort is what it cost, and the same session costing less is progress.
  { key: "rpe", unit: "RPE", direction: "lower-is-better" },
];

/**
 * One option per exercise, with a series per measure that has at least two
 * points — one point is a number, not a trend, and the chart has nothing to
 * draw through it. Exercises left with no series are dropped.
 */
export function exerciseOptions(progression: ExerciseProgression[]): ExerciseOption[] {
  const options: ExerciseOption[] = [];
  for (const exercise of progression) {
    const series: ExerciseOption["series"] = {};
    for (const measure of MEASURES) {
      const points: MetricPoint[] = [];
      for (const point of exercise.points) {
        const value = point[measure.key];
        if (value != null) points.push({ date: point.date, value });
      }
      if (points.length >= 2) {
        series[measure.key] = { id: `${exercise.exerciseId}-${measure.key}`, ...measure, points };
      }
    }
    if (Object.keys(series).length > 0) {
      options.push({ id: exercise.exerciseId, name: exercise.exerciseName, series });
    }
  }
  return options;
}
