"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger);

/**
 * Floating pill shell — fixed with a small inset so it floats over the
 * full-bleed hero gradient. No flow spacer; sections own their top
 * clearance. Desktop only: the pill slims
 * slightly while scrolling down and grows back on the first upward
 * scroll. Below `md` (and under reduced motion) it stays put.
 */
export function HeaderMotion({ children }: { children: React.ReactNode }) {
  const scope = useRef<HTMLElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(
        "(min-width: 768px) and (prefers-reduced-motion: no-preference)",
        () => {
          const row = rowRef.current;
          if (!row) return;

          let shrunk = false;
          const apply = (next: boolean) => {
            if (next === shrunk) return;
            shrunk = next;
            gsap.to(row, {
              height: next ? "3.25rem" : "4rem",
              duration: 0.35,
              ease: "power2.out",
              overwrite: "auto",
            });
          };

          const trigger = ScrollTrigger.create({
            start: 0,
            end: "max",
            onUpdate: (self) => {
              // Near the top the pill always sits at full size.
              if (self.scroll() < 96) apply(false);
              else apply(self.direction === 1);
            },
          });

          return () => {
            trigger.kill();
            gsap.set(row, { clearProps: "height" });
          };
        },
      );
    },
    { scope },
  );

  return (
    <header ref={scope} className="fixed inset-x-3 top-3 z-50 md:inset-x-4 md:top-4">
      <div
        ref={rowRef}
        className="mx-auto flex h-16 max-w-6xl items-center justify-between rounded-full bg-ink/85 pl-6 pr-3 ring-1 ring-cream/10 backdrop-blur-md"
      >
        {children}
      </div>
    </header>
  );
}
