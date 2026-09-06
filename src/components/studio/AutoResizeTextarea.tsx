"use client";

import { useLayoutEffect, useRef } from "react";
import { cn } from "@/lib/utils";

const EASE = "cubic-bezier(0.4, 0, 0.2, 1)";

/**
 * A textarea that grows with its content instead of sprouting a scrollbar.
 * Height is tweened so a new line is a morph, not a jump.
 */
export function AutoResizeTextarea({
  className,
  onInput,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null);

  function fit(el: HTMLTextAreaElement) {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const from = el.getBoundingClientRect().height;
    el.style.height = "auto";
    const to = Math.max(el.scrollHeight, 44);
    if (reduced || Math.abs(from - to) < 1) {
      el.style.transition = "none";
      el.style.height = `${to}px`;
      return;
    }
    el.style.transition = "none";
    el.style.height = `${from}px`;
    void el.offsetHeight;
    el.style.transition = `height 200ms ${EASE}`;
    el.style.height = `${to}px`;
  }

  useLayoutEffect(() => {
    if (ref.current) fit(ref.current);
  }, [props.defaultValue, props.value]);

  return (
    <textarea
      {...props}
      ref={ref}
      onInput={(event) => {
        fit(event.currentTarget);
        onInput?.(event);
      }}
      className={cn("resize-none overflow-hidden", className)}
    />
  );
}
