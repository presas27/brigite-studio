"use client";

import { forwardRef, useCallback, useImperativeHandle } from "react";
import { motion, useAnimate } from "motion/react";
import type { AnimatedIconHandle, AnimatedIconProps } from "./types";

/**
 * Hover's catalog has no plus. Same contract as the rest of the set: hover
 * plays the motion, the handle can replay it.
 */
const PlusIcon = forwardRef<AnimatedIconHandle, AnimatedIconProps>(
  ({ size = 24, color = "currentColor", strokeWidth = 2, className = "" }, ref) => {
    const [scope, animate] = useAnimate();

    const start = useCallback(() => {
      animate(scope.current, { rotate: 90 }, { duration: 0.28, ease: "easeOut" });
    }, [animate, scope]);

    const stop = useCallback(() => {
      animate(scope.current, { rotate: 0 }, { duration: 0.22, ease: "easeInOut" });
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
        <motion.path d="M12 5v14" />
        <motion.path d="M5 12h14" />
      </motion.svg>
    );
  },
);

PlusIcon.displayName = "PlusIcon";
export default PlusIcon;
