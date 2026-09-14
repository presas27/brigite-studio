"use client";

import { useId } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MetricSeries } from "@/lib/studio/analytics";

const GRID = "color-mix(in srgb, var(--color-cream) 12%, transparent)";
const TICK = "color-mix(in srgb, var(--color-cream) 70%, transparent)";

function formatDate(date: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone: "UTC" }).format(
    new Date(`${date}T12:00:00Z`),
  );
}

/** Speech-bubble callout for the latest point, positioned relative to its own dot. */
function ValueBubble({ viewBox, text }: { viewBox?: { x: number; y: number }; text: string }) {
  if (!viewBox) return null;
  const { x, y } = viewBox;
  const width = Math.max(38, text.length * 7.5 + 20);
  const height = 24;
  const tailHeight = 6;
  const gap = 8;
  const bubbleBottom = y - gap - tailHeight;
  const bubbleTop = bubbleBottom - height;
  const bubbleRight = x + 6;
  const bubbleLeft = bubbleRight - width;
  const tailX = Math.min(x, bubbleRight - 10);

  return (
    <g>
      <rect x={bubbleLeft} y={bubbleTop} width={width} height={height} rx={height / 2} fill="var(--color-caramel)" />
      <polygon
        points={`${tailX - 5},${bubbleBottom} ${tailX + 5},${bubbleBottom} ${tailX},${bubbleBottom + tailHeight}`}
        fill="var(--color-caramel)"
      />
      <text
        x={bubbleLeft + width / 2}
        y={bubbleTop + height / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={12}
        fontWeight={700}
        fill="var(--color-ink)"
      >
        {text}
      </text>
    </g>
  );
}

/**
 * One metric, one chart — line or bar. Recharts renders its own SVG, so this
 * needs to be a client component — everything upstream (mock data today, real
 * queries later) stays a plain server-side data fetch.
 */
export function MetricChart({
  series,
  label,
  locale,
  type = "line",
}: {
  series: MetricSeries;
  label: string;
  locale: string;
  type?: "line" | "bar";
}) {
  const gradientId = `metric-chart-fill-${useId()}`;
  const data = series.points.map((point) => ({
    ...point,
    dateLabel: formatDate(point.date, locale),
  }));
  const lastPoint = data.length > 0 ? data[data.length - 1] : null;

  const tooltip = (
    <Tooltip
      contentStyle={{
        background: "var(--color-ink-lift)",
        border: "1px solid color-mix(in srgb, var(--color-cream) 15%, transparent)",
        borderRadius: 12,
        fontSize: 12,
      }}
      labelStyle={{ color: TICK }}
      itemStyle={{ color: "var(--color-cream)" }}
      formatter={(value) => [`${value} ${series.unit}`, label]}
      cursor={type === "bar" ? { fill: "color-mix(in srgb, var(--color-cream) 6%, transparent)" } : undefined}
    />
  );
  const grid = <CartesianGrid stroke={GRID} vertical={false} />;
  const xAxis = (
    <XAxis
      dataKey="dateLabel"
      tick={{ fill: TICK, fontSize: 11 }}
      axisLine={false}
      tickLine={false}
      interval="preserveStartEnd"
    />
  );
  const yAxis = (
    <YAxis
      tick={{ fill: TICK, fontSize: 11 }}
      axisLine={false}
      tickLine={false}
      width={48}
      domain={["auto", "auto"]}
    />
  );

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        {type === "bar" ? (
          <BarChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
            {grid}
            {xAxis}
            {yAxis}
            {tooltip}
            <Bar dataKey="value" fill="var(--color-caramel)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
          </BarChart>
        ) : (
          <AreaChart data={data} margin={{ top: 32, right: 20, left: 4, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-caramel)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--color-caramel)" stopOpacity={0} />
              </linearGradient>
            </defs>
            {grid}
            {xAxis}
            {yAxis}
            {tooltip}
            <Area
              type="monotone"
              dataKey="value"
              stroke="var(--color-caramel)"
              strokeWidth={2.5}
              fill={`url(#${gradientId})`}
              dot={{ r: 3, fill: "var(--color-caramel)", strokeWidth: 0 }}
              activeDot={{ r: 5 }}
              isAnimationActive={false}
            />
            {lastPoint && (
              <ReferenceDot
                x={lastPoint.dateLabel}
                y={lastPoint.value}
                r={5}
                fill="var(--color-ink-lift)"
                stroke="var(--color-caramel)"
                strokeWidth={2.5}
                label={<ValueBubble text={`${lastPoint.value}`} />}
              />
            )}
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
