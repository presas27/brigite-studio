import type { MetricSeries } from "./analytics";

/**
 * Placeholder data for the exercise side of the Evolução chart — reps and
 * effort per exercise, and the exercise list itself for the picker. None of
 * it reads from the database yet. Weight, the other branch of that chart, has
 * already moved to real data (`seriesFromMeasurements`); this is next.
 */

const WEEKLY_DATES = [
  "2026-06-01",
  "2026-06-08",
  "2026-06-15",
  "2026-06-22",
  "2026-06-29",
  "2026-07-06",
  "2026-07-13",
  "2026-07-20",
  "2026-07-27",
  "2026-08-03",
  "2026-08-10",
  "2026-08-17",
];

function seriesFrom(id: string, unit: string, direction: MetricSeries["direction"], values: number[]): MetricSeries {
  return {
    id,
    unit,
    direction,
    points: WEEKLY_DATES.map((date, index) => ({ date, value: values[index] })),
  };
}

const MOCK_EXERCISES: { id: string; name: string; reps: number[]; effort: number[] }[] = [
  {
    id: "agachamento-barra",
    name: "Agachamento com barra",
    reps: [8, 8, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14],
    effort: [6, 6, 7, 7, 7, 8, 8, 8, 8, 9, 8, 9],
  },
  {
    id: "elevacao-barra",
    name: "Elevação na barra",
    reps: [3, 3, 4, 4, 4, 5, 5, 6, 6, 6, 7, 7],
    effort: [7, 7, 8, 7, 8, 8, 9, 8, 9, 9, 9, 10],
  },
  {
    id: "peso-morto-romeno",
    name: "Peso morto romeno",
    reps: [6, 7, 7, 8, 8, 8, 9, 9, 10, 10, 11, 11],
    effort: [6, 7, 6, 7, 7, 7, 8, 7, 8, 8, 8, 9],
  },
];

export type MockExerciseOption = {
  id: string;
  name: string;
  reps: MetricSeries;
  effort: MetricSeries;
};

export function mockExerciseOptions(): MockExerciseOption[] {
  return MOCK_EXERCISES.map((exercise) => ({
    id: exercise.id,
    name: exercise.name,
    reps: seriesFrom(`${exercise.id}-reps`, "reps", "higher-is-better", exercise.reps),
    effort: seriesFrom(`${exercise.id}-effort`, "RPE", "lower-is-better", exercise.effort),
  }));
}
