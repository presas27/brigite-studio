import type { Metadata, Viewport } from "next";
import { Anton, Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { site } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
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
  const locale = await getLocale();
  const t = await getTranslations("Meta");
  const title = t("title");
  const description = t("description");
  const ogLocale = locale === "pt" ? "pt_PT" : "en_GB";

  return {
    title: {
      default: title,
      template: `%s · ${site.name}`,
    },
    description,
    metadataBase: new URL(site.url),
    alternates: { canonical: "/" },
    robots: { index: true, follow: true },
    openGraph: {
      type: "website",
      locale: ogLocale,
      url: "/",
      siteName: site.name,
      title,
      description,
      images: [
        {
          url: site.images.og,
          width: site.images.ogWidth,
          height: site.images.ogHeight,
          alt: t("ogAlt"),
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [site.images.og],
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} ${anton.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
