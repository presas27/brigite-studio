"use client";

import { useEffect, useState } from "react";
import { formatClock } from "./CountdownRing";

/**
 * How long the session has been running, ticking. Isolated in its own component
 * so a clock that changes every second re-renders a `<span>` and not the whole
 * player underneath it.
 */
export function ElapsedTime({ startedAt }: { startedAt: number | null }) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (startedAt == null) return;
    // `Date.now()` never runs during render — the first reading is taken on the
    // next frame, which is soon enough that nobody sees the zero.
    const tick = () => setSeconds(Math.max(0, Math.round((Date.now() - startedAt) / 1000)));
    const frame = requestAnimationFrame(tick);
    const interval = window.setInterval(tick, 1000);
    return () => {
      cancelAnimationFrame(frame);
      window.clearInterval(interval);
    };
  }, [startedAt]);

  return <>{formatClock(seconds)}</>;
}
