"use client";

import { Anton, Geist } from "next/font/google";
import { ErrorPanel } from "@/components/ErrorPanel";
import "./globals.css";

// The root layout never ran, so nothing has declared the type. Both faces are
// loaded again here rather than left to fall back: a brand page in the
// browser's default sans is exactly what "the framework's page" looks like.
const geistSans = Geist({ variable: "--font-sans", subsets: ["latin"] });
const anton = Anton({ variable: "--font-anton", subsets: ["latin"], weight: "400", display: "swap" });

/**
 * Last resort: the root layout itself threw, so there is no `<html>`, no type
 * and no i18n provider above this — which is why it renders the document shell,
 * declares the fonts again, and reads its copy from English literals rather
 * than from messages. English is the default locale (`src/i18n/config.ts`); a
 * translator call here would throw inside the boundary that exists to catch
 * throwing.
 *
 * Practically nothing reaches this far. The point of having it is that the one
 * thing that does is still ours and not the framework's white page.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" className={`${geistSans.variable} ${anton.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-ink text-cream">
        <ErrorPanel
          title="Something broke on our side"
          lead="The page could not load. Nothing you did — try again, and if it keeps happening tell Sara what you were doing."
          retryLabel="Try again"
          onRetryAction={reset}
          href="/"
          hrefLabel="Back to the site"
          reference={error.digest ? `Reference ${error.digest}` : undefined}
        />
      </body>
    </html>
  );
}
