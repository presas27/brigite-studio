/** Rest row presets: 15s, 30s, 45s, 60s, 90s, 2min, 3min. */
export const REST_PRESETS = [15, 30, 45, 60, 90, 120, 180] as const;

/** Workout length presets in minutes. */
export const WORKOUT_DURATION_PRESETS = [15, 30, 45, 60, 90] as const;

export function formatRestDuration(seconds: number): string {
  if (seconds >= 120 && seconds % 60 === 0) return `${seconds / 60}min`;
  return `${seconds}s`;
}

export function parseDurationInput(value: string): number | null {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;
  const minutes = /^(\d+(?:\.\d+)?)\s*m(?:in(?:ute)?s?)?$/.exec(trimmed);
  if (minutes) return Math.round(Number(minutes[1]) * 60);
  const seconds = /^(\d+(?:\.\d+)?)\s*s(?:ec(?:ond)?s?)?$/.exec(trimmed);
  if (seconds) return Math.round(Number(seconds[1]));
  const n = Number(trimmed);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
}

export function parseMinutesInput(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}
