"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { cn } from "@/lib/utils";

export type CoverflowSlide = {
  src: string;
  alt: string;
};

type CoverflowProps = {
  slides: CoverflowSlide[];
  /** Accessible name for the carousel region. */
  label: string;
  /** ms between auto-advances. */
  interval?: number;
};

/** How far a side card sits from the centre, as a fraction of card width. */
const SPACING_RATIO = 0.62;
/** Cards further than this from the centre are hidden. */
const MAX_VISIBLE = 3;
/** Travel duration of one advance. */
const TRAVEL = 0.95;
/** Shared ease — every card moves in lockstep, like one rigid carousel. */
const EASE = "power3.inOut";

/** Shortest signed distance from `active` to `i` on a ring of `n`. */
function ringOffset(i: number, active: number, n: number) {
  let pos = i - active;
  if (pos > n / 2) pos -= n;
  if (pos < -n / 2) pos += n;
  return pos;
}

function prefersReduced() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Coverflow carousel — the centre card is large and sharp; side cards recede
 * in 3D, scaled and dimmed via an overlay, and the whole row glides one step
 * in lockstep on each advance. Auto-advances exactly one slide at a time
 * (self-rescheduling
 * timer, reset on any interaction) and pauses on hover/focus, when the stage
 * leaves the viewport, and when the tab is hidden — snapping to a settled
 * layout so a throttled background tab can never leave it mid-animation.
 * Navigable by drag, arrow keys, and by clicking a side card (which lifts on
 * hover to advertise the affordance). Honours `prefers-reduced-motion`
 * (no auto-advance, instant positioning).
 */
export function Coverflow({ slides, label, interval = 3500 }: CoverflowProps) {
  const n = slides.length;
  const [active, setActive] = useState(0);

  const stageRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const overlayRefs = useRef<(HTMLDivElement | null)[]>([]);
  const hovering = useRef(false);
  const inView = useRef(false);
  const firstRun = useRef(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef = useRef(0);

  const next = useCallback(() => setActive((a) => (a + 1) % n), [n]);
  const prev = useCallback(() => setActive((a) => (a - 1 + n) % n), [n]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Self-rescheduling auto-advance: every settle schedules the next step, so it
  // never stacks and resets cleanly on interaction. Only runs while the stage
  // is on screen in a visible tab.
  const scheduleNext = useCallback(() => {
    clearTimer();
    if (prefersReduced() || hovering.current || !inView.current || document.hidden) {
      return;
    }
    timerRef.current = setTimeout(() => setActive((a) => (a + 1) % n), interval);
  }, [clearTimer, interval, n]);

  // Position every card relative to the active index. `animate` is false for
  // the first paint and on resize (instant), true for navigation.
  const applyLayout = useCallback(
    (animate: boolean) => {
      const cardW = cardRefs.current[0]?.offsetWidth ?? 300;
      const spacing = cardW * SPACING_RATIO;
      const a = activeRef.current;
      const motion = animate && !prefersReduced();

      cardRefs.current.forEach((card, i) => {
        if (!card) return;
        const pos = ringOffset(i, a, n);
        const dist = Math.abs(pos);
        const visible = dist <= MAX_VISIBLE;

        const vars: gsap.TweenVars = {
          xPercent: -50,
          x: pos * spacing,
          scale: pos === 0 ? 1 : Math.max(0.6, 1 - dist * 0.16),
          rotationY: pos === 0 ? 0 : pos < 0 ? 38 : -38,
          opacity: visible ? 1 : 0,
          // Tweened (snapped to ints) rather than set up front: an instant
          // swap puts the incoming card on top before it has moved, so it
          // slides "through" the centre card. Crossing mid-travel keeps the
          // larger card on top until they actually trade places.
          zIndex: 100 - dist,
        };

        if (motion) {
          gsap.to(card, {
            ...vars,
            snap: { zIndex: 1 },
            duration: TRAVEL,
            ease: EASE,
            overwrite: "auto",
          });
        } else {
          gsap.set(card, vars);
        }
        gsap.set(card, { pointerEvents: visible ? "auto" : "none" });

        const overlay = overlayRefs.current[i];
        if (overlay) {
          const o = pos === 0 ? 0 : Math.min(0.62, 0.3 + dist * 0.16);
          if (motion) {
            gsap.to(overlay, {
              opacity: o,
              duration: TRAVEL,
              ease: EASE,
              overwrite: "auto",
            });
          } else {
            gsap.set(overlay, { opacity: o });
          }
        }
      });
    },
    [n],
  );

  // Animate on every active change, then schedule the next auto-advance.
  useGSAP(
    () => {
      activeRef.current = active;
      applyLayout(!firstRun.current);
      firstRun.current = false;
      scheduleNext();
    },
    { scope: stageRef, dependencies: [active] },
  );

  // Mount: instant first layout + reposition on resize.
  useEffect(() => {
    applyLayout(false);
    const onResize = () => applyLayout(false);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      clearTimer();
    };
  }, [applyLayout, clearTimer]);

  // Pause whenever the stage is off screen or the tab is hidden, and snap any
  // in-flight tween to its settled layout — background tabs throttle timers
  // and rAF independently, which otherwise leaves cards frozen mid-animation.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const settle = () => {
      gsap.killTweensOf(
        [...cardRefs.current, ...overlayRefs.current].filter(Boolean),
      );
      applyLayout(false);
    };
    const sync = (visible: boolean) => {
      if (visible) {
        settle();
        scheduleNext();
      } else {
        clearTimer();
        settle();
      }
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        inView.current = entry.isIntersecting;
        sync(entry.isIntersecting);
      },
      { threshold: 0.2 },
    );
    io.observe(stage);

    const onVisibility = () => sync(!document.hidden && inView.current);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [applyLayout, scheduleNext, clearTimer]);

  // --- drag / swipe ---------------------------------------------------------
  const dragStartX = useRef<number | null>(null);
  const moved = useRef(false);

  const onPointerDown = (e: React.PointerEvent) => {
    dragStartX.current = e.clientX;
    moved.current = false;
    hovering.current = true;
    clearTimer();
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (dragStartX.current !== null && Math.abs(e.clientX - dragStartX.current) > 6) {
      moved.current = true;
    }
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (dragStartX.current !== null) {
      const dx = e.clientX - dragStartX.current;
      if (dx > 40) prev();
      else if (dx < -40) next();
    }
    dragStartX.current = null;
    hovering.current = false;
    scheduleNext();
  };

  // Click-to-select a side card — guarded so a drag that ends on a card does
  // not also fire a click (which would jump twice in one gesture).
  const onCardClick = (i: number) => {
    if (moved.current) {
      moved.current = false;
      return;
    }
    if (i !== active) setActive(i);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      prev();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      next();
    }
  };

  return (
    <div className="relative w-full">
      <div
        ref={stageRef}
        role="group"
        aria-roledescription="carousel"
        aria-label={label}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onMouseEnter={() => {
          hovering.current = true;
          clearTimer();
        }}
        onMouseLeave={() => {
          hovering.current = false;
          scheduleNext();
        }}
        onFocus={() => {
          hovering.current = true;
          clearTimer();
        }}
        onBlur={() => {
          hovering.current = false;
          scheduleNext();
        }}
        className="relative mx-auto h-[calc(var(--cw)*1.5)] w-full touch-pan-y select-none outline-none [--cw:clamp(13.5rem,62vw,21rem)] [perspective:1600px] focus-visible:ring-2 focus-visible:ring-caramel/70 focus-visible:ring-offset-4 focus-visible:ring-offset-ink"
      >
        {slides.map((slide, i) => (
          <div
            key={slide.src}
            ref={(el) => {
              cardRefs.current[i] = el;
            }}
            onClick={() => onCardClick(i)}
            className={cn(
              "group absolute left-1/2 top-0 h-[calc(var(--cw)*1.5)] w-[var(--cw)] will-change-transform [backface-visibility:hidden] [transform-style:preserve-3d]",
              i === active ? "cursor-default" : "cursor-pointer",
            )}
          >
            <div
              className={cn(
                // Tailwind v4 translate/scale utilities write the native
                // `translate`/`scale` properties, not `transform` — they must
                // be listed in transition-property or the hover lift snaps.
                "relative h-full w-full overflow-hidden rounded-3xl bg-[#0b0907] ring-1 ring-cream/10 shadow-[0_40px_80px_-24px_rgba(0,0,0,0.8)] transition-[translate,scale,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] [backface-visibility:hidden] [will-change:translate,scale]",
                i !== active &&
                  "group-hover:-translate-y-3 group-hover:scale-[1.03] group-hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.7)]",
              )}
            >
              <Image
                src={slide.src}
                alt={slide.alt}
                fill
                draggable={false}
                sizes="(min-width: 1024px) 21rem, 62vw"
                className="object-cover"
              />
              <div
                ref={(el) => {
                  overlayRefs.current[i] = el;
                }}
                aria-hidden
                className="absolute inset-0 bg-[#15110e]"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
