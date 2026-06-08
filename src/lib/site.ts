/**
 * Central site configuration — single source of truth for metadata,
 * brand details and contact info. Update here, not in components.
 */
export const site = {
  name: "Brigite's Studio",
  trainer: "Sara Brigites",
  description:
    "Brigite's Studio — personal training com a Sara Brigites. Treinos personalizados, acompanhamento e resultados reais.",
  url: "https://brigites.studio",
  locale: "pt-PT",
  email: "geral@brigites.studio",
  social: {
    instagram: "https://www.instagram.com/brigitecircus",
    facebook: "",
  },
  nav: [
    { label: "Home", href: "/" },
    { label: "Services", href: "#services" },
    { label: "About me", href: "#about" },
    { label: "Get in touch!", href: "#contact" },
  ],
} as const;

export type Site = typeof site;
