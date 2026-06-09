/**
 * Services — structural data only (ids, image paths, CTA targets).
 * All copy lives in messages/*.json under the `Services` namespace,
 * keyed by `id`. Drop real images into /public/images and set `image`.
 */

export type ServiceItem = {
  /** Maps to `Services.items.<id>` in the message catalog. */
  id: string;
  image?: string;
  cta?: { href: string };
};

/** Wide, highlighted card shown above the grid. */
export const featuredService: { image?: string } = {
  // image: "/images/services/personal-training.jpg",
};

/** Two-column grid of secondary services. */
export const serviceItems: ServiceItem[] = [
  {
    id: "aerial",
    // image: "/images/services/aerial-performance.jpg",
  },
  {
    id: "mobility",
    // image: "/images/services/mobility-flexibility.jpg",
  },
  {
    id: "handbalancing",
    // image: "/images/services/handbalancing.jpg",
  },
  {
    id: "performances",
    cta: { href: "#contact" },
    // image: "/images/services/performances.jpg",
  },
];
