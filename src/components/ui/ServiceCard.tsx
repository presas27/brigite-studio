import type { Service } from "@/lib/services";
import { Media } from "./Media";
import { Button } from "./Button";

/**
 * Grid service card — square image on top, title and description below,
 * with an optional CTA.
 */
export function ServiceCard({ service }: { service: Service }) {
  return (
    <article className="flex flex-col">
      <Media
        src={service.image}
        alt={service.title}
        className="aspect-square w-full"
        sizes="(min-width: 768px) 50vw, 100vw"
      />

      <h3 className="mt-7 font-serif text-2xl font-bold tracking-tight sm:text-3xl">
        {service.title}
      </h3>

      <p className="mt-4 max-w-prose font-serif text-lg font-bold leading-snug text-foreground/90">
        {service.description}
      </p>

      {service.cta ? (
        <div className="mt-6">
          <Button href={service.cta.href}>{service.cta.label}</Button>
        </div>
      ) : null}
    </article>
  );
}
