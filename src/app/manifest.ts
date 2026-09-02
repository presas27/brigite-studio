import type { MetadataRoute } from "next";

/**
 * What makes `/app` installable: on Android and desktop Chrome this is what
 * the install prompt reads; on iOS 16.4+ Safari reads it too when the person
 * adds the page to the home screen, and `display: standalone` is what hides
 * the browser chrome once opened from there.
 *
 * Scope is the app, not the site: the marketing pages open in the browser as
 * usual, and the installed icon lands on the sign-in or the person's home.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/app",
    name: "Brigite's Studio",
    short_name: "Brigite's",
    description: "A tua área de treino.",
    start_url: "/app",
    scope: "/app",
    display: "standalone",
    orientation: "portrait",
    background_color: "#121114",
    theme_color: "#121114",
    lang: "pt",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
