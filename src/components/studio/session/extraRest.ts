/**
 * Extra rest, said the way a person would say it. Under two minutes it stays in
 * seconds, because "+90s" is a length anyone can feel; past that, minutes are
 * the honest unit and the seconds stop carrying information.
 */
export function formatExtraRest(
  seconds: number,
  t: (key: string, values?: Record<string, string | number>) => string,
): string {
  if (seconds < 120) return t("extraRestSeconds", { seconds });
  return t("extraRestMinutes", { minutes: Math.round(seconds / 60) });
}
