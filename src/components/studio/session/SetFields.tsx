"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { SessionStep } from "@/lib/studio/session-queue";
import type { SetLog } from "@/lib/studio/types";
import { EMPTY_SET, type SetValue } from "./useSessionLog";
import { formatClock } from "./CountdownRing";
import { Icon } from "../coach/icons";
import { cn } from "@/lib/utils";

/**
 * The box she types into: the field is the whole tile, its name sits inside it
 * in small caps and the number lives underneath at the size of the only thing
 * on the screen that matters. A label parked outside and to the left made the
 * tile read as an inert plate — grey, unlabelled, and easy to mistake for
 * disabled.
 */
const box =
  "w-full rounded-[0.9rem] bg-cream/[0.07] px-4 pt-6 pb-3 text-center font-sans text-[2rem] font-semibold leading-none tabular-nums text-cream ring-1 ring-cream/25 outline-none transition placeholder:font-normal placeholder:text-cream/40 focus:bg-cream/10 focus:ring-2 focus:ring-caramel [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

/** Its name, inside the tile, above the number. */
const boxLabel =
  "pointer-events-none absolute inset-x-0 top-2 text-center font-sans text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-cream/50";

/** The tile itself — positioning context for the label sitting over the field. */
const boxWrap = "relative min-w-[7rem] max-w-[15rem] flex-1";

/**
 * What the client actually types for the set in front of her — and nothing
 * else. Which fields exist is decided by the exercise's `tracking`: a squat
 * asks for reps and load, a plank asks for seconds, a carry asks for metres.
 * There is no RPE box here; the session asks for effort once, at the end.
 *
 * Previous numbers are placeholders, never values. Pre-filling a set with last
 * week's numbers records a lift that may not have happened; the "repeat" link
 * puts them one tap away without ever claiming them on her behalf.
 */
export function SetFields({
  step,
  value,
  previous,
  onChange,
}: {
  step: SessionStep;
  value: SetValue;
  previous?: SetLog;
  onChange: (value: SetValue) => void;
}) {
  const t = useTranslations("Studio.session");
  const common = useTranslations("Studio.common");

  function set<K extends keyof SetValue>(key: K, raw: string) {
    onChange({ ...value, [key]: raw === "" ? null : Number(raw) });
  }

  const isCount = step.tracking === "reps" || step.tracking === "distance";
  const isDuration = step.tracking === "time" || step.tracking === "hold";
  const targetSeconds = step.item.seconds ?? 0;
  // A timed set with a target runs itself; one without has nothing to count
  // down, so it falls back to the plain number field.
  const hasTimer = isDuration && targetSeconds > 0;

  // What "repeat the last one" would write, and the label that describes it.
  const repeat: { value: SetValue; label: string } | null = (() => {
    if (!previous) return null;
    if (step.tracking === "reps" && previous.reps != null) {
      return {
        value: { ...EMPTY_SET, reps: previous.reps, loadKg: previous.loadKg },
        label:
          previous.loadKg != null
            ? `${previous.reps} × ${previous.loadKg}${common("kg")}`
            : `${previous.reps}`,
      };
    }
    if (step.tracking === "distance" && previous.reps != null) {
      return { value: { ...EMPTY_SET, reps: previous.reps }, label: `${previous.reps}m` };
    }
    if (isDuration && previous.seconds != null) {
      return { value: { ...EMPTY_SET, seconds: previous.seconds }, label: `${previous.seconds}s` };
    }
    return null;
  })();

  return (
    <div className="space-y-3">
      {hasTimer && (
        <WorkTimer
          key={step.key}
          seconds={targetSeconds}
          onComplete={() => onChange({ ...value, seconds: targetSeconds })}
          onStop={(elapsed) => onChange({ ...value, seconds: elapsed })}
        />
      )}

      <div className="flex flex-wrap items-stretch gap-3 empty:hidden">
        {isCount && (
          <label className={boxWrap}>
            <span className={boxLabel}>
              {step.tracking === "distance" ? t("metersShort") : common("reps")}
            </span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={value.reps ?? ""}
              onChange={(event) => set("reps", event.target.value)}
              placeholder={previous?.reps != null ? String(previous.reps) : ""}
              className={box}
            />
          </label>
        )}

        {step.tracking === "reps" && (
          <label className={boxWrap}>
            <span className={boxLabel}>{common("kg")}</span>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step={0.5}
              value={value.loadKg ?? ""}
              onChange={(event) => set("loadKg", event.target.value)}
              placeholder={previous?.loadKg != null ? String(previous.loadKg) : ""}
              className={box}
            />
          </label>
        )}

        {isDuration && !hasTimer && (
          <label className={boxWrap}>
            <span className={boxLabel}>{t("secondsShort")}</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={value.seconds ?? ""}
              onChange={(event) => set("seconds", event.target.value)}
              placeholder=""
              className={box}
            />
          </label>
        )}
      </div>


      {repeat && (
        <button
          type="button"
          onClick={() => onChange(repeat.value)}
          className="font-sans text-sm font-medium text-accent-ink underline decoration-accent-ink/30 underline-offset-4 transition-colors hover:decoration-accent-ink"
        >
          {t("repeatPrevious", { value: repeat.label })}
        </button>
      )}
    </div>
  );
}

/**
 * The countdown for a set that is measured in time rather than reps. Holding a
 * plank while typing into a number field is not a thing anyone does, so the
 * timer runs the set and writes the seconds itself — the full target when it
 * lands, and however long she actually held it when she stops early. There is
 * no number field beside it to correct: the clock was there, it knows.
 *
 * Mounted fresh for every set (see the `key` above), which is what keeps a
 * clock from one plank running into the next.
 */
function WorkTimer({
  seconds,
  onComplete,
  onStop,
}: {
  seconds: number;
  onComplete: () => void;
  onStop: (elapsed: number) => void;
}) {
  const t = useTranslations("Studio.session");
  const [remaining, setRemaining] = useState<number | null>(null);
  const deadlineRef = useRef(0);
  const intervalRef = useRef<number | null>(null);
  const completeRef = useRef(onComplete);
  const stopRef = useRef(onStop);

  useEffect(() => {
    completeRef.current = onComplete;
    stopRef.current = onStop;
  });

  useEffect(() => () => clearInterval(intervalRef.current ?? undefined), []);

  function start() {
    clearInterval(intervalRef.current ?? undefined);
    // Anchored to a wall-clock deadline, so a backgrounded tab that stops
    // firing intervals still comes back with the right number.
    deadlineRef.current = Date.now() + seconds * 1000;
    setRemaining(seconds);
    intervalRef.current = window.setInterval(() => {
      const left = Math.ceil((deadlineRef.current - Date.now()) / 1000);
      if (left <= 0) {
        clearInterval(intervalRef.current ?? undefined);
        setRemaining(null);
        completeRef.current();
        return;
      }
      setRemaining(left);
    }, 200);
  }

  function stop() {
    clearInterval(intervalRef.current ?? undefined);
    // What she actually held. A tap a moment after starting is a misfire, not a
    // one-second plank, so nothing under a second is recorded.
    const elapsed = seconds - (remaining ?? seconds);
    setRemaining(null);
    if (elapsed >= 1) stopRef.current(elapsed);
  }

  const running = remaining != null;
  const left = remaining ?? seconds;
  // The fill drains left to right as the set does. A ring said the same thing
  // in a circle 136px across, which is most of a phone panel spent on one
  // number; the bar reads from the floor and leaves room for everything else.
  const progress = running ? Math.max(0, Math.min(1, left / Math.max(1, seconds))) : 1;

  return (
    <button
      type="button"
      onClick={running ? stop : start}
      className={cn(
        "relative w-full overflow-hidden rounded-[0.9rem] bg-cream/[0.07] px-5 py-4 text-left ring-1 transition",
        running ? "ring-caramel/60" : "ring-cream/25 hover:ring-cream/40",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-0 left-0 transition-[width] duration-200",
          running ? "bg-caramel/20 ease-linear" : "bg-caramel/10",
        )}
        style={{ width: `${progress * 100}%` }}
      />
      <span className="relative flex items-center justify-between gap-4">
        <span className="flex items-center gap-2.5 font-sans text-sm font-semibold text-cream/85">
          <Icon name={running ? "pause" : "play"} className="h-4 w-4" />
          {running ? t("stopSet") : t("startSetShort")}
        </span>
        <span className="font-sans text-[2rem] font-semibold leading-none tabular-nums text-cream">
          {formatClock(left)}
        </span>
      </span>
    </button>
  );
}
