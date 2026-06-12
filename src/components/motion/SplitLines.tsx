"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, SplitText);

/**
 * Masked line reveal on scroll for display headlines, the same recipe
 * as the hero title. Progressive enhancement: server-rendered visible,
 * hidden only by the tween's first tick, skipped under reduced motion.
 */
export function SplitLines({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLHeadingElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", (ctx) => {
        gsap.set(el, { autoAlpha: 0 });

        // Split only after webfonts settle so line boxes are measured right.
        document.fonts.ready.then(() => {
          ctx.add(() => {
            const split = SplitText.create(el, { type: "lines", mask: "lines" });
            gsap.set(el, { autoAlpha: 1 });
            gsap.from(split.lines, {
              yPercent: 110,
              duration: 1.1,
              stagger: 0.08,
              ease: "power4.out",
              scrollTrigger: { trigger: el, start: "top 80%", once: true },
            });
          });
        });
      });
    },
    { scope: ref },
  );

  return (
    <h2 ref={ref} className={className}>
      {children}
    </h2>
  );
}
