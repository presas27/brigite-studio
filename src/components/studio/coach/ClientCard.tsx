"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { formatDayKey } from "@/components/studio/format";
import { chip, chipAccent, muted, surfaceLink } from "@/components/studio/theme";
import { cn } from "@/lib/utils";
import type { ClientRow } from "./ClientListRow";

/** One client as a tile — same information as the row, stacked for a browse view. */
export function ClientCard({ row, locale }: { row: ClientRow; locale: string }) {
  const t = useTranslations("Studio.clients");
  const tProgress = useTranslations("Studio.progress");
  const { client, done, total, lastSessionDate } = row;

  return (
    <li>
      <Link
        href={`/app/coach/alunos/${client.id}`}
        className={cn(surfaceLink, "flex h-full flex-col gap-3 p-4")}
      >
        <p className="truncate font-sans text-sm font-semibold text-cream">{client.name}</p>
        <div className="flex flex-wrap items-center gap-2">
          <span className={chip}>{t(`plan.${client.profile.plan}`)}</span>
          <span className={client.status === "active" ? chipAccent : chip}>
            {t(`status.${client.status}`)}
          </span>
        </div>
        {client.profile.plan === "personal" && (
          <p className={muted}>
            {t("sessionsLeft")}: {client.profile.sessionsLeft}
          </p>
        )}
        <div className="mt-auto space-y-0.5 border-t border-cream/10 pt-3">
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
