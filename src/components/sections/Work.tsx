import { useTranslations } from "next-intl";
import { Coverflow } from "@/components/ui/Coverflow";
import { workImages, workProfileUrl } from "@/lib/work";

/**
 * "Trabalho" — a coverflow of Sara's circus / aerial work with a "Ver mais" CTA
 * out to her JamarGig profile. Copy comes from the `Work` namespace; the
 * carousel itself is the client component <Coverflow>.
 */
export function Work() {
  const t = useTranslations("Work");

  const slides = workImages.map((img) => ({
    src: img.src,
    alt: t(`alt.${img.key}`),
  }));

  return (
    <section
      id="work"
      className="w-full overflow-hidden px-6 py-16 md:px-10 md:py-24 lg:py-32"
    >
      <div className="mx-auto max-w-6xl">
        <header className="mx-auto max-w-2xl text-center">
          <p className="font-serif text-sm font-medium uppercase tracking-[0.25em] text-foreground/70">
            {t("eyebrow")}
          </p>
          <h2 className="mt-4 font-serif text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">
            {t("title")}
          </h2>
          <p className="mt-5 font-serif text-lg leading-relaxed text-foreground/70">
            {t("intro")}
          </p>
        </header>

        <div className="mt-14 md:mt-20">
          <Coverflow slides={slides} label={t("carouselLabel")} />
        </div>

        <div className="mt-12 flex justify-center">
          <a
            href={workProfileUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t("ctaAria")}
            className="group inline-flex items-center gap-2 font-serif text-lg font-medium text-foreground"
          >
            <span className="border-b border-foreground/30 pb-1 transition-colors group-hover:border-foreground">
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
