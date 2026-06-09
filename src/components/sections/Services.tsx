import { useTranslations } from "next-intl";
import { featuredService, serviceItems } from "@/lib/services";
import { Media } from "@/components/ui/Media";
import { ServiceCard } from "@/components/ui/ServiceCard";

/**
 * Services section — intro line, a wide featured "Personal Training"
 * card, then a two-column grid of secondary services. Copy comes from
 * the `Services` namespace; ids in `serviceItems` map to message keys.
 */
export function Services() {
  const t = useTranslations("Services");

  return (
    <section id="services" className="w-full px-6 py-16 md:px-10 md:py-24 lg:py-32">
      <div className="mx-auto max-w-6xl">
        {/* Intro */}
        <p className="mx-auto max-w-4xl text-center font-serif text-2xl font-bold leading-snug tracking-tight md:text-3xl">
          {t("intro")}
        </p>

        {/* Featured card */}
        <div className="mt-16 grid items-center gap-8 rounded-[2rem] bg-[#ece4da] p-6 sm:p-10 md:grid-cols-2 md:gap-12 lg:mt-24">
          <Media
            src={featuredService.image}
            alt={t("featured.title")}
            className="aspect-[4/5] w-full bg-[#f1f0ee]"
            sizes="(min-width: 768px) 50vw, 100vw"
          />
          <div>
            <h2 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl">
              {t("featured.title")}
            </h2>
            <p className="mt-5 max-w-md font-serif text-lg font-bold leading-snug text-foreground/90 sm:text-xl">
              {t("featured.description")}
            </p>
          </div>
        </div>

        {/* Grid */}
        <div className="mt-16 grid gap-x-8 gap-y-16 md:grid-cols-2 lg:mt-24">
          {serviceItems.map((item) => (
            <ServiceCard
              key={item.id}
              title={t(`items.${item.id}.title`)}
              description={t(`items.${item.id}.description`)}
              image={item.image}
              cta={
                item.cta
                  ? { label: t(`items.${item.id}.cta`), href: item.cta.href }
                  : undefined
              }
            />
          ))}
        </div>
      </div>
    </section>
  );
}
