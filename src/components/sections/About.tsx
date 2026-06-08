import { about } from "@/lib/about";
import { Media } from "@/components/ui/Media";

/**
 * About me — portrait on the left, justified bio on the right.
 */
export function About() {
  return (
    <section id="about" className="w-full px-6 py-24 md:px-10 lg:py-32">
      <div className="mx-auto grid max-w-6xl items-center gap-12 md:grid-cols-2 md:gap-16">
        <Media
          src={about.image}
          alt="Sara Brigites"
          className="aspect-[2/3] w-full"
          sizes="(min-width: 768px) 50vw, 100vw"
        />

        <div className="font-serif text-lg font-bold leading-relaxed text-foreground sm:text-xl">
          <p>{about.heading}</p>
          {about.paragraphs.map((paragraph, i) => (
            <p key={i} className="mt-6 text-justify">
              {paragraph}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
