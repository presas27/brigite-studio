/**
 * One exercise's progression, drawn as an SVG line.
 *
 * Hand-drawn rather than recharts, which the app uses everywhere else, for one
 * reason: this page prints. Recharts measures its container in the browser and
 * fills in a width afterwards, so a `window.print()` fired on load races the
 * first measurement and a chart can reach the paper zero pixels wide. An SVG
 * with a fixed `viewBox` is laid out by the print engine itself, needs no
 * JavaScript, and scales into whatever column the grid gives it.
 *
 * Ink on paper, so: dark strokes, no fills, no grid beyond the two axes and the
 * horizontal rules a reader needs to place a value.
 */

const WIDTH = 320;
const HEIGHT = 180;
const PAD = { top: 12, right: 10, bottom: 26, left: 34 };

export type ChartPoint = { date: string; value: number; label: string };

/** Axis ticks: the lowest and highest value, plus the midpoint when they differ. */
function ticksFor(min: number, max: number): number[] {
  if (min === max) return [min];
  const mid = (min + max) / 2;
  return [max, mid, min];
}

/** Trailing zeros are noise on a chart axis: 7.5 stays 7.5, 70.0 becomes 70. */
function tickLabel(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function PrintChart({
  points,
  unit,
  emptyLabel,
}: {
  points: ChartPoint[];
  /** Printed after each Y tick — "kg", "s", "reps". */
  unit: string;
  emptyLabel: string;
}) {
  if (points.length === 0) {
    return <p className="py-6 text-[0.7rem] text-neutral-500">{emptyLabel}</p>;
  }

  const values = points.map((point) => point.value);
  const max = Math.max(...values);
  const min = Math.min(...values);
  // A flat line sits in the middle of its own band rather than on the floor of
  // the chart: three sessions at 20kg is a real reading, not a zero.
  const top = max === min ? max + Math.max(1, Math.abs(max) * 0.1) : max;
  const bottom = max === min ? min - Math.max(1, Math.abs(min) * 0.1) : min;

  const plotWidth = WIDTH - PAD.left - PAD.right;
  const plotHeight = HEIGHT - PAD.top - PAD.bottom;
  const x = (index: number) =>
    points.length === 1
      ? PAD.left + plotWidth / 2
      : PAD.left + (index / (points.length - 1)) * plotWidth;
  const y = (value: number) =>
    PAD.top + plotHeight - ((value - bottom) / (top - bottom)) * plotHeight;

  const line = points.map((point, index) => `${x(index)},${y(point.value)}`).join(" ");
  const ticks = ticksFor(min, max);

  // Dates crowd fast in a 320-unit box: first, last and middle only, and only
  // when there is room between them.
  const labelled =
    points.length <= 3
      ? points.map((_, index) => index)
      : [0, Math.floor((points.length - 1) / 2), points.length - 1];

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="h-auto w-full"
      role="img"
      aria-label={points.map((point) => `${point.label}: ${point.value}${unit}`).join(", ")}
    >
      {ticks.map((tick) => (
        <g key={tick}>
          <line
            x1={PAD.left}
            x2={WIDTH - PAD.right}
            y1={y(tick)}
            y2={y(tick)}
            stroke="#d4d4d4"
            strokeWidth={0.5}
          />
          <text x={PAD.left - 4} y={y(tick) + 3} textAnchor="end" fontSize={7} fill="#525252">
            {tickLabel(tick)}
            {unit}
          </text>
        </g>
      ))}

      <line
        x1={PAD.left}
        x2={PAD.left}
        y1={PAD.top}
        y2={HEIGHT - PAD.bottom}
        stroke="#404040"
        strokeWidth={0.75}
      />
      <line
        x1={PAD.left}
        x2={WIDTH - PAD.right}
        y1={HEIGHT - PAD.bottom}
        y2={HEIGHT - PAD.bottom}
        stroke="#404040"
        strokeWidth={0.75}
      />

      {points.length > 1 && (
        <polyline points={line} fill="none" stroke="#111111" strokeWidth={1.5} />
      )}
      {points.map((point, index) => (
        <circle key={point.date} cx={x(index)} cy={y(point.value)} r={2.2} fill="#111111" />
      ))}

      {labelled.map((index) => (
        <text
          key={points[index].date}
          x={x(index)}
          y={HEIGHT - PAD.bottom + 11}
          textAnchor={index === 0 ? "start" : index === points.length - 1 ? "end" : "middle"}
          fontSize={7}
          fill="#525252"
        >
          {points[index].label}
        </text>
      ))}
    </svg>
  );
}
