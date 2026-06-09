/**
 * "About me" — structural data only. The heading and paragraphs live in
 * messages/*.json under the `About` namespace. Drop the portrait into
 * /public/images and set `image`; until then the Media placeholder holds.
 */
export const about = {
  // image: "/images/about/sara.jpg",
  image: undefined as string | undefined,
} as const;
