/**
 * Services content. Text mirrors the reference design verbatim
 * (including its original typos). `image` paths are placeholders —
 * drop the real files into /public/images and reference them here.
 *
 * NOTE: a couple of strings are truncated in the source screenshots
 * and marked with TODO — confirm the full copy.
 */

export type Service = {
  title: string;
  description: string;
  image?: string;
  cta?: { label: string; href: string };
};

/** Wide, highlighted card shown above the grid. */
export const featuredService: Service = {
  title: "Personal Training",
  description:
    "Build strenght, improve your health and develop confidence in your body through personalised training tailored to your goals, lifestyle and experience",
  // image: "/images/services/personal-training.jpg",
};

/** Two-column grid of secondary services. */
export const services: Service[] = [
  {
    title: "Aerial & Performance",
    // TODO: copy is cut off in the reference — confirm full text.
    description:
      "Coaching for aerial artist and adventurous athelets looking to develop strength, mobility, technique and confidence through",
    // image: "/images/services/aerial-performance.jpg",
  },
  {
    title: "Mobolity & Flexibility",
    description:
      "Develop flexibility, mobility and body control while imptoving the way you move, train and feel everyday.",
    // image: "/images/services/mobility-flexibility.jpg",
  },
  {
    title: "Handbalancing",
    description:
      "Discover the art of balancing through a progressive approach focused on strength, awareness and body control. Whether you're a beginner or experienced, sessions are tailored to your level and goals.",
    // image: "/images/services/handbalancing.jpg",
  },
  {
    title: "Performances",
    description:
      "Bring something extraordinary to your event with bespoke aerial and hand balancing performances designed to captivate and inspire.",
    cta: { label: "Get in touch", href: "#contact" },
    // image: "/images/services/performances.jpg",
  },
];

/** Centered intro line above the services. */
export const servicesIntro =
  "Strength, conditioning and personalised training designed around your goals and lifestyle, helping you become healthier, stronger, and more confident in your body and yourself";
