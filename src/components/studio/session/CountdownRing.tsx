"use client";

import { cn } from "@/lib/utils";

const RING_LENGTH = 100;

/** `1:59`, `0:24` — the way a clock is read out loud. */
export function formatClock(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}

/**
 * A countdown as a ring that empties. Used at full size for the rest between
 * sets and at column size for an exercise measured in seconds — the same object
 * either way, because they are the same thing to the person holding the plank.
 *
 * The wrapper is sized by the caller; the ring fills it, and `textClassName`
 * scales the numerals to match.
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
  const progress = running ? Math.max(0, Math.min(1, remaining / Math.max(1, total))) : 1;

  return (
    <span className={cn("relative block", className)}>
      <svg viewBox="0 0 120 120" className="w-full -rotate-90">
        <circle cx="60" cy="60" r="52" fill="none" strokeWidth="4" className="stroke-cream/10" />
        <circle
          cx="60"
          cy="60"
          r="52"
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          pathLength={RING_LENGTH}
          strokeDasharray={RING_LENGTH}
          strokeDashoffset={RING_LENGTH * (1 - progress)}
          className={cn(
            "transition-[stroke-dashoffset] duration-200 ease-linear",
            running ? "stroke-accent-ink" : "stroke-cream/25",
          )}
        />
      </svg>
      <span
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
