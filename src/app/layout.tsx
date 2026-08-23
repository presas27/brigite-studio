import type { Metadata, Viewport } from "next";
import { Anton, Geist, Playfair_Display } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { getThemeMode } from "@/lib/studio/theme-mode";
import { site } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

// Display face — condensed heavyweight, always uppercase. Single 400
// weight; hierarchy comes from size, never font-weight.
const anton = Anton({
  variable: "--font-anton",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

// Playfair survives italic-only, in exactly two places: one lowercase
// word in the hero headline and the testimonial attribution name.
const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  style: ["italic"],
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#8f2a3a",
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Meta");
  return {
    title: {
      default: site.name,
      template: `%s · ${site.name}`,
    },
    description: t("description"),
    metadataBase: new URL(site.url),
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const themeMode = await getThemeMode();

  return (
    // `data-scroll-behavior` tells the router that `scroll-behavior: smooth` is
    // set in CSS, so it suppresses it during route transitions. Without it the
    // app's page-to-page navigation animates its scroll reset, which reads as
    // lag; anchor links on the marketing page keep their smooth scroll.
    //
    // `data-studio-theme` is rendered from the cookie so the app's light theme
    // paints on the first frame — no flash. It only takes effect inside
    // `.studio`, so the marketing site is never repainted.
    <html
      lang={locale}
      data-scroll-behavior="smooth"
      data-studio-theme={themeMode}
      className={`${geistSans.variable} ${anton.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
