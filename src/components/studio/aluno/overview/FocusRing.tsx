import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { eyebrow, heading, muted, surfaceLink } from "@/components/studio/theme";
import type { OverviewFocus } from "@/lib/studio/clientConsole";
import { capitalize, cn } from "@/lib/utils";

/**
 * What the week is actually made of, as a ring.
 *
 * Sara plans in focuses — força, mobilidade, aéreo — and an aluna reading a
 * list of five workout names cannot see that three of them are the same thing.
 * The ring can, at a glance, which is the whole argument for spending a circle
 * on it. It is descriptive, not a target: there is no "correct" split, so
 * nothing here is drawn as a goal to hit.
 *
 * Drawn as dashed strokes on one circle rather than arc paths — four numbers of
 * trigonometry versus one subtraction, and the stroke keeps its round caps.
 */

/** A legibility-ordered ramp that survives both themes, then neutral tails. */
const SLICE = ["text-accent-ink", "text-bronze", "text-cream/45", "text-cream/20"];
const LEGEND = ["bg-accent-ink", "bg-bronze", "bg-cream/45", "bg-cream/20"];

const RADIUS = 42;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
/** Breathing room between slices, in path units. Dropped when there is only one. */
const GAP = 4;
/** Slices drawn before the rest collapses into "outros". */
const MAX_SLICES = 3;

export async function FocusRing({
  focus,
  className,
}: {
  focus: OverviewFocus[];
  className?: string;
}) {
  const t = await getTranslations("Studio.aluno.focus");

  const total = focus.reduce((sum, slice) => sum + slice.count, 0);

  // Everything past the third focus becomes one neutral slice. Four labels is
  // the most this card can print before the legend outgrows the ring.
  const head = focus.slice(0, MAX_SLICES);
  const tail = focus.slice(MAX_SLICES);
  const slices =
    tail.length > 0
      ? [...head, { tag: t("other"), count: tail.reduce((sum, s) => sum + s.count, 0) }]
      : head;

  // Offsets are accumulated here rather than inside the map: each arc starts
  // where the previous one ended, and that running total has no business being
  // mutated mid-render.
  const gap = slices.length > 1 ? GAP : 0;
  const arcs = slices.map((slice, index) => {
    const length = (slice.count / total) * CIRCUMFERENCE;
    return {
      ...slice,
      dash: Math.max(length - gap, 0.01),
      offset: slices
        .slice(0, index)
        .reduce((sum, earlier) => sum + (earlier.count / total) * CIRCUMFERENCE, 0),
      tone: SLICE[Math.min(index, SLICE.length - 1)],
      legend: LEGEND[Math.min(index, LEGEND.length - 1)],
    };
  });

  return (
    <Link
      href="/app/aluno/plano"
      className={cn(surfaceLink, "flex flex-col gap-4 p-4 sm:gap-5 sm:p-6", className)}
    >
      <p className={eyebrow}>{t("title")}</p>

      {total === 0 ? (
        <p className={cn(muted, "flex-1")}>{t("empty")}</p>
      ) : (
        <>
          <div className="relative mx-auto w-full max-w-[11rem]">
            <svg viewBox="0 0 100 100" role="img" aria-label={t("aria")} className="w-full">
              {arcs.map((arc) => (
                <circle
                  key={arc.tag}
                  cx="50"
                  cy="50"
                  r={RADIUS}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="13"
                  strokeLinecap="round"
                  strokeDasharray={`${arc.dash} ${CIRCUMFERENCE - arc.dash}`}
                  strokeDashoffset={-arc.offset}
                  // Start at twelve o'clock; SVG strokes start at three.
                  transform="rotate(-90 50 50)"
                  className={arc.tone}
                />
              ))}
            </svg>

            <span className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className={cn(heading, "text-[1.75rem] text-cream sm:text-[2rem]")}>{total}</span>
              <span className={cn(eyebrow, "mt-0.5")}>{t("sessions")}</span>
            </span>
          </div>

          <ul className="space-y-1.5">
            {arcs.map((arc) => (
              <li key={arc.tag} className="flex items-center gap-2">
                <span className={cn("h-2 w-2 shrink-0 rounded-full", arc.legend)} />
                <span className="min-w-0 flex-1 truncate font-sans text-xs text-cream/75">
                  {capitalize(arc.tag)}
                </span>
                <span className="font-sans tabular-nums text-xs text-cream/45">{arc.count}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Link>
  );
}
