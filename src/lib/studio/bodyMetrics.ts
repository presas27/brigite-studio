import type { Measurement } from "./types";

/** WHO adult BMI bands. */
export type BmiCategory = "underweight" | "healthy" | "overweight" | "obese";

export function computeBmi(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

export function bmiCategory(bmi: number): BmiCategory {
  if (bmi < 18.5) return "underweight";
  if (bmi < 25) return "healthy";
  if (bmi < 30) return "overweight";
  return "obese";
}

export type BodyMetricEntry = {
  date: string;
  weightKg: number | null;
  heightCm: number | null;
  bmi: number | null;
};

/**
 * Merges weight and height measurement rows into one entry per date. Both
 * lists are recorded together from the same form submission (same `dayKey()`),
 * so pairing by date is reliable; each list is expected pre-sorted newest
 * first, so the first row seen per date wins over any same-day duplicate.
 */
export function mergeBodyMetrics(
  weightEntries: Measurement[],
  heightEntries: Measurement[],
): BodyMetricEntry[] {
  const byDate = new Map<string, { weightKg: number | null; heightCm: number | null }>();

  for (const entry of weightEntries) {
    const existing = byDate.get(entry.date);
    if (existing) existing.weightKg ??= entry.value;
    else byDate.set(entry.date, { weightKg: entry.value, heightCm: null });
  }
  for (const entry of heightEntries) {
    const existing = byDate.get(entry.date);
    if (existing) existing.heightCm ??= entry.value;
    else byDate.set(entry.date, { weightKg: null, heightCm: entry.value });
  }

  return Array.from(byDate.entries())
    .map(([date, { weightKg, heightCm }]) => ({
      date,
      weightKg,
      heightCm,
      bmi: weightKg != null && heightCm != null ? computeBmi(weightKg, heightCm) : null,
    }))
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

/** `+1.2` / `-0.4` — always signed, for deltas where the sign itself is the point. */
export function formatSigned(value: number, digits = 1): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}`;
}
