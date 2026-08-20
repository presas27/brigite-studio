import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { eyebrow, heading } from "./theme";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
  /** Small all-caps context line above the title. */
  kicker?: string;
  title: string;
  /** One sentence of orientation. Keep it shorter than the title feels. */
  lead?: string;
  /** Right-aligned actions — usually one primary button. */
  action?: React.ReactNode;
  /** Renders a back arrow to this href before the kicker. */
  backHref?: string;
  backLabel?: string;
  className?: string;
};

/**
 * Page masthead for every studio screen. Fixed shape so the app never
 * surprises you about where the title and the primary action live.
 *
 * Async because the back link needs a translated fallback — a hardcoded label
 * here would leak Portuguese into an English session.
 */
export async function PageHeader({
  kicker,
  title,
  lead,
  action,
  backHref,
  backLabel,
  className,
}: PageHeaderProps) {
  const t = await getTranslations("Studio.common");

  return (
    <header className={cn("flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        {backHref && (
          <Link
            href={backHref}
            className="mb-2 inline-flex items-center gap-1.5 font-sans text-xs text-cream/55 transition-colors hover:text-cream"
          >
            <span aria-hidden>←</span>
            {backLabel ?? t("back")}
          </Link>
        )}
        {kicker && <p className={cn(eyebrow, "mb-1.5")}>{kicker}</p>}
        <h1 className={cn(heading, "text-[1.75rem] sm:text-[2.25rem]")}>{title}</h1>
        {lead && <p className="mt-2 max-w-prose text-sm leading-relaxed text-cream/60">{lead}</p>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </header>
  );
}
