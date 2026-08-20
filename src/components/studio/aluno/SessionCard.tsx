import Link from "next/link";
import type { ClientSession } from "@/lib/studio/clientConsole";
import type { Translate } from "@/components/studio/plan/types";
import { eyebrow, heading, muted, surfaceLink } from "@/components/studio/theme";
import { cn } from "@/lib/utils";
import { StatusChip } from "./SessionStatus";

/**
 * One session as a tile. A workout has no picture of its own, so the name
 * carries the card — display face, two lines at most — with the date as the
 * eyebrow above it and the shape of the session as the line below.
 */
export function SessionCard({
  session,
  dateLabel,
  isToday,
  t,
  tPlan,
}: {
  session: ClientSession;
  dateLabel: string;
  isToday: boolean;
  t: Translate;
  tPlan: Translate;
}) {
  return (
    <li>
      <Link
        href={`/app/aluno/treino/${session.id}`}
        className={cn(
          surfaceLink,
          "flex h-full flex-col gap-4 p-5",
          isToday && "ring-caramel/40",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <p className={cn(eyebrow, "capitalize")}>{isToday ? t("sessions.today") : dateLabel}</p>
          <StatusChip status={session.status} label={tPlan(`status.${session.status}`)} />
        </div>

        <div className="min-w-0 flex-1">
          <p className={cn(heading, "line-clamp-2 text-[1.35rem] text-cream")}>{session.name}</p>
          {session.focus && <p className={cn(muted, "mt-1.5 truncate")}>{session.focus}</p>}
        </div>

        <p className={cn(eyebrow, "border-t border-cream/10 pt-3 font-mono")}>
          {t("sessions.items", { count: session.itemCount })} ·{" "}
          {t("sessions.blocks", { count: session.blockCount })}
        </p>
      </Link>
    </li>
  );
}
