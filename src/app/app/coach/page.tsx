import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ALERT_ICON, alertHref } from "@/components/studio/coach/alerts";
import { ActivityFeed } from "@/components/studio/coach/ActivityFeed";
import { Icon } from "@/components/studio/coach/icons";
import { Empty } from "@/components/studio/Empty";
import {
  buttonOnAccent,
  chip,
  chipAccent,
  eyebrow,
  eyebrowOnAccent,
  heading,
  muted,
  surfaceAccent,
  surfaceLink,
} from "@/components/studio/theme";
import { requireCoach } from "@/lib/studio/auth";
import { coachAlerts, listSubmissions, recentActivity, unreadCount } from "@/lib/studio/coaching";
import { dayKey, shiftDay, weekKey } from "@/lib/studio/db";
import { assignmentsBetween, assignmentsOn } from "@/lib/studio/plan";
import { listClients } from "@/lib/studio/users";
import { cn } from "@/lib/utils";

/**
 * Overview — the screen Sara lands on.
 *
 * Three questions in priority order: what needs me, what is happening today,
 * and how is the studio doing. The gold surface goes to the first one, because
 * an unanswered client is the only thing on this page that costs money.
 */
export default async function OverviewPage() {
  const coach = await requireCoach();

  const [t, tToday, tClients, locale] = await Promise.all([
    getTranslations("Studio.overview"),
    getTranslations("Studio.today"),
    getTranslations("Studio.clients"),
    getLocale(),
  ]);

  const clients = listClients();
  const alerts = coachAlerts(coach.id);
  const activity = recentActivity(24);

  const today = dayKey();
  const monday = weekKey();
  const todaySessions = clients.flatMap((client) =>
    assignmentsOn(client.id, today).map((assignment) => ({ client, assignment })),
  );
  const weekSessions = clients.reduce(
    (total, client) =>
      total + assignmentsBetween(client.id, monday, shiftDay(monday, 6)).length,
    0,
  );
  const unreadMessages = clients.reduce(
    (total, client) => total + unreadCount(client.id, coach.id),
    0,
  );

  const stats: { key: string; value: number; href: string }[] = [
    { key: "activeClients", value: clients.length, href: "/app/coach/alunos" },
    {
      key: "pendingVideos",
      value: listSubmissions({ status: "pending" }).length,
      href: "/app/coach/videos",
    },
    { key: "unreadMessages", value: unreadMessages, href: "/app/coach/mensagens" },
    { key: "sessionsThisWeek", value: weekSessions, href: "/app/coach/calendario" },
  ];

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_21rem]">
      <div className="min-w-0 space-y-8">
        <header>
          <p className={eyebrow}>{t("title")}</p>
          <h1 className={cn(heading, "mt-1.5 text-[2rem] sm:text-[2.5rem]")}>
            {t("greeting", { name: coach.name.split(" ")[0] })}
          </h1>
          <p className={cn(muted, "mt-2")}>{t("lead")}</p>
        </header>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map((stat) => (
            <Link key={stat.key} href={stat.href} className={cn(surfaceLink, "p-4")}>
              <p className={cn(heading, "text-[1.75rem] text-cream")}>{stat.value}</p>
              <p className={cn(eyebrow, "mt-2 leading-snug")}>{t(`stats.${stat.key}`)}</p>
            </Link>
          ))}
        </div>

        {/* The one gold surface: what is waiting on Sara. */}
        <section aria-labelledby="needs-you" className={cn(surfaceAccent, "p-5 sm:p-6")}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="needs-you" className={eyebrowOnAccent}>
              {t("needsYou")}
            </h2>
            {alerts.length > 0 && (
              <span className="font-mono text-sm text-ink/60">{alerts.length}</span>
            )}
          </div>

          {alerts.length === 0 ? (
            <div className="mt-3">
              <p className={cn(heading, "text-[1.5rem] sm:text-[1.75rem]")}>
                {t("needsYouEmpty")}
              </p>
              <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink/70">
                {t("needsYouEmptyHint")}
              </p>
            </div>
          ) : (
            <>
              <ol className="mt-4 space-y-2">
                {alerts.slice(0, 6).map((alert) => (
                  <li key={`${alert.kind}-${alert.clientId}-${alert.at}`}>
                    <Link
                      href={alertHref(alert)}
                      className="flex items-center gap-3 rounded-[1rem] bg-ink/[0.07] px-4 py-3 ring-1 ring-brown-deep/15 transition-colors hover:bg-ink/[0.12]"
                    >
                      <Icon
                        name={ALERT_ICON[alert.kind]}
                        className="h-4 w-4 shrink-0 text-brown-deep"
                      />
                      <span className="min-w-0 flex-1 truncate font-sans text-sm text-ink">
                        <span className="font-semibold">{alert.clientName}</span>
                        <span className="text-ink/65"> · {tToday(`kind.${alert.kind}`)}</span>
                      </span>
                      <Icon name="chevron" className="h-3.5 w-3.5 shrink-0 text-brown-deep/70" />
                    </Link>
                  </li>
                ))}
              </ol>
              {alerts.length > 6 && (
                <p className="mt-3 font-mono text-xs text-ink/60">+{alerts.length - 6}</p>
              )}
            </>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/app/coach/alunos" className={cn(buttonOnAccent, "px-5 py-2.5 text-xs")}>
              {tClients("title")}
            </Link>
          </div>
        </section>

        <section aria-labelledby="today-sessions" className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="today-sessions" className={eyebrow}>
              {t("todaySessions")}
            </h2>
            <Link
              href="/app/coach/calendario"
              className="link-grow font-sans text-xs text-accent-ink transition-colors hover:text-butter"
            >
              {t("viewAll")}
            </Link>
          </div>

          {todaySessions.length === 0 ? (
            <Empty title={t("todaySessionsEmpty")} />
          ) : (
            <ul className="space-y-2">
              {todaySessions.map(({ client, assignment }) => (
                <li key={assignment.id}>
                  <Link
                    href={`/app/coach/alunos/${client.id}/plano`}
                    className={cn(surfaceLink, "flex flex-wrap items-center gap-3 p-4")}
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-cream/10 font-sans text-xs font-semibold text-cream/70 ring-1 ring-cream/10">
                      {client.name.trim().charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-sans text-sm font-semibold text-cream">
                        {client.name}
                      </span>
                      <span className="block truncate text-xs text-cream/55">
                        {assignment.snapshot.name}
                      </span>
                    </span>
                    <span className={assignment.status === "done" ? chipAccent : chip}>
                      {new Intl.DateTimeFormat(locale, { weekday: "short" }).format(
                        new Date(`${assignment.date}T12:00:00`),
                      )}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <aside className="min-w-0">
        <ActivityFeed items={activity} />
      </aside>
    </div>
  );
}
