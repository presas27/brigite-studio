import Image from "next/image";
import { cn } from "@/lib/utils";

type MediaProps = {
  src?: string;
  alt?: string;
  /** Tailwind aspect-ratio utility, e.g. "aspect-square". */
  className?: string;
  sizes?: string;
  priority?: boolean;
};

/**
 * Image slot with a neutral placeholder. Renders next/image when a
 * src is provided, otherwise a soft grey box so layouts stay intact
 * before assets exist.
 */
export function Media({ src, alt = "", className, sizes, priority }: MediaProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl bg-[#f1f0ee]",
        className,
      )}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes ?? "100vw"}
          priority={priority}
          className="object-cover"
        />
      ) : null}
    </div>
  );
}
