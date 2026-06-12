"use client";

import { useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";
import { SolMark } from "@/components/ui/SolMark";

gsap.registerPlugin(ScrollTrigger, SplitText);

/**
 * Testemunho — the page's single loud color moment. A full-bleed
 * caramel slab between two ink sections with one short quote in display
 * caps, the SolMark turning slowly behind it on scroll. Quote content
 * is placeholder until Sara supplies a real one.
 */
export function TestimonialBanner() {
  const t = useTranslations("Testimonial");
  const locale = useLocale();
  const scope = useRef<HTMLElement>(null);
  const quoteRef = useRef<HTMLParagraphElement>(null);
  const attrRef = useRef<HTMLElement>(null);
  const markRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", (ctx) => {
        const quote = quoteRef.current;
        const attr = attrRef.current;
        const mark = markRef.current;
        if (!quote || !attr) return;

        gsap.set([quote, attr], { autoAlpha: 0 });

        if (mark) {
          gsap.fromTo(
            mark,
            { rotation: -15 },
            {
              rotation: 15,
              ease: "none",
              scrollTrigger: {
                trigger: scope.current,
                start: "top bottom",
                end: "bottom top",
                scrub: true,
              },
            },
          );
        }

        // Split only after webfonts settle so word boxes are measured right.
        document.fonts.ready.then(() => {
          ctx.add(() => {
            const split = SplitText.create(quote, { type: "words" });
            gsap.set(quote, { autoAlpha: 1 });

            gsap
              .timeline({
                defaults: { ease: "power3.out" },
                scrollTrigger: {
                  trigger: scope.current,
                  start: "top 75%",
                  once: true,
                },
              })
              .from(split.words, {
                yPercent: 60,
                autoAlpha: 0,
                duration: 0.8,
                stagger: 0.03,
              })
              .fromTo(
                attr,
                { autoAlpha: 0, y: 16 },
                { autoAlpha: 1, y: 0, duration: 0.6 },
                "-=0.4",
              );
          });
        });
      });
    },
    // SplitText replaces the quote's DOM, so a locale change must
    // remount the node (key below) and re-run the split.
    { scope, dependencies: [locale], revertOnUpdate: true },
  );

  return (
    <section
      ref={scope}
      className="grain relative overflow-hidden bg-[linear-gradient(170deg,#d9a05b,#c98e4c)] py-24 text-ink md:py-36"
    >
      <div
        ref={markRef}
        aria-hidden
        className="absolute -left-[6%] top-1/2 -translate-y-1/2 text-ink/10 max-md:opacity-60"
      >
        <SolMark className="h-[260px] w-[260px] md:h-[420px] md:w-[420px]" />
      </div>

      <figure className="relative mx-auto max-w-4xl px-6 text-center">
        <blockquote>
          <p
            key={locale}
            ref={quoteRef}
            className="font-display text-[clamp(1.9rem,4.5vw,3.5rem)] uppercase leading-[1.05]"
          >
            {t.rich("quote", {
              m: (chunks) => <span className="text-ink/55">{chunks}</span>,
            })}
          </p>
        </blockquote>
        <figcaption ref={attrRef} className="mt-8">
          <span className="font-serif text-xl italic">{t("name")}</span>
          <span className="mt-1 block text-sm text-ink/60">{t("role")}</span>
        </figcaption>
      </figure>
    </section>
  );
}
