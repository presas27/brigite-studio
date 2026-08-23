import Link from "next/link";
import type { ClientSession } from "@/lib/studio/clientConsole";
import type { Translate } from "@/components/studio/plan/types";
import { Icon } from "@/components/studio/coach/icons";
import { eyebrow, muted, surfaceLink } from "@/components/studio/theme";
import { capitalize, cn } from "@/lib/utils";
import { StatusChip } from "./SessionStatus";

/** One session as a row: date on the left, name and shape in the middle, status on the right. */
export function SessionListRow({
  session,
  dateLabel,
  dayNumber,
  weekday,
  isToday,
  t,
  tPlan,
}: {
  session: ClientSession;
  dateLabel: string;
  dayNumber: string;
  weekday: string;
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
          "group flex items-center gap-4 p-4 sm:gap-5 sm:p-5",
          isToday && "ring-caramel/40",
        )}
      >
        {/* The date as a stamp rather than a sentence — a column of these reads
            as a timeline, which a run of "18 ago" strings never does. */}
        <span
          className={cn(
            "grid h-12 w-12 shrink-0 place-content-center rounded-[0.9rem] text-center leading-none",
            isToday ? "bg-accent-fill text-ink" : "bg-cream/5 text-cream/70 ring-1 ring-cream/10",
          )}
        >
          <span className="font-display text-[1.15rem]">{dayNumber}</span>
          <span className="mt-0.5 font-sans text-[0.6rem] opacity-70">{weekday}</span>
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate font-sans text-base font-semibold text-cream">
            {session.name}
          </span>
          <span className={cn(muted, "block truncate")}>
            {[capitalize(session.focus), t("sessions.items", { count: session.itemCount })]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </span>

        <span className="hidden shrink-0 sm:block">
          <span className={eyebrow}>{dateLabel}</span>
        </span>

        <StatusChip status={session.status} label={tPlan(`status.${session.status}`)} />

        <Icon
          name="chevron"
          className="h-3.5 w-3.5 shrink-0 text-cream/30 transition-transform group-hover:translate-x-0.5 group-hover:text-cream/60 motion-reduce:transition-none"
        />
      </Link>
    </li>
  );
}
