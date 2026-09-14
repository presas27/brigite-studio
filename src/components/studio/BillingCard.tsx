import { startBillingCheckout, startBillingPortal } from "@/app/app/conta/actions";
import { SubmitButton } from "@/components/studio/SubmitButton";
import { chip, chipAccent, eyebrow, muted, surface } from "@/components/studio/theme";
import { formatEur, myBilling } from "@/lib/studio/billing";
import { cn } from "@/lib/utils";
import { getTranslations } from "next-intl/server";

export async function BillingCard({ notice }: { notice?: string }) {
  const [t, bill] = await Promise.all([getTranslations("Studio.billing"), myBilling()]);
  if (!bill) return null;

  return (
    <section id="faturacao" className={cn(surface, "space-y-4 p-5 sm:p-6")}>
      <div>
        <p className={eyebrow}>{t("title")}</p>
        <p className={cn(muted, "mt-1")}>{t("lead")}</p>
      </div>
      {notice === "ok" && <p className="font-sans text-sm text-accent-ink">{t("checkoutOk")}</p>}
      {notice === "cancelado" && (
        <p className="font-sans text-sm text-silk" role="alert">
          {t("checkoutCancel")}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <span className={chip}>{t("active", { count: bill.activeCount })}</span>
        <span className={chip}>{t("included", { count: bill.includedClients })}</span>
        {bill.exempt ? (
          <span className={chipAccent}>{t("exempt")}</span>
        ) : (
          <span className={chipAccent}>{formatEur(bill.monthlyCents)}/{t("month")}</span>
        )}
      </div>
      <p className={muted}>{t("proration")}</p>
      {!bill.exempt && (
        <div className="flex flex-wrap gap-3">
          {bill.extraSeats > 0 && !bill.hasStripe && (
            <form action={startBillingCheckout}>
              <SubmitButton pendingLabel={t("redirecting")}>{t("activate")}</SubmitButton>
            </form>
          )}
          {bill.hasStripe && (
            <form action={startBillingPortal}>
              <SubmitButton variant="ghost" pendingLabel={t("redirecting")}>
                {t("manage")}
              </SubmitButton>
            </form>
          )}
        </div>
      )}
    </section>
  );
}
