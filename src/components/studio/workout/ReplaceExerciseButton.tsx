"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { replacePlanExerciseAction } from "@/app/app/coach/treinos/actions";
import { Icon } from "@/components/studio/coach/icons";
import { ExerciseThumb } from "@/components/studio/library/ExerciseThumb";
import { Modal } from "@/components/studio/Modal";
import {
  ReplaceScopeDialog,
  type ReplaceScope,
} from "@/components/studio/session/ReplaceScopeDialog";
import { buttonGhost, buttonQuiet, eyebrow, field } from "@/components/studio/theme";
import type { Exercise } from "@/lib/studio/types";
import { cn } from "@/lib/utils";
import { youtubeId } from "@/lib/youtube";

type Digest = Pick<Exercise, "id" | "name" | "videoUrl" | "tags">;

const SUGGESTIONS = 24;

/**
 * Replace the movement on a client's plan copy. Opens the library (same-tag
 * movements first), then the today/forever confirmation — the same pair the
 * session player uses, so the gesture is one thing across the app.
 */
export function ReplaceExerciseButton({
  workoutId,
  itemId,
  exerciseId,
  exerciseName,
  library,
}: {
  workoutId: string;
  itemId: string;
  exerciseId: string;
  exerciseName: string;
  library: Digest[];
}) {
  const t = useTranslations("Studio.session");
  const common = useTranslations("Studio.common");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<Digest | null>(null);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!pickerOpen) return;
    if (window.matchMedia("(pointer: fine)").matches) searchRef.current?.focus();
  }, [pickerOpen]);

  const results = useMemo(
    () => preferSameCategory(library, exerciseId, query),
    [library, exerciseId, query],
  );

  function openPicker() {
    setQuery("");
    setPicked(null);
    setFailed(false);
    setPickerOpen(true);
  }

  function confirm(scope: ReplaceScope) {
    if (!picked) return;
    setFailed(false);
    startTransition(async () => {
      try {
        await replacePlanExerciseAction({
          workoutId,
          itemId,
          exerciseId: picked.id,
          exerciseName: picked.name,
          scope,
        });
        setPicked(null);
      } catch {
        setFailed(true);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={openPicker}
        aria-label={t("replaceExercise")}
        title={t("replaceExercise")}
        className={cn(buttonQuiet, "shrink-0 text-accent-ink hover:text-accent-ink")}
      >
        <Icon name="swap" className="h-4 w-4" />
      </button>

      <Modal
        open={pickerOpen}
        onCloseAction={() => setPickerOpen(false)}
        title={t("replaceExercise")}
        lead={exerciseName}
        width="40rem"
      >
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
            placeholder={t("swapSearch")}
            aria-label={t("swapSearch")}
            className={cn(field, "py-2.5 pl-9 text-sm")}
          />
        </div>
        {results.length === 0 ? (
          <p className="mt-6 font-sans text-sm text-cream/55">{t("swapNoResults")}</p>
        ) : (
          <>
            {!query.trim() && <p className={cn(eyebrow, "mt-4")}>{t("swapSuggested")}</p>}
            <ul
              role="listbox"
              aria-label={t("swapSearch")}
              className="mt-3 max-h-[44vh] space-y-1 overflow-y-auto pr-1"
            >
              {results.map((option) => {
                const thumb = option.videoUrl && youtubeId(option.videoUrl) ? option.videoUrl : null;
                return (
                  <li key={option.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={false}
                      onClick={() => {
                        setPicked(option);
                        setPickerOpen(false);
                      }}
                      className="flex w-full items-center gap-3 rounded-[0.85rem] px-3 py-2.5 text-left ring-1 ring-transparent transition hover:bg-cream/5 hover:ring-cream/10"
                    >
                      {thumb && (
                        <ExerciseThumb videoUrl={thumb} className="h-10 w-14 shrink-0 rounded-[0.6rem]" />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block font-sans text-sm font-semibold leading-snug text-cream">
                          {option.name}
                        </span>
                        {option.tags.length > 0 && (
                          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-sans text-xs text-cream/45">
                            {option.tags.slice(0, 3).map((tag) => (
                              <span key={tag}>{tag}</span>
                            ))}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
        <div className="mt-5 flex justify-end border-t border-cream/10 pt-4">
          <button type="button" onClick={() => setPickerOpen(false)} className={cn(buttonGhost, "px-4 py-2 text-sm")}>
            {common("cancel")}
          </button>
        </div>
      </Modal>

      <ReplaceScopeDialog
        key={picked?.id ?? "closed"}
        open={picked !== null}
        fromName={exerciseName}
        toName={picked?.name ?? ""}
        pending={pending}
        failed={failed}
        onConfirmAction={confirm}
        onCloseAction={() => {
          if (!pending) setPicked(null);
        }}
      />
    </>
  );
}

/** Same-tag movements first when she has not typed; the whole library once she has. */
function preferSameCategory(library: Digest[], currentId: string, query: string): Digest[] {
  const others = library.filter((exercise) => exercise.id !== currentId);
  const needle = query.trim().toLowerCase();
  if (needle) {
    return others.filter(
      (exercise) =>
        exercise.name.toLowerCase().includes(needle) ||
        exercise.tags.some((tag) => tag.toLowerCase().includes(needle)),
    );
  }
  const current = library.find((exercise) => exercise.id === currentId);
  const tags = new Set(current?.tags ?? []);
  if (tags.size === 0) return others.slice(0, SUGGESTIONS);
  const matched = others.filter((exercise) => exercise.tags.some((tag) => tags.has(tag)));
  return (matched.length > 0 ? matched : others).slice(0, SUGGESTIONS);
}
