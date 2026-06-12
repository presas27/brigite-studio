import { useTranslations } from "next-intl";
import { Accordion } from "@/components/ui/Accordion";
import { Reveal } from "@/components/motion/Reveal";

const FAQ_COUNT = 5;

/**
 * FAQ — editorial split. A giant "FAQ" wordmark anchors the left column;
 * the numbered accordion fills the right. Copy comes from the `FAQ`
 * namespace, `items.1` through `items.{FAQ_COUNT}`.
 */
export function FAQ() {
  const t = useTranslations("FAQ");
  const items = Array.from({ length: FAQ_COUNT }, (_, i) => ({
    q: t(`items.${i + 1}.q`),
    a: t(`items.${i + 1}.a`),
  }));

  return (
    <section id="faq" className="scroll-mt-24 bg-ink">
      <div className="mx-auto max-w-7xl px-6 py-24 md:px-10 md:py-32 lg:px-12">
        <div className="grid gap-y-12 lg:grid-cols-12 lg:gap-x-10">
          <div className="lg:col-span-5">
            <Reveal>
              <h2 className="font-display text-[clamp(4.5rem,11vw,10rem)] uppercase leading-[0.85] text-cream">
                {t("heading")}
              </h2>
            </Reveal>
          </div>

          <div className="lg:col-span-7">
            <Reveal delay={0.08}>
              <Accordion items={items} />
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
