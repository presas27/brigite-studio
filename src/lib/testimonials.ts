/**
 * Testimonials. Placeholder content mirrors the reference ("name",
 * "xxxx") until real reviews exist. Add `avatar` (image path) and a
 * real `href` for the full comment when available.
 */
export type Testimonial = {
  name: string;
  handle: string;
  href?: string;
  avatar?: string;
};

export const testimonials: Testimonial[] = [
  { name: "name", handle: "xxx", href: "#" },
  { name: "name", handle: "xxxx", href: "#" },
  { name: "name", handle: "xxxx", href: "#" },
];
