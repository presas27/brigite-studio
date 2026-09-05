"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import type { ClientAlert } from "@/lib/studio/clientConsole";
import { relativeTime } from "../chat/relative-time";
import { formatDayKey } from "../format";
import { Icon } from "../coach/icons";
import { clientAlertHref, clientAlertKey, clientAlertLabel, CLIENT_ALERT_ICON } from "./alerts";

/**
 * The aluna's bell — the same control Sara has, pointed the other way.
 *
 * It opens the same list the landing screen's "Para ti" panel shows, so the
 * two never disagree; this is that panel's pocket version, reachable from
 * mid-session on a phone without leaving the screen she is on.
 */
export function AlunoNotifications({ alerts }: { alerts: ClientAlert[] }) {
  const t = useTranslations("Studio.aluno");
  const tNav = useTranslations("Studio.nav");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  // Where the panel hangs from on a phone: the bell's bottom edge, measured
  // when it opens. The bell sits mid-toolbar, so a panel anchored to its right
  // edge ran off the left of the screen; on a phone the panel is anchored to
  // the viewport instead, and only needs to know how far down to start.
  const [top, setTop] = useState(0);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={container} className="relative">
      <button
        type="button"
        onClick={() => {
          setTop((container.current?.getBoundingClientRect().bottom ?? 0) + 8);
          setOpen((value) => !value);
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={tNav("notifications")}
        className="relative rounded-full p-2 text-cream/70 transition-colors hover:bg-cream/5 hover:text-cream"
      >
        <Icon name="bell" className="h-5 w-5" />
        {alerts.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-silk px-0.5 font-sans tabular-nums text-[0.6rem] leading-none text-on-dark ring-2 ring-background">
            {alerts.length > 9 ? "9+" : alerts.length}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            style={{ "--pop-top": `${top}px` } as React.CSSProperties}
            className="fixed inset-x-3 top-[var(--pop-top)] z-50 origin-top overflow-hidden rounded-[1rem] bg-ink-lift ring-1 ring-cream/12 shadow-[0_24px_48px_-20px_rgba(18,17,20,0.65)] sm:absolute sm:inset-x-auto sm:top-auto sm:right-0 sm:mt-2 sm:w-[22rem] sm:origin-top-right"
          >
            <p className="border-b border-cream/10 px-4 py-3 font-sans text-sm font-semibold text-cream">
              {t("needsYou")}
            </p>

            {alerts.length === 0 ? (
              <div className="px-4 py-5">
                <p className="font-sans text-sm text-cream/80">{t("needsYouEmpty")}</p>
                <p className="mt-1 text-xs leading-relaxed text-cream/50">
                  {t("needsYouEmptyHint")}
                </p>
              </div>
            ) : (
              // Every alert, in a list that scrolls: there is no fuller page to
              // send her to — the overview stopped carrying this panel.
              <ol className="max-h-[70vh] divide-y divide-cream/8 overflow-y-auto">
                {alerts.map((alert) => (
                  <li key={clientAlertKey(alert)}>
                    <Link
                      href={clientAlertHref(alert)}
                      role="menuitem"
                      onClick={() => setOpen(false)}
                      className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-cream/[0.04]"
                    >
                      <Icon
                        name={CLIENT_ALERT_ICON[alert.kind]}
                        className="mt-0.5 h-4 w-4 shrink-0 text-accent-ink"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block font-sans text-[0.8125rem] leading-snug text-cream/75">
                          {clientAlertLabel(alert, t, (key) => formatDayKey(key, locale))}
                        </span>
                        <span className="mt-1 block font-sans text-[0.65rem] text-cream/35">
                          {relativeTime(alert.at, locale)}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
