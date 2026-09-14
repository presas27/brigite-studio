import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/studio/PageHeader";
import { chip, muted, surface } from "@/components/studio/theme";
import { requireAdmin } from "@/lib/studio/auth";
import { listClientsAdmin } from "@/lib/studio/billing";
import { cn } from "@/lib/utils";

export default async function AdminClientsPage() {
  const [, t, clients] = await Promise.all([
    requireAdmin(),
    getTranslations("Studio.admin"),
    listClientsAdmin(),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader title={t("clientsTitle")} lead={t("clientsLead")} />
      <ul className="space-y-2">
        {clients.map((client) => (
          <li key={client.id} className={cn(surface, "flex flex-wrap items-center justify-between gap-3 p-4")}>
            <div className="min-w-0">
              <p className="font-sans text-sm font-semibold text-cream">{client.name}</p>
              <p className={cn(muted, "truncate")}>{client.email}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={chip}>{client.status}</span>
              {client.coachId ? (
                <Link
                  href={`/app/admin/treinadores/${client.coachId}`}
                  className="font-sans text-xs text-cream/70 underline-offset-2 hover:text-cream hover:underline"
                >
                  {client.coachName}
                </Link>
              ) : (
                <span className={muted}>{t("noCoach")}</span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
