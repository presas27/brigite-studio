/**
 * "About me" — structural data only. The heading and paragraphs live in
 * messages/*.json under the `About` namespace.
 *
 * The photo is cropped to 4:5 to match the card it fills, so `object-cover`
 * has nothing left to crop: at any other ratio the container would take the
 * difference out of the top and bottom, and the top is where her head is.
 */
export const about = {
  image: "/images/sara/about-photo.webp",
  width: 900,
  height: 1125,
  alt: "Sara Brigites",
} as const;
