"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/utils";

type AccordionItem = { q: string; a: string };

/**
 * Numbered FAQ accordion — oversized caramel digits against condensed
 * uppercase questions, a warm hairline under each item that ignites
 * while it's open. Items open independently so readers can compare
 * answers. Open/close animates via the CSS grid-rows trick — GPU-cheap,
 * ten lines, and `motion-reduce` turns it off wholesale.
 */
export function Accordion({ items }: { items: AccordionItem[] }) {
  const [open, setOpen] = useState<ReadonlySet<number>>(new Set());
  const baseId = useId();

  function toggle(i: number) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  return (
    <div>
      {items.map((item, i) => {
        const isOpen = open.has(i);
        const btnId = `${baseId}-q${i}`;
        const regionId = `${baseId}-a${i}`;
        return (
          <div
            key={item.q}
            className={cn(
              "border-b transition-colors duration-300",
              isOpen ? "border-caramel/70" : "border-caramel/25",
            )}
          >
            <h3>
              <button
                type="button"
                id={btnId}
                aria-expanded={isOpen}
                aria-controls={regionId}
                onClick={() => toggle(i)}
                className="group grid w-full grid-cols-[2.75rem_1fr_2rem] items-baseline gap-4 py-6 text-left md:grid-cols-[4rem_1fr_2rem] md:py-7"
              >
                <span
                  aria-hidden
                  className="font-display text-3xl leading-none text-caramel md:text-4xl"
                >
                  {i + 1}
                </span>
                <span className="font-display text-xl uppercase tracking-wide text-cream transition-colors duration-200 group-hover:text-butter md:text-2xl">
                  {item.q}
                </span>
                <svg
                  viewBox="0 0 16 16"
                  aria-hidden
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={cn(
                    "h-4 w-4 self-center justify-self-end text-caramel transition-transform duration-300 ease-out motion-reduce:transition-none",
                    isOpen && "-rotate-180",
                  )}
                >
                  <polyline points="3 5.5, 8 10.5, 13 5.5" />
                </svg>
              </button>
            </h3>
            <div
              role="region"
              id={regionId}
              aria-labelledby={btnId}
              className={cn(
                "grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none",
                isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
              )}
            >
              <div className="min-h-0 overflow-hidden">
                <p className="max-w-[56ch] pb-7 text-base leading-relaxed text-cream/70 md:pl-20">
                  {item.a}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
