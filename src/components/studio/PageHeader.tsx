import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Icon } from "./coach/icons";
import { heading } from "./theme";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: string;
  /** One sentence of orientation. Keep it shorter than the title feels. */
  lead?: string;
  /** Right-aligned actions — usually one primary button. */
  action?: React.ReactNode;
  /** Renders the back arrow to the left of the title. */
  backHref?: string;
  className?: string;
};

/**
 * Page masthead for every studio screen. Fixed shape so the app never
 * surprises you about where the title and the primary action live.
 *
 * On a sub-page the way back is an arrow sitting to the left of the title, cut
 * to the weight of the display face so it reads as part of the word rather
 * than a control bolted above it. It replaces the old stacked "← Back" link
 * and the context line over the title: both said what the arrow and the title
 * already say.
 *
 * Async because the arrow needs a translated label — a hardcoded one would
 * leak Portuguese into an English session.
 */
export async function PageHeader({ title, lead, action, backHref, className }: PageHeaderProps) {
  const t = await getTranslations("Studio.common");

  return (
    <header className={cn("flex flex-wrap items-start justify-between gap-x-4 gap-y-3", className)}>
      {/* `flex-1 min-w-0`: the lead's natural width is a whole sentence, and
          without this the block claimed it, shoving even a 44px action onto
          its own line under the title on a phone. */}
      <div className="flex min-w-0 flex-1 items-start gap-3 sm:gap-4">
        {backHref && (
          <Link
            href={backHref}
            aria-label={t("back")}
            className="-ml-1 mt-0.5 inline-flex shrink-0 items-center rounded-full p-1 text-cream transition-transform duration-200 hover:-translate-x-1 motion-reduce:transition-none"
          >
            <Icon name="arrowLeft" strokeWidth={3} className="h-7 w-7 sm:h-8 sm:w-8" />
          </Link>
        )}
        <div className="min-w-0">
          <h1 className={cn(heading, "text-[1.75rem] sm:text-[2.25rem]")}>{title}</h1>
          {lead && <p className="mt-2 max-w-prose text-sm leading-relaxed text-cream/60">{lead}</p>}
        </div>
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </header>
  );
}
