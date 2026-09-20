import type { Metadata, Viewport } from "next";
import { Anton, Geist } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
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

  return (
    // `data-scroll-behavior` tells the router that `scroll-behavior: smooth` is
    // set in CSS, so it suppresses it during route transitions — anchor links
    // keep their smooth scroll.
    <html
      lang={locale}
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${anton.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
