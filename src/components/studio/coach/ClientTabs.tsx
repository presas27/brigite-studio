"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export type ClientTab = {
  href: string;
  label: string;
  /** Count of things waiting on Sara in that tab. Hidden at zero. */
  badge?: number;
  /** Whether to show a red health alert indicator. */
  alertBadge?: boolean;
};

/**
 * Tab strip for one client's page. The panels are route segments, so the
 * layout above survives the switch and only the content below re-renders —
 * same feel as in-page tabs, but each tab keeps its own URL, back button and
 * server data.
 *
 * The badges are the reason this earns its space: the strip answers "what does
 * this person need from me" before Sara opens a single tab.
 */
export function ClientTabs({ tabs, label }: { tabs: ClientTab[]; label: string }) {
  const pathname = usePathname();
  // The overview is the base path, so it only wins on an exact match —
  // otherwise it would light up on every tab.
  const activeHref = tabs.reduce<string>((best, tab) => {
    const hit = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
    return hit && tab.href.length > best.length ? tab.href : best;
  }, "");

  // On a phone the strip is wider than the screen, so the tab you are actually
  // on can start off-screen — the page then opens with no visible active tab.
  // Jumped, not animated: this is the initial position, not a transition.
  const stripRef = useRef<HTMLDivElement>(null);
  // Which edges have more tabs behind them, so the fades only appear where
  // there is actually something to scroll to.
  const [edges, setEdges] = useState({ start: false, end: false });

  const readEdges = useCallback(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const max = strip.scrollWidth - strip.clientWidth;
    setEdges({ start: strip.scrollLeft > 1, end: strip.scrollLeft < max - 1 });
  }, []);

  useEffect(() => {
    const strip = stripRef.current;
    const active = strip?.querySelector<HTMLElement>('[aria-current="page"]');
    if (strip && active) {
      strip.scrollLeft = Math.max(0, active.offsetLeft - (strip.clientWidth - active.offsetWidth) / 2);
    }
    readEdges();
    window.addEventListener("resize", readEdges);
    return () => window.removeEventListener("resize", readEdges);
  }, [activeHref, readEdges]);

  return (
    <nav aria-label={label} className="relative border-b border-cream/10">
      {/* The strip scrolls sideways rather than wrapping or squeezing: six labels
          plus badges do not fit a phone, and a tab row that reflows onto two lines
          moves the panel below it every time a badge appears. `w-max` sizes the row
          to its content and `shrink-0` per item is what actually holds it there —
          without it flexbox compresses the labels into each other. */}
      <div
        ref={stripRef}
        onScroll={readEdges}
        // `touch-action: pan-x` tells the browser this element only ever
        // scrolls sideways, so a swipe that starts here but drifts vertical —
        // the common case when a thumb lands on the tab strip while scrolling
        // the page — falls through to the document instead of dragging the
        // strip and clipping a tab mid-word.
        className="-mx-1 touch-pan-x overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <ul className="flex w-max items-stretch px-1">
        {tabs.map((tab) => {
          const active = tab.href === activeHref;
          return (
            <li key={tab.href} className="shrink-0">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex items-center gap-2 px-3 py-3 font-sans text-sm font-semibold whitespace-nowrap transition-colors sm:px-4",
                  active ? "text-accent-ink" : "text-cream/50 hover:text-cream",
                )}
              >
                {tab.label}
                {tab.badge != null && tab.badge > 0 && (
                  <span
                    className={cn(
                      "inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 font-sans tabular-nums text-[0.65rem] leading-none",
                      active ? "bg-accent-fill text-ink" : "bg-caramel/20 text-accent-ink",
                    )}
                  >
                    {tab.badge}
                  </span>
                )}
                {tab.alertBadge && (
                  <span
                    className="inline-flex h-2 w-2 shrink-0 rounded-full bg-silk ring-2 ring-background"
                    title="Alerta de saúde"
                  />
                )}
                <span
                  aria-hidden
                  className={cn(
                    "absolute inset-x-2 -bottom-px h-0.5 rounded-full transition-colors sm:inset-x-3",
                    active ? "bg-accent-ink" : "bg-transparent",
                  )}
                />
              </Link>
            </li>
          );
        })}
        </ul>
      </div>
      {/* Says "there is more this way" without a scrollbar — and only while
          there is, so the last tab never sits under a permanent wash. */}
      {edges.start && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-background to-transparent"
        />
      )}
      {edges.end && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent"
        />
      )}
    </nav>
  );
}
