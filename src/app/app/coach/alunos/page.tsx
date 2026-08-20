import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { AddClientForm } from "@/components/studio/coach/AddClientForm";
import { formatDayKey } from "@/components/studio/coach/format";
import { Empty } from "@/components/studio/Empty";
import { PageHeader } from "@/components/studio/PageHeader";
import { buttonPrimary, chip, chipAccent, muted, surface, surfaceLink } from "@/components/studio/theme";
import { requireCoach } from "@/lib/studio/auth";
import { assignmentHistory, adherence } from "@/lib/studio/plan";
import { listClients } from "@/lib/studio/users";
import { cn } from "@/lib/utils";

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

  const [t, tProgress, locale] = await Promise.all([
    getTranslations("Studio.clients"),
    getTranslations("Studio.progress"),
    getLocale(),
  ]);

  const clients = listClients(true).filter((client) =>
    showArchived ? client.status === "archived" : client.status !== "archived",
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("title")}
        lead={t("lead")}
        action={
          <a href="#novo-aluno" className={buttonPrimary}>
            {t("add")}
          </a>
        }
      />

      <div className="flex flex-wrap gap-2">
        <Link href="/app/coach/alunos" className={showArchived ? chip : chipAccent}>
          {t("status.active")}
        </Link>
        <Link href="/app/coach/alunos?arquivados=1" className={showArchived ? chipAccent : chip}>
          {t("status.archived")}
        </Link>
      </div>

      {clients.length === 0 ? (
        <Empty title={t("empty")} hint={t("emptyHint")} />
      ) : (
        <ul className="space-y-3">
          {clients.map((client) => {
            const { done, total } = adherence(client.id);
            const [lastSession] = assignmentHistory(client.id, 1);
            return (
              <li key={client.id}>
                <Link
                  href={`/app/coach/alunos/${client.id}`}
                  className={cn(
                    surfaceLink,
                    "flex flex-wrap items-center justify-between gap-4 p-4",
                  )}
                >
                  <div className="min-w-0 space-y-1.5">
                    <p className="truncate font-sans text-sm font-semibold text-cream">
                      {client.name}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={chip}>{t(`plan.${client.profile.plan}`)}</span>
                      <span className={client.status === "active" ? chipAccent : chip}>
                        {t(`status.${client.status}`)}
                      </span>
                      {client.profile.plan === "personal" && (
                        <span className={muted}>
                          {t("sessionsLeft")}: {client.profile.sessionsLeft}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 space-y-1 text-right">
                    <p className="font-mono text-sm text-cream/80">
                      {tProgress("sessionsDone", { done, total })}
                    </p>
                    <p className={muted}>
                      {t("lastSession")}:{" "}
                      {lastSession ? formatDayKey(lastSession.date, locale) : t("never")}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <details className={cn(surface, "p-6")}>
        <summary className="cursor-pointer font-sans text-sm font-semibold text-cream select-none">
          {t("addTitle")}
        </summary>
        <div id="novo-aluno" className="mt-4">
          <AddClientForm />
        </div>
      </details>
    </div>
  );
}
