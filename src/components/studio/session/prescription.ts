import type { SessionStep } from "@/lib/studio/session-queue";

/** The words a prescription needs that only the locale can supply. */
export type PrescriptionLabels = {
  /** "reps" */
  reps: string;
  /** "m" — metres, short */
  meters: string;
  /** "sets", for an exercise the plan gave no reps or seconds */
  sets: string;
};

/**
 * What one set of this step asks for — "8 reps", "6-8 reps", "AMRAP", "40s",
 * "200 m" — or `null` when the plan left it open.
 *
 * One function for every surface that prints it (the preview, the list, the
 * sheet, the stage), so a prescription never reads "8 reps" on one screen and
 * "AMRAP reps" on the next. A rep count that does not start with a digit is a
 * word the coach chose ("AMRAP", "max") and is printed as she wrote it.
 */
export function prescriptionOf(step: SessionStep, labels: PrescriptionLabels): string | null {
  if (step.tracking === "time" || step.tracking === "hold") {
    return step.item.seconds != null ? `${step.item.seconds}s` : null;
  }
  const reps = step.item.reps.trim();
  if (!reps) return null;
  if (step.tracking === "distance") return `${reps} ${labels.meters}`;
  return /^\d/.test(reps) ? `${reps} ${labels.reps.toLowerCase()}` : reps;
}

/**
 * The exercise as a list prints it under the name: "3 × 8 reps", "3 × 40s",
 * or, with nothing prescribed, "3 sets".
 */
export function setsOf(step: SessionStep, labels: PrescriptionLabels): string {
  const prescription = prescriptionOf(step, labels);
  return prescription
    ? `${step.setCount} × ${prescription}`
    : `${step.setCount} ${labels.sets.toLowerCase()}`;
}
