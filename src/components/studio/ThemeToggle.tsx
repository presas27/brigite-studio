"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { setThemeMode, type ThemeMode } from "@/lib/studio/theme-mode";
import { cn } from "@/lib/utils";
import { MoonIcon, SunIcon } from "./ThemeIcons";

/**
 * Theme switch, ported from the Developh dashboard: a circle that opens from
 * the click point, using the View Transitions API so the browser cross-fades a
 * snapshot instead of animating a thousand elements.
 *
 * Three things make it feel right and are easy to lose:
 *  - the class flips on `documentElement` synchronously inside the transition
 *    callback, so paint and animation are the same frame. The cookie write is
 *    fire-and-forget afterwards, purely so the next request renders correctly.
 *  - the reveal radius is the distance to the furthest viewport corner, or the
 *    circle stops short on a click near an edge.
 *  - reduced motion and browsers without view transitions get the plain flip.
 */
const TRANSITION_ATTRIBUTE = "data-theme-transition";
const THEME_ATTRIBUTE = "data-studio-theme";

type ViewTransition = { finished: Promise<void> };
type TransitionDocument = Document & {
  startViewTransition?: (update: () => void | Promise<void>) => ViewTransition;
};

function applyTransitionVars(x: number, y: number) {
  const root = document.documentElement;
  const horizontal = Math.max(x, window.innerWidth - x);
  const vertical = Math.max(y, window.innerHeight - y);
  root.style.setProperty("--theme-transition-x", `${x}px`);
  root.style.setProperty("--theme-transition-y", `${y}px`);
  root.style.setProperty("--theme-transition-radius", `${Math.hypot(horizontal, vertical)}px`);
}

function cleanupTransitionVars() {
  const root = document.documentElement;
  root.removeAttribute(TRANSITION_ATTRIBUTE);
  root.style.removeProperty("--theme-transition-x");
  root.style.removeProperty("--theme-transition-y");
  root.style.removeProperty("--theme-transition-radius");
}

export function ThemeToggle({ initial, className }: { initial: ThemeMode; className?: string }) {
  const t = useTranslations("Studio.theme");
  const [mode, setMode] = useState<ThemeMode>(initial);
  const [pulseKey, setPulseKey] = useState(0);

  const isLight = mode === "light";
  const label = t(isLight ? "toDark" : "toLight");

  function handleToggle(event: React.MouseEvent<HTMLButtonElement>) {
    const next: ThemeMode = isLight ? "dark" : "light";
    setPulseKey((key) => key + 1);

    const commit = () => {
      document.documentElement.setAttribute(THEME_ATTRIBUTE, next);
      setMode(next);
    };

    void setThemeMode(next);

    const doc = document as TransitionDocument;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || typeof doc.startViewTransition !== "function") {
      commit();
      return;
    }

    applyTransitionVars(event.clientX, event.clientY);
    document.documentElement.setAttribute(TRANSITION_ATTRIBUTE, "expanding");
    void doc.startViewTransition(commit).finished.finally(cleanupTransitionVars);
  }

  return (
    <motion.button
      type="button"
      onClick={handleToggle}
      aria-label={label}
      title={label}
      whileHover={{ scale: 1.04, rotate: isLight ? -8 : 8 }}
      whileTap={{ scale: 0.94 }}
      className={cn(
        "group relative inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-full text-cream/70 ring-1 ring-cream/12 transition-colors hover:text-cream hover:ring-cream/25 focus-visible:ring-2 focus-visible:ring-caramel/70 focus-visible:outline-none",
        className,
      )}
    >
      <AnimatePresence>
        <motion.span
          key={pulseKey}
          initial={{ opacity: 0, scale: 0.88 }}
          animate={{ opacity: 1, scale: 1.08 }}
          exit={{ opacity: 0, scale: 1.2 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="pointer-events-none absolute inset-0 m-auto h-7 w-7 rounded-full bg-caramel/25 blur-md"
        />
      </AnimatePresence>

      <span className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[radial-gradient(circle_at_center,var(--color-caramel)_0%,transparent_72%)] opacity-0 transition-opacity duration-300 group-hover:opacity-15" />

      <motion.span
        animate={{ rotate: isLight ? 180 : 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
        className="relative flex h-4 w-4 items-center justify-center"
      >
        <SunIcon
          className={cn(
            "absolute h-4 w-4 transition-all duration-300",
            isLight
              ? "translate-y-0 rotate-0 scale-100 opacity-100"
              : "translate-y-[2px] -rotate-90 scale-0 opacity-0",
          )}
        />
        <MoonIcon
          className={cn(
            "absolute h-4 w-4 transition-all duration-300",
            isLight
              ? "-translate-y-[2px] rotate-90 scale-0 opacity-0"
              : "translate-y-0 rotate-0 scale-100 opacity-100",
          )}
        />
      </motion.span>
    </motion.button>
  );
}
