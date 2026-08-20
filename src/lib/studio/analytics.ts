import type { Measurement } from "./types";

/**
 * Shapes for the Evolução chart. `analyticsMock.ts` is still the only source
 * for exercise reps/effort; weight now reads real per-client rows via
 * `seriesFromMeasurements` — the first metric wired to the database, as
 * planned when this tab was mock-only.
 */

export type MetricPoint = { date: string; value: number };

export type MetricDirection = "higher-is-better" | "lower-is-better" | "neutral";

export type MetricSeries = {
  id: string;
  unit: string;
  direction: MetricDirection;
  points: MetricPoint[];
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
