import { useTranslations } from "next-intl";
import { Coverflow } from "@/components/ui/Coverflow";
import { workImages, workProfileUrl } from "@/lib/work";
import { Reveal } from "@/components/motion/Reveal";

/**
 * "Trabalho" — a coverflow of Sara's circus / aerial work with a "Ver
 * mais" CTA out to her JamarGig profile. On ink the photos' stage
 * blacks dissolve into the section and only the lit figure glows. Copy
 * comes from the `Work` namespace; the carousel is <Coverflow>.
 */
export function Work() {
  const t = useTranslations("Work");

  const slides = workImages.map((img) => ({
    src: img.src,
    alt: t(`alt.${img.key}`),
  }));

  return (
    <section
      id="trabalho"
      className="w-full scroll-mt-24 overflow-hidden bg-ink"
    >
      <div className="mx-auto max-w-7xl px-6 py-24 md:px-10 md:py-32 lg:px-12">
        <Reveal>
          <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <h2 className="max-w-[16ch] font-display text-[clamp(2.75rem,6.5vw,5.25rem)] uppercase leading-[0.95] text-cream">
              {t.rich("title", {
                m: (chunks) => <span className="text-accent-muted">{chunks}</span>,
              })}
            </h2>
            <p className="max-w-[36ch] text-lg leading-relaxed text-cream/70 md:text-right">
              {t("intro")}
            </p>
          </header>
        </Reveal>

        <div className="mt-14 md:mt-20">
          <Coverflow slides={slides} label={t("carouselLabel")} />
        </div>

        <div className="mt-12 flex justify-center">
          <a
            href={workProfileUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t("ctaAria")}
            className="group inline-flex items-center gap-2 text-lg font-medium text-cream"
          >
            <span className="border-b border-cream/30 pb-1 transition-colors group-hover:border-cream">
              {t("cta")}
            </span>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
              className="transition-transform duration-300 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            >
              <path
                d="M7 17L17 7M17 7H8.5M17 7v8.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
