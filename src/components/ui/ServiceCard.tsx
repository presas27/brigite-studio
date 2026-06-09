import { Media } from "./Media";
import { Button } from "./Button";

type ServiceCardProps = {
  title: string;
  description: string;
  image?: string;
  cta?: { label: string; href: string };
};

/**
 * Grid service card — square image on top, title and description below,
 * with an optional CTA.
 */
export function ServiceCard({ title, description, image, cta }: ServiceCardProps) {
  return (
    <article className="flex flex-col">
      <Media
        src={image}
        alt={title}
        className="aspect-square w-full"
        sizes="(min-width: 768px) 50vw, 100vw"
      />

      <h3 className="mt-7 font-serif text-2xl font-bold tracking-tight sm:text-3xl">
        {title}
      </h3>

      <p className="mt-4 max-w-prose font-serif text-lg font-bold leading-snug text-foreground/90">
        {description}
      </p>

      {cta ? (
        <div className="mt-6">
          <Button href={cta.href}>{cta.label}</Button>
        </div>
      ) : null}
    </article>
  );
}
