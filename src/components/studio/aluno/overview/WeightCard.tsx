import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { eyebrow, heading, muted, surfaceLink } from "@/components/studio/theme";
import type { OverviewWeight } from "@/lib/studio/clientConsole";
import { cn } from "@/lib/utils";

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

const WIDTH = 320;
const HEIGHT = 64;

function Sparkline({ values, label }: { values: number[]; label: string }) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  // A flat series has no span to divide by, and a straight line through the
  // middle is the honest way to draw "this did not move".
  const span = max - min || 1;
  const step = values.length > 1 ? WIDTH / (values.length - 1) : 0;

  const points = values.map((value, index) => {
    const x = values.length > 1 ? index * step : WIDTH / 2;
    const y = HEIGHT - 4 - ((value - min) / span) * (HEIGHT - 8);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="none"
      className="h-16 w-full text-accent-ink"
    >
      <polygon
        points={`0,${HEIGHT} ${points.join(" ")} ${WIDTH},${HEIGHT}`}
        fill="currentColor"
        opacity={0.12}
      />
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

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
