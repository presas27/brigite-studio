"use client";

import { useLayoutEffect, useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/studio/coach/icons";
import { cn } from "@/lib/utils";

export type SessionView = "focus" | "sheet";

/**
 * Two products, one session: the focused set-by-set player, or the Hevy-style
 * sheet with every set on screen. The pill slides under the choice so the
 * change reads as a move, not a restyle.
 */
export function SessionViewToggle({
  value,
  onChange,
}: {
  value: SessionView;
  onChange: (view: SessionView) => void;
}) {
  const t = useTranslations("Studio.session");
  const root = useRef<HTMLDivElement>(null);
  const focusRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLButtonElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);

  function slidePill(immediate: boolean) {
    const pill = pillRef.current;
    const target = value === "focus" ? focusRef.current : sheetRef.current;
    const parent = root.current;
    if (!pill || !target || !parent) return;
    const parentBox = parent.getBoundingClientRect();
    const box = target.getBoundingClientRect();
    const next = { x: box.left - parentBox.left, width: box.width };
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (immediate || reduced) {
      gsap.set(pill, next);
      return;
    }
    gsap.to(pill, { ...next, duration: 0.32, ease: "power2.out" });
  }

  useLayoutEffect(() => {
    slidePill(true);
  }, []);

  useGSAP(
    () => {
      slidePill(false);
    },
    { scope: root, dependencies: [value] },
  );

  return (
    <div
      ref={root}
      role="group"
      aria-label={t("viewToggle")}
      className="relative isolate flex shrink-0 rounded-full bg-cream/[0.06] p-0.5 ring-1 ring-cream/10"
    >
      <span
        ref={pillRef}
        aria-hidden
        className="pointer-events-none absolute inset-y-0.5 left-0 rounded-full bg-cream/12 ring-1 ring-cream/15"
      />
      <button
        ref={focusRef}
        type="button"
        aria-pressed={value === "focus"}
        onClick={() => onChange("focus")}
        className={cn(
          "relative z-10 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 font-sans text-[0.65rem] font-semibold uppercase tracking-[0.06em] transition-colors",
          value === "focus" ? "text-cream" : "text-cream/45 hover:text-cream/70",
        )}
      >
        <Icon name="video" className="h-3.5 w-3.5" />
        {t("viewFocus")}
      </button>
      <button
        ref={sheetRef}
        type="button"
        aria-pressed={value === "sheet"}
        onClick={() => onChange("sheet")}
        className={cn(
          "relative z-10 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 font-sans text-[0.65rem] font-semibold uppercase tracking-[0.06em] transition-colors",
          value === "sheet" ? "text-cream" : "text-cream/45 hover:text-cream/70",
        )}
      >
        <Icon name="list" className="h-3.5 w-3.5" />
        {t("viewSheet")}
      </button>
    </div>
  );
}
