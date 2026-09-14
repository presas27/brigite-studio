import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/studio/PageHeader";
import { chip, chipAccent, muted, surfaceLink } from "@/components/studio/theme";
import { requireAdmin } from "@/lib/studio/auth";
import { formatEur, listCoachesAdmin } from "@/lib/studio/billing";
import { cn } from "@/lib/utils";

export default async function AdminCoachesPage() {
  const [, t, coaches] = await Promise.all([
    requireAdmin(),
    getTranslations("Studio.admin"),
    listCoachesAdmin(),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader title={t("coachesTitle")} lead={t("coachesLead")} />
      <ul className="space-y-3">
        {coaches.map((coach) => (
          <li key={coach.id}>
            <Link
              href={`/app/admin/treinadores/${coach.id}`}
              className={cn(surfaceLink, "flex flex-wrap items-center justify-between gap-3 p-5")}
            >
              <div className="min-w-0">
                <p className="font-sans text-sm font-semibold text-cream">{coach.name}</p>
                <p className={cn(muted, "mt-0.5 truncate")}>{coach.email}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={chip}>
                  {t("activeCount", { count: coach.activeCount })}
                </span>
                {coach.exempt ? (
                  <span className={chipAccent}>{t("exempt")}</span>
                ) : (
                  <span className={chip}>{formatEur(coach.monthlyCents)}/{t("month")}</span>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
