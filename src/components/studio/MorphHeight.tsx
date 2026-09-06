"use client";

import { useLayoutEffect, useRef } from "react";
import { cn } from "@/lib/utils";

const DURATION_MS = 400;
const EASE = "cubic-bezier(0.4, 0, 0.2, 1)";

/**
 * Tweens its own height when `contentKey` changes, so a swap of inner content
 * (chart → empty, form → history, month → week) does not jump.
 *
 * Height is real CSS, not a transform: the node sits in document flow, and
 * only a real height change lets everything below it reflow frame by frame.
 * Same idea as the armed row in `ExitSheet` and the cues panel in
 * `ExerciseStage`, driven by a CSS transition.
 *
 * The `from` height is painted for one frame with transitions off, then the
 * target is applied on the next frame — a same-commit from/to never paints
 * `from`, so the browser has nothing to interpolate.
 *
 * Overflow is clipped only while the tween runs. Left on, it trims 1px rings
 * and swallows the focus ring.
 */
export function MorphHeight({
  contentKey,
  children,
  className,
}: {
  contentKey: string;
  children: React.ReactNode;
  className?: string;
}) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const prevHeight = useRef<number | null>(null);

  useLayoutEffect(() => {
    const box = outer.current;
    const content = inner.current;
    if (!box || !content) return;
    void contentKey;

    const to = content.getBoundingClientRect().height;
    const from = prevHeight.current;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const shouldTween = from != null && Math.abs(from - to) >= 1 && !reduced;

    if (!shouldTween) {
      prevHeight.current = to;
      const frame = requestAnimationFrame(() => {
        prevHeight.current = content.getBoundingClientRect().height;
      });
      return () => cancelAnimationFrame(frame);
    }

    box.style.transition = "none";
    box.style.height = `${from}px`;
    box.style.overflow = "hidden";
    content.style.transition = "none";
    content.style.opacity = "0.45";
    content.style.transform = "translateY(8px)";

    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      box.style.height = "";
      box.style.overflow = "";
      box.style.transition = "";
      content.style.opacity = "";
      content.style.transform = "";
      content.style.transition = "";
      prevHeight.current = content.getBoundingClientRect().height;
    };

    const onEnd = (event: TransitionEvent) => {
      if (event.propertyName === "height") settle();
    };
    box.addEventListener("transitionend", onEnd);
    const fallback = window.setTimeout(settle, DURATION_MS + 80);

    window.setTimeout(() => {
      if (!box.isConnected) return;
      box.style.transition = `height ${DURATION_MS}ms ${EASE}`;
      content.style.transition = `opacity 300ms ${EASE}, transform 300ms ${EASE}`;
      box.style.height = `${to}px`;
      content.style.opacity = "1";
      content.style.transform = "translateY(0)";
    }, 16);

    return () => {
      box.removeEventListener("transitionend", onEnd);
      window.clearTimeout(fallback);
    };
  }, [contentKey]);

  return (
    <div ref={outer} className={cn(className)}>
      <div ref={inner}>{children}</div>
    </div>
  );
}
