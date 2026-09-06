"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { cn } from "@/lib/utils";

const RING_LENGTH = 100;

/** `1:59`, `0:24` — the way a clock is read out loud. */
export function formatClock(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}

/**
 * A countdown as a ring that empties.
 * GSAP animates the SVG stroke smoothly on every tick, and applies an elastic
 * recoil bounce whenever rest is extended (+30s).
 */
export function CountdownRing({
  remaining,
  total,
  className,
  textClassName,
  running = true,
}: {
  remaining: number;
  total: number;
  className?: string;
  textClassName?: string;
  /** A stopped clock keeps a full ring — it has not started spending time yet. */
  running?: boolean;
}) {
  const circleRef = useRef<SVGCircleElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const prevTotalRef = useRef(total);

  const progress = running ? Math.max(0, Math.min(1, remaining / Math.max(1, total))) : 1;
  const targetOffset = RING_LENGTH * (1 - progress);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        if (circleRef.current) circleRef.current.style.strokeDashoffset = String(targetOffset);
        return;
      }

      const circle = circleRef.current;
      if (!circle) return;

      const wasExtended = total > prevTotalRef.current;
      prevTotalRef.current = total;

      if (wasExtended) {
        // Elastic recoil bounce when adding extra rest time (+30s)
        gsap.to(circle, {
          strokeDashoffset: targetOffset,
          duration: 0.65,
          ease: "back.out(2.2)",
          overwrite: "auto",
        });
        if (textRef.current) {
          gsap.fromTo(
            textRef.current,
            { scale: 1.25, color: "var(--color-accent-ink, #c4a484)" },
            { scale: 1, color: "currentColor", duration: 0.45, ease: "back.out(2)" },
          );
        }
      } else {
        // Continuous, fluid countdown progression
        gsap.to(circle, {
          strokeDashoffset: targetOffset,
          duration: 0.35,
          ease: "power1.out",
          overwrite: "auto",
        });
      }
    },
    { dependencies: [targetOffset, total] },
  );

  return (
    <span className={cn("relative block", className)}>
      <svg viewBox="0 0 120 120" className="w-full -rotate-90">
        <circle cx="60" cy="60" r="52" fill="none" strokeWidth="4" className="stroke-cream/10" />
        <circle
          ref={circleRef}
          cx="60"
          cy="60"
          r="52"
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          pathLength={RING_LENGTH}
          strokeDasharray={RING_LENGTH}
          strokeDashoffset={targetOffset}
          className={cn(running ? "stroke-accent-ink" : "stroke-cream/25")}
        />
      </svg>
      <span
        ref={textRef}
        className={cn(
          "absolute inset-0 grid place-items-center font-sans font-semibold tabular-nums",
          running ? "text-cream" : "text-cream/50",
          textClassName,
        )}
      >
        {formatClock(remaining)}
      </span>
    </span>
  );
}
