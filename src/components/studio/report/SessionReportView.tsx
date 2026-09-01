import { StatusChip } from "@/components/studio/aluno/SessionStatus";
import { formatWeekday, formatDayKey } from "@/components/studio/format";
import type { Translate } from "@/components/studio/plan/types";
import { eyebrow, heading, muted, surface } from "@/components/studio/theme";
import { prescription } from "@/components/studio/workout/parts";
import type { ReportItem, ReportSet, SessionReport } from "@/lib/studio/report";
import { capitalize, cn } from "@/lib/utils";

/**
 * One session, prescribed against logged.
 *
 * The whole screen is built to be read top to bottom in about five seconds:
 * how much of it got closed, what it cost her, and then — only then — the
 * numbers per set. The gold is spent once, on the completion bar, because
 * "did she finish it" is the question the coach opens this page with.
 *
 * Sets she never logged stay on screen as empty slots rather than disappearing.
 * A report that quietly drops the two sets she skipped tells the coach the
 * workout was three sets long, which is the one thing it must never do.
 */
export function SessionReportView({
  report,
  locale,
  t,
  tPlan,
  common,
}: {
  report: SessionReport;
  locale: string;
  t: Translate;
  tPlan: Translate;
  common: Translate;
}) {
  const { assignment, blocks, plannedSets, loggedSets } = report;
  const ratio = plannedSets === 0 ? 0 : Math.min(1, loggedSets / plannedSets);
  const itemCount = blocks.reduce((n, block) => n + block.items.length, 0);

  const when = assignment.date
    ? `${formatWeekday(assignment.date, locale)}, ${formatDayKey(assignment.date, locale)}`
    : null;

  const stats = [
    report.durationMinutes != null && {
      label: t("statDuration"),
      value: t("minutes", { value: report.durationMinutes }),
    },
    report.volumeKg > 0 && {
      label: t("statVolume"),
      value: `${Math.round(report.volumeKg).toLocaleString(locale)} ${common("kg")}`,
    },
    assignment.effort != null && {
      label: common("rpe"),
      value: `${assignment.effort}/10`,
    },
    assignment.extraRestSeconds > 0 && {
      label: t("statExtraRest"),
      value:
        assignment.extraRestSeconds < 120
          ? `+${assignment.extraRestSeconds}s`
          : t("minutes", { value: Math.round(assignment.extraRestSeconds / 60) }),
    },
  ].filter(Boolean) as { label: string; value: string }[];

  const coachNote = [assignment.snapshot.notes, assignment.note]
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n\n");

  return (
    <div className="space-y-5">
      <header className={cn(surface, "p-5 sm:p-6")}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className={eyebrow}>{when ?? t("noDate")}</p>
          <StatusChip status={assignment.status} label={tPlan(`status.${assignment.status}`)} />
        </div>

        <h1 className={cn(heading, "mt-2 text-[1.75rem] sm:text-[2.25rem]")}>
          {assignment.snapshot.name}
        </h1>
        <p className={cn(muted, "mt-1")}>
          {[assignment.snapshot.focus && capitalize(assignment.snapshot.focus), t("itemCount", { count: itemCount })]
            .filter(Boolean)
            .join(" · ")}
        </p>

        {/* The one gold thing on the page: how much of the session came back. */}
        <div className="mt-6">
          <div className="flex items-baseline justify-between gap-4">
            <p className="font-sans text-sm font-semibold text-cream">
              {t("setsLong", { done: loggedSets, total: plannedSets })}
            </p>
            <p className={cn(eyebrow, "tabular-nums")}>{Math.round(ratio * 100)}%</p>
          </div>
          <div
            role="img"
            aria-label={t("setsLong", { done: loggedSets, total: plannedSets })}
            className="mt-2 h-1.5 overflow-hidden rounded-full bg-cream/10"
          >
            <span
              aria-hidden
              className="block h-full rounded-full bg-accent-ink"
              style={{ width: `${ratio * 100}%` }}
            />
          </div>
        </div>
      </header>

      {stats.length > 0 && (
        // Wrapping rather than a fixed grid: the stats a session earns vary —
        // a mobility session has no volume, an uninterrupted one no extra rest
        // — and an empty cell in a four-up grid reads as a bug.
        <dl className={cn(surface, "flex flex-wrap")}>
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="min-w-[8rem] flex-1 border-l border-cream/10 px-5 py-4 first:border-l-0"
            >
              <dt className={eyebrow}>{stat.label}</dt>
              <dd className="mt-1 font-sans text-lg font-semibold text-cream">{stat.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {coachNote && (
        <section className={cn(surface, "space-y-1 p-5")}>
          <h2 className={eyebrow}>{t("coachNote")}</h2>
          <p className="text-sm leading-relaxed whitespace-pre-line text-cream/80">{coachNote}</p>
        </section>
      )}

      {blocks.map((block) => {
        const label = block.label.trim() || (block.kind === "normal" ? "" : t(`block.${block.kind}`));
        return (
          <section key={block.id} className="space-y-2">
            {label && <h2 className={eyebrow}>{label}</h2>}
            {/* One card per block, hairlines between the exercises — not a card
                each. A session is six to eight exercises, and eight rounded
                panels stacked is eight frames of chrome around the only thing
                being read. */}
            <div className={cn(surface, "divide-y divide-cream/8")}>
              {block.items.map((entry) => (
                <ExerciseReport key={entry.item.id} entry={entry} t={t} common={common} />
              ))}
            </div>
          </section>
        );
      })}

      {/* What the client said about the exercises, above the per-set remarks:
          "the shoulder twinged" is context for the whole session, where a set
          note is a footnote on one number. Both are hers, so both are here and
          neither is mixed into the coach's own note above. */}
      {report.exerciseNotes.length > 0 && (
        <section className={cn(surface, "space-y-3 p-5")}>
          <h2 className={eyebrow}>{t("exerciseNotes")}</h2>
          <ul className="space-y-3">
            {report.exerciseNotes.map((note, index) => (
              <li key={`${note.exerciseName}-${index}`}>
                <p className="font-sans text-xs text-cream/45">
                  {t("noteFrom", { name: note.exerciseName })}
                </p>
                <p className="text-sm leading-relaxed whitespace-pre-line text-cream/80">
                  {note.body}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {report.setNotes.length > 0 && (
        <section className={cn(surface, "space-y-3 p-5")}>
          <h2 className={eyebrow}>{t("clientNotes")}</h2>
          <ul className="space-y-3">
            {report.setNotes.map((note, index) => (
              <li key={`${note.exerciseName}-${note.setNumber}-${index}`}>
                <p className="font-sans text-xs text-cream/45">
                  {t("noteOn", { exercise: note.exerciseName, set: note.setNumber })}
                </p>
                <p className="text-sm leading-relaxed text-cream/80">{note.body}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/**
 * One exercise: what was asked for on the right of its name, and what came
 * back underneath as one tile per set. Tiles rather than a table — a session
 * is three to five sets of six to eight exercises, and a table of that shape
 * is nine tenths gridlines.
 */
function ExerciseReport({
  entry,
  t,
  common,
}: {
  entry: ReportItem;
  t: Translate;
  common: Translate;
}) {
  return (
    <article className="p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="min-w-0 font-sans text-[0.95rem] font-semibold text-cream">
          {entry.item.exerciseName}
        </h3>
        <p className={cn(eyebrow, "shrink-0 tabular-nums")}>
          {prescription(entry.item, entry.interleaved)}
        </p>
      </div>

      <ul className="mt-3 flex flex-wrap gap-2">
        {entry.sets.map((set) => (
          <SetTile key={set.setNumber} set={set} t={t} common={common} />
        ))}
      </ul>
    </article>
  );
}

function SetTile({ set, t, common }: { set: ReportSet; t: Translate; common: Translate }) {
  const value = set.log && formatSet(set, common);
  const logged = value != null && value !== "";

  return (
    <li
      // Unlogged sets keep their slot and lose their fill: a dashed outline
      // reads as "nothing came back here", which is exactly what it means.
      className={cn(
        "min-w-[4.75rem] rounded-[0.8rem] px-3 py-2",
        logged ? "border border-cream/10 bg-cream/[0.06]" : "border border-dashed border-cream/15",
      )}
      title={logged ? undefined : t("notLogged")}
    >
      <span className="block font-sans text-[0.6rem] tabular-nums text-cream/40">
        {set.setNumber}
      </span>
      <span
        className={cn(
          "mt-0.5 block font-sans text-sm font-semibold tabular-nums",
          logged ? "text-cream" : "text-cream/30",
        )}
      >
        {logged ? value : "—"}
      </span>
    </li>
  );
}

/**
 * What a logged set says in one line, in the unit its exercise is measured in:
 * "12 × 20kg" for a lift, "45s" for a hold, "200m" for a carry.
 */
function formatSet(set: ReportSet, common: Translate): string {
  const log = set.log;
  if (!log) return "";
  if (set.tracking === "time" || set.tracking === "hold") {
    return log.seconds == null ? "" : `${log.seconds}s`;
  }
  if (set.tracking === "distance") {
    return log.reps == null ? "" : `${log.reps}m`;
  }
  if (log.reps == null) return log.loadKg == null ? "" : `${log.loadKg}${common("kg")}`;
  return log.loadKg == null ? String(log.reps) : `${log.reps} × ${log.loadKg}${common("kg")}`;
}
