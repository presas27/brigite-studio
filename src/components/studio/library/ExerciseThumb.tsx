import Image from "next/image";
import { Icon } from "@/components/studio/coach/icons";
import { youtubeId, youtubeThumb } from "@/lib/youtube";
import { cn } from "@/lib/utils";

/**
 * Exercise thumbnail. Falls back to a quiet plate rather than a broken frame —
 * a link that isn't YouTube (or no link at all) reads as "no image" instead of
 * "something failed".
 */
export function ExerciseThumb({ videoUrl, className }: { videoUrl: string | null; className?: string }) {
  const id = videoUrl ? youtubeId(videoUrl) : null;
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[0.85rem] bg-cream/[0.06] ring-1 ring-cream/10",
        className,
      )}
    >
      {id ? (
        /**
         * `fill` because the plate's size belongs to the caller — this same
         * component is rendered at four widths across the grid and the builder.
         *
         * `unoptimized` because there is nothing to win: `mqdefault` is already
         * 320px, already the right size for the largest plate, and already on
         * Google's CDN. Running sixty of them per page through the optimizer
         * would buy a few kilobytes and cost sixty invocations.
         */
        <Image
          src={youtubeThumb(id)}
          alt=""
          fill
          sizes="320px"
          className="object-cover"
          unoptimized
        />
      ) : (
        <div className="grid h-full w-full place-items-center">
          <Icon name="dumbbell" className="h-6 w-6 text-cream/15" />
        </div>
      )}
    </div>
  );
}
