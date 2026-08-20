import Link from "next/link";
import { buttonGhost } from "@/components/studio/theme";
import { shiftDay, weekKey } from "@/lib/studio/db";
import type { Translate } from "@/components/studio/plan/types";

/**
 * Prev / this-week / next week navigation for a studio-wide weekly view
 * (plano, checkins). `Studio.plan` is the only namespace carrying these
 * three labels today, so both callers pass a translator scoped to it.
 */
export function WeekNav({
  basePath,
  monday,
  t,
}: {
  basePath: string;
  monday: string;
  t: Translate;
}) {
  return (
    <nav className="flex flex-wrap items-center gap-2">
      <Link href={`${basePath}?semana=${shiftDay(monday, -7)}`} className={buttonGhost}>
        {t("prevWeek")}
      </Link>
      <Link href={`${basePath}?semana=${weekKey()}`} className={buttonGhost}>
        {t("thisWeek")}
      </Link>
      <Link href={`${basePath}?semana=${shiftDay(monday, 7)}`} className={buttonGhost}>
        {t("nextWeek")}
      </Link>
    </nav>
  );
}
