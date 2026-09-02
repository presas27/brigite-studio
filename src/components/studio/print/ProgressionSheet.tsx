import { getLocale, getTranslations } from "next-intl/server";
import { formatDayKey } from "@/components/studio/format";
import type { WorkoutProgression } from "@/lib/studio/plan";
import {
  isRestItem,
  trackingFor,
  type Tracking,
  type WorkoutBlock,
  type WorkoutItem,
} from "@/lib/studio/types";
import { PrintChart, type ChartPoint } from "./PrintChart";

/**
 * One chart per exercise, in the workout's own order — the coach's read on
 * whether this session is going anywhere.
 *
 * What each line plots follows how the exercise is measured, because a number
 * without its unit is not a trend: a rep-tracked movement plots the load it was
 * done with, or its reps when it carries no load (bodyweight work logs no kg);
 * a timed or held movement plots seconds; a distance plots metres. `tracking`
 * comes from the workout the coach is looking at, not from the logs.
 */

type Plot = { unit: string; value: (point: { loadKg: number | null; reps: number | null; seconds: number | null }) => number | null };

function plotFor(tracking: Tracking, units: { kg: string; seconds: string; reps: string; metres: string }, loaded: boolean): Plot {
  if (tracking === "time" || tracking === "hold") {
    return { unit: units.seconds, value: (point) => point.seconds };
  }
  if (tracking === "distance") {
    return { unit: units.metres, value: (point) => point.reps };
  }
  // Rep-tracked: weight when this client actually logged weight for it,
  // otherwise the reps themselves. Deciding per exercise rather than per point
  // keeps one line in one unit.
  return loaded
    ? { unit: units.kg, value: (point) => point.loadKg }
    : { unit: units.reps, value: (point) => point.reps };
}

/** Every exercise the workout prescribes, once, in the order the sheet reads them. */
function exercisesOf(blocks: WorkoutBlock[]): WorkoutItem[] {
  const seen = new Set<string>();
  const out: WorkoutItem[] = [];
  for (const block of blocks) {
    for (const item of block.items) {
      if (isRestItem(item) || !item.exerciseId || seen.has(item.exerciseId)) continue;
      seen.add(item.exerciseId);
      out.push(item);
    }
  }
  return out;
}

export async function ProgressionSheet({
  blocks,
  progression,
}: {
  blocks: WorkoutBlock[];
  progression: WorkoutProgression;
}) {
  const [t, locale] = await Promise.all([getTranslations("Studio.print"), getLocale()]);

  if (progression.sessions.length === 0) {
    return <p className="text-sm text-neutral-600">{t("noSessions")}</p>;
  }

  const units = {
    kg: t("unitKg"),
    seconds: t("unitSeconds"),
    reps: t("unitReps"),
    metres: t("unitMetres"),
  };
  const byExercise = new Map(progression.series.map((entry) => [entry.exerciseId, entry.points]));

  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-5">
      {exercisesOf(blocks).map((item) => {
        const points = byExercise.get(item.exerciseId) ?? [];
        const loaded = points.some((point) => point.loadKg != null);
        const plot = plotFor(trackingFor(item), units, loaded);

        const data: ChartPoint[] = [];
        for (const point of points) {
          const value = plot.value(point);
          if (value == null) continue;
          data.push({ date: point.date, value, label: formatDayKey(point.date, locale) });
        }

        return (
          <section key={item.id} className="break-inside-avoid">
            <h3 className="mb-1 text-xs font-semibold text-neutral-800">{item.exerciseName}</h3>
            <PrintChart points={data} unit={plot.unit} emptyLabel={t("noExerciseData")} />
          </section>
        );
      })}
    </div>
  );
}
