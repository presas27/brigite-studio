/**
 * Plans — structural data only, no prices. Names, taglines, bullets and
 * CTAs live in messages/*.json under the `Plans` namespace. Order is
 * display order on desktop; the featured card jumps first on mobile.
 */
export type Plan = {
  id: "personal" | "online" | "specialty";
  featured?: boolean;
  bullets: number;
};

export const plans: readonly Plan[] = [
  { id: "online", bullets: 4 },
  { id: "personal", featured: true, bullets: 4 },
  { id: "specialty", bullets: 5 },
] as const;
