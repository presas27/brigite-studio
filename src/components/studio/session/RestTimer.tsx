"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { buttonGhost, eyebrow } from "../theme";
import { cn } from "@/lib/utils";

/**
 * Countdown between sets. Purely visual, nothing persists — a dropped
 * connection or a page reload just loses the running clock, which is fine:
 * unlike the set log itself, a rest timer has no value once it's gone.
 */
export function RestTimer({ seconds }: { seconds: number }) {
  const t = useTranslations("Studio.session");
  const [remaining, setRemaining] = useState<number | null>(null);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    return () => clearInterval(intervalRef.current ?? undefined);
  }, []);

  if (seconds <= 0) return null;

  function start() {
    clearInterval(intervalRef.current ?? undefined);
    setRemaining(seconds);
    intervalRef.current = window.setInterval(() => {
      setRemaining((current) => {
        if (current == null || current <= 1) {
          clearInterval(intervalRef.current ?? undefined);
          return null;
        }
        return current - 1;
      });
    }, 1000);
  }

  function stop() {
    clearInterval(intervalRef.current ?? undefined);
    setRemaining(null);
  }

  const clock =
    remaining != null
      ? `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`
      : null;

  return (
    <div className="flex items-center gap-2">
      <span className={eyebrow}>{t("restTimer")}</span>
      {clock == null ? (
        <button type="button" onClick={start} className={cn(buttonGhost, "px-4 py-2 text-xs")}>
          {t("startRest")} · {seconds}s
        </button>
      ) : (
        <button type="button" onClick={stop} className={cn(buttonGhost, "px-4 py-2 text-xs font-mono")}>
          {t("stopRest")} · {clock}
        </button>
      )}
    </div>
  );
}
