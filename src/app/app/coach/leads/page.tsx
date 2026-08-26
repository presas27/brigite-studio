import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { formatRelative } from "@/components/studio/format";
import { Empty } from "@/components/studio/Empty";
import { LeadRow } from "@/components/studio/leads/LeadRow";
import { PageHeader } from "@/components/studio/PageHeader";
import { chip, chipAccent } from "@/components/studio/theme";
import { requireCoach } from "@/lib/studio/auth";
import { leadCounts, listLeads } from "@/lib/studio/leads";
import type { LeadStatus } from "@/lib/studio/types";

export const metadata: Metadata = {
  title: "Leads",
  robots: { index: false, follow: false },
};

const STATUSES: LeadStatus[] = ["new", "talking", "won", "lost"];

function isStatus(value: string | undefined): value is LeadStatus {
  return value != null && STATUSES.includes(value as LeadStatus);
}

/**
 * The pipeline: everyone who asked about training and is not a client yet.
 * Newest first, because the newest enquiry is the one still costing money
 * while it waits.
 */
export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  await requireCoach();

  const { estado } = await searchParams;
  const status = isStatus(estado) ? estado : undefined;

  const [t, locale, leads, counts] = await Promise.all([
    getTranslations("Studio.leads"),
    getLocale(),
    listLeads(status),
    leadCounts(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} />

      <nav className="flex flex-wrap gap-2" aria-label={t("statusLabel")}>
        <Link href="/app/coach/leads" className={status ? chip : chipAccent}>
          {t("all")}
        </Link>
        {STATUSES.map((option) => (
          <Link
            key={option}
            href={`/app/coach/leads?estado=${option}`}
            className={status === option ? chipAccent : chip}
          >
            {t(`status.${option}`)}
            <span className="font-sans tabular-nums text-[0.7rem] opacity-60">{counts[option]}</span>
          </Link>
        ))}
      </nav>

      {leads.length === 0 ? (
        <Empty
          title={status ? t("emptyFiltered") : t("empty")}
          hint={status ? undefined : t("emptyHint")}
        />
      ) : (
        <ul className="space-y-2">
          {leads.map((lead) => (
            <li key={lead.id}>
              <LeadRow lead={lead} relative={formatRelative(lead.createdAt, locale)} />
            </li>
          ))}
        </ul>
      )}

      <p className="font-sans text-xs text-cream/35">{t("mock")}</p>
    </div>
  );
}
