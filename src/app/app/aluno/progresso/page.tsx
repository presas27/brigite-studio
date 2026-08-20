import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { requireClient } from "@/lib/studio/auth";
import { adherence, assignmentHistory, personalRecords } from "@/lib/studio/plan";
import { measurements } from "@/lib/studio/coaching";
import { Empty } from "@/components/studio/Empty";
import { PageHeader } from "@/components/studio/PageHeader";
import {
  chip,
  eyebrow,
  eyebrowOnAccent,
  heading,
  surface,
  surfaceAccent,
  surfaceLink,
} from "@/components/studio/theme";
import { cn } from "@/lib/utils";

// `plan.ts` is frozen and returns this shape inline (no exported type to
// import), so it is named here at the one place that consumes it.
type PersonalRecord = {
  exerciseId: string;
  exerciseName: string;
  bestLoadKg: number | null;
  bestSeconds: number | null;
  bestReps: number | null;
};

/** Minimal inline sparkline — no chart library, just a polyline over a viewBox. */
function WeightSparkline({
  values,
  ariaLabel,
  latestLabel,
}: {
  values: number[];
  ariaLabel: string;
  latestLabel: string;
}) {
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
    <div className="space-y-2">
      <svg
        role="img"
        aria-label={ariaLabel}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="h-18 w-full text-accent-ink"
      >
        <polyline fill="none" stroke="currentColor" strokeWidth={2} points={points} />
      </svg>
      <p className="font-mono text-lg text-cream">{latestLabel}</p>
    </div>
  );
}

/** The client's own numbers: adherence, personal records, weight, session history. */
export default async function AlunoProgressoPage() {
  const client = await requireClient();
  const t = await getTranslations("Studio");
  const locale = await getLocale();

  const stats = adherence(client.id);
  const records = personalRecords(client.id);
  const weight = measurements(client.id, "weight", 24).slice().reverse();
  const history = assignmentHistory(client.id, 30);
  const historyDateFormat = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" });

  type Column = {
    key: string;
    label: string;
    has: (record: PersonalRecord) => boolean;
    render: (record: PersonalRecord) => string;
  };
  const allColumns: Column[] = [
    {
      key: "load",
      label: t("progress.bestLoad"),
      has: (record) => record.bestLoadKg != null,
      render: (record) => `${record.bestLoadKg}kg`,
    },
    {
      key: "hold",
      label: t("progress.bestHold"),
      has: (record) => record.bestSeconds != null,
      render: (record) => `${record.bestSeconds}s`,
    },
    {
      key: "reps",
      label: t("progress.bestReps"),
      has: (record) => record.bestReps != null,
      render: (record) => `${record.bestReps}`,
    },
  ];
  const columns = allColumns.filter((column) => records.some(column.has));

  return (
    <div className="space-y-8">
      <PageHeader title={t("progress.title")} lead={t("progress.lead")} />

      {/* The headline number, and the only gold surface on this screen. */}
      <div className={cn(surfaceAccent, "p-6 sm:p-8")}>
        <p className={eyebrowOnAccent}>{t("progress.adherence")}</p>
        <p className={cn(heading, "mt-2 text-[2.5rem] sm:text-[3.25rem]")}>
          {t("progress.sessionsDone", { done: stats.done, total: stats.total })}
        </p>
      </div>

      <section className="space-y-3">
        <h2 className={cn(heading, "text-lg")}>{t("progress.records")}</h2>
        {records.length === 0 ? (
          <Empty title={t("progress.empty")} hint={t("progress.emptyHint")} />
        ) : (
          <div className={cn(surface, "overflow-x-auto p-2")}>
            <table className="w-full min-w-[28rem] border-collapse text-left font-sans text-sm">
              <thead>
                <tr className={eyebrow}>
                  <th className="px-3 py-2 font-medium">{t("videos.chooseExercise")}</th>
                  {columns.map((column) => (
                    <th key={column.key} className="px-3 py-2 font-medium">
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.exerciseId} className="border-t border-cream/10">
                    <td className="px-3 py-2 text-cream/85">{record.exerciseName}</td>
                    {columns.map((column) => (
                      <td key={column.key} className="px-3 py-2 font-mono text-cream/70">
                        {column.has(record) ? column.render(record) : t("common.none")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className={cn(heading, "text-lg")}>{t("progress.weight")}</h2>
        {weight.length === 0 ? (
          <Empty title={t("progress.weightEmpty")} hint={t("progress.weightEmptyHint")} />
        ) : (
          <div className={cn(surface, "p-5")}>
            <WeightSparkline
              values={weight.map((entry) => entry.value)}
              ariaLabel={t("progress.weightAria")}
              latestLabel={`${weight[weight.length - 1].value} ${t("common.kg")}`}
            />
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className={cn(heading, "text-lg")}>{t("progress.history")}</h2>
        {history.length === 0 ? (
          <Empty title={t("progress.empty")} hint={t("progress.emptyHint")} />
        ) : (
          <ul className="space-y-2">
            {history.map((assignment) => (
              <li key={assignment.id}>
                <Link
                  href={`/app/aluno/treino/${assignment.id}`}
                  className={cn(surfaceLink, "flex items-center justify-between gap-3 p-4")}
                >
                  <span className="text-sm text-cream/85">{assignment.snapshot.name}</span>
                  <span className="flex items-center gap-2 text-xs text-cream/55">
                    {historyDateFormat.format(new Date(`${assignment.date}T12:00:00`))}
                    <span className={chip}>{t(`plan.status.${assignment.status}`)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
