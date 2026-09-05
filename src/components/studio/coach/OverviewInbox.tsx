"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { api } from "@convex/_generated/api";
import type { CoachAlert } from "@/lib/studio/types";
import { cn } from "@/lib/utils";
import {
  buttonOnAccent,
  eyebrow,
  eyebrowOnAccent,
  heading,
  surfaceAccent,
  surfaceLink,
} from "@/components/studio/theme";
import { Icon } from "./icons";
import { ALERT_ICON, alertHref } from "./alerts";

/**
 * The two numbers and the gold list on the coach overview, subscribed.
 *
 * An unanswered message or check-in is the reason this page exists; waiting
 * on a reload to see it is the same as not seeing it.
 */
export function OverviewInbox({
  initialAlerts,
  initialUnread,
  clientCount,
}: {
  initialAlerts: CoachAlert[];
  initialUnread: number;
  clientCount: number;
}) {
  const t = useTranslations("Studio.overview");
  const tToday = useTranslations("Studio.today");
  const tClients = useTranslations("Studio.clients");
  const alerts = useQuery(api.coaching.coachAlerts, {}) ?? initialAlerts;
  const unread = useQuery(api.coaching.unreadTotal, {}) ?? initialUnread;

  const stats: { key: string; value: number; href: string }[] = [
    { key: "activeClients", value: clientCount, href: "/app/coach/alunos" },
    { key: "unreadMessages", value: unread, href: "/app/coach/mensagens" },
  ];

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat) => (
          <Link key={stat.key} href={stat.href} className={cn(surfaceLink, "p-4 sm:p-5")}>
            <p className={cn(heading, "text-[1.75rem] text-cream sm:text-[2rem]")}>{stat.value}</p>
            <p className={cn(eyebrow, "mt-2 leading-snug")}>{t(`stats.${stat.key}`)}</p>
          </Link>
        ))}
      </div>

      <section aria-labelledby="needs-you" className={cn(surfaceAccent, "p-5 sm:p-6")}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="needs-you" className={eyebrowOnAccent}>
            {t("needsYou")}
          </h2>
          {alerts.length > 0 && (
            <span className="font-sans tabular-nums text-sm text-on-dark/65">{alerts.length}</span>
          )}
        </div>

        {alerts.length === 0 ? (
          <div className="mt-3">
            <p className={cn(heading, "text-[1.5rem] sm:text-[1.75rem]")}>{t("needsYouEmpty")}</p>
            <p className="mt-2 max-w-prose text-sm leading-relaxed text-on-dark/75">
              {t("needsYouEmptyHint")}
            </p>
          </div>
        ) : (
          <>
            <ol className="mt-4 space-y-2">
              {alerts.slice(0, 6).map((alert) => (
                <li key={`${alert.kind}-${alert.clientId}-${alert.at}`}>
                  <Link
                    href={alertHref(alert)}
                    className="flex items-center gap-3 rounded-[1rem] bg-ink/20 px-4 py-3 ring-1 ring-on-dark/15 transition-colors hover:bg-ink/30"
                  >
                    <Icon
                      name={ALERT_ICON[alert.kind]}
                      className="h-4 w-4 shrink-0 text-on-dark/70"
                    />
                    <span className="min-w-0 flex-1 truncate font-sans text-sm text-on-dark">
                      <span className="font-semibold">{alert.clientName}</span>
                      <span className="text-on-dark/65"> · {tToday(`kind.${alert.kind}`)}</span>
                    </span>
                    <Icon name="chevron" className="h-3.5 w-3.5 shrink-0 text-on-dark/55" />
                  </Link>
                </li>
              ))}
            </ol>
            {alerts.length > 6 && (
              <p className="mt-3 font-sans tabular-nums text-xs text-on-dark/65">
                +{alerts.length - 6}
              </p>
            )}
          </>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/app/coach/alunos" className={cn(buttonOnAccent, "px-5 py-2.5 text-xs")}>
            {tClients("title")}
          </Link>
        </div>
      </section>
    </>
  );
}
