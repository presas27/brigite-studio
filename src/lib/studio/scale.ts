/**
 * The check-in self-report scale.
 *
 * One constant, imported by the dial, the coach's read-out and the server
 * action that clamps what arrives — a scale that means one thing in the form
 * and another in the bar chart is a silent data bug.
 */
export const SCALE_MIN = 1;
export const SCALE_MAX = 10;

/** Clamp any number onto the scale, rounded to a whole stop. */
export function clampScale(value: number): number {
  return Math.min(SCALE_MAX, Math.max(SCALE_MIN, Math.round(value)));
}
