import { eyebrow } from "../theme";

/** A 1-5 self-report value as `n/5` plus a filled bar. No chart library needed. */
export function ScaleBar({ label, value }: { label: string; value: number | null }) {
  const pct = value == null ? 0 : Math.max(0, Math.min(100, (value / 5) * 100));
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className={eyebrow}>{label}</span>
        <span className="font-mono text-xs text-cream/70">{value == null ? "—" : `${value}/5`}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-cream/10">
        <div className="h-full rounded-full bg-caramel/70" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
