import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Field } from "@/components/studio/Field";
import { PageHeader } from "@/components/studio/PageHeader";
import { SubmitButton } from "@/components/studio/SubmitButton";
import { chip, eyebrow, field, muted, surface } from "@/components/studio/theme";
import { requireAdmin } from "@/lib/studio/auth";
import { coachDetailAdmin, formatEur } from "@/lib/studio/billing";
import { cn } from "@/lib/utils";
import { saveCoachBilling } from "../../actions";

export default async function AdminCoachPage({
  params,
}: {
  params: Promise<{ coachId: string }>;
}) {
  const { coachId } = await params;
  const [, t, detail] = await Promise.all([
    requireAdmin(),
    getTranslations("Studio.admin"),
    coachDetailAdmin(coachId),
  ]);
  if (!detail) notFound();

  return (
    <div className="space-y-8">
      <PageHeader
        title={detail.coach.name}
        lead={detail.coach.email}
        backHref="/app/admin/treinadores"
      />

      <section className={cn(surface, "space-y-3 p-5")}>
        <p className={eyebrow}>{t("forecast")}</p>
        <p className="font-sans text-sm text-cream">
          {t("activeCount", { count: detail.activeCount })} · {t("included", { count: detail.includedClients })} ·{" "}
          {detail.exempt ? t("exempt") : formatEur(detail.monthlyCents)}
        </p>
        <p className={muted}>{t("prorationHint")}</p>
      </section>

      <form action={saveCoachBilling} className={cn(surface, "space-y-5 p-5 sm:p-6")}>
        <input type="hidden" name="coachId" value={detail.coach.id} />
        <label className="flex items-center gap-3 font-sans text-sm text-cream">
          <input type="checkbox" name="exempt" defaultChecked={detail.exempt} className="accent-[var(--accent-ink,#c4a484)]" />
          {t("exemptLabel")}
        </label>
        <Field label={t("includedLabel")} htmlFor="included">
          <input
            id="included"
            name="includedClients"
            type="number"
            min={0}
            defaultValue={detail.includedClients}
            className={field}
          />
        </Field>
        <Field label={t("priceLabel")} htmlFor="price" hint={t("priceHint")}>
          <input
            id="price"
            name="priceEuros"
            type="number"
            min={0}
            step="0.01"
            defaultValue={(detail.pricePerClientCents / 100).toFixed(2)}
            className={field}
          />
        </Field>
        <SubmitButton pendingLabel={t("saving")}>{t("save")}</SubmitButton>
      </form>

      <section className="space-y-3">
        <p className={eyebrow}>{t("roster")}</p>
        <ul className="space-y-2">
          {detail.clients.map((client) => (
            <li key={client.id} className={cn(surface, "flex flex-wrap items-center justify-between gap-2 p-4")}>
              <div>
                <p className="font-sans text-sm font-semibold text-cream">{client.name}</p>
                <p className={muted}>{client.email}</p>
              </div>
              <span className={chip}>{client.status}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
