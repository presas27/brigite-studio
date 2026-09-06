import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { eyebrow, heading, muted, surfaceLink } from "@/components/studio/theme";
import { cn } from "@/lib/utils";

/**
 * The headline number: how much of the plan is actually happening.
 *
 * One big figure and the count it came from. The row of dots that used to
 * sit under it — one per session, three colours, no key — asked to be
 * decoded, and nobody decoded it; the "4 of 6" line already says what the
 * dots said. Both numbers come out of a single query in `clientOverview` so
 * they can never disagree.
 *
 * No gold surface here on purpose: the screen's one accent belongs to the
 * session she can start in the next five minutes, not to a statistic.
 */
export async function AdherenceCard({
  done,
  total,
  pct,
  className,
}: {
  done: number;
  total: number;
  pct: number;
  className?: string;
}) {
  const t = await getTranslations("Studio.aluno.adherence");

  return (
    <Link
      href="/app/aluno/evolucao"
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
    </Link>
  );
}
