import Link from "next/link";
import { parseDayKey } from "@/components/studio/plan/date";
import type { Translate } from "@/components/studio/plan/types";
import { chip, chipAccent, eyebrow } from "@/components/studio/theme";
import { cn } from "@/lib/utils";
import type { Assignment, Client } from "@/lib/studio/types";

export type PlanMatrixRow = {
  client: Client;
  adherence: { done: number; total: number };
  byDate: Record<string, Assignment[]>;
};

/** Status chip, sized down to fit a ~140px day cell. Mirrors AssignmentCard's status colouring. */
function statusChipClass(status: Assignment["status"]) {
  const base = "px-1.5 py-0.5 text-[0.65rem]";
  if (status === "done") return cn(chipAccent, base);
  if (status === "skipped") return cn(chip, "text-silk ring-silk/30", base);
  return cn(chip, base);
}

/**
 * The whole studio's week: clients down the side, Monday→Sunday across the
 * top, one compact card per assignment in each cell. Read-only — this is
 * "who is doing what", not another place to edit the plan.
 *
 * A CSS grid rather than a `<table>`: cells hold stacked cards, not scalar
 * text, and the sticky client column needs to survive horizontal scroll on
 * a 30-row roster without a table's cross-browser sticky quirks.
 */
export function PlanMatrix({
  rows,
  days,
  today,
  locale,
  t,
}: {
  rows: PlanMatrixRow[];
  days: string[];
  today: string;
  locale: string;
  t: Translate;
}) {
  return (
    <div className="overflow-x-auto rounded-[1.25rem] ring-1 ring-cream/10">
      <div
        // Sized so a seven-day week fits a 1280px laptop beside the 264px rail
        // without scrolling; narrower viewports scroll the whole grid instead of
        // reflowing, which would break the client-per-row reading.
        className="grid min-w-[60rem] gap-px bg-cream/10"
        style={{ gridTemplateColumns: `176px repeat(${days.length}, minmax(110px, 1fr))` }}
      >
        <div className="sticky left-0 z-10 bg-ink-lift" />
        {days.map((date) => {
          const day = parseDayKey(date);
          const weekday = new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" }).format(day);
          const num = new Intl.DateTimeFormat(locale, { day: "numeric", timeZone: "UTC" }).format(day);
          const isToday = date === today;
          return (
            <div key={date} className="bg-ink-lift px-3 py-2 text-center">
              <p className={cn(eyebrow, "capitalize", isToday && "text-accent-ink")}>{weekday}</p>
              <p className={cn("font-mono text-xs text-cream/50", isToday && "text-accent-ink/80")}>{num}</p>
            </div>
          );
        })}

        {rows.map((row) => (
          <PlanMatrixRowCells key={row.client.id} row={row} days={days} today={today} t={t} />
        ))}
      </div>
    </div>
  );
}

function PlanMatrixRowCells({
  row,
  days,
  today,
  t,
}: {
  row: PlanMatrixRow;
  days: string[];
  today: string;
  t: Translate;
}) {
  const { client, adherence, byDate } = row;
  return (
    <>
      <Link
        href={`/app/coach/alunos/${client.id}/plano`}
        className="sticky left-0 z-10 flex items-center justify-between gap-2 bg-ink-lift px-3 py-3 transition-colors hover:bg-surface-hover"
      >
        <span className="truncate font-sans text-sm font-semibold text-cream">{client.name}</span>
        <span className="shrink-0 font-mono text-xs text-cream/45">
          {adherence.done}/{adherence.total}
        </span>
      </Link>
      {days.map((date) => {
        const assignments = byDate[date] ?? [];
        const isToday = date === today;
        return (
          <div key={date} className={cn("bg-ink-lift px-2 py-2", isToday && "bg-caramel/[0.04]")}>
            {assignments.length === 0 ? (
              <p className="text-center text-sm text-cream/20" aria-hidden>
                ·
              </p>
            ) : (
              <div className="space-y-1.5">
                {assignments.map((assignment) => (
                  <div key={assignment.id} className="rounded-lg bg-cream/5 px-2 py-1.5 ring-1 ring-cream/10">
                    <p className="truncate text-xs font-medium text-cream/85">{assignment.snapshot.name}</p>
                    <span className={cn(statusChipClass(assignment.status), "mt-1")}>
                      {t(`status.${assignment.status}`)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
