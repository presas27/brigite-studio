import { getLocale, getTranslations } from "next-intl/server";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/sections/Hero";
import { About } from "@/components/sections/About";
import { Plans } from "@/components/sections/Plans";
import { Work } from "@/components/sections/Work";
import { TestimonialBanner } from "@/components/sections/TestimonialBanner";
import { Contact } from "@/components/sections/Contact";
import { FAQ, FAQ_COUNT } from "@/components/sections/FAQ";
import { buildJsonLd } from "@/lib/jsonLd";

export default async function Home() {
  const [locale, tMeta, tNav, tFaq] = await Promise.all([
    getLocale(),
    getTranslations("Meta"),
    getTranslations("Nav"),
    getTranslations("FAQ"),
  ]);
  const jsonLd = buildJsonLd({
    locale,
    title: tMeta("title"),
    description: tMeta("description"),
    city: tNav("city"),
    jobTitle: tMeta("jobTitle"),
    faq: Array.from({ length: FAQ_COUNT }, (_, i) => ({
      q: tFaq(`items.${i + 1}.q`),
      a: tFaq(`items.${i + 1}.a`),
    })),
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <Header />
      <main id="main">
        <Hero />
        <About />
        <Plans />
        <Work />
        <TestimonialBanner />
        <FAQ />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
