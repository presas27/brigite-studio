import { useTranslations } from "next-intl";
import { about } from "@/lib/about";
import { Media } from "@/components/ui/Media";

/**
 * About me — portrait on the left, justified bio on the right. Copy comes
 * from the `About` namespace.
 */
export function About() {
  const t = useTranslations("About");
  const paragraphs = [t("p1"), t("p2"), t("p3")];

  return (
    <section id="about" className="w-full px-6 py-16 md:px-10 md:py-24 lg:py-32">
      <div className="mx-auto grid max-w-6xl items-center gap-10 md:grid-cols-2 md:gap-16">
        <Media
          src={about.image}
          alt="Sara Brigites"
          className="aspect-[2/3] w-full"
          sizes="(min-width: 768px) 50vw, 100vw"
        />

        <div className="font-serif text-lg font-bold leading-relaxed text-foreground sm:text-xl">
          <p>{t("heading")}</p>
          {paragraphs.map((paragraph, i) => (
            <p key={i} className="mt-6 text-left sm:text-justify">
              {paragraph}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
