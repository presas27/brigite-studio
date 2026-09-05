"use client";

import { useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useTranslations } from "next-intl";
import type { SessionStep } from "@/lib/studio/session-queue";
import { CountdownRing } from "./CountdownRing";
import { buttonGhost } from "../theme";
import { cn } from "@/lib/utils";

/**
 * The rest between two sets, given the whole screen.
 *
 * The clock is anchored to a wall-clock deadline rather than counted down tick
 * by tick, because a phone locked and pocketed between sets stops firing
 * intervals — and a rest timer that quietly pauses when you put the phone down
 * is worse than no timer at all.
 *
 * What comes next is spelled out here, so a change of exercise is already
 * understood by the time it appears. The player mounts one of these per rest,
 * which is what lets all the clock state live here and stay simple.
 */
export function RestScreen({
  seconds,
  next,
  nextIsNewExercise,
  onDone,
  onExtend,
  actions,
}: {
  seconds: number;
  /** The step this rest leads into. `null` when the session ends after it. */
  next: SessionStep | null;
  /** Whether `next` belongs to a different exercise than the set just finished. */
  nextIsNewExercise: boolean;
  onDone: () => void;
  /**
   * Called when she adds time to this rest. The player totals it for the
   * session and sends it with the log — how much longer she needed between
   * sets is Sara's clearest signal that a session was pitched too hard.
   */
  onExtend: (seconds: number) => void;
  /** Skip, rendered in the composition on wide screens. */
  actions: React.ReactNode;
}) {
  const t = useTranslations("Studio.session");
  const scope = useRef<HTMLDivElement>(null);
  const [remaining, setRemaining] = useState(seconds);
  const [total, setTotal] = useState(() => Math.max(1, seconds));
  const deadlineRef = useRef(0);
  const doneRef = useRef(onDone);

  useEffect(() => {
    doneRef.current = onDone;
  });

  useEffect(() => {
    // The clock starts when the screen appears, not when it rendered, so the
    // deadline is stamped here rather than in a ref initialiser.
    deadlineRef.current = Date.now() + seconds * 1000;
    const interval = window.setInterval(() => {
      const left = Math.ceil((deadlineRef.current - Date.now()) / 1000);
      if (left > 0) {
        setRemaining(left);
        return;
      }
      window.clearInterval(interval);
      setRemaining(0);
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate([90, 60, 90]);
        } catch {
          // Some browsers expose `vibrate` and then refuse to run it outside a
          // user gesture. Nothing here depends on the buzz.
        }
      }
      doneRef.current();
    }, 200);
    return () => window.clearInterval(interval);
    // One mount per rest — the player keys this component — so the clock is
    // started once and never restarted underneath itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function extend(extra: number) {
    deadlineRef.current += extra * 1000;
    setTotal((current) => current + extra);
    setRemaining(Math.ceil((deadlineRef.current - Date.now()) / 1000));
    onExtend(extra);
  }

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          scope.current,
          { autoAlpha: 0, scale: 0.98 },
          { autoAlpha: 1, scale: 1, duration: 0.3, ease: "power2.out" },
        );
      });
      return () => mm.revert();
    },
    { scope },
  );


  return (
    <div ref={scope} className="mx-auto flex w-full max-w-md flex-col items-center gap-7 text-center lg:gap-9">
      <p className="font-sans text-sm text-cream/55">{t("restTimer")}</p>

      <CountdownRing
        remaining={remaining}
        total={total}
        className="w-full max-w-[14rem] lg:max-w-[18rem]"
        textClassName="text-[2.75rem] lg:text-[3.5rem]"
      />

      {next && (
        <div className="space-y-1">
          <p className="font-sans text-xs text-cream/45">
            {nextIsNewExercise ? t("nextExercise") : t("nextSet")}
          </p>
          <p className="font-sans text-base font-semibold text-cream lg:text-lg">
            {nextIsNewExercise
              ? next.item.exerciseName
              : next.round != null
                ? t("roundOf", { round: next.round, total: next.roundCount ?? next.round })
                : t("setOf", { set: next.setNumber, total: next.setCount })}
          </p>
          {nextIsNewExercise && (
            <p className="font-sans text-xs text-cream/50">
              {next.round != null
                ? t("roundOf", { round: next.round, total: next.roundCount ?? next.round })
                : t("setOf", { set: next.setNumber, total: next.setCount })}
            </p>
          )}
        </div>
      )}

      <div className="flex flex-col items-center gap-4">
        <button type="button" onClick={() => extend(30)} className={cn(buttonGhost, "px-5 py-2.5 text-xs")}>
          {t("addRest", { seconds: 30 })}
        </button>
        <div className="hidden items-center gap-3 md:flex">{actions}</div>
      </div>
    </div>
  );
}
