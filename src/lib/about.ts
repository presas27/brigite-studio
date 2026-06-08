/**
 * "About me" content. Drop the portrait into /public/images and set
 * `image` — until then the Media placeholder keeps the layout intact.
 */
export const about = {
  heading: "Hi, I’m Sara.",
  // image: "/images/about/sara.jpg",
  image: undefined as string | undefined,
  paragraphs: [
    "I’m a former athlete and professional acrobat artist with a background in elite-level movement, strength, and body control, performing internationally across Europe, Asia, and the Americas.",
    "Alongside my performance career, I’ve worked as a coach and studied at the University of Kent in London, UK. I am also a YMCA Certified Personal Trainer, combining practical coaching experience with a strong foundation in exercise science.",
    "I specialise in personalised training designed to build strength, improve fitness, enhance mobility, and increase confidence. My approach focuses on sustainable results that fit your lifestyle and goals.",
  ],
} as const;
