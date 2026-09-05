import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ActivityFeed } from "@/components/studio/coach/ActivityFeed";
import { OverviewInbox } from "@/components/studio/coach/OverviewInbox";
import { Empty } from "@/components/studio/Empty";
import { shortWeekday } from "@/components/studio/format";
import { chip, chipAccent, eyebrow, heading, surfaceLink } from "@/components/studio/theme";
import { requireCoach } from "@/lib/studio/auth";
import { coachAlerts, recentActivity, unreadTotal } from "@/lib/studio/coaching";
import { dayKey } from "@/lib/studio/dates";
import { assignmentsOn } from "@/lib/studio/plan";
import { listClients } from "@/lib/studio/users";
import { cn } from "@/lib/utils";

/**
 * Overview — the screen the coach lands on.
 *
 * Two questions in priority order: who is waiting on me, and what is happening
 * today. The gold panel answers the first one by name — every client with a
 * check-in, a message or a missed session sitting unanswered — because an
 * unanswered client is the only thing on this page that costs money.
 *
 * The two counters above it are the only numbers left: how many alunas there
 * are, and how many are mid-conversation. Both, and the gold list, subscribe
 * so a message that just landed does not wait on a reload.
 */
export default async function OverviewPage() {
  const [coach, t, locale, clients, alerts, activity, unreadMessages] = await Promise.all([
    requireCoach(),
    getTranslations("Studio.overview"),
    getLocale(),
    listClients(),
    coachAlerts(),
    recentActivity(24),
    unreadTotal(),
  ]);

  const today = dayKey();
  const todaySessions = (
    await Promise.all(
      clients.map(async (client) => {
        const assignments = await assignmentsOn(client.id, today);
        return assignments.map((assignment) => ({ client, assignment }));
      }),
    )
  ).flat();

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_21rem]">
      <div className="min-w-0 space-y-6">
        <header>
          <h1 className={cn(heading, "text-[2rem] sm:text-[2.5rem]")}>
            {t("greeting", { name: coach.name.split(" ")[0] })}
          </h1>
        </header>

        <OverviewInbox
          initialAlerts={alerts}
          initialUnread={unreadMessages}
          clientCount={clients.length}
        />

        <section aria-labelledby="today-sessions" className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="today-sessions" className={eyebrow}>
              {t("todaySessions")}
            </h2>
            <Link
              href="/app/coach/calendario"
              className="link-grow font-sans text-xs text-accent-ink transition-colors hover:text-cream"
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
                      {shortWeekday(assignment.date, locale)}
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
