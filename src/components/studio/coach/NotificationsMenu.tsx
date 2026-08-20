"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import type { CoachAlert } from "@/lib/studio/types";
import { cn } from "@/lib/utils";
import { ALERT_ICON, alertHref } from "./alerts";
import { formatDayKey } from "./format";
import { relativeTime } from "../chat/relative-time";
import { Icon } from "./icons";

const VISIBLE = 6;

/**
 * The bell. Same trigger everywhere Sara can see it, so it opens the same
 * list `coach/page.tsx`'s "Precisa de ti" panel shows — this is that panel's
 * pocket version, reachable without leaving whatever screen she's on.
 *
 * Closes on outside click and on Escape, same as `AccountMenu` — two header
 * popovers that behave differently would be worse than either alone.
 */
export function NotificationsMenu({ alerts }: { alerts: CoachAlert[] }) {
  const t = useTranslations("Studio.today");
  const tOverview = useTranslations("Studio.overview");
  const tNav = useTranslations("Studio.nav");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);

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

  const alertLabel = (alert: CoachAlert) => {
    switch (alert.kind) {
      case "checkin":
        return t("alert.checkin", { week: formatDayKey(alert.weekOf, locale) });
      case "inactive":
        return t("alert.inactive", { days: alert.days });
      case "missed":
        return t("alert.missed", { date: formatDayKey(alert.date, locale) });
      default:
        return t(`alert.${alert.kind}`);
    }
  };

  return (
    <div ref={container} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={tNav("notifications")}
        className="relative rounded-full p-2 text-cream/70 transition-colors hover:bg-cream/5 hover:text-cream"
      >
        <Icon name="bell" className="h-5 w-5" />
        {alerts.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-silk px-0.5 font-mono text-[0.6rem] leading-none text-on-dark ring-2 ring-background">
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
            className="absolute right-0 z-50 mt-2 w-[min(90vw,22rem)] origin-top-right overflow-hidden rounded-[1rem] bg-ink-lift ring-1 ring-cream/12 shadow-[0_24px_48px_-20px_rgba(20,16,12,0.65)]"
          >
            <p className="border-b border-cream/10 px-4 py-3 font-sans text-sm font-semibold text-cream">
              {tOverview("needsYou")}
            </p>

            {alerts.length === 0 ? (
              <div className="px-4 py-5">
                <p className="font-sans text-sm text-cream/80">{t("empty")}</p>
                <p className="mt-1 text-xs leading-relaxed text-cream/50">{t("emptyHint")}</p>
              </div>
            ) : (
              <ol className="max-h-[70vh] divide-y divide-cream/8 overflow-y-auto">
                {alerts.slice(0, VISIBLE).map((alert) => (
                  <li key={`${alert.kind}-${alert.clientId}-${alert.at}`}>
                    <Link
                      href={alertHref(alert)}
                      role="menuitem"
                      onClick={() => setOpen(false)}
                      className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-cream/[0.04]"
                    >
                      <Icon
                        name={ALERT_ICON[alert.kind]}
                        className="mt-0.5 h-4 w-4 shrink-0 text-accent-ink"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block font-sans text-[0.8125rem] leading-snug text-cream/70">
                          <span className="font-semibold text-cream">{alert.clientName}</span>{" "}
                          {alertLabel(alert)}
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

            {alerts.length > 0 && (
              <Link
                href="/app/coach"
                onClick={() => setOpen(false)}
                className={cn(
                  "block border-t border-cream/10 px-4 py-2.5 text-center font-sans text-xs text-accent-ink transition-colors hover:text-butter",
                )}
              >
                {tOverview("viewAll")}
              </Link>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
