"use client";

import Link from "next/link";
import { Icon } from "@/components/studio/coach/icons";
import { buttonGhost, buttonPrimary, heading, muted, surface } from "@/components/studio/theme";
import { cn } from "@/lib/utils";

type ErrorPanelProps = {
  title: string;
  /** One sentence: what happened, and what to do about it. */
  lead: string;
  retryLabel: string;
  onRetryAction: () => void;
  /** A second way out, for when retrying is not what is wanted. */
  href?: string;
  hrefLabel?: string;
  /**
   * Next's error digest. In production the real message never reaches the
   * browser, so this hash is the only thing that ties what the coach saw to a
   * line in the server log — which is exactly what makes a bug report useful.
   */
  reference?: string;
  className?: string;
};

/**
 * What an error boundary renders. One shape for all of them, so a failure looks
 * like part of the product rather than like the framework's default white page:
 * the same card, the same buttons, and a way forward that is not the browser's
 * reload button.
 *
 * Copy arrives as props rather than being read here, because the outermost
 * boundary (`global-error`) renders above the i18n provider and has no
 * translator to call.
 */
export function ErrorPanel({
  title,
  lead,
  retryLabel,
  onRetryAction,
  href,
  hrefLabel,
  reference,
  className,
}: ErrorPanelProps) {
  return (
    <div className={cn("flex min-h-[60dvh] items-center justify-center px-5 py-16", className)}>
      <div className={cn(surface, "w-full max-w-xl space-y-5 p-6 sm:p-8")}>
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-cream/5 text-accent-ink ring-1 ring-cream/10">
          <Icon name="alert" className="h-6 w-6" />
        </span>

        <div className="space-y-2">
          <h1 className={cn(heading, "text-[1.75rem] sm:text-[2.25rem]")}>{title}</h1>
          <p className={cn(muted, "max-w-prose")}>{lead}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={onRetryAction} className={buttonPrimary}>
            {retryLabel}
          </button>
          {href && hrefLabel && (
            <Link href={href} className={buttonGhost}>
              {hrefLabel}
            </Link>
          )}
        </div>

        {reference && (
          <p className="font-sans text-xs tabular-nums text-cream/40">{reference}</p>
        )}
      </div>
    </div>
  );
}
