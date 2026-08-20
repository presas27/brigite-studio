import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { requireCoach } from "@/lib/studio/auth";
import { messagesFor, unreadCount } from "@/lib/studio/coaching";
import { listClients } from "@/lib/studio/users";
import { Empty } from "@/components/studio/Empty";
import { PageHeader } from "@/components/studio/PageHeader";
import { chipAccent, muted, surfaceLink } from "@/components/studio/theme";
import { relativeTime } from "@/components/studio/chat/relative-time";
import { cn } from "@/lib/utils";

/**
 * One row per client, most urgent first: threads with unread messages before
 * read ones, each group ordered by the most recent activity.
 */
export default async function CoachMessagesPage() {
  const coach = await requireCoach();
  const t = await getTranslations("Studio.messages");
  const locale = await getLocale();

  const rows = listClients()
    .map((client) => ({
      client,
      last: messagesFor(client.id, 1)[0],
      unread: unreadCount(client.id, coach.id),
    }))
    .sort((a, b) => {
      const unreadDelta = (b.unread > 0 ? 1 : 0) - (a.unread > 0 ? 1 : 0);
      if (unreadDelta !== 0) return unreadDelta;
      return (b.last?.createdAt ?? 0) - (a.last?.createdAt ?? 0);
    });

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} />
      {rows.length === 0 ? (
        <Empty title={t("noClients")} hint={t("noClientsHint")} />
      ) : (
        <ul className="space-y-2">
          {rows.map(({ client, last, unread }) => (
            <li key={client.id}>
              <Link
                href={`/app/coach/alunos/${client.id}/mensagens`}
                className={cn(surfaceLink, "flex items-center justify-between gap-4 p-4")}
              >
                <div className="min-w-0">
                  <p className="truncate font-sans text-sm font-semibold text-cream">{client.name}</p>
                  <p className={cn(muted, "truncate")}>{last ? last.body : t("empty")}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  {last && (
                    <span className="font-sans text-[0.65rem] text-cream/40">
                      {relativeTime(last.createdAt, locale)}
                    </span>
                  )}
                  {unread > 0 && <span className={chipAccent}>{t("unread", { count: unread })}</span>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
