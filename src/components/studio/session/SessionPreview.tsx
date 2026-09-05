"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useTranslations } from "next-intl";
import type { SessionStep } from "@/lib/studio/session-queue";
import { isRestItem } from "@/lib/studio/types";
import { ExerciseThumb } from "@/components/studio/library/ExerciseThumb";
import { Icon } from "@/components/studio/coach/icons";
import { buttonPrimary, eyebrow, heading } from "@/components/studio/theme";
import { cn } from "@/lib/utils";
import { youtubeId } from "@/lib/youtube";
import { setsOf } from "./prescription";

type Row = {
  itemId: string;
  name: string;
  /** A playable demo, when the exercise has one. Most do not yet. */
  videoUrl: string | null;
  /** "3 × 8 reps · rest 60s" */
  line: string;
  /** A rest the coach placed between exercises: a pause in the list, not work. */
  rest: boolean;
};

/**
 * The workout as a map, before anything is logged.
 *
 * Opening a session used to start the clock. That left no moment to read the
 * work, gather the kit, or notice a machine that is taken. This screen is that
 * moment: every exercise with its sets and its rest — and one button that
 * means "now".
 *
 * The demo thumbnail trails the row and only when there is one to show. Most
 * of the library has no video yet, and a plate standing in for one on every
 * row made the list a column of empty boxes with the exercises beside them.
 */
export function SessionPreview({
  title,
  note,
  steps,
  onStart,
}: {
  title: string;
  note: string;
  steps: SessionStep[];
  onStart: () => void;
}) {
  const t = useTranslations("Studio.session");
  const common = useTranslations("Studio.common");
  const workoutsT = useTranslations("Studio.workouts");
  const scope = useRef<HTMLDivElement>(null);

  const labels = { reps: common("reps"), meters: t("metersShort"), sets: common("sets") };
  const rest = common("rest").toLowerCase();
  const blocks: { id: string; label: string; kind: string; rows: Row[] }[] = [];
  for (const step of steps) {
    let block = blocks.find((entry) => entry.id === step.blockId);
    if (!block) {
      block = { id: step.blockId, label: step.blockLabel, kind: step.blockKind, rows: [] };
      blocks.push(block);
    }
    if (block.rows.some((row) => row.itemId === step.itemId)) continue;
    const restItem = isRestItem(step.item);
    block.rows.push({
      itemId: step.itemId,
      name: step.item.exerciseName,
      videoUrl: step.item.videoUrl && youtubeId(step.item.videoUrl) ? step.item.videoUrl : null,
      line: restItem
        ? `${step.item.seconds ?? 0}s`
        : [setsOf(step, labels), step.item.restSeconds > 0 ? `${rest} ${step.item.restSeconds}s` : null]
            .filter(Boolean)
            .join(" · "),
      rest: restItem,
    });
  }

  useGSAP(
    () => {
      gsap.matchMedia().add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          "[data-preview-row]",
          { autoAlpha: 0, y: 10 },
          { autoAlpha: 1, y: 0, duration: 0.32, stagger: 0.04, ease: "power2.out" },
        );
      });
    },
    { scope },
  );

  return (
    <div ref={scope} className="mx-auto flex w-full max-w-lg flex-col gap-6 pb-8">
      <div className="space-y-2">
        <p className={eyebrow}>{t("previewEyebrow")}</p>
        <h1 className={cn(heading, "text-[1.75rem] leading-[1.05] sm:text-[2.25rem]")}>{title}</h1>
      </div>

      {note && (
        <div className="rounded-[1rem] bg-cream/5 p-4 ring-1 ring-cream/10">
          <p className={eyebrow}>{t("coachNote")}</p>
          <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-cream/80">{note}</p>
        </div>
      )}

      {blocks.map((block) => (
        <section key={block.id} className="space-y-2">
          <p className={eyebrow}>{block.label || workoutsT(`blockKind.${block.kind}`)}</p>
          <ul className="space-y-1.5">
            {block.rows.map((row) =>
              row.rest ? (
                <li
                  key={row.itemId}
                  data-preview-row
                  className="flex items-center gap-2 px-4 py-1 font-sans text-xs text-cream/50"
                >
                  <Icon name="clock" className="h-3.5 w-3.5 shrink-0 text-cream/40" />
                  {row.name} · {row.line}
                </li>
              ) : (
                <li
                  key={row.itemId}
                  data-preview-row
                  className="flex min-h-[3.5rem] items-center gap-3 rounded-[1rem] bg-cream/[0.04] px-4 py-2 ring-1 ring-cream/10"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-sans text-sm font-semibold text-cream">{row.name}</span>
                    <span className="mt-0.5 block font-sans text-xs text-cream/50">{row.line}</span>
                  </span>
                  {row.videoUrl && (
                    <ExerciseThumb videoUrl={row.videoUrl} className="h-10 w-[3.5rem] shrink-0 rounded-[0.6rem]" />
                  )}
                </li>
              ),
            )}
          </ul>
        </section>
      ))}

      <button type="button" onClick={onStart} className={cn(buttonPrimary, "h-14 w-full text-base")}>
        {t("startNow")}
        <Icon name="play" className="h-4 w-4" />
      </button>
    </div>
  );
}
