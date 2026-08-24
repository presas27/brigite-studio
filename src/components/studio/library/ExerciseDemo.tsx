"use client";

import { useTranslations } from "next-intl";
import { saveVideoUrlAction } from "@/app/app/coach/exercicios/actions";
import { field, muted } from "../theme";
import { InlineEditPanel } from "./InlineEditPanel";
import { youtubeEmbed, youtubeId } from "@/lib/youtube";
import { cn } from "@/lib/utils";

/**
 * The demo: a YouTube link, played in place.
 *
 * Linking rather than uploading is the whole point. A few hundred filmed
 * exercises would be a few hundred files to store, serve and transcode, and
 * they already exist on Sara's channel — the account carried over from
 * Trainerize stores her own demos as YouTube ids. So the panel holds an address,
 * not a file, and the player is an iframe.
 *
 * An uploaded clip still wins when there is one: `mediaId` is a file she put
 * here deliberately, and the link is the fallback rather than the other way
 * round.
 */
export function ExerciseDemo({
  exerciseId,
  videoUrl,
  mediaId,
}: {
  exerciseId: string;
  videoUrl: string | null;
  mediaId: string | null;
}) {
  const t = useTranslations("Studio.library");
  const errors = useTranslations("Studio.errors");
  const id = videoUrl ? youtubeId(videoUrl) : null;

  return (
    <InlineEditPanel
      label={t("uploadLabel")}
      action={saveVideoUrlAction.bind(null, exerciseId)}
      hint={t("videoHintYoutube")}
      errorText={{ url: errors("url") }}
      interactiveRead={!mediaId && !id}
      read={
        <Plate>
          {mediaId ? (
            <video
              controls
              preload="metadata"
              playsInline
              src={`/app/media/${mediaId}`}
              className="h-full w-full rounded-[0.85rem] object-cover"
            />
          ) : id ? (
            <iframe
              // `title` is what a screen reader reads instead of "iframe", and
              // the allow list is the minimum an embedded player needs.
              title={t("uploadLabel")}
              src={youtubeEmbed(id)}
              allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture; fullscreen"
              className="h-full w-full rounded-[0.85rem]"
            />
          ) : videoUrl ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
              <p className={muted}>{t("videoExternal")}</p>
              <a
                href={videoUrl}
                target="_blank"
                rel="noreferrer"
                onClick={(event) => event.stopPropagation()}
                className="font-sans text-sm text-accent-ink underline underline-offset-2"
              >
                {t("demo")}
              </a>
            </div>
          ) : (
            <p className={cn(muted, "px-6 text-center")}>{t("videoAdd")}</p>
          )}
        </Plate>
      }
      edit={
        <>
          <input
            type="url"
            name="videoUrl"
            defaultValue={videoUrl ?? ""}
            placeholder={t("videoPlaceholder")}
            aria-label={t("videoAdd")}
            className={cn(field, "text-sm")}
          />
          {/* Clearing is emptying the field, so the destructive path needs no
              button of its own — but it does need saying out loud. */}
          <p className="font-sans text-xs text-cream/40">{t("videoRemove")}</p>
        </>
      }
    />
  );
}

/** The 3:2 plate the whole library uses for a demo, filled or not. */
function Plate({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex aspect-[3/2] w-full items-center justify-center overflow-hidden rounded-[0.85rem] bg-cream/[0.06] ring-1 ring-cream/10">
      {children}
    </div>
  );
}
