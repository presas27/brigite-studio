import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SessionLibrary } from "@/components/studio/aluno/SessionLibrary";
import { Empty } from "@/components/studio/Empty";
import { PageHeader } from "@/components/studio/PageHeader";
import { requireClient } from "@/lib/studio/auth";
import { clientSessions, sessionFocuses } from "@/lib/studio/clientConsole";
import { dayKey } from "@/lib/studio/dates";

export const metadata: Metadata = { title: "Treinos" };

/**
 * Every session Sara has put on this aluna's calendar, browsable — the
 * counterpart of the coach's workout library, over what was actually assigned
 * rather than over the templates.
 *
 * The calendar answers "when"; this answers "which one was that again" — the
 * question you ask when you want to repeat a session you liked or find the
 * week you last did legs.
 */
export default async function AlunoTreinosPage() {
  const client = await requireClient();
  const t = await getTranslations("Studio.aluno");

  const sessions = await clientSessions(client.id);

  return (
    <div className="space-y-8">
      <PageHeader title={t("sessions.title")} lead={t("sessions.lead")} />

      {sessions.length === 0 ? (
        <Empty title={t("sessions.empty")} hint={t("sessions.emptyHint")} />
      ) : (
        <SessionLibrary
          sessions={sessions}
          focuses={sessionFocuses(sessions)}
          today={dayKey()}
        />
      )}
    </div>
  );
}
