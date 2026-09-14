import { cn } from "@/lib/utils";

const SIZES = {
  /** Account chip in the masthead. */
  sm: "h-7 w-7 text-xs",
  /** Dock button on a phone. */
  md: "h-8 w-8 text-xs",
  /** The person's own account page. */
  lg: "h-16 w-16 text-2xl sm:h-20 sm:w-20 sm:text-3xl",
} as const;

/**
 * A person as a circle: the first letter of their name on the brand fill.
 *
 * There is no photo upload yet, so today the letter is all there is — but the
 * letter is the fallback, not the feature, and it is worth having one shape
 * that draws it. Every place that showed an initial had its own span with its
 * own size and its own idea of the colour; a photo added later changes this
 * file and nothing else.
 *
 * `aria-hidden`: the name is always rendered or labelled next to it, and a
 * screen reader announcing "I" before "Iris Fernandes" is noise.
 */
export function Avatar({
  name,
  size = "sm",
  className,
}: {
  name: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-accent-fill font-sans font-semibold text-ink",
        SIZES[size],
        className,
      )}
    >
      {name.trim().charAt(0).toUpperCase()}
    </span>
  );
}
