import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { StatusChip } from "@/components/studio/aluno/SessionStatus";
import { formatDayKey } from "@/components/studio/coach/format";
import { Icon } from "@/components/studio/coach/icons";
import { Empty } from "@/components/studio/Empty";
import { PageHeader } from "@/components/studio/PageHeader";
import {
  eyebrow,
  eyebrowOnAccent,
  heading,
  muted,
  mutedOnAccent,
  surface,
  surfaceLink,
  surfaceAccent,
} from "@/components/studio/theme";
import { requireClient } from "@/lib/studio/auth";
import { measurements } from "@/lib/studio/coaching";
import { adherence, assignmentHistory, personalRecords } from "@/lib/studio/plan";
import { cn } from "@/lib/utils";

// `plan.ts` returns this shape inline (no exported type to import), so it is
// named here at the one place that consumes it.
type PersonalRecord = {
  exerciseId: string;
  exerciseName: string;
  bestLoadKg: number | null;
  bestSeconds: number | null;
  bestReps: number | null;
};

/** Minimal inline sparkline — no chart library, just a polyline over a viewBox. */
function WeightSparkline({ values, ariaLabel }: { values: number[]; ariaLabel: string }) {
  const width = 320;
  const height = 72;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = values.length > 1 ? width / (values.length - 1) : 0;
  const points = values
    .map((value, index) => {
      const x = values.length > 1 ? index * step : width / 2;
      const y = height - ((value - min) / span) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      role="img"
      aria-label={ariaLabel}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="h-18 w-full text-accent-ink"
    >
      <polyline fill="none" stroke="currentColor" strokeWidth={2} points={points} />
    </svg>
  );
}

/**
 * The aluna's own numbers: how much of the plan she is keeping, her bests, her
 * weight, and the sessions behind all three.
 *
 * Records used to be a table. A table is the right shape for a spreadsheet and
 * the wrong one here — three columns of which two are usually empty, read on a
 * phone. They are cards now: the exercise's name leads, and only the measures
 * that actually exist for it get printed.
 */
export default async function AlunoProgressoPage() {
  const client = await requireClient();
  const [t, common, tPlan, locale] = await Promise.all([
    getTranslations("Studio.progress"),
    getTranslations("Studio.common"),
    getTranslations("Studio.plan"),
    getLocale(),
  ]);

  const stats = adherence(client.id);
  const records = personalRecords(client.id);
  const weight = measurements(client.id, "weight", 24).slice().reverse();
  const history = assignmentHistory(client.id, 30);

  const pct = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

  const measuresOf = (record: PersonalRecord) =>
    [
      record.bestLoadKg != null
        ? { key: "load", label: t("bestLoad"), value: `${record.bestLoadKg} ${common("kg")}` }
        : null,
      record.bestSeconds != null
        ? { key: "hold", label: t("bestHold"), value: `${record.bestSeconds}s` }
        : null,
      record.bestReps != null
        ? { key: "reps", label: t("bestReps"), value: `${record.bestReps}` }
        : null,
    ].filter((measure) => measure != null);

  const latestWeight = weight[weight.length - 1];
  const firstWeight = weight[0];
  const delta =
    weight.length > 1 ? Number((latestWeight.value - firstWeight.value).toFixed(1)) : null;

  return (
    <div className="space-y-8">
      <PageHeader title={t("title")} lead={t("lead")} />

      {/* The headline number, and the only gold surface on this screen. */}
      <section aria-labelledby="adherence" className={cn(surfaceAccent, "p-6 sm:p-8")}>
        <h2 id="adherence" className={eyebrowOnAccent}>
          {t("adherence")}
        </h2>
        <p className={cn(heading, "mt-2 flex items-baseline gap-3 text-[2.5rem] sm:text-[3.25rem]")}>
          {t("sessionsDone", { done: stats.done, total: stats.total })}
          {stats.total > 0 && <span className="font-mono text-lg text-ink/55">{pct}%</span>}
        </p>
        {stats.total > 0 && (
          <div
            aria-hidden
            className="mt-4 h-[3px] overflow-hidden rounded-full bg-ink/[0.15]"
          >
            <span className="block h-full rounded-full bg-ink/70" style={{ width: `${pct}%` }} />
          </div>
        )}
        <p className={cn(mutedOnAccent, "mt-3")}>{t("adherenceHint")}</p>
      </section>

      <section aria-labelledby="records" className="space-y-3">
        <h2 id="records" className={eyebrow}>
          {t("records")}
        </h2>
        {records.length === 0 ? (
          <Empty title={t("empty")} hint={t("emptyHint")} />
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

      <section aria-labelledby="weight" className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="weight" className={eyebrow}>
            {t("weight")}
          </h2>
          <Link
            href="/app/aluno/evolucao"
            className="link-grow font-sans text-xs text-accent-ink transition-colors hover:text-butter"
          >
            {t("openTrends")}
          </Link>
        </div>
        {weight.length === 0 ? (
          <Empty title={t("weightEmpty")} hint={t("weightEmptyHint")} />
        ) : (
          <div className={cn(surface, "space-y-4 p-5")}>
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <p className={cn(heading, "text-[2rem] text-cream")}>
                {latestWeight.value} {common("kg")}
              </p>
              {delta != null && delta !== 0 && (
                <p className={cn(eyebrow, "font-mono")}>
                  {delta > 0 ? "+" : ""}
                  {delta} {common("kg")} · {t("sinceFirst")}
                </p>
              )}
            </div>
            <WeightSparkline
              values={weight.map((entry) => entry.value)}
              ariaLabel={t("weightAria")}
            />
          </div>
        )}
      </section>

      <section aria-labelledby="history" className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="history" className={eyebrow}>
            {t("history")}
          </h2>
          <Link
            href="/app/aluno/treinos"
            className="link-grow font-sans text-xs text-accent-ink transition-colors hover:text-butter"
          >
            {t("openSessions")}
          </Link>
        </div>
        {history.length === 0 ? (
          <Empty title={t("empty")} hint={t("emptyHint")} />
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
                      {[assignment.snapshot.focus, formatDayKey(assignment.date, locale)]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  <StatusChip
                    status={assignment.status}
                    label={tPlan(`status.${assignment.status}`)}
                  />
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
