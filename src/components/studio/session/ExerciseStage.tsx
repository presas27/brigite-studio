"use client";

import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useLocale, useTranslations } from "next-intl";
import type { SessionStep } from "@/lib/studio/session-queue";
import type { Locale } from "@/i18n/config";
import { cuesFor } from "@/lib/studio/cues";
import type { SetLog } from "@/lib/studio/types";
import { SetFields } from "./SetFields";
import { prescriptionOf } from "./prescription";
import type { SetValue } from "./useSessionLog";
import { Icon } from "../coach/icons";
import { heading } from "../theme";
import { cn } from "@/lib/utils";
import { youtubeEmbed, youtubeId } from "@/lib/youtube";

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
  viewToggle,
  quickActions,
  note,
  onStartRest,
  onChange,
}: {
  step: SessionStep;
  value: SetValue;
  previous?: SetLog;
  /** Which transition brought us here — decides how much of the panel moves. */
  enterAs: "set" | "exercise";
  /** Previous/next. In the bottom panel on a phone, in the column above it. */
  actions: React.ReactNode;
  /** Focus/sheet switch, on the line with the name — a phone only; the toolbar has it wide. */
  viewToggle?: React.ReactNode;
  /**
   * Swap and note as icons, on the line with the set — a phone only. A wide
   * screen has room for the labelled pair, which arrives through `note`.
   */
  quickActions?: React.ReactNode;
  /**
   * The client's note on this exercise, as a slot. Passed in rather than built
   * here because the note is per session and the stage only knows the step —
   * the player owns the assignment and the draft state.
   */
  note?: React.ReactNode;
  /** Starts the prescribed rest without leaving this exercise. Hidden when rest is 0. */
  onStartRest?: () => void;
  onChange: (value: SetValue) => void;
}) {
  const t = useTranslations("Studio.session");
  const common = useTranslations("Studio.common");
  const scope = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const detailsPanelRef = useRef<HTMLDivElement>(null);
  // The demo's height right before it collapses, so closing the details
  // restores it exactly rather than guessing from a frame that is mid-shrink.
  const mediaHeightRef = useRef(0);
  // A demo only exists when there is a video to play. Most of the library has
  // none yet, and a plate with an icon on it, at the size of the video it
  // stands in for, was the biggest thing on the screen and said nothing.
  const videoId = step.item.videoUrl ? youtubeId(step.item.videoUrl) : null;
  // With a demo the cues sit collapsed behind one bar: they are worth opening
  // for, not worth reading through on the way to the movement she can watch.
  // Without one the cues are the demo, so they start open. Keyed by the step
  // so a new exercise gets its own default — last exercise's cues have nothing
  // to say about this one — and storing the key the flag was set for, rather
  // than resetting in an effect, avoids a render with the old panel open.
  const [details, setDetails] = useState<{ key: string; open: boolean } | null>(null);
  const detailsOpen = details?.key === step.key ? details.open : videoId == null;
  const [title, setTitle] = useState<{ key: string; open: boolean } | null>(null);
  const titleExpanded = title?.key === step.key ? title.open : false;

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

  // The details panel itself: a clean grow/shrink, in or out of view either
  // way. Independent of the media effect below so a wide screen — which never
  // hides the demo — still gets the open/close animation.
  useGSAP(
    () => {
      const panel = detailsPanelRef.current;
      if (!panel) return;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (detailsOpen) {
        gsap.set(panel, { height: "auto" });
        const openHeight = panel.getBoundingClientRect().height;
        gsap.set(panel, { height: 0 });
        if (reduced) {
          gsap.set(panel, { height: openHeight, autoAlpha: 1 });
        } else {
          gsap.to(panel, {
            height: openHeight,
            autoAlpha: 1,
            duration: 0.32,
            ease: "power2.out",
            onComplete: () => gsap.set(panel, { height: "auto" }),
          });
        }
      } else if (reduced) {
        gsap.set(panel, { height: 0, autoAlpha: 0 });
      } else {
        gsap.to(panel, { height: 0, autoAlpha: 0, duration: 0.24, ease: "power2.inOut" });
      }
    },
    { scope, dependencies: [detailsOpen] },
  );

  // The demo, only below `md`: opening the details there hides it, trading
  // the video for room to read — closed, the video is what gets the emphasis.
  // A laptop's two columns have room for both, so the demo never moves there.
  //
  // The element tweened is the wrapper around the 16:9 frame, not the frame,
  // so this is a plain height tween: no flex-basis to override and no aspect
  // ratio holding the box open against it.
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(max-width: 767px)", () => {
        const media = mediaRef.current;
        if (!media) return;
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        if (detailsOpen) {
          mediaHeightRef.current = media.getBoundingClientRect().height || mediaHeightRef.current;
          if (reduced) {
            gsap.set(media, { height: 0, autoAlpha: 0 });
          } else {
            gsap.to(media, { height: 0, autoAlpha: 0, duration: 0.26, ease: "power2.inOut" });
          }
        } else {
          const restoreHeight = mediaHeightRef.current;
          if (!restoreHeight) return;
          if (reduced) {
            gsap.set(media, { height: "", autoAlpha: 1 });
          } else {
            gsap.to(media, {
              height: restoreHeight,
              autoAlpha: 1,
              duration: 0.34,
              ease: "power2.out",
              onComplete: () => gsap.set(media, { height: "" }),
            });
          }
        }
      });
      return () => mm.revert();
    },
    { scope, dependencies: [detailsOpen] },
  );

  // The session player is what a client reads mid-set, so it follows her
  // locale; cuesFor falls back to the other language rather than showing a
  // movement with no instructions.
  const cueLines = cuesFor(step.item, useLocale() as Locale)
    .split("\n")
    .filter((line) => line.trim().length > 0);
  const itemNotes = step.item.notes.trim();
  const target = prescriptionOf(step, {
    reps: common("reps"),
    meters: t("metersShort"),
    sets: common("sets"),
  });
  const targetLabel =
    step.tracking === "time" || step.tracking === "hold"
      ? t("secondsShort")
      : step.tracking === "distance"
        ? t("metersShort")
        : common("reps");
  const roundLabel = step.round != null ? t("statRound") : t("statSet");
  const roundValue =
    step.round != null
      ? `${step.round}/${step.roundCount ?? step.round}`
      : `${step.setNumber}/${step.setCount}`;

  // With no demo the stage is one column, and on a wide screen that column
  // keeps a reading width rather than stretching the fields across the frame.
  return (
    <div
      ref={scope}
      // `my-auto` and not `justify-center` on the parent: the column is sized
      // by its contents now that the demo holds a ratio instead of eating the
      // leftover height, and auto margins centre it without clipping the top
      // off anything taller than the space between the header and the panel.
      className={cn(
        "my-auto flex w-full flex-col gap-4",
        videoId
          ? "md:grid md:grid-cols-2 md:gap-10 lg:gap-12 xl:gap-16"
          : "md:mx-auto md:max-w-2xl",
      )}
    >
      {videoId && <StageMedia ref={mediaRef} videoId={videoId} title={step.item.exerciseName} />}

      <div className="contents md:flex md:flex-col md:gap-6">
        <div data-stage="identity" className="order-1 space-y-3 md:order-none">
          {/* Two lines on a phone, each carrying its own control on the right:
              the name with the view switch, then the set with the exercise's
              actions. The toolbar above is left with just the cross. A wide
              screen keeps the switch in the toolbar and the labelled actions
              under the cues, so both slots sit out there. */}
          <div className="flex items-start justify-between gap-3 md:block">
            <button
              type="button"
              onClick={() => setTitle({ key: step.key, open: !titleExpanded })}
              aria-expanded={titleExpanded}
              className="min-w-0 flex-1 text-left"
            >
              <h1
                // Anton set tight enough to look right in English drops the tilde of
                // BASTÃO into the line above it. Portuguese titles are full of Ã, Ç
                // and Ó, so the leading is set to clear a diacritic.
                className={cn(
                  heading,
                  "text-[1.35rem] leading-[1.08] md:text-[1.85rem] lg:text-[2.35rem]",
                  !titleExpanded && "line-clamp-2",
                )}
              >
                {step.item.exerciseName}
              </h1>
            </button>
            {viewToggle && <div className="shrink-0 pt-1 md:hidden">{viewToggle}</div>}
          </div>

          {/* The prescription, as three glanceable cards — set, target, tempo —
              so mid-set the numbers are what the eye hits first, not a sentence. */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-1 gap-2">
              <StatCard label={roundLabel} value={roundValue} accent />
              {target && <StatCard label={targetLabel} value={target} />}
              {step.item.tempo && <StatCard label={common("tempo")} value={step.item.tempo} />}
            </div>
            {quickActions && (
              <div className="-mr-2 flex shrink-0 items-center self-center md:hidden">{quickActions}</div>
            )}
          </div>

          {/* The slot's prescribed exercise, once she has swapped it out: part
              of what this screen is, not a footnote — she is doing this one in
              place of that one, and the report will say the same. */}
          {step.item.replaces && (
            <p className="flex items-center gap-1.5 font-sans text-xs text-accent-ink md:text-sm">
              <Icon name="swap" className="h-3.5 w-3.5 shrink-0" />
              {t("swapReplaces", { name: step.item.replaces.exerciseName })}
            </p>
          )}

          {/* A demo hosted somewhere the stage cannot play: a link, not a plate. */}
          {!videoId && step.item.videoUrl && (
            <a
              href={step.item.videoUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 font-sans text-xs text-cream/60 underline decoration-cream/25 underline-offset-4 transition-colors hover:text-cream md:text-sm"
            >
              <Icon name="play" className="h-3 w-3" />
              {t("watchDemo")}
            </a>
          )}
        </div>

        {(itemNotes || cueLines.length > 0 || note) && (
          <div
            data-stage="identity"
            className="order-2 space-y-2 md:order-3 md:space-y-3 md:border-t md:border-cream/10 md:pt-5"
          >
            {(itemNotes || cueLines.length > 0) && (
              <ExerciseDetails
                open={detailsOpen}
                onToggle={() => setDetails({ key: step.key, open: !detailsOpen })}
                panelRef={detailsPanelRef}
                notes={itemNotes}
                cueLines={cueLines}
              />
            )}
            {/* The client's own note, below the coach's cues: hers is what the
                exercise asks for, this is what actually happened. */}
            {note}
          </div>
        )}

        {/* The panel. Pinned to the bottom of a phone; on a wide screen it stops
            generating a box at all and its contents rejoin the column. */}
        <div className="fixed inset-x-0 bottom-0 z-30 space-y-3 rounded-t-[1.5rem] bg-rail px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-24px_48px_-28px_rgba(0,0,0,0.55)] ring-1 ring-cream/10 md:contents">
          <div data-stage="fields" className="md:order-2">
            <SetFields step={step} value={value} previous={previous} onChange={onChange} />
            {onStartRest && step.item.restSeconds > 0 && (
              <button
                type="button"
                onClick={onStartRest}
                className="mt-3 inline-flex items-center gap-2 rounded-full bg-cream/[0.06] px-3 py-1.5 font-sans text-xs font-medium text-cream/70 ring-1 ring-cream/10 transition-colors hover:bg-cream/10 hover:text-cream"
              >
                <Icon name="clock" className="h-3.5 w-3.5" />
                {t("startRest", { seconds: step.item.restSeconds })}
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 md:order-4 md:mt-auto md:pt-4">{actions}</div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="min-w-0 flex-1 rounded-[0.9rem] bg-cream/[0.06] px-2.5 py-2.5 text-center ring-1 ring-cream/10 md:px-3 md:py-3">
      <p className="font-sans text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-cream/45">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 font-sans text-[1.35rem] font-semibold leading-none tabular-nums md:text-[1.65rem]",
          accent ? "text-accent-ink" : "text-cream",
        )}
      >
        {value}
      </p>
    </div>
  );
}

/**
 * The demo, streamed from YouTube same as the library's own demo panel, just
 * without the coach's edit chrome — because a client mid-set should never have
 * to leave the session to see the movement. Rendered only when there is a
 * video to play; the stage decides that, not this component.
 *
 * The frame is 16:9 and nothing else, because that is the frame YouTube's
 * player renders in: given a taller box it letterboxes the video against the
 * top and leaves the rest of the plate empty, which is exactly what a demo
 * stretched to fill the leftover height of a phone looked like.
 *
 * The outer element is the one the parent animates — it carries no ratio of its
 * own, so collapsing it is a plain height tween with nothing to fight.
 */
function StageMedia({
  videoId,
  title,
  ref,
}: {
  videoId: string;
  title: string;
  ref?: React.Ref<HTMLDivElement>;
}) {
  return (
    <div
      ref={ref}
      data-stage="identity"
      className="order-3 w-full overflow-hidden md:order-none md:self-start"
    >
      <div className="relative aspect-video w-full max-h-[16vh] overflow-hidden rounded-[1rem] bg-cream/[0.06] ring-1 ring-cream/10 md:max-h-[11.5rem]">
        <iframe
          title={title}
          src={youtubeEmbed(videoId)}
          allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture; fullscreen"
          className="absolute inset-0 h-full w-full"
        />
      </div>
    </div>
  );
}

/**
 * The coach's cues, behind one bar instead of a wall of text. Closed is the
 * default: a phone leads with the exercise and its demo, not a paragraph to
 * scroll past first. `panelRef` is the growing/shrinking element the parent
 * animates — this component only ever renders it fully expanded; the parent
 * clips it to `detailsOpen` in a `useGSAP` effect so the open state is one
 * clean height tween instead of a CSS transition fighting an `auto` value.
 */
function ExerciseDetails({
  open,
  onToggle,
  panelRef,
  notes,
  cueLines,
}: {
  open: boolean;
  onToggle: () => void;
  panelRef: React.Ref<HTMLDivElement>;
  notes: string;
  cueLines: string[];
}) {
  const t = useTranslations("Studio.session");

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 rounded-[0.75rem] bg-cream/[0.05] px-4 py-2.5 text-left transition-colors hover:bg-cream/[0.08]"
      >
        <span className="font-sans text-xs font-semibold uppercase tracking-[0.08em] text-cream/55">
          {t("cues")}
        </span>
        <Icon
          name="chevron"
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-cream/45 transition-transform duration-200",
            open ? "rotate-90" : "",
          )}
        />
      </button>

      <div ref={panelRef} className="overflow-hidden" style={{ height: 0, opacity: 0 }}>
        <div className="space-y-2 pt-3 md:space-y-3">
          {notes && (
            <p className="text-xs leading-relaxed text-cream/55 md:text-base md:text-cream/75">
              {notes}
            </p>
          )}
          {cueLines.length > 0 && (
            // Side by side for as long as the width allows: three short cues
            // read as three things at a glance, where a stacked list reads as
            // a paragraph to work through.
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 md:gap-x-7 md:gap-y-3">
              {cueLines.map((line) => (
                <p
                  key={line}
                  className="max-w-[18rem] text-xs leading-snug text-cream/50 md:text-sm md:text-cream/65"
                >
                  {line}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
