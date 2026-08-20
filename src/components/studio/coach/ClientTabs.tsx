"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export type ClientTab = {
  href: string;
  label: string;
  /** Count of things waiting on Sara in that tab. Hidden at zero. */
  badge?: number;
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

  return (
    <nav aria-label={label} className="-mx-1 overflow-x-auto border-b border-cream/10">
      <ul className="flex min-w-max items-stretch px-1">
        {tabs.map((tab) => {
          const active = tab.href === activeHref;
          return (
            <li key={tab.href}>
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
                      "inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 font-mono text-[0.65rem] leading-none",
                      active ? "bg-caramel text-ink" : "bg-caramel/20 text-accent-ink",
                    )}
                  >
                    {tab.badge}
                  </span>
                )}
                <span
                  aria-hidden
                  className={cn(
                    "absolute inset-x-2 -bottom-px h-0.5 rounded-full transition-colors sm:inset-x-3",
                    active ? "bg-caramel" : "bg-transparent",
                  )}
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
