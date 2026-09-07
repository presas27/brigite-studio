"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { AccountMenu } from "@/components/studio/AccountMenu";
import { ThemeToggle } from "@/components/studio/ThemeToggle";
import { Icon, type IconName } from "@/components/studio/coach/icons";
import { SolMark } from "@/components/ui/SolMark";
import { eyebrow } from "@/components/studio/theme";
import type { ThemeMode } from "@/lib/studio/theme-mode";
import { cn } from "@/lib/utils";

export type ChromeItem = {
  href: string;
  labelKey: string;
  icon: IconName;
  /** Renders the count as a red corner badge on the icon instead of the usual inline pill — reserved for unread messages, the one count that reads as urgent. */
  urgentBadge?: boolean;
};

/** A titled run of destinations. The first one carries no title. */
export type ChromeSection = { titleKey?: string; items: ChromeItem[] };



/**
 * The studio's application chrome: a persistent, collapsible rail on the left,
 * a sticky topbar, and the main column.
 *
 * Both roles get the same frame. A coach and an aluna do very different work,
 * but they do it in the same app, and a second navigation model — a tab strip
 * for one, a rail for the other — makes the app feel like two products bolted
 * together. What changes between them is the *contents* of the rail and what
 * sits in the topbar, which is exactly what the props here are for.
 *
 * Sidebar and topbar live in one component because they share the drawer's
 * open state; splitting them would mean lifting that state into a context for
 * no gain.
 */
export function StudioChrome({
  role,
  homeHref,
  sections,
  name,
  email,
  themeMode,
  badges,
  actions,
  notifications,
  mobileChrome = "drawer",
  mobileDock,
  children,
}: {
  role: "coach" | "client";
  /** Where the brand mark points — each role's landing screen. */
  homeHref: string;
  sections: ChromeSection[];
  name: string;
  email: string;
  themeMode: ThemeMode;
  /** Counts keyed by href — rendered as a caramel pip on the nav item. */
  badges: Record<string, number>;
  /** The topbar's leading control (a quick-add dialog, a primary link). Rendered by the layout so it can be a server component. */
  actions?: React.ReactNode;
  /** The bell, already fed with this role's alerts. */
  notifications?: React.ReactNode;
  /** Phone shell. `dock` hides the drawer and topbar — the aluna's glass pill. */
  mobileChrome?: "drawer" | "dock";
  mobileDock?: React.ReactNode;
  children: React.ReactNode;
}) {
  const dock = mobileChrome === "dock";
  const t = useTranslations("Studio.nav");
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  function toggleCollapsed() {
    setCollapsed((prev) => !prev);
  }

  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const handleChange = (event: MediaQueryList | MediaQueryListEvent) => {
      if (event.matches) return;
      setCollapsed(false);
    };
    query.addEventListener("change", handleChange);
    return () => query.removeEventListener("change", handleChange);
  }, []);

  // `<main>` carries its own scrollbar at `lg` (see below), so Next.js's
  // built-in scroll restoration — which only resets the window — never
  // touches it. Without this, switching tabs on a client page (e.g. Plano
  // back to Visão geral) after scrolling down keeps the old scrollTop: the
  // new, shorter page opens mid-content with the sticky masthead already
  // pinned over it, which reads as the header rendering broken.
  useEffect(() => {
    document.getElementById("main")?.scrollTo({ top: 0 });
  }, [pathname]);

  // Exact match for the landing screen, prefix match for everything else, so
  // `/app/aluno/treino/<id>` lights up its section without the root lighting
  // up on every page.
  function isActive(href: string) {
    if (href === homeHref) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const nav = (
    <nav aria-label={t("mainMenu")} className="flex min-h-0 flex-1 flex-col gap-5">
      {sections.map((section) => (
        <div key={section.titleKey ?? "root"} className="space-y-1">
          {section.titleKey && (
            // Fades with the rest of the labels when the rail collapses; the
            // line it leaves behind is what keeps the icon stack in runs.
            <p data-sidebar-fade className={cn(eyebrow, "px-3 pb-1", collapsed && "lg:hidden")}>
              {t(section.titleKey)}
            </p>
          )}
          {section.items.map((item) => {
            const active = isActive(item.href);
            const badge = badges[item.href];
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setDrawerOpen(false)}
                aria-current={active ? "page" : undefined}
                title={collapsed ? t(item.labelKey) : undefined}
                className={cn(
                  "relative flex items-center gap-3 rounded-[0.9rem] px-3 py-2.5 font-sans text-sm transition-colors",
                  active ? "font-semibold text-ink" : "text-cream/70 hover:bg-cream/5 hover:text-cream",
                )}
              >
                {active && (
                  <motion.span
                    layoutId={reduceMotion ? undefined : `${role}-nav-pill`}
                    className="absolute inset-0 rounded-[0.9rem] bg-accent-fill"
                    transition={{ type: "spring", stiffness: 520, damping: 40 }}
                  />
                )}
                <span className="relative z-[1] shrink-0">
                  <Icon name={item.icon} className="h-[1.15rem] w-[1.15rem]" />
                  {badge != null &&
                    badge > 0 &&
                    (item.urgentBadge ? (
                      <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-silk px-0.5 font-sans tabular-nums text-[0.6rem] leading-none text-on-dark ring-2 ring-rail">
                        {badge > 9 ? "9+" : badge}
                      </span>
                    ) : (
                      collapsed && (
                        <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-accent-ink ring-2 ring-rail" />
                      )
                    ))}
                </span>
                <span
                  data-sidebar-fade
                  className={cn(
                    "relative z-[1] flex min-w-0 flex-1 items-center gap-3",
                    collapsed && "lg:hidden",
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">{t(item.labelKey)}</span>
                  {!item.urgentBadge && badge != null && badge > 0 && (
                    <span
                      className={cn(
                        "inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 font-sans tabular-nums text-[0.65rem] leading-none",
                        active ? "bg-ink/15 text-ink" : "bg-caramel/20 text-accent-ink",
                      )}
                    >
                      {badge}
                    </span>
                  )}
                </span>
              </Link>
            );
          })}
        </div>
      ))}

      {/* Collapsed only: the header loses this button (too tight next to the
          logo at icon width), so it resurfaces here — pinned toward the
          bottom of the rail, same row treatment as the items above so it
          reads as one of the icon stack rather than a bolt-on, with a bit of
          clearance from the sidebar's actual bottom edge. */}
      {collapsed && (
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={t("expand")}
          aria-expanded={false}
          className="mt-auto mb-2 flex items-center rounded-[0.9rem] px-3 py-2.5 text-cream/60 transition-colors hover:bg-cream/5 hover:text-cream"
        >
          <Icon name="panelLeftOpen" className="h-[1.15rem] w-[1.15rem]" />
        </button>
      )}
    </nav>
  );

  return (
    // `lg:h-dvh` + `lg:overflow-hidden`, not `min-h-dvh`: a page taller than the viewport used
    // to grow the whole document, so the browser's own rubber-band overscroll could nudge it a
    // few px past its edges and flash the near-black `body` underneath `.studio`. Pinning the
    // shell to exactly the viewport and letting `<main>` below carry its own scrollbar keeps
    // that motion (and the reveal) contained inside `<main>` instead of on the document.
    <div className="studio min-h-dvh lg:h-dvh lg:overflow-hidden">
      {/* Drawer scrim. Rendered only when open so it never eats taps on lg. */}
      {!dock && drawerOpen && (
        <button
          type="button"
          aria-label={t("closeMenu")}
          onClick={() => setDrawerOpen(false)}
          className="fixed inset-0 z-30 bg-ink/70 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[16.5rem] flex-col gap-6 overflow-x-hidden border-r border-cream/12 bg-rail px-4 pt-[calc(1.25rem+env(safe-area-inset-top))] pb-[calc(1.25rem+env(safe-area-inset-bottom))]",
          "bg-[radial-gradient(115%_55%_at_0%_0%,rgba(143,42,58,0.11),transparent_62%)]",
          "transition-[transform,width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] lg:translate-x-0",
          collapsed ? "lg:w-[4.75rem]" : "lg:w-[16.5rem]",
          drawerOpen ? "translate-x-0" : "-translate-x-full",
          dock && "max-lg:hidden",
        )}
      >
        {/* px-3 mirrors the nav links' own left inset (see `nav` below) so the
            sun mark sits directly above the icon column, collapsed or not. */}
        <div className="flex items-start justify-between gap-2 px-3">
          <Link href={homeHref} className="group flex min-w-0 items-center gap-2.5">
            <SolMark className="h-6 w-6 shrink-0 text-accent-ink transition-transform duration-500 group-hover:rotate-45" />
            <span
              data-sidebar-fade
              className={cn(
                "overflow-hidden font-display text-base leading-[0.95] uppercase tracking-[0.06em] text-cream",
                collapsed && "lg:hidden",
              )}
            >
              Brigite&rsquo;s
              <br />
              <span className="text-accent-ink">Studio</span>
            </span>
          </Link>
          {!collapsed && (
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-label={t("collapse")}
              aria-expanded
              className="hidden shrink-0 text-cream/60 transition-colors hover:text-cream lg:inline-flex"
            >
              <Icon name="panelLeftClose" className="h-[1.15rem] w-[1.15rem]" />
            </button>
          )}
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

      <div
        className={cn(
          "flex min-w-0 flex-col lg:h-full lg:transition-[margin] lg:duration-300",
          collapsed ? "lg:ml-[4.75rem]" : "lg:ml-[16.5rem]",
        )}
      >
        {/* Opaque, not a translucent blur: `<main>` scrolls directly under this bar,
            and a gold hero card or a display heading passing beneath a 95% wash reads
            as a rendering fault, not as depth. */}
        {/*
         * `pt` is the padding plus whatever the device reserves at the top:
         * installed on iOS the app owns the whole screen (`viewport-fit=cover`
         * plus a translucent status bar), so without the inset the clock and
         * the battery sit on top of this row. Same reasoning for the sides,
         * which is landscape and the curved edges.
         */}
        <header
          className={cn(
            "sticky top-0 z-20 flex items-center gap-3 border-b border-cream/10 bg-background px-[max(1rem,env(safe-area-inset-left))] pt-[calc(0.75rem+env(safe-area-inset-top))] pb-3 sm:px-[max(1.5rem,env(safe-area-inset-left))]",
            dock && "hidden lg:flex",
          )}
        >
          {!dock && (
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label={t("openMenu")}
              className="rounded-full p-2 text-cream/70 transition-colors hover:bg-cream/5 hover:text-cream lg:hidden"
            >
              <Icon name="menu" className="h-5 w-5" />
            </button>
          )}

          {/* Slots rather than imports: both are server components, so the
              layout hands them in already rendered. */}
          <div className="ml-auto">{actions}</div>

          {notifications}

          <ThemeToggle initial={themeMode} />

          <AccountMenu name={name} email={email} role={role} />
        </header>

        <main
          id="main"
          className={cn(
            "min-w-0 grow px-[max(1rem,env(safe-area-inset-left))] pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:px-[max(1.5rem,env(safe-area-inset-left))] sm:pt-8 sm:pb-[calc(2rem+env(safe-area-inset-bottom))] lg:min-h-0 lg:flex-1 lg:overflow-y-auto",
            dock &&
              "max-lg:pt-[max(1.25rem,env(safe-area-inset-top))] max-lg:pb-[calc(6.75rem+env(safe-area-inset-bottom))]",
          )}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      {dock && mobileDock}
    </div>
  );
}
