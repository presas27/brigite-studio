"use client";

import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { SCALE_MAX, SCALE_MIN } from "@/lib/studio/scale";
import { eyebrow } from "../theme";
import { cn } from "@/lib/utils";
/**
 * A 1-10 self-report rendered as a drag dial.
 *
 * Ten pills in a row were fine at 1-5 and fall apart at 1-10 — twenty of them
 * across three questions is a wall of identical circles. An arc gives the whole
 * range one gesture: put a thumb anywhere on the ring and drag. The value lives
 * in the middle in the display face, so the number is the loudest thing on the
 * card, the way the page title is.
 *
 * Uncontrolled by design: the value rides a hidden input, so the enclosing
 * server-action form needs no client state of its own.
 */

const MIN = SCALE_MIN;
const MAX = SCALE_MAX;
/** Gaps between stops, not stops — 1..10 is nine drags end to end. */
const STEPS = MAX - MIN;

/* Geometry, in the 120×120 viewBox. The gap sits at the bottom so the dial
   reads as a gauge rather than a pie, and so the thumb never hides the value. */
const CX = 60;
const CY = 60;
const R = 42;
/** Degrees in the SVG frame (y grows downwards, so angles run clockwise). */
const START = 135;
const SWEEP = 270;
/** Anything past the arc snaps to whichever end is nearer. */
const DEAD_MID = SWEEP + (360 - SWEEP) / 2;

function pointAt(angle: number): { x: number; y: number } {
  const rad = (angle * Math.PI) / 180;
  return { x: CX + R * Math.cos(rad), y: CY + R * Math.sin(rad) };
}

const ARC = (() => {
  const from = pointAt(START);
  const to = pointAt(START + SWEEP);
  // large-arc-flag 1 because the sweep is over 180°, sweep-flag 1 for clockwise.
  return `M${from.x.toFixed(2)} ${from.y.toFixed(2)}A${R} ${R} 0 1 1 ${to.x.toFixed(2)} ${to.y.toFixed(2)}`;
})();

export function ArcRating({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  /** `null` leaves the dial unset — an untouched question stays unanswered. */
  defaultValue?: number | null;
}) {
  const [value, setValue] = useState<number | null>(
    defaultValue == null ? null : Math.min(MAX, Math.max(MIN, Math.round(defaultValue))),
  );
  const [dragging, setDragging] = useState(false);
  const dialRef = useRef<HTMLDivElement>(null);
  const numRef = useRef<HTMLSpanElement>(null);

  const targetFraction = value == null ? 0 : (value - MIN) / STEPS;
  const [displayFraction, setDisplayFraction] = useState(targetFraction);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setDisplayFraction(targetFraction);
        return;
      }
      const tracker = { f: displayFraction };
      gsap.to(tracker, {
        f: targetFraction,
        duration: dragging ? 0.06 : 0.35,
        ease: dragging ? "none" : "back.out(1.6)",
        onUpdate: () => setDisplayFraction(tracker.f),
        overwrite: "auto",
      });
      if (!dragging && value != null && numRef.current) {
        gsap.fromTo(numRef.current, { scale: 1.18 }, { scale: 1, duration: 0.28, ease: "back.out(2)" });
      }
    },
    { dependencies: [targetFraction, dragging] },
  );

  const thumb = pointAt(START + displayFraction * SWEEP);
  /** Screen point → nearest stop on the arc. */
  function valueAt(clientX: number, clientY: number): number {
    const box = dialRef.current?.getBoundingClientRect();
    if (!box) return MIN;
    const x = ((clientX - box.left) / box.width) * 120 - CX;
    const y = ((clientY - box.top) / box.height) * 120 - CY;
    const angle = (Math.atan2(y, x) * 180) / Math.PI;
    let rel = (angle - START + 360) % 360;
    if (rel > SWEEP) rel = rel > DEAD_MID ? 0 : SWEEP;
    return MIN + Math.round((rel / SWEEP) * STEPS);
  }

  function nudge(delta: number) {
    // An untouched dial lands mid-scale first, so one key press never reads as
    // "very poor" just because the arrow happened to point left.
    setValue((current) =>
      current == null ? 5 : Math.min(MAX, Math.max(MIN, current + delta)),
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <span className={eyebrow}>{label}</span>
      <div
        ref={dialRef}
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={MIN}
        aria-valuemax={MAX}
        aria-valuenow={value ?? undefined}
        aria-valuetext={value == null ? undefined : `${value}/${MAX}`}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          setDragging(true);
          setValue(valueAt(event.clientX, event.clientY));
        }}
        onPointerMove={(event) => {
          if (dragging) setValue(valueAt(event.clientX, event.clientY));
        }}
        onPointerUp={(event) => {
          event.currentTarget.releasePointerCapture(event.pointerId);
          setDragging(false);
        }}
        onPointerCancel={() => setDragging(false)}
        onKeyDown={(event) => {
          const step =
            event.key === "ArrowRight" || event.key === "ArrowUp"
              ? 1
              : event.key === "ArrowLeft" || event.key === "ArrowDown"
                ? -1
                : 0;
          if (step !== 0) {
            event.preventDefault();
            nudge(step);
          } else if (event.key === "Home") {
            event.preventDefault();
            setValue(MIN);
          } else if (event.key === "End") {
            event.preventDefault();
            setValue(MAX);
          }
        }}
        className={cn(
          "relative h-[7.5rem] w-[7.5rem] cursor-pointer touch-none select-none rounded-full outline-none",
          "focus-visible:ring-2 focus-visible:ring-caramel/70",
        )}
      >
        <svg viewBox="0 0 120 120" className="h-full w-full" aria-hidden>
          <path
            d={ARC}
            fill="none"
            stroke="currentColor"
            strokeWidth={9}
            strokeLinecap="round"
            className="text-cream/12"
          />
          {displayFraction > 0 && (
            <path
              d={ARC}
              pathLength={100}
              strokeDasharray={`${displayFraction * 100} 100`}
              fill="none"
              stroke="currentColor"
              strokeWidth={9}
              strokeLinecap="round"
              className="text-accent-ink"
            />
          )}
          <circle
            cx={thumb.x}
            cy={thumb.y}
            r={7}
            className={cn(
              "fill-ink-lift transition-[stroke]",
              value == null ? "stroke-cream/25" : "stroke-accent-ink",
            )}
            strokeWidth={4}
          />
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span ref={numRef} className="font-display text-[2.5rem] leading-none tracking-[0.01em] text-cream">
            {value ?? "–"}
          </span>
          <span className="mt-1 font-sans text-[0.65rem] font-medium text-cream/40">/{MAX}</span>
        </div>
      </div>
      <input type="hidden" name={name} value={value ?? ""} />
    </div>
  );
}
