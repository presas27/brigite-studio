import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Empty } from "@/components/studio/Empty";
import { SessionHistoryList } from "@/components/studio/report/SessionHistoryList";
import { requireClientAccess } from "@/lib/studio/auth";
import { sessionHistory } from "@/lib/studio/report";

/** A year of training is plenty of history to scroll; past that, nobody scrolls. */
const HISTORY_LIMIT = 60;

/**
 * Treinos tab — what this client actually trained, newest first.
 *
 * The plan tab is the future and this one is the past: only sessions that are
 * finished or missed land here, so the list is a record rather than a to-do.
 */
export default async function ClientSessionsPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const { viewer, client } = await requireClientAccess(clientId);
  if (viewer.role !== "coach") redirect("/app/aluno");

  const [t, tPlan, locale] = await Promise.all([
    getTranslations("Studio.report"),
    getTranslations("Studio.plan"),
    getLocale(),
  ]);

  const sessions = await sessionHistory(client.id, HISTORY_LIMIT);

  if (sessions.length === 0) {
    return <Empty title={t("empty")} hint={t("emptyHint")} />;
  }

  return (
    <SessionHistoryList
      sessions={sessions}
      base={`/app/coach/alunos/${client.id}/treinos`}
      locale={locale}
      t={t}
      tPlan={tPlan}
    />
  );
}
