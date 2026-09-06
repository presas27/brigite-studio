"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

const WIDTH = 320;
const HEIGHT = 64;

/**
 * Animated SVG sparkline for weight trends.
 * The stroke draws dynamically from left to right, the shaded area fades in,
 * and the latest reading gets a spring-popped dot at its apex.
 */
export function Sparkline({ values, label }: { values: number[]; label: string }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const lineRef = useRef<SVGPolylineElement>(null);
  const areaRef = useRef<SVGPolygonElement>(null);
  const dotRef = useRef<SVGCircleElement>(null);

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = values.length > 1 ? WIDTH / (values.length - 1) : 0;

  const pointCoords = values.map((value, index) => {
    const x = values.length > 1 ? index * step : WIDTH / 2;
    const y = HEIGHT - 6 - ((value - min) / span) * (HEIGHT - 12);
    return { x, y, str: `${x.toFixed(1)},${y.toFixed(1)}` };
  });

  const pointsStr = pointCoords.map((p) => p.str).join(" ");
  const lastPoint = pointCoords[pointCoords.length - 1];

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const line = lineRef.current;
      if (!line) return;

      // Approximate polyline length if getTotalLength is unavailable in some browsers
      let length = 400;
      try {
        if (typeof line.getTotalLength === "function") {
          length = line.getTotalLength();
        }
      } catch {
        length = 400;
      }

      gsap.fromTo(
        line,
        { strokeDasharray: length, strokeDashoffset: length },
        { strokeDashoffset: 0, duration: 0.65, ease: "power2.out" },
      );

      if (areaRef.current) {
        gsap.fromTo(
          areaRef.current,
          { opacity: 0 },
          { opacity: 0.12, duration: 0.7, ease: "power1.out" },
        );
      }

      if (dotRef.current) {
        gsap.fromTo(
          dotRef.current,
          { scale: 0 },
          {
            scale: 1,
            duration: 0.32,
            delay: 0.5,
            ease: "back.out(2.5)",
            transformOrigin: "center",
          },
        );
      }
    },
    { scope: svgRef, dependencies: [values.join(",")] },
  );

  return (
    <svg
      ref={svgRef}
      role="img"
      aria-label={label}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="none"
      className="h-16 w-full text-accent-ink overflow-visible"
    >
      <polygon
        ref={areaRef}
        points={`0,${HEIGHT} ${pointsStr} ${WIDTH},${HEIGHT}`}
        fill="currentColor"
        opacity={0.12}
      />
      <polyline
        ref={lineRef}
        points={pointsStr}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      {lastPoint && (
        <circle
          ref={dotRef}
          cx={lastPoint.x}
          cy={lastPoint.y}
          r={3.5}
          className="fill-accent-ink"
        />
      )}
    </svg>
  );
}
