"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
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

/** Rail width, expanded and collapsed to icons-only. Mirrors the `16.5rem` /
 * `4.75rem` Tailwind values below — kept in px so the tween below can drive
 * the `--rail-w` custom property with plain numbers. */
const RAIL_WIDTH_EXPANDED = 264;
const RAIL_WIDTH_COLLAPSED = 76;

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
  children: React.ReactNode;
}) {
  const t = useTranslations("Studio.nav");
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const asideRef = useRef<HTMLElement>(null);
  // The rail is genuinely `position: fixed` at every breakpoint (see the aside's
  // className below) — nothing short of that is immune to the browser's overscroll
  // rubber-banding, which a `sticky` rail would still visibly shift with. Fixed
  // elements take themselves out of layout, so the content column needs its own
  // offset that shrinks/grows in lockstep; both read the same `--rail-w` custom
  // property off this shell so one tween drives both, frame for frame.
  const shellRef = useRef<HTMLDivElement>(null);
  const railWidthRef = useRef({ w: RAIL_WIDTH_EXPANDED });

  const { contextSafe } = useGSAP({ scope: asideRef });

  function setRailWidth(px: number) {
    shellRef.current?.style.setProperty("--rail-w", `${px}px`);
  }

  /**
   * One timeline per toggle, built fresh so it always animates from the
   * current state rather than replaying a pre-baked one. Closing fades the
   * labels out fast and lets the rail keep shrinking after they're gone;
   * opening grows the rail first and fades labels in once there's room —
   * that ordering is what keeps the text from visibly reflowing mid-tween.
   */
  // contextSafe defers this closure to the click handler below (toggleCollapsed); the ref is
  // never read during render, but the compiler can't see through contextSafe to know that.
  // eslint-disable-next-line react-hooks/refs
  const animateCollapse = contextSafe((next: boolean) => {
    const aside = asideRef.current;
    if (!aside) return;
    const fadeTargets = aside.querySelectorAll<HTMLElement>("[data-sidebar-fade]");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const target = next ? RAIL_WIDTH_COLLAPSED : RAIL_WIDTH_EXPANDED;

    const railWidth = railWidthRef.current;

    if (reduced) {
      railWidth.w = target;
      setRailWidth(target);
      gsap.set(fadeTargets, { autoAlpha: next ? 0 : 1 });
      return;
    }

    const tl = gsap.timeline({ defaults: { ease: "power2.out" }, overwrite: true });
    if (next) {
      tl.to(fadeTargets, { autoAlpha: 0, duration: 0.15 }, 0).to(
        railWidth,
        { w: target, duration: 0.35, onUpdate: () => setRailWidth(railWidth.w) },
        0,
      );
    } else {
      tl.to(railWidth, { w: target, duration: 0.35, onUpdate: () => setRailWidth(railWidth.w) }, 0).to(
        fadeTargets,
        { autoAlpha: 1, duration: 0.2 },
        0.18,
      );
    }
  });

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      animateCollapse(next);
      return next;
    });
  }

  // The toggle only exists at `lg`; if the viewport narrows past that while
  // collapsed (a resized window, not a reload), the mobile drawer must not
  // inherit the icon-only width.
  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const handleChange = (event: MediaQueryList | MediaQueryListEvent) => {
      if (event.matches) return;
      setCollapsed(false);
      railWidthRef.current.w = RAIL_WIDTH_EXPANDED;
      shellRef.current?.style.removeProperty("--rail-w");
      const aside = asideRef.current;
      if (!aside) return;
      gsap.set(aside.querySelectorAll<HTMLElement>("[data-sidebar-fade]"), {
        clearProps: "opacity,visibility",
      });
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
            <p data-sidebar-fade className={cn(eyebrow, "px-3 pb-1")}>
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
                  "flex items-center gap-3 rounded-[0.9rem] px-3 py-2.5 font-sans text-sm transition-colors",
                  active
                    ? "bg-caramel font-semibold text-ink"
                    : "text-cream/70 hover:bg-cream/5 hover:text-cream",
                )}
              >
                <span className="relative shrink-0">
                  <Icon name={item.icon} className="h-[1.15rem] w-[1.15rem]" />
                  {badge != null &&
                    badge > 0 &&
                    (item.urgentBadge ? (
                      <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-silk px-0.5 font-sans tabular-nums text-[0.6rem] leading-none text-on-dark ring-2 ring-rail">
                        {badge > 9 ? "9+" : badge}
                      </span>
                    ) : (
                      collapsed && (
                        <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-caramel ring-2 ring-rail" />
                      )
                    ))}
                </span>
                <span data-sidebar-fade className="flex min-w-0 flex-1 items-center gap-3">
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
    <div ref={shellRef} className="studio min-h-dvh lg:h-dvh lg:overflow-hidden">
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
        ref={asideRef}
        className={cn(
          // A flat lift is not enough separation at this width, so the rail gets
          // a faint caramel wash from the top-left corner — the same layering
          // trick the site's hero uses, at a tenth of the intensity.
          "fixed inset-y-0 left-0 z-40 flex w-[16.5rem] flex-col gap-6 overflow-x-hidden border-r border-cream/12 bg-rail px-4 py-5",
          "bg-[radial-gradient(115%_55%_at_0%_0%,rgba(217,160,91,0.11),transparent_62%)]",
          // Genuinely fixed at every breakpoint — immune to scroll and to the
          // overscroll rubber-band bounce, which `sticky` still visibly moves
          // with. The content column carries a matching `--rail-w` offset below.
          "transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] lg:w-[var(--rail-w,16.5rem)] lg:translate-x-0",
          drawerOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* px-3 mirrors the nav links' own left inset (see `nav` below) so the
            sun mark sits directly above the icon column, collapsed or not. */}
        <div className="flex items-start justify-between gap-2 px-3">
          <Link href={homeHref} className="group flex min-w-0 items-center gap-2.5">
            <SolMark className="h-6 w-6 shrink-0 text-accent-ink transition-transform duration-500 group-hover:rotate-45" />
            <span
              data-sidebar-fade
              className="overflow-hidden font-display text-base leading-[0.95] uppercase tracking-[0.06em] text-cream"
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

      <div className="flex min-w-0 flex-col lg:h-full lg:ml-[var(--rail-w,16.5rem)]">
        {/* Opaque, not a translucent blur: `<main>` scrolls directly under this bar,
            and a gold hero card or a display heading passing beneath a 95% wash reads
            as a rendering fault, not as depth. */}
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-cream/10 bg-background px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label={t("openMenu")}
            className="rounded-full p-2 text-cream/70 transition-colors hover:bg-cream/5 hover:text-cream lg:hidden"
          >
            <Icon name="menu" className="h-5 w-5" />
          </button>

          {/* Slots rather than imports: both are server components, so the
              layout hands them in already rendered. */}
          <div className="ml-auto">{actions}</div>

          {notifications}

          <ThemeToggle initial={themeMode} />

          <AccountMenu name={name} email={email} role={role} />
        </header>

        <main
          id="main"
          className="min-w-0 grow px-4 py-6 sm:px-6 sm:py-8 lg:min-h-0 lg:flex-1 lg:overflow-y-auto"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
