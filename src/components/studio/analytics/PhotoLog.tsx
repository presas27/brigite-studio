"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Empty } from "@/components/studio/Empty";
import { formatDayKey } from "@/components/studio/format";
import { MorphHeight } from "@/components/studio/MorphHeight";
import { buttonGhost, chip, eyebrow, heading, muted } from "@/components/studio/theme";
import type { PhotoAngle, ProgressPhotoWeek } from "@/lib/studio/types";
import { cn } from "@/lib/utils";

/** Angles in the order they are always shown, and the order the compare columns take. */
const ANGLES: readonly PhotoAngle[] = ["front", "back", "side"] as const;

/** `next/image` is deliberately not used: see `photoSrc`. */
function photoSrc(photoId: string, variant: "thumb" | "full"): string {
  return `/app/api/foto/${photoId}?v=${variant}`;
}

function Slot({
  src,
  alt,
  label,
  emptyLabel,
}: {
  src: string | null;
  alt: string;
  label: string;
  emptyLabel: string;
}) {
  return (
    <div className="space-y-1">
      <p className={cn(eyebrow, "text-[0.65rem]")}>{label}</p>
      <div className="flex aspect-[3/4] w-full items-center justify-center overflow-hidden rounded-[0.85rem] bg-cream/[0.04] ring-1 ring-cream/10">
        {src ? (
          // The photos are served per request behind the session and already
          // stored at the two sizes the app shows, so there is nothing for the
          // image optimizer to do but add a hop and a bill.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={alt} className="h-full w-full object-cover" />
        ) : (
          <span className="px-2 text-center font-sans text-[0.65rem] text-cream/35">
            {emptyLabel}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * The photo log, and the comparison it exists for.
 *
 * Two views of one list. The log is every check-in that carries at least one
 * photo, newest first, with a checkbox per row; ticking exactly two enables
 * Compare, which lays the same weeks out as one column per angle so the pair
 * reads as a before and after rather than as two galleries. A missing angle is
 * a labelled gap, never a shifted column — half a comparison is still the
 * comparison a coach asked for.
 *
 * Selection is capped at two rather than counted after the fact: a third tick
 * drops the oldest, which is what makes the button reachable without a "clear"
 * step.
 */
export function PhotoLog({ weeks }: { weeks: ProgressPhotoWeek[] }) {
  const t = useTranslations("Studio.photos");
  const locale = useLocale();
  const [selected, setSelected] = useState<string[]>([]);
  const [comparing, setComparing] = useState(false);

  if (weeks.length === 0) {
    return <Empty title={t("logEmpty")} hint={t("logEmptyHint")} className="bg-transparent ring-0 px-1 py-2" />;
  }

  const pair = selected
    .map((weekOf) => weeks.find((week) => week.weekOf === weekOf))
    .filter((week): week is ProgressPhotoWeek => week != null)
    .sort((a, b) => a.weekOf.localeCompare(b.weekOf));

  function toggle(weekOf: string, checked: boolean) {
    setSelected((current) => {
      if (!checked) return current.filter((key) => key !== weekOf);
      if (current.includes(weekOf)) return current;
      // Third tick pushes the first one out, so the pair is always the two most
      // recently chosen weeks.
      return [...current, weekOf].slice(-2);
    });
  }

  const comparingPair = comparing && pair.length === 2;
  const [older, newer] = comparingPair ? pair : [undefined, undefined];

  return (
    <MorphHeight contentKey={comparingPair ? "compare" : "log"}>
      {comparingPair && older && newer ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className={cn(heading, "text-lg")}>
              {t("comparing", {
                from: formatDayKey(older.weekOf, locale),
                to: formatDayKey(newer.weekOf, locale),
              })}
            </h3>
            <button
              type="button"
              onClick={() => setComparing(false)}
              className={cn(buttonGhost, "px-4 py-2 text-xs")}
            >
              {t("exitCompare")}
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {ANGLES.map((angle) => (
              <section key={angle} className="space-y-2">
                <h4 className="font-sans text-sm font-semibold text-cream">{t(`angle.${angle}`)}</h4>
                <div className="grid grid-cols-2 gap-2">
                  {[older, newer].map((week) => {
                    const photo = week.photos.find((candidate) => candidate.angle === angle);
                    return (
                      <Slot
                        key={week.weekOf}
                        src={photo ? photoSrc(photo.id, "full") : null}
                        alt={t("photoAlt", {
                          angle: t(`angle.${angle}`),
                          date: formatDayKey(week.weekOf, locale),
                        })}
                        label={formatDayKey(week.weekOf, locale)}
                        emptyLabel={t("missingAngle")}
                      />
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className={cn(muted, "text-xs")}>
              {selected.length === 2 ? t("compareReady") : t("compareHint")}
            </p>
            <button
              type="button"
              disabled={pair.length !== 2}
              onClick={() => setComparing(true)}
              className={cn(buttonGhost, "px-4 py-2 text-xs")}
            >
              {t("compare")}
            </button>
          </div>

          <ul className="space-y-3">
            {weeks.map((week) => {
              const checked = selected.includes(week.weekOf);
              return (
                <li
                  key={week.weekOf}
                  className={cn(
                    "flex items-center gap-4 rounded-[1rem] p-3 ring-1 transition-colors",
                    checked ? "bg-cream/[0.06] ring-accent-ink/60" : "bg-cream/[0.02] ring-cream/10",
                  )}
                >
                  <label className="flex shrink-0 items-center gap-3">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => toggle(week.weekOf, event.target.checked)}
                      aria-label={t("selectWeek", { date: formatDayKey(week.weekOf, locale) })}
                      className="h-4 w-4 accent-caramel"
                    />
                    <span className="font-sans text-sm font-semibold text-cream tabular-nums">
                      {formatDayKey(week.weekOf, locale)}
                    </span>
                  </label>

                  <div className="ml-auto flex items-center gap-2">
                    {ANGLES.map((angle) => {
                      const photo = week.photos.find((candidate) => candidate.angle === angle);
                      if (!photo) {
                        return (
                          <span
                            key={angle}
                            title={t("missingAngle")}
                            className="flex h-16 w-12 items-center justify-center rounded-[0.6rem] bg-cream/[0.03] font-sans text-[0.6rem] text-cream/25 ring-1 ring-cream/10 ring-dashed"
                          >
                            {t(`angleShort.${angle}`)}
                          </span>
                        );
                      }
                      return (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={angle}
                          src={photoSrc(photo.id, "thumb")}
                          alt={t("photoAlt", {
                            angle: t(`angle.${angle}`),
                            date: formatDayKey(week.weekOf, locale),
                          })}
                          title={t(`angle.${angle}`)}
                          className="h-16 w-12 shrink-0 rounded-[0.6rem] object-cover ring-1 ring-cream/10"
                        />
                      );
                    })}
                    <span className={cn(chip, "hidden sm:inline-flex")}>
                      {t("angleCount", { count: week.photos.length })}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </MorphHeight>
  );
}
