"use client";

import { LazyMotion, domMax } from "motion/react";

export { AnimatePresence, m } from "motion/react";

/** Loads motion features once so screens import `m` instead of the full `motion`. */
export function MotionRoot({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={domMax} strict>
      {children}
    </LazyMotion>
  );
}
