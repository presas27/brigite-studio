"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { Submission } from "@/lib/studio/types";
import { chip, chipAccent, muted, surface } from "../theme";
import { formatClipTime } from "./time";

/**
 * One submitted clip from the client's own list: the video, Sara's verdict
 * and reply once reviewed, and her timestamped comments — each one seeks the
 * player, so "at 0:42" is never just a number to go hunt for by hand.
 */
export function SubmissionCard({ submission }: { submission: Submission }) {
  const t = useTranslations("Studio.videos");
  const videoRef = useRef<HTMLVideoElement>(null);

  function seek(tMs: number) {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = tMs / 1000;
    video.play().catch(() => {
      /* autoplay after a user click can be blocked; the seek itself still lands */
    });
  }

  const sortedComments = [...submission.comments].sort((a, b) => a.tMs - b.tMs);

  return (
    <article className={cn(surface, "space-y-3 p-5")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-sans text-sm font-semibold text-cream">
          {submission.exerciseName ?? t("title")}
        </p>
        {submission.status === "reviewed" && submission.verdict ? (
          <span className={chipAccent}>{t(`verdict.${submission.verdict}`)}</span>
        ) : (
          <span className={chip}>{t("awaitingReview")}</span>
        )}
      </div>

      {submission.mediaId ? (
        <video
          ref={videoRef}
          controls
          playsInline
          preload="metadata"
          className="w-full rounded-[1rem] bg-black"
        >
          <source src={`/app/media/${submission.mediaId}`} />
          {t("unsupported")}
        </video>
      ) : submission.videoUrl ? (
        <a
          href={submission.videoUrl}
          target="_blank"
          rel="noreferrer"
          className="block truncate font-sans text-sm text-accent-ink underline decoration-caramel/40 underline-offset-2"
        >
          {submission.videoUrl}
        </a>
      ) : null}

      {submission.note && <p className={muted}>{submission.note}</p>}

      {submission.status === "reviewed" && submission.reply && (
        <p className="font-sans text-sm text-cream/85">{submission.reply}</p>
      )}

      {sortedComments.length > 0 && (
        <ul className="space-y-1.5 border-t border-cream/10 pt-3">
          {sortedComments.map((comment) => (
            <li key={comment.id} className="flex flex-wrap items-baseline gap-x-2">
              <button
                type="button"
                onClick={() => seek(comment.tMs)}
                disabled={!submission.mediaId}
                className="font-sans tabular-nums text-xs text-accent-ink underline decoration-caramel/40 underline-offset-2 disabled:text-cream/45 disabled:no-underline"
              >
                {t("atTime", { time: formatClipTime(comment.tMs) })}
              </button>
              <span className="font-sans text-sm text-cream/75">{comment.body}</span>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
