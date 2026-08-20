"use client";

import { useTranslations } from "next-intl";
import type { SetLog, Tracking } from "@/lib/studio/types";
import { eyebrow, fieldCompact, muted } from "../theme";
import { cn } from "@/lib/utils";

/**
 * The numbers for one logged set. There is no dedicated "distance" column in
 * `SetLog` — distance is a count (metres), not a duration, so it shares the
 * `reps` field. `time`/`hold` share `seconds`, since both are durations.
 * `tracking` alone decides which of these a row actually shows and writes.
 */
export type SetValue = {
  reps: number | null;
  loadKg: number | null;
  seconds: number | null;
  rpe: number | null;
};

export const EMPTY_SET: SetValue = { reps: null, loadKg: null, seconds: null, rpe: null };

export function isFullyEmpty(value: SetValue): boolean {
  return value.reps == null && value.loadKg == null && value.seconds == null && value.rpe == null;
}

export function SetRow({
  index,
  tracking,
  value,
  previous,
  onChange,
}: {
  index: number;
  tracking: Tracking;
  value: SetValue;
  previous?: SetLog;
  onChange: (value: SetValue) => void;
}) {
  const t = useTranslations("Studio.session");
  const common = useTranslations("Studio.common");

  // Previous value, formatted per tracking type — reps carries an optional
  // load, time/hold is a duration, distance is a bare metre count.
  const previousValue = previous
    ? tracking === "reps"
      ? previous.loadKg != null
        ? `${previous.reps ?? "—"} × ${previous.loadKg}kg`
        : `${previous.reps ?? "—"}`
      : tracking === "distance"
        ? `${previous.reps ?? "—"}m`
        : `${previous.seconds ?? "—"}s`
    : null;

  function set<K extends keyof SetValue>(key: K, raw: string) {
    onChange({ ...value, [key]: raw === "" ? null : Number(raw) });
  }

  // Every row shows the same three column headers, so the implicit <label>
  // alone would announce four identical "Reps" fields. Prefixing the set number
  // makes each input distinguishable to a screen reader.
  const setLabel = t("setLabel", { index: index + 1 });

  return (
    <div className="flex flex-wrap items-end gap-3 border-t border-cream/10 pt-3 first:border-t-0 first:pt-0">
      <div className="min-w-[6.5rem] flex-1 sm:flex-none">
        <p className="font-mono text-sm text-cream/80">{setLabel}</p>
        <p className={cn(muted, "text-xs")}>
          {previousValue != null ? t("previous", { value: previousValue }) : t("noPrevious")}
        </p>
      </div>

      {(tracking === "reps" || tracking === "distance") && (
        <label className="w-20 shrink-0 space-y-1">
          <span className={eyebrow}>{tracking === "distance" ? t("distanceMeters") : common("reps")}</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={value.reps ?? ""}
            onChange={(event) => set("reps", event.target.value)}
            aria-label={`${setLabel} · ${tracking === "distance" ? t("distanceMeters") : common("reps")}`}
            className={fieldCompact}
          />
        </label>
      )}

      {tracking === "reps" && (
        <label className="w-20 shrink-0 space-y-1">
          <span className={eyebrow}>{common("load")}</span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step={0.5}
            value={value.loadKg ?? ""}
            onChange={(event) => set("loadKg", event.target.value)}
            aria-label={`${setLabel} · ${common("load")} (${common("kg")})`}
            className={fieldCompact}
          />
        </label>
      )}

      {(tracking === "time" || tracking === "hold") && (
        <label className="w-20 shrink-0 space-y-1">
          <span className={eyebrow}>{t("holdSeconds")}</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={value.seconds ?? ""}
            onChange={(event) => set("seconds", event.target.value)}
            aria-label={`${setLabel} · ${t("holdSeconds")}`}
            className={fieldCompact}
          />
        </label>
      )}

      <label className="w-20 shrink-0 space-y-1">
        <span className={eyebrow}>{common("rpe")}</span>
        <input
          type="number"
          inputMode="decimal"
          min={0}
          max={10}
          step={0.5}
          value={value.rpe ?? ""}
          onChange={(event) => set("rpe", event.target.value)}
          aria-label={`${setLabel} · ${common("rpe")}`}
          className={fieldCompact}
        />
      </label>
    </div>
  );
}
