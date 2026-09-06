"use client";

import { useEffect, useMemo, useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useTranslations } from "next-intl";
import type { SessionStep } from "@/lib/studio/session-queue";
import { isRestItem, type BlockKind, type SetLog, type WorkoutItem } from "@/lib/studio/types";
import { Icon } from "@/components/studio/coach/icons";
import { eyebrow } from "@/components/studio/theme";
import { cn } from "@/lib/utils";
import { setsOf } from "./prescription";
import { EMPTY_SET, isFullyEmpty, type SetValue } from "./useSessionLog";

type SheetExercise = {
  itemId: string;
  exerciseId: string;
  item: WorkoutItem;
  tag: string | null;
  steps: SessionStep[];
};

type SheetBlock = {
  id: string;
  label: string;
  kind: BlockKind;
  interleaved: boolean;
  letter: string | null;
  exercises: SheetExercise[];
};

function isInterleaved(kind: BlockKind) {
  return kind === "superset" || kind === "circuit" || kind === "interval";
}

function groupSheet(steps: SessionStep[]): SheetBlock[] {
  const blocks: SheetBlock[] = [];
  let interleavedCount = 0;
  for (const step of steps) {
    if (isRestItem(step.item)) continue;
    let block = blocks.find((entry) => entry.id === step.blockId);
    if (!block) {
      const interleaved = isInterleaved(step.blockKind);
      if (interleaved) interleavedCount += 1;
      const letter = String.fromCharCode(64 + interleavedCount);
      block = {
        id: step.blockId,
        label: step.blockLabel,
        kind: step.blockKind,
        interleaved,
        letter: interleaved ? letter : null,
        exercises: [],
      };
      blocks.push(block);
    }
    let exercise = block.exercises.find((entry) => entry.itemId === step.itemId);
    if (!exercise) {
      const index = block.exercises.length + 1;
      exercise = {
        itemId: step.itemId,
        exerciseId: step.exerciseId,
        item: step.item,
        tag: block.letter ? `${block.letter}${index}` : null,
        steps: [],
      };
      block.exercises.push(exercise);
    }
    exercise.steps.push(step);
  }
  return blocks;
}

const cell =
  "h-10 w-full min-w-0 rounded-[0.65rem] bg-cream/[0.07] px-1.5 text-center font-sans text-sm font-semibold tabular-nums text-cream ring-1 ring-cream/20 outline-none transition placeholder:font-normal placeholder:text-cream/35 focus:bg-cream/10 focus:ring-2 focus:ring-accent-ink [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

/**
 * The Hevy-shaped view of the same session: every exercise, every set, on one
 * sheet. Supersets sit in one block with A1/A2 tags. Logging still writes the
 * same `itemId:setIndex` keys the focused player uses, so flipping the toggle
 * mid-session does not invent a second log.
 */
export function SessionSheet({
  steps,
  currentKey,
  entries,
  previousByExercise,
  onChange,
  onFlush,
  onJump,
  onStartRest,
  renderNote,
  renderSwap,
}: {
  steps: SessionStep[];
  currentKey: string | undefined;
  entries: Record<string, SetValue>;
  previousByExercise: Record<string, SetLog[]>;
  onChange: (itemId: string, setIndex: number, value: SetValue) => void;
  onFlush: (itemId: string, setIndex: number) => void;
  onJump: (index: number) => void;
  onStartRest?: (step: SessionStep) => void;
  renderNote: (itemId: string, exerciseId: string, name: string) => React.ReactNode;
  renderSwap: (itemId: string, name: string, replaces: WorkoutItem["replaces"]) => React.ReactNode;
}) {
  const t = useTranslations("Studio.session");
  const common = useTranslations("Studio.common");
  const workoutsT = useTranslations("Studio.workouts");
  const scope = useRef<HTMLDivElement>(null);
  const blocks = useMemo(() => groupSheet(steps), [steps]);
  const prescriptionLabels = {
    reps: common("reps"),
    meters: t("metersShort"),
    sets: common("sets"),
  };

  useGSAP(
    () => {
      gsap.matchMedia().add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          "[data-sheet-block]",
          { autoAlpha: 0, y: 16 },
          { autoAlpha: 1, y: 0, duration: 0.36, stagger: 0.06, ease: "power2.out" },
        );
      });
    },
    { scope },
  );

  useEffect(() => {
    if (!currentKey) return;
    const node = scope.current?.querySelector(`[data-sheet-row="${currentKey}"]`);
    node?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [currentKey]);

  return (
    <div ref={scope} className="mx-auto flex w-full max-w-lg flex-col gap-5">
      {blocks.map((block) => (
        <section
          key={block.id}
          data-sheet-block
          className={cn(
            "overflow-hidden rounded-[1.15rem] bg-cream/[0.03] ring-1 ring-cream/10",
            block.interleaved && "ring-accent-ink/25",
          )}
        >
          <div className="flex items-center justify-between gap-3 px-3.5 pt-3 pb-2">
            <p className={eyebrow}>
              {block.label || workoutsT(`blockKind.${block.kind}`)}
            </p>
            {block.interleaved && (
              <span className="font-sans text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-accent-ink">
                {t("sheetSuperset")}
              </span>
            )}
          </div>

          <ul>
            {block.exercises.map((exercise) => {
              const restStep = exercise.steps.find((step) => step.restSeconds > 0);
              return (
                <li key={exercise.itemId} className="border-t border-cream/8 px-3 pb-3 pt-3">
                  <div className="mb-2 flex items-start gap-2.5">
                    {exercise.tag ? (
                      <span className="mt-1 w-6 shrink-0 text-center font-sans text-[0.65rem] font-semibold text-accent-ink">
                        {exercise.tag}
                      </span>
                    ) : (
                      <span className="w-0 shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-sans text-sm font-semibold text-cream">
                        {exercise.item.exerciseName}
                      </p>
                      <p className="mt-0.5 font-sans text-xs text-cream/45">
                        {[
                          setsOf(exercise.steps[0], prescriptionLabels),
                          exercise.item.tempo ? `${common("tempo")} ${exercise.item.tempo}` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center">
                      {renderSwap(exercise.itemId, exercise.item.exerciseName, exercise.item.replaces)}
                      {renderNote(exercise.itemId, exercise.exerciseId, exercise.item.exerciseName)}
                    </div>
                  </div>

                  {/* Centred like the cells under them, so a header sits over
                      its column and not over the gap to the left of it. A set
                      measured in one number (seconds, metres) takes both value
                      columns, so the field is not parked beside an empty one. */}
                  <div className="grid grid-cols-[2rem_minmax(3.25rem,1fr)_minmax(3.5rem,1fr)_minmax(3.5rem,1fr)_2.25rem] items-center gap-1.5 px-1 pb-1 text-center font-sans text-[0.6rem] font-semibold uppercase tracking-[0.08em] text-cream/35">
                    <span>{t("sheetSet")}</span>
                    <span>{t("sheetPrevious")}</span>
                    {exercise.steps[0]?.tracking === "time" || exercise.steps[0]?.tracking === "hold" ? (
                      <span className="col-span-2">{t("secondsShort")}</span>
                    ) : exercise.steps[0]?.tracking === "distance" ? (
                      <span className="col-span-2">{t("metersShort")}</span>
                    ) : (
                      <>
                        <span>{common("kg")}</span>
                        <span>{common("reps")}</span>
                      </>
                    )}
                    <span className="sr-only">{t("sheetDone")}</span>
                  </div>

                  <ul className="space-y-1.5">
                    {exercise.steps.map((step) => {
                      const value = entries[step.key] ?? EMPTY_SET;
                      const previous = previousByExercise[step.exerciseId]?.find(
                        (log) => log.setIndex === step.setIndex,
                      );
                      const done = !isFullyEmpty(value);
                      const current = step.key === currentKey;
                      return (
                        <li key={step.key} data-sheet-row={step.key} className="scroll-mt-32 md:scroll-mt-20">
                          <SheetSetRow
                            step={step}
                            value={value}
                            previous={previous}
                            done={done}
                            current={current}
                            onFocusRow={() => {
                              const index = steps.findIndex((candidate) => candidate.key === step.key);
                              if (index >= 0) onJump(index);
                            }}
                            onChange={(next) => onChange(step.itemId, step.setIndex, next)}
                            onToggleDone={() => {
                              if (done) {
                                onChange(step.itemId, step.setIndex, EMPTY_SET);
                                onFlush(step.itemId, step.setIndex);
                                return;
                              }
                              const filled = fillFromPrevious(step, value, previous);
                              onChange(step.itemId, step.setIndex, filled);
                              onFlush(step.itemId, step.setIndex);
                            }}
                          />
                        </li>
                      );
                    })}
                  </ul>

                  {restStep && onStartRest && (
                    <button
                      type="button"
                      onClick={() => onStartRest(restStep)}
                      className="mt-2 ml-1 inline-flex items-center gap-1.5 rounded-full bg-cream/[0.05] px-2.5 py-1 font-sans text-[0.65rem] font-medium text-cream/60 ring-1 ring-cream/10 hover:text-cream"
                    >
                      <Icon name="clock" className="h-3 w-3" />
                      {t("startRest", { seconds: restStep.restSeconds })}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

function fillFromPrevious(step: SessionStep, value: SetValue, previous?: SetLog): SetValue {
  if (!isFullyEmpty(value)) return value;
  if (step.tracking === "reps") {
    return {
      ...EMPTY_SET,
      reps: previous?.reps ?? (Number.parseInt(step.item.reps, 10) || null),
      loadKg: previous?.loadKg ?? null,
    };
  }
  if (step.tracking === "distance") {
    return { ...EMPTY_SET, reps: previous?.reps ?? (Number.parseInt(step.item.reps, 10) || null) };
  }
  return { ...EMPTY_SET, seconds: previous?.seconds ?? step.item.seconds };
}

function previousLabel(step: SessionStep, previous?: SetLog) {
  if (!previous) return "—";
  if (step.tracking === "reps") {
    if (previous.reps == null) return "—";
    return previous.loadKg != null ? `${previous.loadKg}×${previous.reps}` : `${previous.reps}`;
  }
  if (step.tracking === "distance") return previous.reps != null ? `${previous.reps}m` : "—";
  return previous.seconds != null ? `${previous.seconds}s` : "—";
}

function SheetSetRow({
  step,
  value,
  previous,
  done,
  current,
  onFocusRow,
  onChange,
  onToggleDone,
}: {
  step: SessionStep;
  value: SetValue;
  previous?: SetLog;
  done: boolean;
  current: boolean;
  onFocusRow: () => void;
  onChange: (value: SetValue) => void;
  onToggleDone: () => void;
}) {
  const t = useTranslations("Studio.session");
  const isDuration = step.tracking === "time" || step.tracking === "hold";
  const isDistance = step.tracking === "distance";
  const rowRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const isMountedRef = useRef(false);

  useGSAP(
    () => {
      if (!isMountedRef.current) {
        isMountedRef.current = true;
        return;
      }
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const btn = btnRef.current;
      const row = rowRef.current;
      if (!btn) return;

      if (done) {
        // Energetic pop on completion + row flash
        gsap.fromTo(btn, { scale: 0.75 }, { scale: 1, duration: 0.35, ease: "back.out(2.5)" });
        const icon = btn.querySelector("svg");
        if (icon) {
          gsap.fromTo(icon, { scale: 0.4, rotate: -20 }, { scale: 1, rotate: 0, duration: 0.3, ease: "back.out(2)" });
        }
        if (row) {
          gsap.fromTo(
            row,
            { backgroundColor: "rgba(143, 42, 58, 0.22)" },
            { backgroundColor: "transparent", duration: 0.65, ease: "power2.out", clearProps: "backgroundColor" },
          );
        }
      } else {
        gsap.fromTo(btn, { scale: 1.15 }, { scale: 1, duration: 0.2, ease: "power2.out" });
      }
    },
    { dependencies: [done] },
  );

  return (
    <div
      ref={rowRef}
      className={cn(
        "grid grid-cols-[2rem_minmax(3.25rem,1fr)_minmax(3.5rem,1fr)_minmax(3.5rem,1fr)_2.25rem] items-center gap-1.5 rounded-[0.75rem] px-1 py-0.5 transition-colors",
        current && "bg-cream/[0.04] ring-1 ring-cream/10",
        done && !current && "opacity-80",
      )}
    >
      <span className="text-center font-sans text-sm font-semibold tabular-nums text-cream/70">
        {step.setNumber}
      </span>
      <span className="truncate text-center font-sans text-xs tabular-nums text-cream/40">
        {previousLabel(step, previous)}
      </span>

      {isDuration ? (
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={value.seconds ?? ""}
          placeholder={previous?.seconds != null ? String(previous.seconds) : ""}
          onFocus={onFocusRow}
          onChange={(event) =>
            onChange({ ...value, seconds: event.target.value === "" ? null : Number(event.target.value) })
          }
          className={cn(cell, "col-span-2")}
          aria-label={t("secondsShort")}
        />
      ) : isDistance ? (
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={value.reps ?? ""}
          placeholder={previous?.reps != null ? String(previous.reps) : ""}
          onFocus={onFocusRow}
          onChange={(event) =>
            onChange({ ...value, reps: event.target.value === "" ? null : Number(event.target.value) })
          }
          className={cn(cell, "col-span-2")}
          aria-label={t("metersShort")}
        />
      ) : (
        <input
          type="number"
          inputMode="decimal"
          min={0}
          step={0.5}
          value={value.loadKg ?? ""}
          placeholder={previous?.loadKg != null ? String(previous.loadKg) : ""}
          onFocus={onFocusRow}
          onChange={(event) =>
            onChange({ ...value, loadKg: event.target.value === "" ? null : Number(event.target.value) })
          }
          className={cell}
          aria-label="kg"
        />
      )}

      {!isDuration && !isDistance && (
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={value.reps ?? ""}
          placeholder={previous?.reps != null ? String(previous.reps) : ""}
          onFocus={onFocusRow}
          onChange={(event) =>
            onChange({ ...value, reps: event.target.value === "" ? null : Number(event.target.value) })
          }
          className={cell}
          aria-label="reps"
        />
      )}

      <button
        ref={btnRef}
        type="button"
        onClick={onToggleDone}
        aria-pressed={done}
        aria-label={t("sheetDone")}
        className={cn(
          "grid h-9 w-9 place-items-center rounded-[0.6rem] ring-1 transition-colors",
          done
            ? "bg-accent-ink/20 text-accent-ink ring-accent-ink/40"
            : "text-cream/30 ring-cream/15 hover:text-cream/70 hover:ring-cream/30",
        )}
      >
        <Icon name="check" strokeWidth={2} className="h-5 w-5" />
      </button>
    </div>
  );
}
