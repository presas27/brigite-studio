import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { formatDayKey } from "@/components/studio/format";
import { Icon } from "@/components/studio/coach/icons";
import { chip, chipAccent, muted, surfaceLink } from "@/components/studio/theme";
import type { TrainingPhaseSummary } from "@/lib/studio/types";
import { cn } from "@/lib/utils";

/**
 * `YYYY-MM-DD | null` pair -> a short localized range, e.g. "1 Jun – 30 Jun".
 * Either end can be missing (a phase that has started but has no planned end,
 * or vice versa) — in that case the range is just whichever end exists.
 */
function dateRange(startDate: string | null, endDate: string | null, locale: string): string {
  const start = startDate ? formatDayKey(startDate, locale) : null;
  const end = endDate ? formatDayKey(endDate, locale) : null;
  if (start && end) return `${start} – ${end}`;
  return start ?? end ?? "";
}

/**
 * The plan tab's first section: what the client is training right now, one
 * row per phase in the coach's order. The week calendar underneath still
 * says *when* a workout happens — this says *what* phase it belongs to.
 */
export async function PhaseList({
  phases,
  basePath,
}: {
  phases: TrainingPhaseSummary[];
  basePath: string;
}) {
  if (phases.length === 0) return null;

  const [t, locale] = await Promise.all([
    getTranslations("Studio.plan.phases"),
    getLocale(),
  ]);

  return (
    <ul className="space-y-2">
      {phases.map((phase, index) => {
        const meta =
          phase.durationType === "calendar"
            ? [dateRange(phase.startDate, phase.endDate, locale), t("durationType.calendar")]
                .filter(Boolean)
                .join(" · ")
            : [t("weeksValue", { count: phase.weeks ?? 0 }), t("durationType.weeks")]
                .filter(Boolean)
                .join(" · ");

        return (
          <li key={phase.id}>
            <Link
              href={`${basePath}/fase/${phase.id}`}
              className={cn(surfaceLink, "flex flex-wrap items-center justify-between gap-4 p-4")}
            >
              <div className="min-w-0 space-y-1">
                <p className="truncate font-sans text-sm font-semibold text-cream">
                  {t("phaseTitle", { index: index + 1, name: phase.name })}
                </p>
                <p className={cn(muted, "flex items-center gap-1.5")}>
                  <Icon
                    name={phase.durationType === "calendar" ? "calendar" : "history"}
                    className="h-3.5 w-3.5 shrink-0"
                  />
                  <span>{meta}</span>
                </p>
              </div>
              <span className={phase.workoutCount > 0 ? chipAccent : chip}>
                {t("workoutCount", { count: phase.workoutCount })}
              </span>
            </Link>
          </li>
        );
      })}
      <li>
        <p
          className={cn(
            muted,
            "rounded-[1.25rem] border border-dashed border-cream/20 py-5 text-center",
          )}
        >
          {t("noFuture")}
        </p>
      </li>
    </ul>
  );
}
