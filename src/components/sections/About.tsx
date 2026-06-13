import Image from "next/image";
import { useTranslations } from "next-intl";
import { about } from "@/lib/about";
import { Reveal } from "@/components/motion/Reveal";
import { ClipReveal } from "@/components/motion/ClipReveal";

/**
 * About — opens the ink band that runs to the footer, lapping over the
 * hero so its rounded corners reveal caramel gradient rather than the
 * page background. Studio portrait card to the left, bio to the right
 * with a two-tone heading. The portrait is hidden on mobile, where it
 * would sit right under the hero cut-out and read as a second Sara; the
 * bio fills the column instead. Copy comes from the `About` namespace.
 */
export function About() {
  const t = useTranslations("About");
  const paragraphs = [t("p1"), t("p2"), t("p3")];

  return (
    <section
      id="sobre"
      className="relative -mt-8 scroll-mt-24 rounded-t-[2rem] bg-ink md:-mt-10 md:rounded-t-[2.5rem]"
    >
      <div className="mx-auto grid max-w-7xl items-center gap-14 px-6 py-24 md:grid-cols-12 md:gap-10 md:px-10 md:py-32 lg:px-12">
        <ClipReveal className="hidden md:col-span-5 md:block">
          <div className="gradient-caramel grain relative mx-auto aspect-[4/5] w-full max-w-sm overflow-hidden rounded-[1.75rem] md:max-w-none">
            <Image
              src={about.image}
              alt={about.alt}
              width={about.width}
              height={about.height}
              sizes="(min-width: 768px) 26rem, 80vw"
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>
        </ClipReveal>

        <div className="md:col-span-7 lg:col-span-6 lg:col-start-7">
          <Reveal>
            <h2 className="max-w-[16ch] font-display text-[clamp(2.75rem,6.5vw,5.25rem)] uppercase leading-[0.95] text-cream">
              {t.rich("heading", {
                m: (chunks) => <span className="text-bronze">{chunks}</span>,
              })}
            </h2>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="mt-8 max-w-[52ch] space-y-6 text-lg leading-relaxed text-cream/75">
              {paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
