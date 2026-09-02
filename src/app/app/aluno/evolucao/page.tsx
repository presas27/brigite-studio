import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ProgressChart } from "@/components/studio/analytics/ProgressChart";
import { StatusChip } from "@/components/studio/aluno/SessionStatus";
import { Icon } from "@/components/studio/coach/icons";
import { Empty } from "@/components/studio/Empty";
import { formatDayKey } from "@/components/studio/format";
import { PageHeader } from "@/components/studio/PageHeader";
import {
  eyebrow,
  eyebrowOnAccent,
  heading,
  muted,
  mutedOnAccent,
  surface,
  surfaceAccent,
  surfaceLink,
} from "@/components/studio/theme";
import { exerciseOptions, seriesFromMeasurements } from "@/lib/studio/analytics";
import { requireClient } from "@/lib/studio/auth";
import { measurements } from "@/lib/studio/coaching";
import { progressPhotoWeeks } from "@/lib/studio/photos";
import { adherence, assignmentHistory, exerciseProgression, personalRecords } from "@/lib/studio/plan";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Evolução" };

// `plan.ts` returns this shape inline (no exported type to import), so it is
// named here at the one place that consumes it.
type PersonalRecord = {
  exerciseId: string;
  exerciseName: string;
  bestLoadKg: number | null;
  bestSeconds: number | null;
  bestReps: number | null;
};

/**
 * The aluna's own numbers, on one screen: how much of the plan she is keeping,
 * the chart (weight, any exercise she has logged, her photos), her bests, and
 * the sessions behind all of it.
 *
 * This used to be two pages — one in the rail with placeholder exercise data,
 * one reachable only from a card with the real figures — plus a sparkline
 * duplicating the chart. One page, all real, and `/app/aluno/medidas` stays
 * the place where weight and measurements are *entered*.
 *
 * Records are cards, not a table: three columns of which two are usually
 * empty, read on a phone. The exercise's name leads, and only the measures
 * that actually exist for it get printed.
 */
export default async function AlunoEvolucaoPage() {
  const client = await requireClient();
  const [t, tProgress, tPlan, common, locale] = await Promise.all([
    getTranslations("Studio.evolucao"),
    getTranslations("Studio.progress"),
    getTranslations("Studio.plan"),
    getTranslations("Studio.common"),
    getLocale(),
  ]);

  const [stats, records, weightEntries, photoWeeks, progression, history] = await Promise.all([
    adherence(client.id),
    personalRecords(client.id),
    measurements(client.id, "weight", 52),
    progressPhotoWeeks(client.id),
    exerciseProgression(client.id),
    assignmentHistory(client.id, 30),
  ]);

  const weightSeries =
    weightEntries.length > 0
      ? seriesFromMeasurements(weightEntries, { id: "weight", unit: "kg", direction: "neutral" })
      : null;
  const pct = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

  const measuresOf = (record: PersonalRecord) =>
    [
      record.bestLoadKg != null
        ? { key: "load", label: tProgress("bestLoad"), value: `${record.bestLoadKg} ${common("kg")}` }
        : null,
      record.bestSeconds != null
        ? { key: "hold", label: tProgress("bestHold"), value: `${record.bestSeconds}s` }
        : null,
      record.bestReps != null
        ? { key: "reps", label: tProgress("bestReps"), value: `${record.bestReps}` }
        : null,
    ].filter((measure) => measure != null);

  return (
    <div className="space-y-8">
      <PageHeader title={t("title")} lead={t("lead")} />

      {/* The headline number, and the only gold surface on this screen. */}
      <section aria-labelledby="adherence" className={cn(surfaceAccent, "p-6 sm:p-8")}>
        <h2 id="adherence" className={eyebrowOnAccent}>
          {tProgress("adherence")}
        </h2>
        <p className={cn(heading, "mt-2 flex items-baseline gap-3 text-[2.5rem] sm:text-[3.25rem]")}>
          {tProgress("sessionsDone", { done: stats.done, total: stats.total })}
          {stats.total > 0 && (
            <span className="font-sans tabular-nums text-lg text-on-dark/60">{pct}%</span>
          )}
        </p>
        {stats.total > 0 && (
          <div aria-hidden className="mt-4 h-[3px] overflow-hidden rounded-full bg-ink/25">
            <span className="block h-full rounded-full bg-on-dark/80" style={{ width: `${pct}%` }} />
          </div>
        )}
        <p className={cn(mutedOnAccent, "mt-3")}>{tProgress("adherenceHint")}</p>
      </section>

      <section aria-labelledby="chart" className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="chart" className={eyebrow}>
            {t("chart")}
          </h2>
          <Link
            href="/app/aluno/medidas"
            className="link-grow font-sans text-xs text-accent-ink transition-colors hover:text-cream"
          >
            {t("logMeasures")}
          </Link>
        </div>
        <ProgressChart
          weightSeries={weightSeries}
          exercises={exerciseOptions(progression)}
          photoWeeks={photoWeeks}
        />
      </section>

      <section aria-labelledby="records" className="space-y-3">
        <h2 id="records" className={eyebrow}>
          {tProgress("records")}
        </h2>
        {records.length === 0 ? (
          <Empty title={tProgress("empty")} hint={tProgress("emptyHint")} />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {records.map((record) => (
              <li key={record.exerciseId} className={cn(surface, "space-y-3 p-4")}>
                <p className="font-sans text-sm font-semibold text-cream">{record.exerciseName}</p>
                <dl className="flex flex-wrap gap-x-6 gap-y-2">
                  {measuresOf(record).map((measure) => (
                    <div key={measure.key}>
                      <dt className={eyebrow}>{measure.label}</dt>
                      <dd className={cn(heading, "mt-0.5 text-[1.35rem] text-cream")}>
                        {measure.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="history" className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="history" className={eyebrow}>
            {tProgress("history")}
          </h2>
          <Link
            href="/app/aluno/treinos"
            className="link-grow font-sans text-xs text-accent-ink transition-colors hover:text-cream"
          >
            {tProgress("openSessions")}
          </Link>
        </div>
        {history.length === 0 ? (
          <Empty title={tProgress("empty")} hint={tProgress("emptyHint")} />
        ) : (
          <ul className="space-y-2">
            {history.map((assignment) => (
              <li key={assignment.id}>
                <Link
                  href={`/app/aluno/treino/${assignment.id}`}
                  className={cn(surfaceLink, "group flex items-center gap-4 p-4")}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-sans text-sm font-semibold text-cream">
                      {assignment.snapshot.name}
                    </span>
                    <span className={cn(muted, "block truncate")}>
                      {[
                        assignment.snapshot.focus,
                        assignment.date ? formatDayKey(assignment.date, locale) : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  <StatusChip status={assignment.status} label={tPlan(`status.${assignment.status}`)} />
                  <Icon
                    name="chevron"
                    className="h-3.5 w-3.5 shrink-0 text-cream/30 transition-transform group-hover:translate-x-0.5 group-hover:text-cream/60 motion-reduce:transition-none"
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
