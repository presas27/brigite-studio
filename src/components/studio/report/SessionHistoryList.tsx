import Link from "next/link";
import { Icon } from "@/components/studio/coach/icons";
import { StatusChip } from "@/components/studio/aluno/SessionStatus";
import { shortWeekday } from "@/components/studio/format";
import type { Translate } from "@/components/studio/plan/types";
import { eyebrow, muted, surfaceLink } from "@/components/studio/theme";
import type { SessionRow } from "@/lib/studio/report";
import { capitalize, cn } from "@/lib/utils";

/**
 * A client's training log as a list — every session she finished or missed,
 * newest first, grouped by the month it happened in.
 *
 * One row answers the three questions Sara asks of a past session before she
 * decides whether to open it: when, what, and how much of it actually got
 * done. Everything else — the numbers per set, her note, the effort — is one
 * tap away in the report and stays out of the list, because a column of rows
 * carrying five facts each is a spreadsheet, not something you can scan.
 */
export function SessionHistoryList({
  sessions,
  base,
  locale,
  t,
  tPlan,
}: {
  sessions: SessionRow[];
  /** `/app/coach/alunos/<id>/treinos` — the row hrefs hang off it. */
  base: string;
  locale: string;
  t: Translate;
  tPlan: Translate;
}) {
  const months = groupByMonth(sessions, locale);

  return (
    <div className="space-y-8">
      {months.map((month) => (
        <section key={month.key} className="space-y-2">
          {/* A session assigned with no day never got one, so it has no month
              to sit under — it keeps its rows and loses the heading. */}
          {month.label && <h2 className={eyebrow}>{month.label}</h2>}
          <ul className="space-y-2">
            {month.sessions.map((session) => (
              <SessionHistoryRow
                key={session.id}
                session={session}
                href={`${base}/${session.id}`}
                locale={locale}
                t={t}
                tPlan={tPlan}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function SessionHistoryRow({
  session,
  href,
  locale,
  t,
  tPlan,
}: {
  session: SessionRow;
  href: string;
  locale: string;
  t: Translate;
  tPlan: Translate;
}) {
  const stamp = session.date ? dateStamp(session.date, locale) : null;
  const facts = [
    session.focus && capitalize(session.focus),
    session.durationMinutes != null && t("minutes", { value: session.durationMinutes }),
    session.effort != null && t("effort", { value: session.effort }),
  ].filter(Boolean);

  return (
    <li>
      <Link href={href} className={cn(surfaceLink, "group flex items-center gap-4 p-4 sm:gap-5")}>
        {/* The date as a stamp rather than a sentence — a column of these reads
            as a timeline, which a run of "18 Ago" strings never does. */}
        <span className="grid h-12 w-12 shrink-0 place-content-center rounded-[0.9rem] bg-cream/5 text-center leading-none text-cream/70 ring-1 ring-cream/10">
          <span className="font-display text-[1.15rem]">{stamp?.day ?? "—"}</span>
          {stamp && <span className="mt-0.5 font-sans text-[0.6rem] opacity-70">{stamp.weekday}</span>}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate font-sans text-base font-semibold text-cream">
            {session.name}
          </span>
          {facts.length > 0 && (
            <span className={cn(muted, "block truncate")}>{facts.join(" · ")}</span>
          )}
        </span>

        <span className="hidden shrink-0 font-sans text-sm tabular-nums text-cream/55 sm:block">
          {t("sets", { done: session.loggedSets, total: session.plannedSets })}
        </span>

        <StatusChip status={session.status} label={tPlan(`status.${session.status}`)} />

        <Icon
          name="chevron"
          className="h-3.5 w-3.5 shrink-0 text-cream/30 transition-transform group-hover:translate-x-0.5 group-hover:text-cream/60 motion-reduce:transition-none"
        />
      </Link>
    </li>
  );
}

/** `YYYY-MM-DD` -> the day number and short weekday for the stamp. */
function dateStamp(key: string, locale: string): { day: string; weekday: string } {
  return { day: String(Number(key.slice(8, 10))), weekday: shortWeekday(key, locale) };
}

/**
 * Sessions bucketed by the month they happened in, order preserved. A year of
 * training is a long column; the month headings are what turn it back into
 * something you can find a week in.
 */
function groupByMonth(
  sessions: SessionRow[],
  locale: string,
): { key: string; label: string; sessions: SessionRow[] }[] {
  const months: { key: string; label: string; sessions: SessionRow[] }[] = [];
  for (const session of sessions) {
    const key = session.date?.slice(0, 7) ?? "";
    let month = months.find((candidate) => candidate.key === key);
    if (!month) {
      month = { key, label: monthLabel(key, locale), sessions: [] };
      months.push(month);
    }
    month.sessions.push(session);
  }
  return months;
}

function monthLabel(key: string, locale: string): string {
  if (!key) return "";
  const label = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${key}-01T12:00:00Z`));
  return capitalize(label, locale);
}
