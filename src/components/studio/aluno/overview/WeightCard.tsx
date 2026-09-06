import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { eyebrow, heading, muted, surfaceLink } from "@/components/studio/theme";
import type { OverviewWeight } from "@/lib/studio/clientConsole";
import { cn } from "@/lib/utils";
import { Sparkline } from "./Sparkline";
/**
 * Weight, as a number and a shape.
 *
 * The number alone is the one an aluna can talk herself into a bad mood over;
 * the line is what makes it a trend instead of a verdict, so they always ship
 * together. No goal line and no target: this app does not set weight targets,
 * and drawing a bar towards one would invent a judgement Sara never made.
 *
 * The direction is stated in words, not in colour. Down is not automatically
 * good — for half of what Sara trains it is the opposite — so painting a loss
 * green would be the app taking a side it has no business taking.
 */


export async function WeightCard({
  weight,
  className,
}: {
  weight: OverviewWeight;
  className?: string;
}) {
  const [t, common, locale] = await Promise.all([
    getTranslations("Studio.aluno.weight"),
    getTranslations("Studio.common"),
    getLocale(),
  ]);

  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  const delta = weight.delta;

  return (
    <Link
      href="/app/aluno/medidas"
      className={cn(surfaceLink, "flex flex-col justify-between gap-4 p-5 sm:p-6", className)}
    >
      <div>
        <p className={eyebrow}>{t("title")}</p>
        <p className={cn(heading, "mt-3 flex items-baseline gap-1.5 text-[2.5rem] text-cream")}>
          {number.format(weight.latest)}
          <span className="font-sans text-base font-medium text-cream/45">{common("kg")}</span>
        </p>
        <p className={cn(muted, "mt-1")}>
          {delta == null
            ? t("single")
            : delta === 0
              ? t("flat")
              : t(delta > 0 ? "up" : "down", { value: number.format(Math.abs(delta)) })}
        </p>
      </div>

      {weight.series.length > 1 && (
        <Sparkline values={weight.series} label={t("aria")} />
      )}
    </Link>
  );
}
