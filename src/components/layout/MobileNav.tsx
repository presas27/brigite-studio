"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { AnimatePresence, domAnimation, LazyMotion, m, useReducedMotion } from "motion/react";
import { site } from "@/lib/site";
import { LocaleToggle } from "./LocaleToggle";

/**
 * Mobile navigation — a hamburger toggle that opens a full-width panel.
 * Shown below `md`; the inline desktop nav takes over at `md` and up.
 *
 * Accessibility: the toggle exposes `aria-expanded`/`aria-controls`, the
 * panel traps initial focus, Escape closes it, body scroll is locked while
 * open, and motion is suppressed under `prefers-reduced-motion`.
 */
export function MobileNav() {
  const [open, setOpen] = useState(false);
  const t = useTranslations("Nav");
  const reduceMotion = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  // Lock body scroll, move focus into the panel, and wire Escape while open.
  useEffect(() => {
    if (!open) return;

    const toggle = toggleRef.current;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    const firstLink = panelRef.current?.querySelector<HTMLAnchorElement>("a");
    firstLink?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKeyDown);
      toggle?.focus();
    };
  }, [open]);

  return (
    <LazyMotion features={domAnimation}>
      <div className="md:hidden">
      <button
        ref={toggleRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? t("closeMenu") : t("openMenu")}
        className="inline-flex size-11 items-center justify-center rounded-full text-cream transition-opacity hover:opacity-60"
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          className="h-6 w-6"
        >
          {open ? (
            <>
              <line x1="5" y1="5" x2="19" y2="19" />
              <line x1="19" y1="5" x2="5" y2="19" />
            </>
          ) : (
            <>
              <line x1="3" y1="7" x2="21" y2="7" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="17" x2="21" y2="17" />
            </>
          )}
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <m.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
            className="fixed inset-0 z-40 bg-black/50"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <m.div
            key="panel"
            id="mobile-menu"
            ref={panelRef}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -12 }}
            transition={{ duration: reduceMotion ? 0 : 0.22, ease: "easeOut" }}
            className="fixed inset-x-3 top-[5.25rem] z-50 rounded-3xl bg-ink px-6 pb-8 pt-2 ring-1 ring-cream/10 shadow-[0_18px_50px_-20px_rgba(0,0,0,0.6)]"
          >
            <nav aria-label={t("primary")}>
              <ul className="flex flex-col font-display text-3xl uppercase text-cream">
                {site.nav.map((item) => (
                  <li key={item.href} className="border-b border-cream/10">
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="block py-4 transition-opacity hover:opacity-60"
                    >
                      {t(item.key)}
                    </Link>
                  </li>
                ))}
              </ul>

              <div className="mt-6">
                <LocaleToggle className="text-lg" />
              </div>

              {site.social.instagram && (
                <a
                  href={site.social.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setOpen(false)}
                  aria-label={t("instagram")}
                  className="mt-6 inline-flex items-center gap-3 text-lg font-medium text-cream transition-opacity hover:opacity-60"
                >
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-6 w-6"
                  >
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                    <circle cx="12" cy="12" r="4.2" />
                    <circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none" />
                  </svg>
                  Instagram
                </a>
              )}
            </nav>
          </m.div>
        )}
      </AnimatePresence>
      </div>
    </LazyMotion>
  );
}
