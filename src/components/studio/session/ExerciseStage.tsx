"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useLocale, useTranslations } from "next-intl";
import type { SessionStep } from "@/lib/studio/session-queue";
import type { Locale } from "@/i18n/config";
import { cuesFor } from "@/lib/studio/cues";
import type { SetLog } from "@/lib/studio/types";
import { SetFields } from "./SetFields";
import type { SetValue } from "./useSessionLog";
import { Icon } from "../coach/icons";
import { heading } from "../theme";
import { cn } from "@/lib/utils";

/**
 * The one screen the client looks at while she trains, in two shapes.
 *
 * On a phone it is a player: what she is doing fills the screen, and everything
 * she touches lives in a panel pinned to the bottom, under her thumb — the
 * numbers, the clock, the progress, the two controls. On a tablet or a laptop
 * there is room to put the demo beside the numbers instead, so the same pieces
 * lay out in two columns and the panel dissolves back into the column.
 *
 * That is what the `contents` switches below are doing: one DOM, ordered one way
 * on a phone and another on a wide screen, so nothing — least of all the fields
 * or a running timer — is ever mounted twice.
 *
 * The motion carries meaning. A new set of the same exercise moves only the
 * counter and the fields — the name and the demo stay exactly where they were,
 * because nothing about them changed. A new exercise moves the whole panel in.
 */
export function ExerciseStage({
  step,
  value,
  previous,
  enterAs,
  actions,
  progress,
  onOpenList,
  onChange,
}: {
  step: SessionStep;
  value: SetValue;
  previous?: SetLog;
  /** Which transition brought us here — decides how much of the panel moves. */
  enterAs: "set" | "exercise";
  /** Previous/next. In the bottom panel on a phone, in the column above it. */
  actions: React.ReactNode;
  /** The session's progress, shown in the panel where the header has none. */
  progress: React.ReactNode;
  onOpenList: () => void;
  onChange: (value: SetValue) => void;
}) {
  const t = useTranslations("Studio.session");
  const common = useTranslations("Studio.common");
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        if (enterAs === "exercise") {
          gsap.fromTo(
            '[data-stage="identity"]',
            { autoAlpha: 0, y: 24 },
            { autoAlpha: 1, y: 0, duration: 0.4, ease: "power2.out", stagger: 0.06 },
          );
        }
        // The fields move on every step: they are the thing being replaced.
        gsap.fromTo(
          '[data-stage="fields"]',
          { autoAlpha: 0, y: 12 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.25,
            ease: "power2.out",
            delay: enterAs === "exercise" ? 0.14 : 0,
          },
        );
      });
      return () => mm.revert();
    },
    { scope, dependencies: [step.key, enterAs] },
  );

  // The session player is what a client reads mid-set, so it follows her
  // locale; cuesFor falls back to the other language rather than showing a
  // movement with no instructions.
  const cueLines = cuesFor(step.item, useLocale() as Locale)
    .split("\n")
    .filter((line) => line.trim().length > 0);
  const itemNotes = step.item.notes.trim();
  const target =
    step.tracking === "time" || step.tracking === "hold"
      ? step.item.seconds != null
        ? `${step.item.seconds}s`
        : null
      : step.item.reps
        ? `${step.item.reps} ${step.tracking === "distance" ? t("metersShort") : common("reps")}`
        : null;

  return (
    <div
      ref={scope}
      className="flex w-full flex-1 flex-col gap-5 md:grid md:flex-none md:grid-cols-2 md:gap-10 lg:gap-12 xl:gap-16"
    >
      <StageMedia step={step} />

      <div className="contents md:flex md:flex-col md:gap-6">
        <div data-stage="identity" className="order-1 space-y-2 md:order-none">
          <h1
            // Anton set tight enough to look right in English drops the tilde of
            // BASTÃO into the line above it. Portuguese titles are full of Ã, Ç
            // and Ó, so the leading is set to clear a diacritic.
            className={cn(
              heading,
              "text-[1.75rem] leading-[1.05] sm:text-[2.25rem] md:text-[2.25rem] lg:text-[3.25rem] xl:text-[3.75rem]",
            )}
          >
            {step.item.exerciseName}
          </h1>

          {/* One line, one truth: which set she is on and what it asks for.
              The dots keep it a sentence instead of three floating chips. */}
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 font-sans text-sm md:text-base">
            <span className="font-semibold text-accent-ink">
              {step.round != null
                ? t("roundShort", { round: step.round, total: step.roundCount ?? step.round })
                : t("setShort", { set: step.setNumber, total: step.setCount })}
            </span>
            {target && (
              <span className="text-cream/60">
                <span aria-hidden className="pr-2 text-cream/30">·</span>
                {target}
              </span>
            )}
            {step.item.tempo && (
              <span className="text-cream/60">
                <span aria-hidden className="pr-2 text-cream/30">·</span>
                {common("tempo")} {step.item.tempo}
              </span>
            )}
          </div>
        </div>

        {(itemNotes || cueLines.length > 0) && (
          <div
            data-stage="identity"
            className="order-2 space-y-2 md:order-3 md:space-y-3 md:border-t md:border-cream/10 md:pt-5"
          >
            {itemNotes && (
              <p className="text-xs leading-relaxed text-cream/55 md:text-base md:text-cream/75">
                {itemNotes}
              </p>
            )}
            {cueLines.length > 0 && (
              // Side by side for as long as the width allows: three short cues
              // read as three things at a glance, where a stacked list reads as
              // a paragraph to work through.
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 md:gap-x-7 md:gap-y-3">
                {cueLines.map((line, index) => (
                  <p
                    key={index}
                    className="max-w-[18rem] text-xs leading-snug text-cream/50 md:text-sm md:text-cream/65"
                  >
                    {line}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* The panel. Pinned to the bottom of a phone; on a wide screen it stops
            generating a box at all and its contents rejoin the column. */}
        <div className="fixed inset-x-0 bottom-0 z-30 space-y-3 rounded-t-[1.5rem] bg-rail px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-24px_48px_-28px_rgba(0,0,0,0.55)] ring-1 ring-cream/10 md:contents">
          <div data-stage="fields" className="md:order-2">
            <SetFields step={step} value={value} previous={previous} onChange={onChange} />
          </div>

          {/* The line and the way into the list, on one row: the map of the
              session and the button that opens it belong to each other. */}
          <div className="flex items-center gap-3 md:hidden">
            <div className="min-w-0 flex-1">{progress}</div>
            <button
              type="button"
              onClick={onOpenList}
              aria-label={t("openList")}
              className="-m-2 shrink-0 p-2 text-cream/50 transition-colors hover:text-cream"
            >
              <Icon name="list" className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-3 md:order-4 md:mt-auto md:pt-4">{actions}</div>
        </div>
      </div>
    </div>
  );
}

/**
 * The demo, at the size a demo is worth. Keyed on the exercise so it survives a
 * change of set untouched — restarting the clip every time she finishes a set
 * would be the loudest thing on the screen. With no clip to show it stays a
 * quiet plate rather than collapsing: it is the slot the clip will fill, and
 * the two columns keep their shape whether or not the exercise has one yet.
 */
function StageMedia({ step }: { step: SessionStep }) {
  const t = useTranslations("Studio.session");
  const frame =
    "relative order-3 min-h-[10rem] w-full flex-1 overflow-hidden rounded-[1.5rem] bg-cream/[0.06] ring-1 ring-cream/10 md:order-none md:aspect-square md:min-h-0 md:flex-none md:self-start";

  if (step.item.mediaId) {
    return (
      <video
        key={step.item.mediaId}
        data-stage="identity"
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        className={cn(frame, "object-cover")}
        src={`/app/media/${step.item.mediaId}`}
      />
    );
  }

  return (
    <div data-stage="identity" className={cn(frame, "grid place-items-center")}>
      <Icon name="dumbbell" className="h-14 w-14 text-cream/10 md:h-16 md:w-16" />
      {step.item.videoUrl && (
        <a
          href={step.item.videoUrl}
          target="_blank"
          rel="noreferrer"
          className="absolute bottom-4 left-4 font-sans text-xs text-cream/60 underline decoration-cream/25 underline-offset-4 transition-colors hover:text-cream"
        >
          {t("watchDemo")}
        </a>
      )}
    </div>
  );
}
