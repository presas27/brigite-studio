import type { Metadata } from "next";
import { seedStudio } from "@/lib/studio/seed";

/**
 * Root of the studio app.
 *
 * `robots: noindex` plus the deliberate absence of any inbound link from the
 * marketing site keeps `/app` unlisted — clients arrive through the emailed
 * sign-in link, never by browsing.
 *
 * The layout also runs the idempotent seed, so a fresh checkout has Sara's
 * coach account and starter library on first request instead of an empty shell.
 */
export const metadata: Metadata = {
  title: "Studio",
  robots: { index: false, follow: false, nocache: true },
};

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  seedStudio();
  return children;
}
