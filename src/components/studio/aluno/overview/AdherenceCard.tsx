import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { eyebrow, heading, muted, surfaceLink } from "@/components/studio/theme";
import type { AssignmentStatus } from "@/lib/studio/types";
import { cn } from "@/lib/utils";

/**
 * The headline number: how much of the plan is actually happening.
 *
 * One big figure and then the sessions it was computed from, one dot each —
 * gold done, hollow still ahead, red missed. The percentage is the summary and
 * the dots are the evidence, which is the only reason a number like this is
 * worth believing. Both come out of a single query in `clientOverview` so they
 * can never disagree.
 *
 * No gold surface here on purpose: the screen's one accent belongs to the
 * session she can start in the next five minutes, not to a statistic.
 */

const DOT: Record<AssignmentStatus, string> = {
  done: "bg-accent-ink",
  scheduled: "ring-1 ring-inset ring-cream/25",
  skipped: "bg-silk/75",
};

export async function AdherenceCard({
  done,
  total,
  pct,
  dots,
  className,
}: {
  done: number;
  total: number;
  pct: number;
  /** Oldest first, so the grid reads left-to-right as time passing. */
  dots: AssignmentStatus[];
  className?: string;
}) {
  const t = await getTranslations("Studio.aluno.adherence");

  return (
    <Link
      href="/app/aluno/progresso"
      className={cn(surfaceLink, "flex flex-col justify-between gap-4 p-4 sm:gap-6 sm:p-6", className)}
    >
      <div>
        <p className={eyebrow}>{t("title")}</p>

        {total === 0 ? (
          // No placeholder figure: a lone dash where a percentage belongs reads
          // as a number that failed to arrive rather than as one that does not
          // exist yet.
          <p className={cn(muted, "mt-3")}>{t("empty")}</p>
        ) : (
          <>
            <p className={cn(heading, "mt-2 text-[2.5rem] text-cream sm:mt-3 sm:text-[3.25rem] xl:text-[4rem]")}>
              {pct}
              <span className="text-[0.45em] text-cream/45">%</span>
            </p>
            <p className={cn(muted, "mt-1")}>{t("of", { done, total })}</p>
          </>
        )}
      </div>

      {dots.length > 0 && (
        <ul aria-hidden className="flex flex-wrap gap-1.5">
          {dots.map((status, index) => (
            <li
              key={index}
              className={cn("h-2.5 w-2.5 rounded-full sm:h-3 sm:w-3", DOT[status])}
            />
          ))}
        </ul>
      )}
    </Link>
  );
}
