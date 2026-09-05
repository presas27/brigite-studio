"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/studio/coach/icons";
import { buttonGhost, field, muted, surface } from "@/components/studio/theme";
import { dayKey } from "@/lib/studio/dates";
import type { PhaseWorkout } from "@/lib/studio/types";
import { cn } from "@/lib/utils";

const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;

/**
 * "Schedule" on a phase workout row: repeat weekly, pick days, or neither.
 *
 * The date panel opens on the days the workout already has, not on today — a
 * coach reopening it is almost always editing a placement rather than starting
 * one, and a picker that silently forgets three saved days is a picker that
 * deletes them on the next save.
 */
export function WorkoutScheduleMenu({
  workout,
  scheduleAction,
  canRepeatWeekly,
}: {
  workout: PhaseWorkout;
  scheduleAction: (formData: FormData) => void | Promise<void>;
  canRepeatWeekly: boolean;
}) {
  const t = useTranslations("Studio.plan");
  const tPhases = useTranslations("Studio.plan.phases");
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<"menu" | "weekly" | "custom">("menu");
  // The days to open the picker on: the ones the workout already occupies, or
  // today when it has none. Never empty — a panel with no date row has nothing
  // to submit and no obvious way back.
  const saved = workout.scheduleDates.length > 0 ? workout.scheduleDates : [dayKey()];
  const [dates, setDates] = useState(() =>
    saved.map((value) => ({ id: `${value}-${Math.random().toString(36).slice(2, 8)}`, value })),
  );
  const [pending, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function submit(build: (form: FormData) => void) {
    const form = new FormData();
    form.set("workoutId", workout.id);
    build(form);
    startTransition(async () => {
      await scheduleAction(form);
      setOpen(false);
      setPanel("menu");
    });
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setPanel("menu");
          setOpen((value) => !value);
        }}
        className={cn(buttonGhost, "px-4 py-2 text-xs")}
      >
        {t("schedule")}
      </button>

      {open && (
        <div
          className={cn(
            surface,
            "absolute top-full right-0 z-20 mt-2 w-[min(20rem,calc(100vw-2rem))] p-2 shadow-xl",
          )}
        >
          {panel === "menu" && (
            <div className="flex flex-col">
              <button
                type="button"
                disabled={!canRepeatWeekly || pending}
                onClick={() => setPanel("weekly")}
                className="flex items-start gap-3 rounded-[0.85rem] px-3 py-2.5 text-left transition-colors hover:bg-cream/5 disabled:opacity-40"
              >
                <Icon name="history" className="mt-0.5 h-4 w-4 shrink-0 text-accent-ink" />
                <span>
                  <span className="block font-sans text-sm font-semibold text-cream">
                    {t("scheduleRepeatWeekly")}
                  </span>
                  <span className={cn(muted, "mt-0.5 block text-xs")}>
                    {t("scheduleRepeatWeeklyHint")}
                  </span>
                </span>
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setDates(
                    saved.map((value) => ({
                      id: `${value}-${Math.random().toString(36).slice(2, 8)}`,
                      value,
                    })),
                  );
                  setPanel("custom");
                }}
                className="flex items-start gap-3 rounded-[0.85rem] px-3 py-2.5 text-left transition-colors hover:bg-cream/5"
              >
                <Icon name="calendar" className="mt-0.5 h-4 w-4 shrink-0 text-accent-ink" />
                <span>
                  <span className="block font-sans text-sm font-semibold text-cream">
                    {t("scheduleCustomDate")}
                  </span>
                  <span className={cn(muted, "mt-0.5 block text-xs")}>
                    {t("scheduleCustomDateHint")}
                  </span>
                </span>
              </button>
              <div className="my-1 border-t border-cream/10" />
              <button
                type="button"
                disabled={pending}
                onClick={() => submit((form) => form.set("mode", "none"))}
                className="flex items-start gap-3 rounded-[0.85rem] px-3 py-2.5 text-left transition-colors hover:bg-cream/5"
              >
                <Icon name="clients" className="mt-0.5 h-4 w-4 shrink-0 text-accent-ink" />
                <span>
                  <span className="block font-sans text-sm font-semibold text-cream">
                    {t("scheduleDont")}
                  </span>
                  <span className={cn(muted, "mt-0.5 block text-xs")}>{t("scheduleDontHint")}</span>
                </span>
              </button>
            </div>
          )}

          {panel === "weekly" && (
            <div className="space-y-3 p-2">
              <p className="font-sans text-sm font-semibold text-cream">{t("scheduleRepeatWeekly")}</p>
              <div className="grid grid-cols-7 gap-1">
                {WEEKDAYS.map((day) => (
                  <button
                    key={day}
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      submit((form) => {
                        form.set("mode", "weekly");
                        form.set("weekday", String(day));
                      })
                    }
                    className={cn(
                      buttonGhost,
                      "px-0 py-2 text-[0.65rem]",
                      workout.scheduleMode === "weekly" &&
                        workout.scheduleWeekday === day &&
                        "bg-cream/10 ring-accent-ink/70",
                    )}
                  >
                    {tPhases(`weekdayShort.${day}`)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {panel === "custom" && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                submit((form) => {
                  form.set("mode", "custom");
                  for (const date of dates) form.append("date", date.value);
                });
              }}
              className="space-y-3 p-2"
            >
              <p className="font-sans text-sm font-semibold text-cream">{t("scheduleCustomDate")}</p>
              <div className="space-y-2">
                {dates.map((row) => (
                  <div key={row.id} className="flex items-center gap-2">
                    <input
                      type="date"
                      aria-label={t("scheduleCustomDate")}
                      value={row.value}
                      onChange={(event) => {
                        const value = event.target.value;
                        setDates((current) =>
                          current.map((candidate) =>
                            candidate.id === row.id ? { ...candidate, value } : candidate,
                          ),
                        );
                      }}
                      className={cn(field, "py-2")}
                    />
                    {dates.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setDates((current) => current.filter((candidate) => candidate.id !== row.id))}
                        className="shrink-0 font-sans text-xs text-cream/45 hover:text-cream"
                      >
                        {t("removeDate")}
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() =>
                  setDates((current) => [
                    ...current,
                    { id: `${dayKey()}-${Math.random().toString(36).slice(2, 8)}`, value: dayKey() },
                  ])
                }
                className="font-sans text-xs font-semibold text-accent-ink"
              >
                {t("addDate")}
              </button>
              <div className="flex justify-end">
                <button type="submit" disabled={pending} className={cn(buttonGhost, "px-4 py-2 text-xs")}>
                  {t("schedule")}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
