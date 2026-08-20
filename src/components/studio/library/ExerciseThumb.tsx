import { Icon } from "@/components/studio/coach/icons";
import { cn } from "@/lib/utils";

/**
 * Exercise thumbnail. Falls back to a quiet plate rather than a broken frame —
 * the library has no stills yet, and an empty tile that keeps the card's shape
 * reads as "no image" instead of "something failed".
 */
export function ExerciseThumb({ mediaId, className }: { mediaId: string | null; className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[0.85rem] bg-cream/[0.06] ring-1 ring-cream/10",
        className,
      )}
    >
      {mediaId ? (
        <video preload="metadata" muted playsInline className="h-full w-full object-cover">
          <source src={`/app/media/${mediaId}`} />
        </video>
      ) : (
        <div className="grid h-full w-full place-items-center">
          <Icon name="dumbbell" className="h-6 w-6 text-cream/15" />
        </div>
      )}
    </div>
  );
}
