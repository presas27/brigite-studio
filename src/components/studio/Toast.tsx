"use client";

import { useEffect, useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { Icon } from "./coach/icons";
import { cn } from "@/lib/utils";

/**
 * A short confirmation, bottom-centre, that takes itself away.
 *
 * Deliberately not a provider with a queue: the app has one kind of message to
 * show — "that worked" after an action whose result is off-screen — and one at a
 * time is all a coach can read anyway. The owner keeps the message in state and
 * clears it from `onDoneAction`, so there is nothing global to reason about and
 * nothing to leak between pages.
 *
 * `aria-live="polite"` rather than `assertive`: it confirms something the user
 * just did, so it must not interrupt whatever they moved on to.
 */
export function Toast({
  message,
  onDoneAction,
  duration = 2600,
}: {
  /** The line to show. `null` renders nothing. */
  message: string | null;
  /** Called once the toast has finished leaving, to clear the message. */
  onDoneAction: () => void;
  /** How long it stays before it starts leaving, in ms. */
  duration?: number;
}) {
  const scope = useRef<HTMLDivElement>(null);
  // The callback is read through a ref so the timer effect below depends only on
  // the message: a parent that re-creates its handler each render would
  // otherwise restart the countdown on every keystroke elsewhere on the page.
  // Kept current in its own effect rather than assigned during render, which
  // React forbids — the timer only ever fires after both effects have run.
  const done = useRef(onDoneAction);
  useEffect(() => {
    done.current = onDoneAction;
  }, [onDoneAction]);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => done.current(), duration);
    return () => window.clearTimeout(timer);
  }, [message, duration]);

  useGSAP(
    () => {
      if (!message) return;
      // Reduced motion still gets the toast, just placed rather than thrown: the
      // message is the point and the movement is decoration.
      gsap.matchMedia().add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          scope.current,
          { autoAlpha: 0, y: 12, scale: 0.98 },
          { autoAlpha: 1, y: 0, scale: 1, duration: 0.28, ease: "power2.out" },
        );
      });
    },
    { dependencies: [message], scope },
  );

  if (!message) return null;

  return (
    <div
      ref={scope}
      role="status"
      aria-live="polite"
      className={cn(
        "pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2",
        "flex items-center gap-2 rounded-full bg-ink-lift px-4 py-2.5",
        "font-sans text-sm font-medium text-cream shadow-xl ring-1 ring-cream/15",
      )}
    >
      <Icon name="check" className="h-4 w-4 shrink-0 text-accent-ink" strokeWidth={2.2} />
      {message}
    </div>
  );
}
