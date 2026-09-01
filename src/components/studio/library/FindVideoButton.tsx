"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  findVideoAction,
  type VideoSearchState,
} from "@/app/app/coach/exercicios/actions";
import { Toast } from "@/components/studio/Toast";
import { Icon } from "@/components/studio/coach/icons";
import { buttonQuiet } from "@/components/studio/theme";
import { cn } from "@/lib/utils";

/**
 * "Find on YouTube": fills the demo link in from a search on the exercise's name.
 *
 * It exists because the library arrived from Trainerize with two thousand
 * movements and no videos, and pasting two thousand links by hand is not work
 * anybody should do. What it produces is a *suggestion* — the search cannot tell
 * a Bulgarian split squat from a badly filmed rear-foot-elevated lunge — so the
 * toast names the video it linked rather than only saying it worked, and the
 * coach corrects the wrong ones as she meets them while building plans.
 *
 * One press spends 100 units of a 10,000-a-day YouTube quota, which is why this
 * is a button and not something that runs when an exercise is saved.
 */
export function FindVideoButton({ exerciseId }: { exerciseId: string }) {
  const t = useTranslations("Studio.library");
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);

  function message(result: VideoSearchState): string | null {
    if (result.status === "found") return `${t("videoFound")}: ${result.title}`;
    if (result.status === "notFound") return t("videoNotFound");
    if (result.status === "failed") return t("videoSearchFailed");
    return null;
  }

  return (
    <>
      <button
        type="button"
        disabled={pending}
        title={t("findVideoHint")}
        onClick={() =>
          startTransition(async () => {
            setToast(message(await findVideoAction(exerciseId)));
          })
        }
        className={cn(buttonQuiet, "gap-1.5")}
      >
        <Icon name={pending ? "history" : "search"} className="h-3.5 w-3.5" />
        {pending ? t("findingVideo") : t("findVideo")}
      </button>

      <Toast message={toast} onDoneAction={() => setToast(null)} duration={4200} />
    </>
  );
}
