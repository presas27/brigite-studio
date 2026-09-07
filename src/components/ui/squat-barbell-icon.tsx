"use client";

import { forwardRef, useCallback, useImperativeHandle } from "react";
import { motion, useAnimate } from "motion/react";
import type { AnimatedIconHandle, AnimatedIconProps } from "./types";

/**
 * A lifter in the hole, bar on the back. The workout dock needed a body, not
 * a target — this is the movement she is actually doing.
 */
const SquatBarbellIcon = forwardRef<AnimatedIconHandle, AnimatedIconProps>(
  ({ size = 24, color = "currentColor", strokeWidth = 2, className = "" }, ref) => {
    const [scope, animate] = useAnimate();

    const start = useCallback(() => {
      animate(scope.current, { y: [0, 1.5, 0] }, { duration: 0.42, ease: "easeInOut" });
    }, [animate, scope]);

    const stop = useCallback(() => {
      animate(scope.current, { y: 0 }, { duration: 0.18, ease: "easeOut" });
    }, [animate, scope]);

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
        <path d="M3 7.5h18" />
        <path d="M5 5.5v4" />
        <path d="M19 5.5v4" />
        <path d="M7 6v3" />
        <path d="M17 6v3" />
        <circle cx="12" cy="11.2" r="1.55" />
        <path d="M12 12.8v2.4" />
        <path d="M12 15.2 8.6 17.6 7.8 21" />
        <path d="M12 15.2 15.4 17.6 16.2 21" />
      </motion.svg>
    );
  },
);

SquatBarbellIcon.displayName = "SquatBarbellIcon";
export default SquatBarbellIcon;
