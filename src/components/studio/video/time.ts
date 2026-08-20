/**
 * Shared clip-time formatting for the video review UI: `m:ss.d`, e.g. `1:04.3`.
 * One decimal is enough precision to tell frames apart at typical clip
 * framerates without turning the readout into a stopwatch.
 */
export function formatClipTime(tMs: number): string {
  const totalSeconds = Math.max(0, tMs) / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = (totalSeconds % 60).toFixed(1).padStart(4, "0");
  return `${minutes}:${seconds}`;
}
