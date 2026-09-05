"use client";

import { useRef } from "react";
import Link from "next/link";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useTranslations } from "next-intl";
import type { AssignmentStatus } from "@/lib/studio/types";
import { formatExtraRest } from "./extraRest";
import {
  buttonPrimary,
  eyebrow,
  eyebrowOnAccent,
  heading,
  mutedOnAccent,
  surface,
  surfaceAccent,
} from "../theme";
import { cn } from "@/lib/utils";

const RING_LENGTH = 100;

/**
 * How the session went, in one word. The end of a workout is the one moment the
 * app has an opinion, and the opinion has to be earned: a session closed to the
 * last set does not get the same line as one abandoned at the second, and
 * neither gets a line that pretends the other happened.
 */
function toneOf(status: AssignmentStatus, done: number, total: number): string {
  if (status === "skipped") return "skipped";
  if (done === 0) return "none";
  const ratio = total === 0 ? 0 : done / total;
  if (ratio >= 0.99) return "full";
  if (ratio >= 0.75) return "most";
  if (ratio >= 0.4) return "half";
  return "some";
}

/**
 * The end of the session. Finishing is the one moment in this screen worth
 * celebrating, so it — and only it — lands on gold, the same rule the rest of
 * the app follows.
 *
 * Everything here is a number she earned in the last hour: how much of the
 * session she closed, how long it took, what she moved, what it cost her. The
 * ring fills and the count climbs on arrival, because a total that lands
 * finished reads as a fact, and a total that climbs reads as something she did.
 */
export function SessionSummary({
  name,
  status,
  coached,
  doneCount,
  totalCount,
  effort,
  extraRestSeconds,
  durationMinutes,
  volumeKg,
}: {
  name: string;
  status: AssignmentStatus;
  /** Whether there is a coach to tell — the empty outcome names one only then. */
  coached: boolean;
  doneCount: number;
  totalCount: number;
  effort: number | null;
  extraRestSeconds: number;
  /** Wall-clock length of the session. `null` when it was never started. */
  durationMinutes: number | null;
  /** Reps × load, over every set that had both. */
  volumeKg: number;
}) {
  const t = useTranslations("Studio.session");
  const common = useTranslations("Studio.common");
  const scope = useRef<HTMLDivElement>(null);
  const ringRef = useRef<SVGCircleElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);

  const tone = toneOf(status, doneCount, totalCount);
  const ratio = totalCount === 0 ? 0 : Math.min(1, doneCount / totalCount);

  useGSAP(
    () => {
      const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (still) {
        ringRef.current?.setAttribute("stroke-dashoffset", String(RING_LENGTH * (1 - ratio)));
        if (countRef.current) countRef.current.textContent = String(doneCount);
        return;
      }

      const timeline = gsap.timeline();
      timeline
        .fromTo(
          '[data-end="card"]',
          { autoAlpha: 0, scale: 0.97, y: 16 },
          { autoAlpha: 1, scale: 1, y: 0, duration: 0.5, ease: "power3.out" },
        )
        .fromTo(
          ringRef.current,
          { strokeDashoffset: RING_LENGTH },
          { strokeDashoffset: RING_LENGTH * (1 - ratio), duration: 1, ease: "power2.inOut" },
          0.15,
        )
        .to(
          { value: 0 },
          {
            value: doneCount,
            duration: 1,
            ease: "power2.inOut",
            onUpdate() {
              const tween = this as unknown as { targets: () => { value: number }[] };
              const current = tween.targets()[0].value;
              if (countRef.current) countRef.current.textContent = String(Math.round(current));
            },
          },
          0.15,
        )
        .fromTo(
          '[data-end="line"]',
          { autoAlpha: 0, y: 14 },
          { autoAlpha: 1, y: 0, duration: 0.45, ease: "power2.out", stagger: 0.08 },
          0.3,
        )
        .fromTo(
          '[data-end="stat"]',
          { autoAlpha: 0, y: 12 },
          { autoAlpha: 1, y: 0, duration: 0.4, ease: "power2.out", stagger: 0.06 },
          0.55,
        )
        .fromTo(
          '[data-end="cta"]',
          { autoAlpha: 0 },
          { autoAlpha: 1, duration: 0.4, ease: "power1.out" },
          0.85,
        );

      return () => {
        timeline.kill();
      };
    },
    { scope, dependencies: [doneCount, ratio] },
  );

  const stats: { label: string; value: string }[] = [];
  if (durationMinutes != null && durationMinutes > 0) {
    stats.push({ label: t("statDuration"), value: t("minutes", { value: durationMinutes }) });
  }
  if (volumeKg > 0) {
    stats.push({
      label: t("statVolume"),
      value: `${Math.round(volumeKg).toLocaleString("pt-PT")} ${common("kg")}`,
    });
  }
  if (effort != null) {
    stats.push({
      label: common("rpe"),
      value: `${effort}/10 · ${t(`effortBand.${bandOf(effort)}`)}`,
    });
  }
  if (extraRestSeconds > 0) {
    stats.push({ label: t("statExtraRest"), value: formatExtraRest(extraRestSeconds, t) });
  }

  return (
    <div ref={scope} className="mx-auto w-full max-w-3xl">
      <div data-end="card" className={cn(surfaceAccent, "p-7 sm:p-10")}>
        <div className="flex flex-col items-center gap-7 sm:flex-row sm:gap-10">
          <span className="relative block w-[9rem] shrink-0 sm:w-[10.5rem]">
            <svg viewBox="0 0 120 120" className="w-full -rotate-90">
              <circle cx="60" cy="60" r="52" fill="none" strokeWidth="6" className="stroke-on-dark/20" />
              <circle
                ref={ringRef}
                cx="60"
                cy="60"
                r="52"
                fill="none"
                strokeWidth="6"
                strokeLinecap="round"
                pathLength={RING_LENGTH}
                strokeDasharray={RING_LENGTH}
                strokeDashoffset={RING_LENGTH}
                className="stroke-on-dark"
              />
            </svg>
            <span className="absolute inset-0 flex flex-col items-center justify-center">
              <span
                ref={countRef}
                className={cn(heading, "text-[2.75rem] leading-none text-on-dark tabular-nums")}
              >
                0
              </span>
              <span className="font-sans text-xs text-on-dark/70">
                {t("ofSets", { total: totalCount })}
              </span>
            </span>
          </span>

          <div className="min-w-0 flex-1 text-center sm:text-left">
            <p data-end="line" className={eyebrowOnAccent}>
              {name}
            </p>
            <h1
              data-end="line"
              className={cn(heading, "mt-1 text-[2rem] leading-[1.05] sm:text-[2.75rem]")}
            >
              {t(`outcome.${tone}.title`)}
            </h1>
            <p data-end="line" className={cn(mutedOnAccent, "mt-2")}>
              {tone === "none" && !coached ? t("outcome.none.lineSolo") : t(`outcome.${tone}.line`)}
            </p>
          </div>
        </div>
      </div>

      {stats.length > 0 && (
        // Wrapping rather than a fixed grid: the stats a session earns vary —
        // a plank session has no volume, an uninterrupted one has no extra
        // rest — and an empty cell in a four-up grid reads as a bug.
        <dl className={cn(surface, "mt-5 flex flex-wrap")}>
          {stats.map((stat) => (
            <div
              key={stat.label}
              data-end="stat"
              className="min-w-[9rem] flex-1 border-l border-cream/10 px-5 py-4 first:border-l-0"
            >
              <dt className={eyebrow}>{stat.label}</dt>
              <dd className="mt-1 font-sans text-lg font-semibold text-cream">{stat.value}</dd>
            </div>
          ))}
        </dl>
      )}

      <div data-end="cta" className="mt-8 flex justify-center">
        <Link href="/app/aluno" className={buttonPrimary}>
          {t("backToApp")}
        </Link>
      </div>
    </div>
  );
}

/** 1-3 light, 4-6 moderate, 7-8 hard, 9-10 everything there was. */
function bandOf(value: number): "light" | "moderate" | "hard" | "max" {
  if (value <= 3) return "light";
  if (value <= 6) return "moderate";
  if (value <= 8) return "hard";
  return "max";
}
