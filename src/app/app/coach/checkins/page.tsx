import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { parseDayKey } from "@/components/studio/plan/date";
import { Empty } from "@/components/studio/Empty";
import { PageHeader } from "@/components/studio/PageHeader";
import { chipAccent, eyebrow, muted, surfaceLink } from "@/components/studio/theme";
import { CheckinReplyCard } from "@/components/studio/week/CheckinReplyCard";
import { WeekNav } from "@/components/studio/week/WeekNav";
import { requireCoach } from "@/lib/studio/auth";
import { findCheckin, listCheckins } from "@/lib/studio/coaching";
import { weekKey } from "@/lib/studio/db";
import { listClients } from "@/lib/studio/users";
import type { Checkin, Client } from "@/lib/studio/types";
import { cn } from "@/lib/utils";
import { reply } from "./actions";

const WEEK_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Every client's check-in for one week, in one place. Unanswered submissions
 * are first-class (the four numbers, the notes, an inline reply), answered
 * ones collapse to a row, and clients who haven't sent anything this week
 * become a plain nudge list — three groups, in the order Sara needs to work
 * through them.
 */
export default async function CoachCheckinsOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ semana?: string }>;
}) {
  await requireCoach();

  const { semana } = await searchParams;
  const parsed = semana && WEEK_KEY_RE.test(semana) ? new Date(`${semana}T12:00:00Z`) : null;
  const monday = parsed && !Number.isNaN(parsed.getTime()) ? weekKey(parsed) : weekKey();

  const [t, tPlan, locale] = await Promise.all([
    getTranslations("Studio.checkin"),
    getTranslations("Studio.plan"),
    getLocale(),
  ]);

  const clients = listClients();
  // Rows only ever get created by `submitCheckin`, which sets `submittedAt`
  // in the same write — so any checkin in a client's history means they have
  // submitted at least once, regardless of what this particular week shows.
  const everSubmitted = clients.some((client) => listCheckins(client.id, 1).length > 0);

  const unanswered: { client: Client; checkin: Checkin }[] = [];
  const answered: { client: Client; checkin: Checkin }[] = [];
  const notSubmitted: Client[] = [];

  for (const client of clients) {
    const checkin = findCheckin(client.id, monday);
    if (!checkin || checkin.submittedAt == null) {
      notSubmitted.push(client);
    } else if (checkin.repliedAt == null) {
      unanswered.push({ client, checkin });
    } else {
      answered.push({ client, checkin });
    }
  }

  const weekLabel = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(parseDayKey(monday));

  return (
    <div className="space-y-8">
      <PageHeader title={t("title")} />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <WeekNav basePath="/app/coach/checkins" monday={monday} t={tPlan} />
        <p className={eyebrow}>{t("weekOf", { date: weekLabel })}</p>
      </div>

      {!everSubmitted ? (
        <Empty title={t("empty")} hint={t("coachEmptyHint")} />
      ) : (
        <div className="space-y-8">
          {unanswered.length > 0 && (
            <div className="space-y-4">
              {unanswered.map(({ client, checkin }) => (
                <CheckinReplyCard
                  key={checkin.id}
                  clientId={client.id}
                  clientName={client.name}
                  checkin={checkin}
                  locale={locale}
                  t={t}
                  replyAction={reply}
                />
              ))}
            </div>
          )}

          {answered.length > 0 && (
            <div className="space-y-2">
              {answered.map(({ client, checkin }) => (
                <Link
                  key={checkin.id}
                  href={`/app/coach/alunos/${client.id}/checkins`}
                  className={cn(surfaceLink, "flex flex-wrap items-start justify-between gap-3 p-4")}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-sans text-sm font-semibold text-cream">{client.name}</p>
                      <span className={chipAccent}>{t("replySent")}</span>
                    </div>
                    <p className={cn(muted, "mt-1 line-clamp-2")}>{checkin.reply}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {notSubmitted.length > 0 && (
            <div className="space-y-2">
              <p className={eyebrow}>{t("notSubmitted")}</p>
              <ul className="flex flex-wrap gap-2">
                {notSubmitted.map((client) => (
                  <li key={client.id}>
                    <Link
                      href={`/app/coach/alunos/${client.id}/checkins`}
                      className={cn(surfaceLink, "block px-4 py-2 text-sm text-cream/80")}
                    >
                      {client.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
