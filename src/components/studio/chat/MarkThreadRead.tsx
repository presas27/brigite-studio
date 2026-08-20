"use client";

import { useEffect, useRef } from "react";

/**
 * Fires a "mark thread read" server action once, after the thread actually
 * mounts in the browser.
 *
 * This deliberately does not happen inside the page's Server Component
 * render. Next.js can render — and `Link` can even prefetch — that RSC
 * payload without the coach or client ever looking at the screen, which
 * would silently clear unread badges for messages nobody actually saw.
 * Running the mutation from a mounted Client Component ties it to a real
 * paint in the browser instead of a speculative render.
 */
export function MarkThreadRead({ action }: { action: () => Promise<void> }) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    void action();
  }, [action]);

  return null;
}
