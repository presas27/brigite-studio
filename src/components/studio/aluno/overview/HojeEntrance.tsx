"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

/**
 * Choreographed GSAP entrance for the aluno dashboard ("Hoje").
 * Staggers the reading cards, the hero workout band, and the week rings
 * so the dashboard loads with organic, unified rhythm instead of a flat pop.
 */
export function HojeEntrance({ children }: { children: React.ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // Staggered lift and reveal of the dashboard cards
        gsap.fromTo(
          "[data-hoje-card]",
          { autoAlpha: 0, y: 18, scale: 0.985 },
          {
            autoAlpha: 1,
            y: 0,
            scale: 1,
            duration: 0.44,
            stagger: 0.065,
            ease: "power3.out",
          },
        );

        // Cascading pop of the 7-day week ring indicators (Mon -> Sun)
        gsap.fromTo(
          "[data-week-ring]",
          { autoAlpha: 0, scale: 0.75 },
          {
            autoAlpha: 1,
            scale: 1,
            duration: 0.35,
            stagger: 0.04,
            ease: "back.out(2)",
            delay: 0.18,
          },
        );
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <div ref={root} className="h-full">
      {children}
    </div>
  );
}
