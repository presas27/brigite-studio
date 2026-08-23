import { Button } from "@/components/ui/Button";
import { SolMark } from "@/components/ui/SolMark";
import { cn } from "@/lib/utils";

type PlanCardProps = {
  name: string;
  tagline: string;
  bullets: string[];
  cta: string;
  featured?: boolean;
};

/**
 * Plan card — no prices, the CTA routes to the contact form. The
 * featured card glows caramel and says "flagship" without a ribbon.
 */
export function PlanCard({
  name,
  tagline,
  bullets,
  cta,
  featured,
}: PlanCardProps) {
  return (
    <article
      className={cn(
        "relative flex h-full min-h-[26rem] flex-col rounded-[1.25rem] p-8 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
        featured
          ? "gradient-band grain overflow-hidden text-ink hover:shadow-[0_32px_64px_-24px_rgba(198,179,160,0.28)]"
          : "bg-ink-lift text-cream ring-1 ring-cream/10 hover:-translate-y-1 hover:ring-cream/20",
      )}
    >
      {featured && (
        <SolMark className="absolute right-6 top-6 h-9 w-9 text-brown-deep/60" />
      )}
      <h3 className="max-w-[12ch] font-display text-[1.75rem] uppercase leading-none">
        {name}
      </h3>
      <p
        className={cn(
          "mt-3 text-sm leading-relaxed",
          featured ? "text-ink/75" : "text-cream/70",
        )}
      >
        {tagline}
      </p>
      <ul className="mt-6 space-y-3 text-sm leading-relaxed">
        {bullets.map((bullet) => (
          <li key={bullet} className="flex items-start gap-3">
            <SolMark
              className={cn(
                "mt-1 h-2.5 w-2.5 shrink-0",
                featured ? "text-brown-deep/70" : "text-accent-ink/70",
              )}
            />
            {bullet}
          </li>
        ))}
      </ul>
      <div className="mt-8 flex grow items-end">
        <Button
          href="#contacto"
          variant={featured ? "dark" : "cream"}
          className="w-full"
        >
          {cta}
        </Button>
      </div>
    </article>
  );
}
