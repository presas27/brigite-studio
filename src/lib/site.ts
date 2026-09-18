/**
 * Central site configuration — single source of truth for metadata,
 * brand details and contact info. Update here, not in components.
 */
export const site = {
  name: "Brigite's Studio",
  trainer: "Sara Brigites",
  description:
    "Personal training com a Sara Brigites. Treinos personalizados, acompanhamento próximo e resultados reais.",
  url: "https://brigitestudio.com",
  locale: "pt-PT",
  country: "PT",
  email: "hello@brigitestudio.com",
  images: {
    og: "/images/sara/hero-wide.webp",
    ogWidth: 3840,
    ogHeight: 1920,
    portrait: "/images/sara/about-photo.webp",
  },
  social: {
    instagram: "https://www.instagram.com/brigitecircus",
    facebook: "",
  },
  // `key` maps to the `Nav` namespace in messages/*.json for labels.
  // `contact` renders as the outline pill on desktop, a plain link on mobile.
  nav: [
    { key: "home", href: "/" },
    { key: "about", href: "#sobre" },
    { key: "plans", href: "#planos" },
    { key: "work", href: "#trabalho" },
    { key: "contact", href: "#contacto" },
  ],
} as const;

export type Site = typeof site;
