import { PageHeader } from "@/components/studio/PageHeader";
import { eyebrow, heading, surface } from "@/components/studio/theme";
import { requireAdmin } from "@/lib/studio/auth";
import { billingOverview, formatEur } from "@/lib/studio/billing";
import { cn } from "@/lib/utils";
import { getTranslations } from "next-intl/server";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className={cn(surface, "p-5")}>
      <p className={cn(heading, "text-[1.75rem] text-cream")}>{value}</p>
      <p className={cn(eyebrow, "mt-2")}>{label}</p>
    </div>
  );
}

export default async function AdminHomePage() {
  const [, t, overview] = await Promise.all([
    requireAdmin(),
    getTranslations("Studio.admin"),
    billingOverview(),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader title={t("title")} lead={t("lead")} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={t("coaches")} value={String(overview.coaches)} />
        <Stat label={t("clients")} value={String(overview.clientsActive)} />
        <Stat label={t("paying")} value={String(overview.payingCoaches)} />
        <Stat label={t("mrr")} value={formatEur(overview.mrrCents)} />
      </div>
    </div>
  );
}
