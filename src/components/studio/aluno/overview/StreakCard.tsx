import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Icon } from "@/components/studio/coach/icons";
import { eyebrow, heading, muted, surfaceLink } from "@/components/studio/theme";
import { cn } from "@/lib/utils";

/**
 * Weeks in a row with every session done — what stands where weight would be
 * for an aluna who has never recorded one.
 *
 * A blank card that says "no measurements yet" spends the same space to say
 * nothing. This says something true about her training instead, and points at
 * the page where the weight would come from, so the empty state is also the
 * invitation.
 *
 * The current week is not counted: it is still being lived. A streak that
 * resets every Monday and climbs back by Sunday measures the calendar, not her.
 */
export async function StreakCard({
  weeks,
  className,
}: {
  weeks: number;
  className?: string;
}) {
  const t = await getTranslations("Studio.aluno.streak");

  return (
    <Link
      href="/app/aluno/medidas"
      className={cn(surfaceLink, "flex flex-col justify-between gap-4 p-5 sm:p-6", className)}
    >
      <div>
        <p className={eyebrow}>{t("title")}</p>
        <p className={cn(heading, "mt-3 flex items-baseline gap-2 text-[2.5rem] text-cream")}>
          {weeks}
          <Icon
            name="flame"
            className={cn("h-6 w-6", weeks > 0 ? "text-accent-ink" : "text-cream/20")}
          />
        </p>
        <p className={cn(muted, "mt-1")}>{t(weeks > 0 ? "weeks" : "none", { count: weeks })}</p>
      </div>

      <p className={cn(eyebrow, "leading-snug")}>{t("hint")}</p>
    </Link>
  );
}
