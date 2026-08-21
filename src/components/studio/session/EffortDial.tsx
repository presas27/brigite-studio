"use client";

import { useCallback, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useTranslations } from "next-intl";
import { heading } from "../theme";
import { cn } from "@/lib/utils";

const MIN = 1;
const MAX = 10;
const CENTER_X = 120;
const CENTER_Y = 116;
const RADIUS = 96;
const ARC_LENGTH = 100;

/** Where a value sits along the arc, 0 at the left end, 1 at the right. */
function ratioOf(value: number): number {
  return (value - MIN) / (MAX - MIN);
}

function pointAt(ratio: number): { x: number; y: number } {
  const angle = Math.PI * (1 - ratio);
  return { x: CENTER_X + RADIUS * Math.cos(angle), y: CENTER_Y - RADIUS * Math.sin(angle) };
}

/** 1-3 light, 4-6 moderate, 7-8 hard, 9-10 everything there was. */
function bandOf(value: number): "light" | "moderate" | "hard" | "max" {
  if (value <= 3) return "light";
  if (value <= 6) return "moderate";
  if (value <= 8) return "hard";
  return "max";
}

/**
 * How hard the session was, 1 to 10, asked once and answered in one gesture.
 *
 * The arc is dragged, but it is also ten tappable marks and a real range input
 * underneath — hidden from sight, not from keyboards or screen readers. A dial
 * that can only be dragged is a dial that some people cannot answer at all,
 * and this is the one question the whole session asks.
 */
export function EffortDial({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (value: number) => void;
}) {
  const t = useTranslations("Studio.session");
  const svgRef = useRef<SVGSVGElement>(null);
  const fillRef = useRef<SVGPathElement>(null);
  const knobRef = useRef<SVGCircleElement>(null);
  const numberRef = useRef<HTMLSpanElement>(null);
  const [dragging, setDragging] = useState(false);

  // The arc and the knob are driven from one tweened number rather than from
  // React state, so a drag paints at frame rate instead of at render rate.
  const shown = useRef(value ?? MIN);

  useGSAP(
    () => {
      const target = value ?? MIN;
      const paint = (ratio: number) => {
        fillRef.current?.setAttribute("stroke-dashoffset", String(ARC_LENGTH * (1 - ratio)));
        const point = pointAt(ratio);
        knobRef.current?.setAttribute("cx", String(point.x));
        knobRef.current?.setAttribute("cy", String(point.y));
      };

      const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (still || value == null) {
        shown.current = target;
        paint(value == null ? 0 : ratioOf(target));
        return;
      }

      const proxy = { value: shown.current };
      gsap.to(proxy, {
        value: target,
        duration: 0.35,
        ease: "power2.out",
        onUpdate: () => {
          shown.current = proxy.value;
          paint(ratioOf(proxy.value));
        },
      });
      gsap.fromTo(
        numberRef.current,
        { scale: 0.88 },
        { scale: 1, duration: 0.3, ease: "back.out(2.4)" },
      );
    },
    { dependencies: [value] },
  );

  const valueFromPointer = useCallback((clientX: number, clientY: number): number | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    if (rect.width === 0) return null;
    // The viewBox is 240 wide and preserves its aspect ratio, so one scale
    // factor maps both axes.
    const scale = 240 / rect.width;
    const x = (clientX - rect.left) * scale - CENTER_X;
    const y = CENTER_Y - (clientY - rect.top) * scale;
    const degrees = (Math.atan2(y, x) * 180) / Math.PI;
    const ratio = (180 - Math.min(180, Math.max(0, degrees))) / 180;
    return Math.round(ratio * (MAX - MIN)) + MIN;
  }, []);

  const handlePointer = useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      const next = valueFromPointer(event.clientX, event.clientY);
      if (next != null && next !== value) onChange(next);
    },
    [onChange, value, valueFromPointer],
  );

  const band = value == null ? null : bandOf(value);

  return (
    <div className="mx-auto w-full max-w-sm lg:max-w-md">
      <label className="sr-only" htmlFor="effort-range">
        {t("effortLabel")}
      </label>
      {/* The dial is dragged, but this is what answers it from a keyboard. It
          sits before the arc so `peer-focus-visible` can put a ring on it —
          a control nobody can see focus on is a control nobody can use. */}
      <input
        id="effort-range"
        type="range"
        min={MIN}
        max={MAX}
        step={1}
        value={value ?? MIN}
        aria-valuetext={value == null ? t("effortPrompt") : `${value} · ${t(`effortBand.${bandOf(value)}`)}`}
        onChange={(event) => onChange(Number(event.target.value))}
        className="peer sr-only"
      />

      <div className="relative rounded-[1.5rem] peer-focus-visible:ring-2 peer-focus-visible:ring-caramel/60">
        <svg
          ref={svgRef}
          viewBox="0 0 240 140"
          className="w-full touch-none select-none"
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            setDragging(true);
            handlePointer(event);
          }}
          onPointerMove={(event) => {
            if (dragging) handlePointer(event);
          }}
          onPointerUp={(event) => {
            event.currentTarget.releasePointerCapture(event.pointerId);
            setDragging(false);
          }}
          onPointerCancel={() => setDragging(false)}
        >
          <path
            d={`M ${CENTER_X - RADIUS} ${CENTER_Y} A ${RADIUS} ${RADIUS} 0 0 1 ${CENTER_X + RADIUS} ${CENTER_Y}`}
            fill="none"
            strokeWidth="10"
            strokeLinecap="round"
            className="stroke-cream/10"
          />
          <path
            ref={fillRef}
            d={`M ${CENTER_X - RADIUS} ${CENTER_Y} A ${RADIUS} ${RADIUS} 0 0 1 ${CENTER_X + RADIUS} ${CENTER_Y}`}
            fill="none"
            strokeWidth="10"
            strokeLinecap="round"
            pathLength={ARC_LENGTH}
            strokeDasharray={ARC_LENGTH}
            strokeDashoffset={ARC_LENGTH}
            className="stroke-caramel"
          />

          {Array.from({ length: MAX - MIN + 1 }, (_, index) => {
            const tickValue = MIN + index;
            const point = pointAt(ratioOf(tickValue));
            const active = value != null && tickValue <= value;
            return (
              <g key={tickValue} onPointerDown={() => onChange(tickValue)} className="cursor-pointer">
                <circle cx={point.x} cy={point.y} r="12" fill="transparent" />
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="2"
                  className={active ? "fill-ink/35" : "fill-cream/25"}
                />
              </g>
            );
          })}

          {value != null && (
            <circle
              ref={knobRef}
              cx={CENTER_X - RADIUS}
              cy={CENTER_Y}
              r="11"
              className="fill-butter stroke-background"
              strokeWidth="3"
            />
          )}
        </svg>

        {/* The viewBox is 240×140 and the svg keeps its ratio, so a percentage
            here lands on a known point of the arc: 62% of the height is the
            middle of the bowl, whatever the screen width. */}
        <div className="pointer-events-none absolute left-1/2 top-[62%] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1">
          <span
            ref={numberRef}
            className={cn(heading, "block font-sans text-[3.5rem] leading-none font-bold tabular-nums lg:text-[4.25rem]")}
          >
            {value ?? "—"}
          </span>
          <span className="font-sans text-xs text-cream/55 lg:text-sm">
            {band ? t(`effortBand.${band}`) : t("effortPrompt")}
          </span>
        </div>
      </div>

      {/* The arc starts and ends at 10% and 90% of the viewBox, so the scale
          labels are inset to match rather than sitting at the box edges. */}
      <div
        aria-hidden
        className="-mt-1 flex justify-between px-[10%] font-sans text-[0.7rem] text-cream/35"
      >
        <span>{MIN}</span>
        <span>{MAX}</span>
      </div>
    </div>
  );
}
