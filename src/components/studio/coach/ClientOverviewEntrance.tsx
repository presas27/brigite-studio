"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

/**
 * Choreographed GSAP entrance for the coach's client overview page.
 * Staggers the next session hero, the stat tiles, the intake summary,
 * and the private notes so the client profile enters with smooth, cohesive physics.
 */
export function ClientOverviewEntrance({ children }: { children: React.ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          "[data-client-card]",
          { autoAlpha: 0, y: 16, scale: 0.985 },
          {
            autoAlpha: 1,
            y: 0,
            scale: 1,
            duration: 0.42,
            stagger: 0.05,
            ease: "power3.out",
          },
        );
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return <div ref={root} className="space-y-6">{children}</div>;
}
