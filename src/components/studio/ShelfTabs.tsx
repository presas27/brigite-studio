"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import type { LibraryCategory } from "@/lib/studio/types";
import { cn } from "@/lib/utils";

export type Shelf = { value: LibraryCategory; label: string; count: number };

/**
 * The Master / Shared split, as a tab strip above a library list.
 *
 * Client state rather than a route segment or a search param, because it is one
 * more filter on a list that already filters by search, category and view
 * entirely on the client — see `WorkoutLibrary`. A shelf that reloaded the page
 * while the neighbouring search box did not would be the odd one out.
 *
 * The counts are on the tabs on purpose: the whole reason for the split is to
 * tell drafts from what a client is running, and a coach should not have to open
 * the other tab to find out it is empty.
 */
export function ShelfTabs({
  shelves,
  value,
  onChangeAction,
  label,
}: {
  shelves: Shelf[];
  value: LibraryCategory;
  onChangeAction: (value: LibraryCategory) => void;
  /** Names the strip for screen readers — "Workout shelves", "Program shelves". */
  label: string;
}) {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.matchMedia().add("(prefers-reduced-motion: no-preference)", () => {
        // The underline slides to the active tab rather than cutting to it. Read
        // off the DOM instead of computed from an index, so it stays correct when
        // a label's width changes with the locale.
        const active = scope.current?.querySelector<HTMLElement>('[aria-selected="true"]');
        const bar = scope.current?.querySelector<HTMLElement>("[data-shelf-bar]");
        if (!active || !bar) return;
        gsap.to(bar, {
          x: active.offsetLeft,
          width: active.offsetWidth,
          duration: 0.28,
          ease: "power3.out",
        });
      });
    },
    { dependencies: [value, shelves.map((shelf) => shelf.label).join("|")], scope },
  );

  return (
    <div
      ref={scope}
      role="tablist"
      aria-label={label}
      className="relative flex items-stretch border-b border-cream/10"
    >
      {shelves.map((shelf) => {
        const active = shelf.value === value;
        return (
          <button
            key={shelf.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChangeAction(shelf.value)}
            className={cn(
              "flex shrink-0 items-center gap-2 px-3 py-3 font-sans text-sm font-semibold whitespace-nowrap transition-colors sm:px-4",
              active ? "text-accent-ink" : "text-cream/50 hover:text-cream",
            )}
          >
            {shelf.label}
            <span
              className={cn(
                "inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 font-sans tabular-nums text-[0.65rem] leading-none",
                active ? "bg-accent-fill text-ink" : "bg-cream/8 text-cream/60",
              )}
            >
              {shelf.count}
            </span>
          </button>
        );
      })}
      {/* One bar that moves, not one per tab that fades: two underlines
          cross-fading at 0.28s reads as a flicker at this size. Positioned from
          the left edge, so it starts under the first tab before GSAP runs. */}
      <span
        aria-hidden
        data-shelf-bar
        className="pointer-events-none absolute bottom-0 left-0 h-0.5 rounded-full bg-accent-ink"
        style={{ width: 0 }}
      />
    </div>
  );
}
