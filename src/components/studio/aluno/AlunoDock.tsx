"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { Icon, type IconName } from "@/components/studio/coach/icons";
import { MorphHeight } from "@/components/studio/MorphHeight";
import type { ChromeItem } from "@/components/studio/chrome/StudioChrome";
import { DAY_MARKS, type DayMarkKind } from "@/components/studio/calendar/dayMarks";
import { useDayMarks } from "@/components/studio/calendar/DayMarksProvider";
import type { ClientAlert } from "@/lib/studio/clientConsole";
import { cn } from "@/lib/utils";
import { formatDayKey } from "../format";
import { CLIENT_ALERT_ICON, clientAlertHref, clientAlertKey, clientAlertLabel } from "./alerts";

const PRIMARY = ["/app/aluno", "/app/aluno/treinos", "/app/aluno/checkin"] as const;

const SPRING = { type: "spring" as const, stiffness: 480, damping: 38, mass: 0.7 };

/**
 * Phone navigation for the aluna: a floating glass pill, no rail, no topbar.
 *
 * Three destinations she hits between sets sit on the pill. Everything else —
 * plan, evolução, messages — lives in the same piece of glass when she taps
 * more. Theme lives on the account page, so opening more stays instant.
 */
export function AlunoDock({
  items,
  badges,
  name,
  alerts,
  session,
}: {
  items: ChromeItem[];
  badges: Record<string, number>;
  name: string;
  alerts: ClientAlert[];
  session: { href: string; label: string } | null;
}) {
  const t = useTranslations("Studio.nav");
  const tAluno = useTranslations("Studio.aluno");
  const tPlan = useTranslations("Studio.plan.calendar");
  const locale = useLocale();
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const [more, setMore] = useState(false);
  const add = useDayMarks();

  useEffect(() => {
    setMore(false);
    add.close();
    // Intentionally not depending on `add`: a new object on open would
    // immediately shut the sheet we just opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (add.open) setMore(false);
  }, [add.open]);

  const primary = PRIMARY.map((href) => items.find((item) => item.href === href)).filter(
    (item): item is ChromeItem => item != null,
  );
  const extra = items.filter((item) => !(PRIMARY as readonly string[]).includes(item.href));
  const extraActive = extra.some(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
  const moreBadge =
    extra.reduce((sum, item) => sum + (badges[item.href] ?? 0), 0) + (more ? 0 : alerts.length);

  function isActive(href: string) {
    if (href === "/app/aluno") return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(0.7rem,env(safe-area-inset-bottom))] lg:hidden">
      <AnimatePresence>
        {(more || add.open) && (
          <motion.button
            type="button"
            aria-label={t("closeMenu")}
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => {
              setMore(false);
              add.close();
            }}
            className="pointer-events-auto absolute inset-x-0 bottom-0 h-[100dvh] bg-ink/25"
          />
        )}
      </AnimatePresence>

      <div className="pointer-events-auto relative mx-auto w-full max-w-[22.5rem]">
        <AnimatePresence>
          {session && !add.open && (
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={SPRING}
              className="mb-2 flex justify-center"
            >
              <Link
                href={session.href}
                className="aluno-dock inline-flex items-center gap-2 rounded-full px-4 py-2 font-sans text-xs font-semibold text-cream"
              >
                <Icon name="play" className="h-3.5 w-3.5 text-accent-ink" />
                {session.label}
              </Link>
            </motion.div>
          )}
        </AnimatePresence>

        <nav
          aria-label={t("mainMenu")}
          data-day-add-menu={add.open ? "" : undefined}
          className="aluno-dock rounded-[1.75rem]"
        >
          <div className="overflow-hidden rounded-[inherit]">
            <MorphHeight
              appear={false}
              fade={false}
              contentKey={add.open ? "add" : more ? "open" : "shut"}
              durationMs={520}
              ease="cubic-bezier(0.22, 1, 0.36, 1)"
            >
            {add.open ? (
              <AddMarksSheet
                date={add.date}
                pinned={add.date ? add.marksOn(add.date) : []}
                onToggle={add.toggle}
                t={tPlan}
                reduceMotion={!!reduceMotion}
              />
            ) : more ? (
              <div className="px-3 pt-3">
                <ul className="space-y-0.5">
                  {extra.map((item) => {
                    const active = isActive(item.href);
                    const badge = badges[item.href];
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={cn(
                            "flex items-center gap-3 rounded-[1.1rem] px-3 py-2.5 font-sans text-sm transition-colors",
                            active ? "bg-cream/[0.09] font-semibold text-cream" : "text-cream/70",
                          )}
                        >
                          <Icon name={item.icon} className="h-[1.15rem] w-[1.15rem]" />
                          <span className="flex-1">{t(item.labelKey)}</span>
                          {badge != null && badge > 0 && (
                            <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-silk px-1.5 py-0.5 font-sans tabular-nums text-[0.65rem] leading-none text-on-dark">
                              {badge > 9 ? "9+" : badge}
                            </span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>

                {alerts.length > 0 && (
                  <div className="mt-1 border-t border-cream/10 pt-1">
                    {alerts.slice(0, 3).map((alert) => (
                      <Link
                        key={clientAlertKey(alert)}
                        href={clientAlertHref(alert)}
                        className="flex items-center gap-3 rounded-[1.1rem] px-3 py-2.5 font-sans text-sm text-cream/70"
                      >
                        <Icon
                          name={CLIENT_ALERT_ICON[alert.kind]}
                          className="h-[1.15rem] w-[1.15rem] text-accent-ink"
                        />
                        <span className="line-clamp-1 flex-1">
                          {clientAlertLabel(alert, tAluno, (key) => formatDayKey(key, locale))}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}

                <div className="h-1" />
              </div>
            ) : null}
          </MorphHeight>

          <div className="flex items-center px-1.5 py-1.5">
            <div className="flex min-w-0 flex-1 items-center">
              {primary.map((item) => (
                <DockIcon
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  label={t(item.labelKey)}
                  active={!more && isActive(item.href)}
                  badge={badges[item.href]}
                  urgent={item.urgentBadge}
                  layoutId={!more && !reduceMotion ? "aluno-dock-active" : undefined}
                />
              ))}
            </div>

            <div className="flex shrink-0 items-center gap-2 pl-2">
              <button
                type="button"
                onClick={() => {
                  if (add.open) {
                    add.close();
                    return;
                  }
                  setMore((open) => !open);
                }}
                aria-expanded={more || add.open}
                aria-label={more || add.open ? t("closeMenu") : t("more")}
                className={cn(
                  "relative grid h-11 w-11 place-items-center rounded-full text-cream/65 transition-colors",
                  (more || extraActive) && "text-cream",
                )}
              >
                {!reduceMotion && (more || extraActive) && (
                  <motion.span
                    layoutId="aluno-dock-active"
                    className="absolute inset-0 rounded-full bg-cream/[0.12]"
                    transition={SPRING}
                  />
                )}
                {(more || extraActive) && reduceMotion && (
                  <span className="absolute inset-0 rounded-full bg-cream/[0.12]" />
                )}
                <Icon
                  name="chevron"
                  className={cn(
                    "relative z-[1] h-4 w-4 transition-transform duration-200",
                    more || add.open ? "rotate-90" : "-rotate-90",
                  )}
                />
                {moreBadge > 0 && !more && (
                  <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-silk" />
                )}
              </button>

              <Link
                href="/app/conta"
                aria-label={name}
                className="relative grid h-11 w-11 place-items-center"
              >
                {!more && isActive("/app/conta") && !reduceMotion && (
                  <motion.span
                    layoutId="aluno-dock-active"
                    className="absolute inset-0 rounded-full bg-cream/[0.12]"
                    transition={SPRING}
                  />
                )}
                <span className="relative z-[1] grid h-8 w-8 place-items-center rounded-full bg-accent-fill font-sans text-xs font-semibold text-ink ring-2 ring-cream/10">
                  {name.trim().charAt(0).toUpperCase()}
                </span>
              </Link>
            </div>
          </div>
          </div>
        </nav>
      </div>
    </div>
  );
}

function AddMarksSheet({
  date,
  pinned,
  onToggle,
  t,
  reduceMotion,
}: {
  date: string | null;
  pinned: DayMarkKind[];
  onToggle: (kind: DayMarkKind) => void;
  t: (key: string) => string;
  reduceMotion: boolean;
}) {
  return (
    <div className="px-3 pt-3 pb-1" data-day-add-menu="">
      <ul className="flex flex-col items-stretch gap-1">
        {DAY_MARKS.map((mark, index) => {
          const on = pinned.includes(mark.kind);
          return (
            <motion.li
              key={mark.kind}
              initial={reduceMotion ? false : { opacity: 0, y: 10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ ...SPRING, delay: reduceMotion ? 0 : index * 0.028 }}
            >
              <button
                type="button"
                onClick={() => onToggle(mark.kind)}
                aria-pressed={on}
                className={cn(
                  "flex w-full items-center justify-end gap-3 rounded-[1.1rem] px-2 py-1.5 transition-colors",
                  on ? "bg-cream/[0.07]" : "hover:bg-cream/[0.05]",
                )}
              >
                <span className="font-sans text-sm font-semibold text-cream">
                  {t(`addKind.${mark.kind}`)}
                </span>
                <span
                  className={cn(
                    "grid h-11 w-11 place-items-center rounded-full text-white shadow-[0_8px_18px_-10px_rgba(0,0,0,0.45)]",
                    mark.swatch,
                    on && "ring-2 ring-cream/80 ring-offset-2 ring-offset-transparent",
                  )}
                >
                  <Icon name={mark.icon} className="h-5 w-5" />
                </span>
              </button>
            </motion.li>
          );
        })}
      </ul>
      {date ? <p className="sr-only">{date}</p> : null}
    </div>
  );
}

function DockIcon({
  href,
  icon,
  label,
  active,
  badge,
  urgent,
  layoutId,
}: {
  href: string;
  icon: IconName;
  label: string;
  active: boolean;
  badge?: number;
  urgent?: boolean;
  layoutId?: string;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      aria-label={label}
      className="relative grid h-11 flex-1 place-items-center rounded-full text-cream/60 transition-colors"
    >
      {active && layoutId && (
        <motion.span
          layoutId={layoutId}
          className="absolute inset-y-0 inset-x-1 rounded-full bg-cream/[0.12]"
          transition={SPRING}
        />
      )}
      {active && !layoutId && (
        <span className="absolute inset-y-0 inset-x-1 rounded-full bg-cream/[0.12]" />
      )}
      <span className={cn("relative z-[1]", active && "text-cream")}>
        <Icon name={icon} className="h-[1.2rem] w-[1.2rem]" />
        {badge != null && badge > 0 &&
          (urgent ? (
            <span className="absolute -top-1 -right-1.5 h-1.5 w-1.5 rounded-full bg-silk" />
          ) : (
            <span className="absolute -top-1 -right-1.5 h-1.5 w-1.5 rounded-full bg-accent-ink" />
          ))}
      </span>
    </Link>
  );
}
