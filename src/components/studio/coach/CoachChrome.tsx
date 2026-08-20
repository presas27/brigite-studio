"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { AccountMenu } from "@/components/studio/AccountMenu";
import { ThemeToggle } from "@/components/studio/ThemeToggle";
import { SolMark } from "@/components/ui/SolMark";
import { buttonPrimary, eyebrow, field } from "@/components/studio/theme";
import type { ThemeMode } from "@/lib/studio/theme-mode";
import { cn } from "@/lib/utils";
import { Icon, type IconName } from "./icons";

type Item = {
  href: string;
  labelKey: string;
  icon: IconName;
  /** Nested items turn the entry into a disclosure group. */
  children?: { href: string; labelKey: string }[];
};

/**
 * Coach navigation. Sara works on a laptop with a lot of client state to move
 * between, so this is a persistent rail rather than the tab strip the client
 * area uses — a phone-first tab bar cannot hold nine destinations without
 * hiding most of them.
 *
 * Sidebar and topbar live in one client component because they share the
 * drawer's open state; splitting them would mean lifting that state into a
 * context for no gain.
 */
const MAIN: Item[] = [
  { href: "/app/coach", labelKey: "overview", icon: "overview" },
  { href: "/app/coach/alunos", labelKey: "clients", icon: "clients" },
  { href: "/app/coach/plano", labelKey: "plan", icon: "calendar" },
  { href: "/app/coach/videos", labelKey: "videos", icon: "video" },
  { href: "/app/coach/checkins", labelKey: "checkin", icon: "checkin" },
  { href: "/app/coach/mensagens", labelKey: "messages", icon: "message" },
  {
    href: "/app/coach/treinos",
    labelKey: "libraries",
    icon: "library",
    children: [
      { href: "/app/coach/treinos", labelKey: "workouts" },
      { href: "/app/coach/biblioteca", labelKey: "exercises" },
    ],
  },
];

export function CoachChrome({
  name,
  email,
  themeMode,
  badges,
  children,
}: {
  name: string;
  email: string;
  themeMode: ThemeMode;
  /** Counts keyed by href — rendered as a caramel pip on the nav item. */
  badges: Record<string, number>;
  children: React.ReactNode;
}) {
  const t = useTranslations("Studio.nav");
  const tWorkouts = useTranslations("Studio.workouts");
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const pendingTotal = Object.values(badges).reduce((sum, n) => sum + n, 0);

  // Exact match for section roots, prefix match for their children, so
  // `/app/coach/treinos/<id>` lights up Libraries without `/app/coach`
  // lighting up on every page.
  function isActive(href: string) {
    if (href === "/app/coach") return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const nav = (
    <nav aria-label={t("mainMenu")} className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto">
      <form action="/app/coach/alunos" className="relative">
        <Icon
          name="search"
          className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-cream/40"
        />
        <input
          type="search"
          name="q"
          placeholder={t("searchClient")}
          aria-label={t("searchClient")}
          className={cn(field, "py-2.5 pl-9 text-sm")}
        />
      </form>

      <div className="space-y-1">
        <p className={cn(eyebrow, "px-3 pb-1")}>{t("mainMenu")}</p>
        {MAIN.map((item) => {
          const active = isActive(item.href);
          const groupOpen = item.children?.some((child) => isActive(child.href)) ?? false;
          const badge = badges[item.href];
          return (
            <div key={item.href}>
              <Link
                href={item.href}
                onClick={() => setDrawerOpen(false)}
                aria-current={active || groupOpen ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-[0.9rem] px-3 py-2.5 font-sans text-sm transition-colors",
                  active || groupOpen
                    ? "bg-caramel font-semibold text-ink"
                    : "text-cream/70 hover:bg-cream/5 hover:text-cream",
                )}
              >
                <Icon name={item.icon} className="h-[1.15rem] w-[1.15rem] shrink-0" />
                <span className="min-w-0 flex-1 truncate">{t(item.labelKey)}</span>
                {badge != null && badge > 0 && (
                  <span
                    className={cn(
                      "inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 font-mono text-[0.65rem] leading-none",
                      active || groupOpen ? "bg-ink/15 text-ink" : "bg-caramel/20 text-accent-ink",
                    )}
                  >
                    {badge}
                  </span>
                )}
                {item.children && (
                  <Icon
                    name="chevron"
                    className={cn("h-3.5 w-3.5 shrink-0 transition-transform", groupOpen && "rotate-90")}
                  />
                )}
              </Link>

              {item.children && groupOpen && (
                <ul className="mt-1 mb-1 space-y-1 border-l border-cream/10 pl-3 ml-5">
                  {item.children.map((child) => (
                    <li key={child.href}>
                      <Link
                        href={child.href}
                        onClick={() => setDrawerOpen(false)}
                        aria-current={isActive(child.href) ? "page" : undefined}
                        className={cn(
                          "block rounded-[0.7rem] px-3 py-2 font-sans text-sm transition-colors",
                          isActive(child.href)
                            ? "bg-cream/10 text-cream"
                            : "text-cream/55 hover:bg-cream/5 hover:text-cream",
                        )}
                      >
                        {t(child.labelKey)}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );

  return (
    <div className="studio lg:grid lg:min-h-dvh lg:grid-cols-[16.5rem_minmax(0,1fr)]">
      {/* Drawer scrim. Rendered only when open so it never eats taps on lg. */}
      {drawerOpen && (
        <button
          type="button"
          aria-label={t("closeMenu")}
          onClick={() => setDrawerOpen(false)}
          className="fixed inset-0 z-30 bg-ink/70 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={cn(
          // A flat lift is not enough separation at this width, so the rail gets
          // a faint caramel wash from the top-left corner — the same layering
          // trick the site's hero uses, at a tenth of the intensity.
          "fixed inset-y-0 left-0 z-40 flex w-[16.5rem] flex-col gap-6 border-r border-cream/12 bg-rail px-4 py-5",
          "bg-[radial-gradient(115%_55%_at_0%_0%,rgba(217,160,91,0.11),transparent_62%)]",
          "transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] lg:static lg:z-auto lg:translate-x-0",
          drawerOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <Link href="/app/coach" className="group flex items-center gap-2.5">
            <SolMark className="h-6 w-6 shrink-0 text-accent-ink transition-transform duration-500 group-hover:rotate-45" />
            <span className="font-display text-base leading-[0.95] uppercase tracking-[0.06em] text-cream">
              Brigite&rsquo;s
              <br />
              <span className="text-accent-ink">Studio</span>
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            aria-label={t("closeMenu")}
            className="-mt-1 rounded-full p-1.5 text-cream/60 transition-colors hover:bg-cream/5 hover:text-cream lg:hidden"
          >
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>
        {nav}
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-cream/10 bg-background/95 px-4 py-3 backdrop-blur sm:px-6">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label={t("openMenu")}
            className="rounded-full p-2 text-cream/70 transition-colors hover:bg-cream/5 hover:text-cream lg:hidden"
          >
            <Icon name="menu" className="h-5 w-5" />
          </button>

          <Link href="/app/coach/treinos" className={cn(buttonPrimary, "ml-auto px-5 py-2.5 text-xs")}>
            <Icon name="plus" className="h-4 w-4" />
            {tWorkouts("add")}
          </Link>

          <Link
            href="/app/coach"
            aria-label={t("notifications")}
            className="relative rounded-full p-2 text-cream/70 transition-colors hover:bg-cream/5 hover:text-cream"
          >
            <Icon name="bell" className="h-5 w-5" />
            {pendingTotal > 0 && (
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-caramel ring-2 ring-background" />
            )}
          </Link>

          <ThemeToggle initial={themeMode} />

          <AccountMenu name={name} email={email} role="coach" />
        </header>

        <main id="main" className="min-w-0 grow px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
