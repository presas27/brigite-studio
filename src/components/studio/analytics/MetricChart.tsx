"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MetricSeries } from "@/lib/studio/analytics";

const GRID = "color-mix(in srgb, var(--color-cream) 12%, transparent)";
const TICK = "color-mix(in srgb, var(--color-cream) 55%, transparent)";

function formatDate(date: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone: "UTC" }).format(
    new Date(`${date}T12:00:00Z`),
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
  const data = series.points.map((point) => ({
    ...point,
    dateLabel: formatDate(point.date, locale),
  }));

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
          <LineChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
            {grid}
            {xAxis}
            {yAxis}
            {tooltip}
            <Line
              type="monotone"
              dataKey="value"
              stroke="var(--color-caramel)"
              strokeWidth={2.5}
              dot={{ r: 3, fill: "var(--color-caramel)", strokeWidth: 0 }}
              activeDot={{ r: 5 }}
              isAnimationActive={false}
            />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
