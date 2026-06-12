"use client";

import { useRef } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";
import { Button } from "@/components/ui/Button";
import { SolMark } from "@/components/ui/SolMark";

gsap.registerPlugin(ScrollTrigger, SplitText);

/**
 * Hero — full-bleed caramel gradient; the ink band below laps over its
 * bottom edge with rounded corners. Condensed uppercase headline on the
 * left with one Playfair italic word, Sara's cut-out anchored to the
 * bottom on the right. One choreographed load: masked line reveal on
 * the title, then figure and intro; the figure lags on scroll. Skipped
 * under `prefers-reduced-motion`.
 */
export function Hero() {
  const t = useTranslations("Hero");
  const locale = useLocale();
  const scope = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const leadRef = useRef<HTMLDivElement>(null);
  const figureRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", (ctx) => {
        const title = titleRef.current;
        const lead = leadRef.current;
        const figure = figureRef.current;
        if (!title || !lead || !figure) return;

        // Hide before the entrance; revealed by the timeline below.
        gsap.set([title, lead, figure], { autoAlpha: 0 });

        // Split only after webfonts settle so line boxes are measured right.
        document.fonts.ready.then(() => {
          ctx.add(() => {
            const split = SplitText.create(title, {
              type: "lines",
              mask: "lines",
            });
            gsap.set(title, { autoAlpha: 1 });

            gsap
              .timeline({ defaults: { ease: "power4.out" } })
              .from(split.lines, {
                yPercent: 110,
                duration: 1.1,
                stagger: 0.08,
              })
              .fromTo(
                figure,
                { autoAlpha: 0, y: 48 },
                { autoAlpha: 1, y: 0, duration: 1.15, ease: "power3.out" },
                0.25,
              )
              .fromTo(
                lead,
                { autoAlpha: 0, y: 24 },
                { autoAlpha: 1, y: 0, duration: 0.8, ease: "power3.out" },
                0.5,
              );
          });
        });
      });

      // Scroll depth, desktop only: figure trails the scroll.
      mm.add(
        "(min-width: 768px) and (prefers-reduced-motion: no-preference)",
        () => {
          const figure = figureRef.current;
          if (!figure) return;
          gsap.to(figure, {
            yPercent: 7,
            ease: "none",
            scrollTrigger: {
              trigger: scope.current,
              start: "top top",
              end: "bottom top",
              scrub: true,
            },
          });
        },
      );
    },
    // SplitText replaces the h1's DOM, so a locale change must remount
    // the node (key below) and re-run the split — otherwise React writes
    // the new text into detached nodes and the title never updates.
    { scope, dependencies: [locale], revertOnUpdate: true },
  );

  return (
    <section ref={scope}>
      <div className="gradient-hero grain relative flex min-h-svh flex-col overflow-hidden">
        <div className="relative mx-auto flex w-full max-w-[100rem] grow flex-col px-6 pt-28 md:px-10 md:pt-36 lg:px-16">
          {/* Text block centers in the space below the nav pill on lg;
              on mobile it flows from the top as before. */}
          <div className="lg:my-auto">
            <h1
              key={locale}
              ref={titleRef}
              className="relative z-10 max-w-[14ch] font-display text-[clamp(3.5rem,10.5vw,9rem)] uppercase leading-[0.95] tracking-tight text-cream"
            >
              {t.rich("title", {
                i: (chunks) => (
                  <em className="font-serif text-[0.92em] lowercase italic">
                    {chunks}
                  </em>
                ),
              })}
            </h1>

            <div ref={leadRef} className="relative z-10 mt-8 max-w-md">
              <p className="max-w-[36ch] text-base leading-relaxed text-cream/85 sm:text-lg">
                {t("intro")}
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-6">
                <Button href="#contacto" className="max-sm:w-full">
                  {t("cta")}
                  <span
                    aria-hidden
                    className="transition-transform duration-200 ease-out group-hover:translate-x-1"
                  >
                    →
                  </span>
                </Button>
                <a
                  href="#planos"
                  className="group inline-flex items-center gap-2 text-base font-medium text-cream/85"
                >
                  <span className="border-b border-cream/30 pb-0.5 transition-colors group-hover:border-cream">
                    {t("secondary")}
                  </span>
                  <span
                    aria-hidden
                    className="transition-transform duration-300 ease-out group-hover:translate-y-0.5"
                  >
                    ↓
                  </span>
                </a>
                <SolMark className="h-7 w-7 text-cream/90 motion-safe:animate-[spin_45s_linear_infinite]" />
              </div>
            </div>
          </div>

          {/* Figure — anchored to the card bottom so the rounded edge crops
              her cleanly. */}
          <div
            ref={figureRef}
            className="pointer-events-none relative mx-auto mt-10 flex grow items-end drop-shadow-[0_24px_48px_rgba(60,30,10,0.35)] lg:absolute lg:bottom-0 lg:right-10 lg:mt-0 xl:right-16"
          >
            <Image
              src="/images/sara/hero-cutout-v6.webp"
              alt={t("alt")}
              width={957}
              height={1380}
              preload
              sizes="(min-width: 1024px) 40rem, 70vw"
              className="relative h-[min(52svh,28rem)] w-auto lg:h-[min(84vh,54rem)]"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
