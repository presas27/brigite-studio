/**
 * "Trabalho" — curated portfolio of Sara's circus / aerial work, exported and
 * optimized (webp, ~1200px) from her JamarGig profile into /public/images/work.
 *
 * Only watermark-free shots were kept. Each entry carries a stable `key`; the
 * localized alt text lives in the `Work.alt` namespace (messages/*.json), so
 * the strip stays fully translatable. Section copy lives under `Work`.
 */
export type WorkImage = {
  src: string;
  /** Maps to `Work.alt.<key>` for the localized alt text. */
  key: string;
};

/** External profile the "Ver +" CTA links out to. */
export const workProfileUrl = "https://profile.jamargig.com/sarabrigite/";

export const workImages: WorkImage[] = [
  { src: "/images/work/aerial-straps-purple.webp", key: "aerialStrapsPurple" },
  { src: "/images/work/aerial-straps-blue.webp", key: "aerialStrapsBlue" },
  { src: "/images/work/aerial-hoop-orange.webp", key: "aerialHoopOrange" },
  { src: "/images/work/fire-performance.webp", key: "firePerformance" },
  { src: "/images/work/aerial-silks-red.webp", key: "aerialSilksRed" },
  { src: "/images/work/contortion-backbend.webp", key: "contortionBackbend" },
  { src: "/images/work/stage-pose-red.webp", key: "stagePoseRed" },
  { src: "/images/work/editorial-red-curtain.webp", key: "editorialRedCurtain" },
  { src: "/images/work/editorial-red-silk.webp", key: "editorialRedSilk" },
  { src: "/images/work/editorial-red-portrait.webp", key: "editorialRedPortrait" },
] as const;
