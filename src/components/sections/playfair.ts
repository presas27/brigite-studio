import { Playfair_Display } from "next/font/google";

/** Italic accent on the hero headline and testimonial name. Not loaded on `/app`. */
export const playfair = Playfair_Display({
  subsets: ["latin"],
  style: ["italic"],
  display: "swap",
});
