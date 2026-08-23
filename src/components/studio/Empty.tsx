import { mutedOnAccent, muted, surface, surfaceAccent } from "./theme";
import { cn } from "@/lib/utils";

type EmptyProps = {
  title: string;
  /** Say what to do next, not that the list is empty. */
  hint?: string;
  action?: React.ReactNode;
  /**
   * `accent` puts the state on gold. Reserved for empties that are *good news*
   * — an inbox with nothing pending is an achievement, not a void.
   */
  tone?: "flat" | "accent";
  className?: string;
};

/**
 * Empty state. Every list in the app has one — an unexplained blank panel is
 * the fastest way to make a coach think the app is broken.
 */
export function Empty({ title, hint, action, tone = "flat", className }: EmptyProps) {
  const accent = tone === "accent";
  return (
    <div
      className={cn(
        accent ? surfaceAccent : surface,
        "flex flex-col items-start gap-3 p-6",
        className,
      )}
    >
      <p
        className={cn(
          "font-sans font-semibold",
          accent ? "text-lg text-on-dark" : "text-sm text-cream/85",
        )}
      >
        {title}
      </p>
      {hint && <p className={accent ? mutedOnAccent : muted}>{hint}</p>}
      {action}
    </div>
  );
}
