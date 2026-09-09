"use client";

import { useDeferredValue, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useAuthedQuery } from "@/components/studio/useAuthedQuery";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Icon } from "@/components/studio/coach/icons";
import { ExerciseThumb } from "@/components/studio/library/ExerciseThumb";
import { MorphHeight } from "@/components/studio/MorphHeight";
import { field } from "@/components/studio/theme";
import { cn } from "@/lib/utils";
import { youtubeId } from "@/lib/youtube";

/**
 * Add an exercise to the open session without a modal.
 *
 * The sheet is the workout: this is a row that opens into a search, and a tap
 * on a name writes the movement onto the snapshot. Confirming in a dialog
 * would be a second surface for a one-tap job.
 */
export function AddExerciseComposer({
  assignmentId,
  onAddAction,
}: {
  assignmentId: string;
  onAddAction: (exerciseId: string) => Promise<void>;
}) {
  const t = useTranslations("Studio.session");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [failed, setFailed] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const searchRef = useRef<HTMLInputElement>(null);
  const search = useDeferredValue(query);
  const options = useAuthedQuery(
    api.plan.sessionExerciseOptions,
    open
      ? { assignmentId: assignmentId as Id<"assignments">, search }
      : "skip",
  );

  function add(id: string) {
    setFailed(false);
    setPendingId(id);
    startTransition(async () => {
      try {
        await onAddAction(id);
        setQuery("");
        searchRef.current?.focus();
      } catch {
        setFailed(true);
      } finally {
        setPendingId(null);
      }
    });
  }

  return (
    <div className="overflow-hidden rounded-[1.15rem] bg-cream/[0.03] ring-1 ring-cream/10">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => {
          setOpen((current) => !current);
          setFailed(false);
        }}
        className="flex w-full items-center gap-3 px-3.5 py-3.5 text-left transition-colors hover:bg-cream/[0.04]"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-butter text-on-primary">
          <Icon name="plus" className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-sans text-sm font-semibold text-cream">{t("addExercise")}</span>
          <span className="mt-0.5 block font-sans text-xs text-cream/45">{t("addExerciseHint")}</span>
        </span>
        <Icon
          name="chevron"
          className={cn(
            "h-4 w-4 shrink-0 text-cream/40 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
            open && "rotate-90",
          )}
        />
      </button>

      <MorphHeight contentKey={open ? "open" : "closed"} appear={false} fade={false}>
        {open ? (
          <div className="border-t border-cream/8 px-3 pb-3 pt-3">
            <div className="relative">
              <Icon
                name="search"
                className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-cream/40"
              />
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("addExerciseSearch")}
                aria-label={t("addExerciseSearch")}
                autoComplete="off"
                className={cn(field, "py-2.5 pl-9 text-sm")}
              />
            </div>

            {options === undefined ? (
              <p className="mt-3 font-sans text-sm text-cream/50">{t("swapLoading")}</p>
            ) : options.length === 0 ? (
              <p className="mt-3 font-sans text-sm text-cream/50">
                {search.trim() ? t("swapNoResults") : t("addExerciseEmpty")}
              </p>
            ) : (
              <ul className="mt-2 max-h-64 space-y-0.5 overflow-y-auto">
                {options.map((option) => {
                  const thumb = option.videoUrl && youtubeId(option.videoUrl) ? option.videoUrl : null;
                  const adding = pending && pendingId === option.id;
                  return (
                    <li key={option.id}>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => add(option.id)}
                        className="flex w-full items-center gap-3 rounded-[0.85rem] px-2.5 py-2 text-left transition-colors hover:bg-cream/5 disabled:opacity-60"
                      >
                        {thumb ? (
                          <ExerciseThumb videoUrl={thumb} className="h-9 w-12 shrink-0 rounded-[0.5rem]" />
                        ) : (
                          <span className="grid h-9 w-12 shrink-0 place-items-center rounded-[0.5rem] bg-cream/[0.05] ring-1 ring-cream/10">
                            <Icon name="squat" className="h-3.5 w-3.5 text-cream/40" />
                          </span>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-sans text-sm font-semibold text-cream">
                            {option.name}
                          </span>
                          {option.tags.length > 0 && (
                            <span className="mt-0.5 block truncate font-sans text-[0.65rem] text-cream/40">
                              {option.tags.slice(0, 3).join(" · ")}
                            </span>
                          )}
                        </span>
                        <Icon
                          name={adding ? "clock" : "plus"}
                          className={cn("h-3.5 w-3.5 shrink-0", adding ? "text-butter" : "text-cream/35")}
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {failed && (
              <p role="alert" className="mt-2 text-sm text-silk">
                {t("saveFailed")}
              </p>
            )}
          </div>
        ) : null}
      </MorphHeight>
    </div>
  );
}
