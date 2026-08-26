import { getLocale, getTranslations } from "next-intl/server";
import { AddClientModal } from "@/components/studio/coach/AddClientModal";
import { ClientLibrary } from "@/components/studio/coach/ClientLibrary";
import type { ClientRow } from "@/components/studio/coach/ClientListRow";
import { Empty } from "@/components/studio/Empty";
import { PageHeader } from "@/components/studio/PageHeader";
import { requireCoach } from "@/lib/studio/auth";
import { assignmentHistory, adherence } from "@/lib/studio/plan";
import type { PlanId } from "@/lib/studio/types";
import { listClients } from "@/lib/studio/users";

const PLAN_IDS: PlanId[] = ["personal", "online", "specialty"];

/**
 * Client roster. Active/invited clients by default — archived ones are
 * one filter tap away, mostly so the "reactivate" action stays reachable.
 */
export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ arquivados?: string }>;
}) {
  await requireCoach();
  const { arquivados } = await searchParams;
  const showArchived = arquivados === "1";

  const [t, locale] = await Promise.all([getTranslations("Studio.clients"), getLocale()]);

  const allClients = await listClients(true);
  const clients = allClients.filter((client) =>
    showArchived ? client.status === "archived" : client.status !== "archived",
  );

  const rows: ClientRow[] = await Promise.all(
    clients.map(async (client) => {
      const [{ done, total }, history] = await Promise.all([
        adherence(client.id),
        assignmentHistory(client.id, 1),
      ]);
      const [lastSession] = history;
      return { client, done, total, lastSessionDate: lastSession?.date ?? null };
    }),
  );

  const planOptions = PLAN_IDS.map((plan) => ({
    value: plan,
    label: t(`plan.${plan}`),
    count: clients.filter((client) => client.profile.plan === plan).length,
  })).filter((option) => option.count > 0);

  return (
    <div className="space-y-8">
      <PageHeader title={t("title")} action={<AddClientModal />} />

      {clients.length === 0 ? (
        <Empty title={t("empty")} hint={t("emptyHint")} />
      ) : (
        <ClientLibrary rows={rows} planOptions={planOptions} locale={locale} />
      )}
    </div>
  );
}
