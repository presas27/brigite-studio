"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { addComment, deleteComment, finish } from "@/app/app/coach/videos/actions";
import { cn } from "@/lib/utils";
import type { Submission, Verdict } from "@/lib/studio/types";
import { buttonGhost, buttonPrimary, chip, chipAccent, eyebrow, field, muted, surface } from "../theme";
import { formatClipTime } from "./time";

const RATES = [0.25, 0.5, 1] as const;
/** One frame at a conservative 30fps — good enough for stepping through a handstand. */
const FRAME_SECONDS = 1 / 30;
const VERDICTS: Verdict[] = ["ok", "adjust", "regress"];

/**
 * The annotated review: pause, step frames, slow the clip down, pin a comment
 * to the exact instant, pick a verdict. Props refresh from the server after
 * every action (`revalidatePath` in the actions module), so this component
 * carries no comment/verdict state of its own beyond the in-progress inputs —
 * `submission` is always the source of truth.
 */
export function ReviewPlayer({ submission }: { submission: Submission }) {
  const t = useTranslations("Studio.videos");
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentMs, setCurrentMs] = useState(0);
  const [rate, setRate] = useState<number>(1);
  const [commentBody, setCommentBody] = useState("");
  const [replyBody, setReplyBody] = useState(submission.reply);
  const [verdict, setVerdict] = useState<Verdict | null>(submission.verdict);
  const [pending, startTransition] = useTransition();

  // An external link cannot be scrubbed or read back for `currentTime`, so
  // there is nothing to pin a millisecond offset to.
  const pinnable = submission.mediaId != null;
  const isDone = submission.status === "reviewed";

  // `timeupdate` only fires while the clip is actually playing. A coach
  // reviewing technique scrubs frame by frame with the video PAUSED, where the
  // relevant events are `seeked` and `loadedmetadata` — without them the
  // readout stays at 0:00.0 and every pin lands on the first frame.
  function syncTime() {
    const video = videoRef.current;
    if (video) setCurrentMs(Math.round(video.currentTime * 1000));
  }

  function seek(tMs: number) {
    const video = videoRef.current;
    if (video) video.currentTime = tMs / 1000;
  }

  function stepFrame(direction: 1 | -1) {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    video.currentTime = Math.max(0, video.currentTime + direction * FRAME_SECONDS);
  }

  function setPlaybackRate(next: number) {
    setRate(next);
    if (videoRef.current) videoRef.current.playbackRate = next;
  }

  function handleAddComment() {
    const body = commentBody.trim();
    if (!body) return;
    // Read the element, not the state: a pin must land on the frame on screen
    // even if a seek event has not repainted the readout yet.
    const video = videoRef.current;
    const tMs = video ? Math.round(video.currentTime * 1000) : currentMs;
    startTransition(async () => {
      await addComment(submission.id, tMs, body);
      setCommentBody("");
    });
  }

  function handleDeleteComment(commentId: string) {
    startTransition(async () => {
      await deleteComment(commentId, submission.id);
    });
  }

  function handleFinish() {
    if (!verdict) return;
    const reply = replyBody.trim();
    startTransition(async () => {
      await finish(submission.id, verdict, reply);
    });
  }

  const sortedComments = [...submission.comments].sort((a, b) => a.tMs - b.tMs);

  return (
    <div className="space-y-6">
      <div className={cn(surface, "space-y-4 p-5")}>
        {submission.mediaId ? (
          <video
            ref={videoRef}
            controls
            playsInline
            preload="metadata"
            onTimeUpdate={syncTime}
            onSeeked={syncTime}
            onSeeking={syncTime}
            onLoadedMetadata={syncTime}
            className="w-full rounded-[1rem] bg-black"
          >
            <source src={`/app/media/${submission.mediaId}`} />
            {t("unsupported")}
          </video>
        ) : submission.videoUrl ? (
          <div className="space-y-2">
            <iframe
              src={submission.videoUrl}
              title={submission.exerciseName ?? t("reviewTitle")}
              allow="autoplay; fullscreen"
              className="aspect-video w-full rounded-[1rem] bg-black"
            />
            <p className={muted}>{t("externalHint")}</p>
          </div>
        ) : null}

        {pinnable && (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" onClick={() => stepFrame(-1)} className={buttonGhost}>
                ◀ 1/30s
              </button>
              <span className="min-w-[5ch] font-sans text-sm text-cream/85 tabular-nums">
                {formatClipTime(currentMs)}
              </span>
              <button type="button" onClick={() => stepFrame(1)} className={buttonGhost}>
                1/30s ▶
              </button>
              <div className="ml-auto flex items-center gap-1.5">
                {RATES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setPlaybackRate(r)}
                    className={rate === r ? chipAccent : chip}
                  >
                    {r}×
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[12rem] flex-1">
                <label htmlFor="comment-body" className="sr-only">
                  {t("addComment")}
                </label>
                <input
                  id="comment-body"
                  value={commentBody}
                  onChange={(event) => setCommentBody(event.target.value)}
                  placeholder={t("commentPlaceholder")}
                  className={field}
                />
              </div>
              <button
                type="button"
                onClick={handleAddComment}
                disabled={pending || !commentBody.trim()}
                className={buttonPrimary}
              >
                {t("addComment")} · {formatClipTime(currentMs)}
              </button>
            </div>
          </>
        )}
      </div>

      <div className={cn(surface, "space-y-3 p-5")}>
        {sortedComments.length === 0 ? (
          <p className={muted}>{t("noComments")}</p>
        ) : (
          <ul className="space-y-2.5">
            {sortedComments.map((comment) => (
              <li key={comment.id} className="flex items-start justify-between gap-3">
                <button
                  type="button"
                  onClick={() => seek(comment.tMs)}
                  disabled={!pinnable}
                  className="text-left disabled:cursor-default"
                >
                  <span className="block font-sans tabular-nums text-xs text-accent-ink underline decoration-caramel/40 underline-offset-2">
                    {t("jumpTo", { time: formatClipTime(comment.tMs) })}
                  </span>
                  <span className="font-sans text-sm text-cream/85">{comment.body}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteComment(comment.id)}
                  disabled={pending}
                  aria-label={t("deleteComment")}
                  className="shrink-0 font-sans text-sm text-cream/40 transition-colors hover:text-silk"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={cn(surface, "space-y-4 p-5")}>
        <p className={eyebrow}>{t("verdictLabel")}</p>

        {isDone ? (
          <div className="space-y-2">
            {submission.verdict && (
              <span className={chipAccent}>{t(`verdict.${submission.verdict}`)}</span>
            )}
            {submission.reply && <p className="font-sans text-sm text-cream/85">{submission.reply}</p>}
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t("verdictLabel")}>
              {VERDICTS.map((v) => (
                <label key={v} className={cn(verdict === v ? chipAccent : chip, "cursor-pointer")}>
                  <input
                    type="radio"
                    name="verdict"
                    value={v}
                    checked={verdict === v}
                    onChange={() => setVerdict(v)}
                    className="sr-only"
                  />
                  {t(`verdict.${v}`)}
                </label>
              ))}
            </div>

            <div>
              <label htmlFor="reply-body" className={eyebrow}>
                {t("replyLabel")}
              </label>
              <textarea
                id="reply-body"
                rows={3}
                value={replyBody}
                onChange={(event) => setReplyBody(event.target.value)}
                placeholder={t("replyPlaceholder")}
                className={cn(field, "mt-1.5")}
              />
            </div>

            <button
              type="button"
              onClick={handleFinish}
              disabled={pending || !verdict}
              className={buttonPrimary}
            >
              {t("finishReview")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
