"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export type NavItem = { href: string; label: string; badge?: number };

/**
 * Horizontal tab bar for the studio app. Scrolls sideways on a phone instead of
 * collapsing into a menu — a coach checking her console mid-session should
 * never have to open something to see where she can go.
 *
 * "Active" is prefix-based so `/app/coach/treinos/<id>` still lights up Treinos,
 * with an exact match for the section root so it does not light everything up.
 */
export function Nav({ items, ariaLabel }: { items: NavItem[]; ariaLabel: string }) {
  const pathname = usePathname();

  return (
    <nav aria-label={ariaLabel} className="-mx-1 overflow-x-auto">
      <ul className="flex items-center gap-1 px-1">
        {items.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/app/coach" &&
              item.href !== "/app/aluno" &&
              pathname.startsWith(`${item.href}/`));
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 font-sans text-sm whitespace-nowrap transition-colors",
                  active
                    ? "bg-butter text-ink"
                    : "text-cream/65 hover:bg-cream/5 hover:text-cream",
                )}
              >
                {item.label}
                {item.badge != null && item.badge > 0 && (
                  <span
                    className={cn(
                      "inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 font-mono text-[0.65rem] leading-none",
                      active ? "bg-ink/15 text-ink" : "bg-caramel/20 text-accent-ink",
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
