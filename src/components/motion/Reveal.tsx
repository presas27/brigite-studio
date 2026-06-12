"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger);

type RevealProps = {
  children: React.ReactNode;
  className?: string;
  /** Seconds, for staggering siblings. */
  delay?: number;
  /** Entry offset in px. */
  y?: number;
  /** ScrollTrigger start. Loosen for elements pinned to the page bottom
      (e.g. the footer wordmark) that never reach the default line. */
  start?: string;
};

/**
 * Scroll reveal — fades the wrapper up once as it enters the viewport.
 * Progressive enhancement: content is server-rendered visible and only
 * hidden by the tween's first tick, so no-JS and reduced-motion users
 * always see it.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 28,
  start = "top 88%",
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          el,
          { autoAlpha: 0, y },
          {
            autoAlpha: 1,
            y: 0,
            duration: 1,
            delay,
            ease: "power3.out",
            scrollTrigger: { trigger: el, start, once: true },
          },
        );
      });
    },
    { scope: ref },
  );

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
