"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

const VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

/** 1-3 light, 4-6 moderate, 7-8 hard, 9-10 everything there was. */
const BANDS: { key: "light" | "moderate" | "hard" | "max"; span: number }[] = [
  { key: "light", span: 3 },
  { key: "moderate", span: 3 },
  { key: "hard", span: 2 },
  { key: "max", span: 2 },
];

function bandOf(value: number): (typeof BANDS)[number]["key"] {
  if (value <= 3) return "light";
  if (value <= 6) return "moderate";
  if (value <= 8) return "hard";
  return "max";
}

/**
 * How hard the session was, 1 to 10, answered with one tap.
 *
 * Ten buttons in a row and the four words under them that give the numbers
 * meaning. A dial looked the part but asked a tired thumb to land on one of
 * ten marks along an arc; a row of targets the width of a fingertip asks
 * nothing. The chosen number and its word are said again below the row, so
 * the answer is readable without decoding which tile is lit.
 */
export function EffortScale({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (value: number) => void;
}) {
  const t = useTranslations("Studio.session");
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.matchMedia().add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          "[data-effort-tile]",
          { autoAlpha: 0, y: 8 },
          { autoAlpha: 1, y: 0, duration: 0.3, stagger: 0.025, ease: "power2.out" },
        );
      });
    },
    { scope },
  );

  const band = value == null ? null : bandOf(value);

  return (
    <div ref={scope} className="space-y-3">
      <div role="radiogroup" aria-label={t("effortLabel")} className="grid grid-cols-10 gap-1.5">
        {VALUES.map((candidate) => {
          const selected = candidate === value;
          return (
            <button
              key={candidate}
              type="button"
              role="radio"
              aria-checked={selected}
              data-effort-tile
              onClick={() => onChange(candidate)}
              className={cn(
                "h-12 rounded-[0.7rem] font-sans text-base font-semibold tabular-nums ring-1 transition-colors",
                selected
                  ? "bg-butter text-on-primary ring-butter"
                  : "bg-cream/[0.06] text-cream/70 ring-cream/10 hover:bg-cream/10 hover:text-cream",
              )}
            >
              {candidate}
            </button>
          );
        })}
      </div>

      {/* The words under the numbers, each spanning the tiles it names. */}
      <div className="grid grid-cols-10 gap-1.5">
        {BANDS.map(({ key, span }) => (
          <span
            key={key}
            style={{ gridColumn: `span ${span} / span ${span}` }}
            className={cn(
              "text-center font-sans text-[0.65rem] font-medium uppercase tracking-[0.08em] transition-colors",
              band === key ? "text-accent-ink" : "text-cream/40",
            )}
          >
            {t(`effortBand.${key}`)}
          </span>
        ))}
      </div>

      <p aria-live="polite" className="text-center font-sans text-sm text-cream/70">
        {value == null ? t("effortPrompt") : `${t("effortValue", { value })} · ${t(`effortBand.${band}`)}`}
      </p>
    </div>
  );
}
