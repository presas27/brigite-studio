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
 *
 * `fade` (default on) cross-fades the inner content. Turn it off when a
 * transformed ancestor would trap `position: fixed` descendants — the session
 * player's stage — or when the content is growing in place (composer, cells).
 *
 * `appear` tweens from 0 on first mount, so a dropdown opening is a morph
 * rather than a pop.
 */
export function MorphHeight({
  contentKey,
  children,
  className,
  fade = true,
  appear = false,
}: {
  contentKey: string;
  children: React.ReactNode;
  className?: string;
  fade?: boolean;
  appear?: boolean;
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
    const from = prevHeight.current ?? (appear ? 0 : null);
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
    if (fade) {
      content.style.transition = "none";
      content.style.opacity = "0.45";
      content.style.transform = "translateY(8px)";
    }

    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      box.style.height = "";
      box.style.overflow = "";
      box.style.transition = "";
      if (fade) {
        content.style.opacity = "";
        content.style.transform = "";
        content.style.transition = "";
      }
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
      box.style.height = `${to}px`;
      if (fade) {
        content.style.transition = `opacity 300ms ${EASE}, transform 300ms ${EASE}`;
        content.style.opacity = "1";
        content.style.transform = "translateY(0)";
      }
    }, 16);

    return () => {
      box.removeEventListener("transitionend", onEnd);
      window.clearTimeout(fallback);
    };
  }, [appear, contentKey, fade]);

  return (
    <div ref={outer} className={cn(className)}>
      <div ref={inner}>{children}</div>
    </div>
  );
}
