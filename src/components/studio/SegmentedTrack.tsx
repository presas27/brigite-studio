"use client";

import { useLayoutEffect, useRef } from "react";
import { cn } from "@/lib/utils";

const EASE = "cubic-bezier(0.4, 0, 0.2, 1)";

/**
 * One sliding pill under the active choice so a change reads as a move, not a
 * restyle. Same idea as `SessionViewToggle`: measure the pressed control
 * against the track, then tween x/width (and y/height if the row wraps).
 *
 * Children must mark the active item with `aria-pressed="true"` or
 * `aria-current="page"`, and sit above the thumb (`relative z-10`).
 */
export function SegmentedTrack({
  value,
  children,
  className,
  thumbClassName,
  groupLabel,
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
  thumbClassName?: string;
  groupLabel?: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const pill = useRef<HTMLSpanElement>(null);
  const ready = useRef(false);

  useLayoutEffect(() => {
    const track = root.current;
    const thumb = pill.current;
    if (!track || !thumb) return;

    const active = track.querySelector<HTMLElement>(
      '[aria-pressed="true"], [aria-current="page"]',
    );
    if (!active) return;
    const trackBox = track.getBoundingClientRect();
    const box = active.getBoundingClientRect();
    const x = box.left - trackBox.left;
    const y = box.top - trackBox.top;
    const instant =
      !ready.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    ready.current = true;

    const apply = () => {
      thumb.style.transform = `translate(${x}px, ${y}px)`;
      thumb.style.width = `${box.width}px`;
      thumb.style.height = `${box.height}px`;
    };

    if (instant) {
      thumb.style.transition = "none";
      apply();
      return;
    }

    window.setTimeout(() => {
      if (!thumb.isConnected) return;
      thumb.style.transition = `transform 320ms ${EASE}, width 320ms ${EASE}, height 320ms ${EASE}`;
      apply();
    }, 16);
  }, [value]);

  return (
    <div
      ref={root}
      role={groupLabel ? "group" : undefined}
      aria-label={groupLabel}
      data-segment={value}
      className={cn(
        "relative isolate inline-flex items-center gap-1 rounded-full bg-cream/5 p-1 ring-1 ring-cream/10",
        className,
      )}
    >
      <span
        ref={pill}
        aria-hidden
        className={cn(
          "pointer-events-none absolute top-0 left-0 rounded-full bg-caramel/20",
          thumbClassName,
        )}
      />
      {children}
    </div>
  );
}
