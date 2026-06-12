import { useTranslations } from "next-intl";
import { plans } from "@/lib/plans";
import { PlanCard } from "@/components/ui/PlanCard";
import { Reveal } from "@/components/motion/Reveal";

/**
 * Plans — three cards, no prices; every CTA routes to the contact form.
 * Copy comes from the `Plans` namespace, structure from lib/plans.
 */
export function Plans() {
  const t = useTranslations("Plans");

  return (
    <section id="planos" className="scroll-mt-24 bg-ink">
      <div className="mx-auto max-w-7xl px-6 py-24 md:px-10 md:py-32 lg:px-12">
        <Reveal>
          <h2 className="whitespace-nowrap text-center font-display text-[clamp(1.5rem,7vw,5.25rem)] uppercase leading-[0.95] text-cream">
            {t.rich("title", {
              m: (chunks) => <span className="text-bronze">{chunks}</span>,
            })}
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          {plans.map((plan, i) => (
            <Reveal
              key={plan.id}
              delay={i * 0.08}
              className={plan.featured ? "max-lg:order-first" : undefined}
            >
              <PlanCard
                name={t(`items.${plan.id}.name`)}
                tagline={t(`items.${plan.id}.tagline`)}
                bullets={Array.from({ length: plan.bullets }, (_, b) =>
                  t(`items.${plan.id}.b${b + 1}`),
                )}
                cta={t(`items.${plan.id}.cta`)}
                featured={plan.featured}
              />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
