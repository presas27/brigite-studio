import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils";
import type { Client } from "@/lib/studio/types";
import { chip, chipAccent } from "../theme";

type QueueStatus = "pending" | "reviewed" | undefined;

function hrefFor(status: QueueStatus, clientId: string | undefined): string {
  const params = new URLSearchParams();
  if (status) params.set("estado", status);
  if (clientId) params.set("aluno", clientId);
  const qs = params.toString();
  return qs ? `/app/coach/videos?${qs}` : "/app/coach/videos";
}

/**
 * Status tabs (all / pending / reviewed) plus, when the console linked in
 * with `?aluno=`, a chip naming the client that clears back to the full queue.
 */
export async function VideoQueueFilters({
  status,
  clientFilter,
}: {
  status: QueueStatus;
  clientFilter?: Client;
}) {
  const t = await getTranslations("Studio.videos");
  const common = await getTranslations("Studio.common");

  const tabs: { key: QueueStatus; label: string }[] = [
    { key: undefined, label: common("all") },
    { key: "pending", label: t("pending") },
    { key: "reviewed", label: t("reviewed") },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {tabs.map((tab) => (
        <Link
          key={tab.label}
          href={hrefFor(tab.key, clientFilter?.id)}
          aria-current={status === tab.key ? "page" : undefined}
          className={cn(
            status === tab.key ? chipAccent : chip,
            "transition-colors",
            status !== tab.key && "hover:bg-cream/10",
          )}
        >
          {tab.label}
        </Link>
      ))}
      {clientFilter && (
        <Link
          href={hrefFor(status, undefined)}
          aria-label={common("close")}
          className={cn(chip, "ml-auto transition-colors hover:bg-cream/10")}
        >
          {clientFilter.name} ×
        </Link>
      )}
    </div>
  );
}
