"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { formatDayKey } from "@/components/studio/format";
import { chip, chipAccent, muted, surfaceLink } from "@/components/studio/theme";
import type { Client } from "@/lib/studio/types";
import { cn } from "@/lib/utils";

export type ClientRow = {
  client: Client;
  done: number;
  total: number;
  lastSessionDate: string | null;
  hasHealthAlert?: boolean;
};

/** One client as a row: identity and plan on the left, adherence on the right. */
export function ClientListRow({ row, locale }: { row: ClientRow; locale: string }) {
  const t = useTranslations("Studio.clients");
  const tProgress = useTranslations("Studio.progress");
  const { client, done, total, lastSessionDate } = row;

  return (
    <li>
      <Link
        href={`/app/coach/alunos/${client.id}`}
        className={cn(surfaceLink, "flex flex-wrap items-center justify-between gap-4 p-4")}
      >
        <div className="min-w-0 space-y-1.5">
          <div className="flex items-center gap-2">
            <p className="truncate font-sans text-sm font-semibold text-cream">{client.name}</p>
            {row.hasHealthAlert && (
              <span className="shrink-0 rounded-full bg-silk/20 px-2 py-0.5 font-sans text-[0.65rem] font-semibold text-silk ring-1 ring-silk/30">
                Alerta
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={chip}>{t(`plan.${client.profile.plan}`)}</span>
            <span className={client.status === "active" ? chipAccent : chip}>
              {t(`status.${client.status}`)}
            </span>
            {client.profile.plan === "personal" && (
              <span className={muted}>
                {t("sessionsLeft")}: {client.profile.sessionsLeft}
              </span>
            )}
          </div>
        </div>
        <div className="shrink-0 space-y-1 text-right">
          <p className="font-sans text-sm font-semibold text-cream">
            {tProgress("sessionsDone", { done, total })}
          </p>
          <p className={muted}>
            {t("lastSession")}: {lastSessionDate ? formatDayKey(lastSessionDate, locale) : t("never")}
          </p>
        </div>
      </Link>
    </li>
  );
}
