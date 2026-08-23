import { useTranslations } from "next-intl";
import { ContactFormServer } from "@/components/ui/ContactFormServer";
import { Reveal } from "@/components/motion/Reveal";
import { SplitLines } from "@/components/motion/SplitLines";
import { SolMark } from "@/components/ui/SolMark";

/**
 * Contacto — the final CTA headline and the centered form, with the
 * SolMark half-clipped on the right edge.
 */
export function Contact() {
  const t = useTranslations("Contact");

  return (
    <section
      id="contacto"
      className="relative scroll-mt-24 overflow-hidden bg-ink"
    >
      <SolMark className="absolute -right-44 top-12 hidden h-[34rem] w-[34rem] text-accent-ink/10 md:block" />

      <div className="relative mx-auto max-w-7xl px-6 py-24 md:px-10 md:py-32 lg:px-12">
        <SplitLines className="max-w-[14ch] font-display text-[clamp(3rem,9vw,7.5rem)] uppercase leading-[0.95] text-cream">
          {t.rich("title", {
            m: (chunks) => <span className="text-bronze">{chunks}</span>,
          })}
        </SplitLines>
        <p className="mt-6 max-w-[44ch] text-lg leading-relaxed text-cream/70">
          {t("subtitle")}
        </p>

        <Reveal delay={0.1} className="mx-auto mt-16 w-full max-w-3xl">
          <ContactFormServer />
        </Reveal>
      </div>
    </section>
  );
}
