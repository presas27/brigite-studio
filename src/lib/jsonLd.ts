import { site } from "@/lib/site";
import { workProfileUrl } from "@/lib/work";

type FaqItem = { q: string; a: string };

/**
 * JSON-LD for the marketing homepage. Service-area business: Lisbon is the
 * city, no street — we do not have a public storefront to put on the map.
 * Reviews stay off this graph; Google only trusts the Business Profile.
 */
export function buildJsonLd(input: {
  locale: string;
  title: string;
  description: string;
  city: string;
  jobTitle: string;
  faq: FaqItem[];
}): Record<string, unknown> {
  const url = site.url;
  const inLanguage = input.locale === "pt" ? "pt-PT" : "en";
  const og = new URL(site.images.og, url).href;
  const portrait = new URL(site.images.portrait, url).href;
  const sameAs = [site.social.instagram, workProfileUrl];

  const businessId = `${url}/#business`;
  const personId = `${url}/#sara`;
  const websiteId = `${url}/#website`;
  const webpageId = `${url}/#webpage`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": websiteId,
        url,
        name: site.name,
        inLanguage,
        publisher: { "@id": businessId },
      },
      {
        "@type": ["LocalBusiness", "ProfessionalService"],
        "@id": businessId,
        name: site.name,
        url,
        email: site.email,
        image: [og, portrait],
        logo: new URL("/icon.png", url).href,
        description: input.description,
        inLanguage,
        address: {
          "@type": "PostalAddress",
          addressLocality: input.city,
          addressCountry: site.country,
        },
        areaServed: {
          "@type": "City",
          name: input.city,
        },
        founder: { "@id": personId },
        employee: { "@id": personId },
        sameAs,
      },
      {
        "@type": "Person",
        "@id": personId,
        name: site.trainer,
        url,
        image: portrait,
        jobTitle: input.jobTitle,
        worksFor: { "@id": businessId },
        alumniOf: {
          "@type": "CollegeOrUniversity",
          name: "University of Kent",
        },
        hasCredential: "YMCA Certified Personal Trainer",
        sameAs,
      },
      {
        "@type": "WebPage",
        "@id": webpageId,
        url,
        name: input.title,
        description: input.description,
        inLanguage,
        isPartOf: { "@id": websiteId },
        about: { "@id": personId },
        primaryImageOfPage: og,
      },
      {
        "@type": "FAQPage",
        "@id": `${url}/#faq`,
        isPartOf: { "@id": webpageId },
        inLanguage,
        mainEntity: input.faq.map((item) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.a,
          },
        })),
      },
    ],
  };
}
