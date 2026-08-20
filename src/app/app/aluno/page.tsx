import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { AlunoActivityFeed } from "@/components/studio/aluno/AlunoActivityFeed";
import { WeekStrip } from "@/components/studio/aluno/WeekStrip";
import {
  clientAlertHref,
  clientAlertKey,
  clientAlertLabel,
  CLIENT_ALERT_ICON,
} from "@/components/studio/aluno/alerts";
import { formatDayKey } from "@/components/studio/coach/format";
import { Icon } from "@/components/studio/coach/icons";
import { Empty } from "@/components/studio/Empty";
import {
  buttonOnAccent,
  eyebrow,
  eyebrowOnAccent,
  heading,
  muted,
  mutedOnAccent,
  panelOnAccent,
  surface,
  surfaceAccent,
  surfaceLink,
} from "@/components/studio/theme";
import { requireClient } from "@/lib/studio/auth";
import { clientActivity, clientAlerts, clientStats } from "@/lib/studio/clientConsole";
import { dayKey, shiftDay, weekKey } from "@/lib/studio/db";
import { assignmentsBetween, assignmentsOn, nextAssignment } from "@/lib/studio/plan";
import { cn } from "@/lib/utils";

/**
 * Hoje — the screen an aluna lands on, and the mirror of Sara's overview.
 *
 * Same three questions, from the other side: what do I do right now, what is
 * still waiting on me, and how is the month going. The gold surface goes to
 * the session, because that is the only thing on this page she can act on in
 * the next five minutes; the alert list stays flat beside it. With no session
 * scheduled the gold moves to whatever *is* waiting, so the accent always
 * marks the one thing worth doing.
 */
export default async function AlunoHojePage() {
  const client = await requireClient();

  const [t, tSession, tNav, tWorkouts, locale] = await Promise.all([
    getTranslations("Studio.aluno"),
    getTranslations("Studio.session"),
    getTranslations("Studio.nav"),
    getTranslations("Studio.workouts"),
    getLocale(),
  ]);

  const today = dayKey();
  const todays = assignmentsOn(client.id, today);
  const fallback = todays.length === 0 ? nextAssignment(client.id, today) : undefined;
  const primary = todays[0] ?? fallback;

  const alerts = clientAlerts(client.id);
  const stats = clientStats(client.id);
  const activity = clientActivity(client.id, 12);

  const monday = weekKey();
  const days = Array.from({ length: 7 }, (_, offset) => shiftDay(monday, offset));
  const week = assignmentsBetween(client.id, monday, days[6]);

  // Today's session already owns the gold, so it only moves to the alert panel
  // when there is no session to own it.
  const alertsOnAccent = !primary && alerts.length > 0;

  const tiles: { key: string; value: string; href: string }[] = [
    {
      key: "weekSessions",
      value: `${stats.weekDone}/${stats.weekTotal}`,
      href: "/app/aluno/plano",
    },
    {
      key: "adherence",
      value: `${stats.adherenceDone}/${stats.adherenceTotal}`,
      href: "/app/aluno/progresso",
    },
    {
      key: "awaitingFeedback",
      value: String(stats.awaitingFeedback),
      href: "/app/aluno/videos",
    },
    {
      key: "unreadMessages",
      value: String(stats.unreadMessages),
      href: "/app/aluno/mensagens",
    },
  ];

  const alertRows = (
    <ol className="space-y-2">
      {alerts.slice(0, 6).map((alert) => (
        <li key={clientAlertKey(alert)}>
          <Link
            href={clientAlertHref(alert)}
            className={cn(
              "flex items-center gap-3 rounded-[1rem] px-4 py-3 transition-colors",
              alertsOnAccent
                ? "bg-ink/[0.07] ring-1 ring-brown-deep/15 hover:bg-ink/[0.12]"
                : "bg-cream/[0.04] ring-1 ring-cream/10 hover:bg-surface-hover",
            )}
          >
            <Icon
              name={CLIENT_ALERT_ICON[alert.kind]}
              className={cn(
                "h-4 w-4 shrink-0",
                alertsOnAccent ? "text-brown-deep" : "text-accent-ink",
              )}
            />
            <span
              className={cn(
                "min-w-0 flex-1 truncate font-sans text-sm",
                alertsOnAccent ? "text-ink" : "text-cream/80",
              )}
            >
              {clientAlertLabel(alert, t, (key) => formatDayKey(key, locale))}
            </span>
            <Icon
              name="chevron"
              className={cn(
                "h-3.5 w-3.5 shrink-0",
                alertsOnAccent ? "text-brown-deep/70" : "text-cream/35",
              )}
            />
          </Link>
        </li>
      ))}
    </ol>
  );

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_21rem]">
      <div className="min-w-0 space-y-8">
        <header>
          <p className={eyebrow}>{tNav("today")}</p>
          <h1 className={cn(heading, "mt-1.5 text-[2rem] sm:text-[2.5rem]")}>
            {t("greeting", { name: client.name.split(" ")[0] })}
          </h1>
          <p className={cn(muted, "mt-2")}>{t("lead")}</p>
        </header>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {tiles.map((tile) => (
            <Link key={tile.key} href={tile.href} className={cn(surfaceLink, "p-4")}>
              <p className={cn(heading, "text-[1.75rem] text-cream")}>{tile.value}</p>
              <p className={cn(eyebrow, "mt-2 leading-snug")}>{t(`stats.${tile.key}`)}</p>
            </Link>
          ))}
        </div>

        {primary ? (
          // The screen's one gold surface. Everything nested here is ink-side.
          <section aria-labelledby="next-session" className={cn(surfaceAccent, "space-y-6 p-6 sm:p-8")}>
            <div>
              <p className={eyebrowOnAccent}>
                {todays.length > 0
                  ? tNav("today")
                  : `${tSession("nextUp")} · ${new Intl.DateTimeFormat(locale, {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    }).format(new Date(`${primary.date}T12:00:00`))}`}
              </p>
              <h2 id="next-session" className={cn(heading, "mt-2 text-[2rem] sm:text-[2.75rem]")}>
                {primary.snapshot.name}
              </h2>
              {primary.snapshot.focus && (
                <p className={cn(mutedOnAccent, "mt-1")}>{primary.snapshot.focus}</p>
              )}
            </div>

            {primary.snapshot.notes && (
              <p className={cn(panelOnAccent, "p-4 text-sm leading-relaxed text-ink/80")}>
                {primary.snapshot.notes}
              </p>
            )}

            <ul className="space-y-2">
              {primary.snapshot.blocks.map((block) => (
                <li key={block.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
                  <span className={eyebrowOnAccent}>
                    {block.label || tWorkouts(`blockKind.${block.kind}`)}
                  </span>
                  <span className="text-ink/70">
                    {block.items.map((item) => item.exerciseName).join(" · ")}
                  </span>
                </li>
              ))}
            </ul>

            <Link
              href={`/app/aluno/treino/${primary.id}`}
              className={cn(buttonOnAccent, "w-full px-8 py-4 text-base sm:w-auto")}
            >
              {primary.startedAt ? tSession("resume") : tSession("start")}
            </Link>
          </section>
        ) : (
          <Empty title={tSession("todayEmpty")} hint={tSession("todayEmptyHint")} />
        )}

        <section
          aria-labelledby="needs-you"
          className={cn(alertsOnAccent ? surfaceAccent : surface, "p-5 sm:p-6")}
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="needs-you" className={alertsOnAccent ? eyebrowOnAccent : eyebrow}>
              {t("needsYou")}
            </h2>
            {alerts.length > 0 && (
              <span
                className={cn(
                  "font-mono text-sm",
                  alertsOnAccent ? "text-ink/60" : "text-cream/45",
                )}
              >
                {alerts.length}
              </span>
            )}
          </div>

          {alerts.length === 0 ? (
            <div className="mt-3">
              <p className="font-sans text-sm font-semibold text-cream/85">{t("needsYouEmpty")}</p>
              <p className={cn(muted, "mt-1")}>{t("needsYouEmptyHint")}</p>
            </div>
          ) : (
            <>
              <div className="mt-4">{alertRows}</div>
              {alerts.length > 6 && (
                <p
                  className={cn(
                    "mt-3 font-mono text-xs",
                    alertsOnAccent ? "text-ink/60" : "text-cream/40",
                  )}
                >
                  +{alerts.length - 6}
                </p>
              )}
            </>
          )}
        </section>

        <WeekStrip days={days} assignments={week} today={today} />
      </div>

      <aside className="min-w-0">
        <AlunoActivityFeed items={activity} />
      </aside>
    </div>
  );
}
