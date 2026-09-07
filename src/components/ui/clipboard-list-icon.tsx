"use client";

import { forwardRef, useCallback, useImperativeHandle } from "react";
import { motion, useAnimate } from "motion/react";
import type { AnimatedIconHandle, AnimatedIconProps } from "./types";

/** A board with writing — the check-in, not a tick. */
const ClipboardListIcon = forwardRef<AnimatedIconHandle, AnimatedIconProps>(
  ({ size = 24, color = "currentColor", strokeWidth = 2, className = "" }, ref) => {
    const [scope, animate] = useAnimate();

    const start = useCallback(() => {
      animate(".clip-lines", { pathLength: [0, 1] }, { duration: 0.35, ease: "easeOut" });
    }, [animate]);

    const stop = useCallback(() => {
      animate(".clip-lines", { pathLength: 1 }, { duration: 0.15 });
    }, [animate]);

    useImperativeHandle(ref, () => ({ startAnimation: start, stopAnimation: stop }));

    return (
      <motion.svg
        ref={scope}
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        onHoverStart={start}
        onHoverEnd={stop}
      >
        <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
        <path d="M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" />
        <path d="M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2" />
        <motion.path d="M9 12h6" className="clip-lines" />
        <motion.path d="M9 16h4" className="clip-lines" />
      </motion.svg>
    );
  },
);

ClipboardListIcon.displayName = "ClipboardListIcon";
export default ClipboardListIcon;
