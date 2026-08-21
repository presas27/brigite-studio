import type { Checkin } from "@/lib/studio/types";
import type { Translate } from "../plan/types";
import { Empty } from "../Empty";
import { eyebrow, heading, muted, surface } from "../theme";
import { cn } from "@/lib/utils";

/** `weekOf` is a `YYYY-MM-DD` Monday key; read at noon so no timezone shifts the day. */
function formatWeek(weekOf: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Lisbon",
  }).format(new Date(`${weekOf}T12:00:00`));
}

/** One past score, in the same display face the dial uses — the number leads. */
function Score({ label, value, suffix }: { label: string; value: number; suffix: string }) {
  return (
    <div className="min-w-[4.5rem]">
      <p className={eyebrow}>{label}</p>
      <p className="mt-0.5 font-display text-[1.5rem] leading-none tracking-[0.01em] text-cream">
        {value}
        <span className="ml-0.5 font-sans text-[0.65rem] font-medium text-cream/40">{suffix}</span>
      </p>
    </div>
  );
}

/**
 * Past check-ins, week by week. Lives behind the history toggle rather than
 * under the form: the thing you came to do is send this week's, and the archive
 * is what you go looking for.
 */
export function CheckinHistory({
  entries,
  locale,
  t,
  unit,
  scaleMax,
}: {
  entries: Checkin[];
  locale: string;
  t: Translate;
  unit: string;
  scaleMax: number;
}) {
  if (entries.length === 0) {
    return <Empty title={t("empty")} hint={t("emptyHint")} />;
  }

  return (
    <ul className={cn(surface, "divide-y divide-cream/10")}>
      {entries.map((entry) => (
        <li key={entry.id} className="space-y-4 p-5 sm:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <p className={cn(heading, "text-[1.35rem] text-cream")}>
              {t("weekOf", { date: formatWeek(entry.weekOf, locale) })}
            </p>
            {entry.submittedAt == null && <span className={muted}>{t("notSubmitted")}</span>}
          </div>

          <div className="flex flex-wrap gap-x-7 gap-y-3">
            {entry.energy != null && (
              <Score label={t("energyLabel")} value={entry.energy} suffix={`/${scaleMax}`} />
            )}
            {entry.sleep != null && (
              <Score label={t("sleepLabel")} value={entry.sleep} suffix={`/${scaleMax}`} />
            )}
            {entry.soreness != null && (
              <Score label={t("sorenessLabel")} value={entry.soreness} suffix={`/${scaleMax}`} />
            )}
            {entry.weightKg != null && (
              <Score label={t("weightLabel")} value={entry.weightKg} suffix={unit} />
            )}
          </div>

          {(entry.wins || entry.blockers) && (
            <div className="grid gap-3 sm:grid-cols-2">
              {entry.wins && (
                <div>
                  <p className={eyebrow}>{t("winsLabel")}</p>
                  <p className="mt-1 text-sm leading-relaxed text-cream/80">{entry.wins}</p>
                </div>
              )}
              {entry.blockers && (
                <div>
                  <p className={eyebrow}>{t("blockersLabel")}</p>
                  <p className="mt-1 text-sm leading-relaxed text-cream/80">{entry.blockers}</p>
                </div>
              )}
            </div>
          )}

          <div className="border-t border-cream/10 pt-4">
            {entry.reply ? (
              <>
                <p className={eyebrow}>{t("coachReply")}</p>
                <p className="mt-1 text-sm leading-relaxed text-cream/80">{entry.reply}</p>
              </>
            ) : (
              <p className={muted}>{t("awaitingReply")}</p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
