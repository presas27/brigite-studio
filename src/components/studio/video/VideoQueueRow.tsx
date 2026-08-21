import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils";
import type { Submission } from "@/lib/studio/types";
import { chip, chipAccent, muted, surfaceLink } from "../theme";

/** One row in the coach's review queue: enough to triage without opening it. */
export async function VideoQueueRow({ submission }: { submission: Submission }) {
  const t = await getTranslations("Studio.videos");
  const locale = await getLocale();
  const age = new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(submission.createdAt));

  return (
    <Link
      href={`/app/coach/videos/${submission.id}`}
      className={cn(surfaceLink, "flex items-center gap-4 p-4")}
    >
      {submission.mediaId ? (
        // Preview only — no controls, this row just links into the review page.
        <video preload="metadata" muted className="h-16 w-24 shrink-0 rounded-[0.75rem] bg-black">
          <source src={`/app/media/${submission.mediaId}`} />
        </video>
      ) : (
        <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-[0.75rem] bg-cream/5 font-sans text-[0.6rem] uppercase text-cream/45">
          URL
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate font-sans text-sm font-semibold text-cream">{submission.clientName}</p>
        <p className={cn(muted, "truncate")}>
          {submission.exerciseName ?? t("title")} · {age}
        </p>
      </div>

      {submission.status === "reviewed" && submission.verdict ? (
        <span className={chipAccent}>{t(`verdict.${submission.verdict}`)}</span>
      ) : (
        <span className={chip}>{t("pending")}</span>
      )}
    </Link>
  );
}
