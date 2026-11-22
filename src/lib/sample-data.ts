// Editorial homepage content (products live in the database).
// Images are from Unsplash.

export type Collection = {
  slug: string;
  title: string;
  description: string;
  image: string;
};

export const unsplash = (id: string, width = 1600) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${width}&q=80`;

// Zoomed crop of the same photo around a focal point, used for gallery detail shots.
export const detail = (id: string, x: number, y: number, zoom: number) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&crop=focalpoint&fp-x=${x}&fp-y=${y}&fp-z=${zoom}&w=1200&h=1600&q=80`;

export const hero = {
  eyebrow: "Autumn / Winter",
  title: "The Quiet Season",
  description:
    "Soft tailoring, heavy knits and leather made to be worn for years.",
  image: unsplash("1485968579580-b6d095142e6e", 2400),
};

export const collections: Collection[] = [
  {
    slug: "women",
    title: "Women",
    description: "Coats, knitwear and city layers",
    image: unsplash("1539109136881-3be0616acf4b"),
  },
  {
    slug: "men",
    title: "Men",
    description: "Tailoring cut close to the body",
    image: unsplash("1507679799987-c73779587ccf"),
  },
  {
    slug: "shoes",
    title: "Shoes",
    description: "Heels, loafers and everyday leather",
    image: unsplash("1543163521-1bf539c55dd2"),
  },
];

export const editorials = [
  {
    eyebrow: "Evening",
    href: "/shop/dresses",
    title: "After Dark",
    description: "Bare shoulders, deep colour and a single statement piece.",
    image: unsplash("1566174053879-31528523f8ae"),
  },
  {
    eyebrow: "Tailoring",
    href: "/shop/tailoring",
    title: "The New Suit",
    description: "Lighter construction for days that start early and end late.",
    image: unsplash("1617137968427-85924c800a22"),
  },
];

export const services = [
  {
    title: "Complimentary Shipping",
    description: "Free express delivery on every order.",
  },
  {
    title: "Returns Within 30 Days",
    description: "Send it back, no questions asked.",
  },
  {
    title: "Signature Packaging",
    description: "Every order arrives gift-wrapped.",
  },
  {
    title: "Client Advisors",
    description: "Styling help by chat, phone or appointment.",
  },
];
