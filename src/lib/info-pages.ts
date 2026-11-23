// Content for /info/[slug], linked from the footer and mobile menu.
// `draft` pages hold placeholder business or legal text that must be replaced
// before launch; the page shows a notice saying so.

export type InfoPage = {
  slug: string;
  title: string;
  group: "Client Services" | "The House" | "Legal";
  draft?: boolean;
  sections: { heading?: string; body: string }[];
  cta?: { label: string; href: string };
};

export const infoPages: InfoPage[] = [
  {
    slug: "contact",
    title: "Contact Us",
    group: "Client Services",
    draft: true,
    sections: [
      {
        body: "Our client advisors can help with sizing, styling and product questions.",
      },
      {
        heading: "Contact details",
        body: "A support email address and phone number have not been configured for this store yet.",
      },
    ],
    cta: { label: "Search the Collection", href: "/search" },
  },
  {
    slug: "shipping",
    title: "Shipping",
    group: "Client Services",
    draft: true,
    sections: [
      {
        body: "Every order ships with complimentary express delivery and arrives in signature packaging.",
      },
      {
        heading: "Checkout",
        body: "Online checkout is not available yet, so orders cannot currently be placed or shipped.",
      },
    ],
  },
  {
    slug: "returns",
    title: "Returns",
    group: "Client Services",
    draft: true,
    sections: [
      {
        body: "Unworn pieces can be returned within 30 days of delivery in their original packaging.",
      },
    ],
  },
  {
    slug: "faq",
    title: "FAQ",
    group: "Client Services",
    sections: [
      {
        heading: "How do I find my size?",
        body: "Choose your size on the product page. Clothing is offered in XS to XL and shoes in EU sizes.",
      },
      {
        heading: "Where is my bag saved?",
        body: "Items in your bag are saved in this browser, so they stay there when you come back on the same device.",
      },
      {
        heading: "Can I place an order?",
        body: "Not yet. Online checkout and payment are still being set up.",
      },
      {
        heading: "Do I need an account?",
        body: "No. You can browse and fill your bag without one. Creating an account lets you sign in to your profile.",
      },
    ],
    cta: { label: "Create an Account", href: "/account" },
  },
  {
    slug: "track-order",
    title: "Track an Order",
    group: "Client Services",
    sections: [
      {
        body: "If you checked out while signed in, every order and its status is listed under Account, in Orders. If you checked out as a guest, your order is shown on the confirmation page you saw after paying, so keep that page for your records. Shipment tracking numbers are not available yet.",
      },
    ],
    cta: { label: "Go to My Account", href: "/account" },
  },
  {
    slug: "about",
    title: "About Atelier",
    group: "The House",
    sections: [
      {
        body: "Atelier makes considered clothing and accessories in small runs, chosen to be worn for years rather than seasons.",
      },
    ],
    cta: { label: "Shop New In", href: "/new-arrivals" },
  },
  {
    slug: "craftsmanship",
    title: "Craftsmanship",
    group: "The House",
    sections: [
      {
        body: "Each product page lists the materials and construction of the piece, from half-canvassed tailoring to Goodyear-welted soles.",
      },
    ],
    cta: { label: "Shop Tailoring", href: "/shop/tailoring" },
  },
  {
    slug: "sustainability",
    title: "Sustainability",
    group: "The House",
    draft: true,
    sections: [
      {
        body: "We favour natural fibres, repairable construction and small production runs. A full sustainability report has not been published yet.",
      },
    ],
  },
  {
    slug: "careers",
    title: "Careers",
    group: "The House",
    sections: [
      {
        body: "There are no open positions at the moment.",
      },
    ],
  },
  {
    slug: "terms",
    title: "Terms of Use",
    group: "Legal",
    draft: true,
    sections: [
      {
        body: "The terms of use for this store have not been written yet. They must be added before the store launches.",
      },
    ],
  },
  {
    slug: "privacy",
    title: "Privacy Policy",
    group: "Legal",
    draft: true,
    sections: [
      {
        heading: "What this site stores today",
        body: "If you create an account, your name, email address and a hashed password are stored in our database, together with sign-in sessions. Your shopping bag is stored only in your browser.",
      },
      {
        body: "A complete privacy policy must be added before the store launches.",
      },
    ],
  },
  {
    slug: "cookies",
    title: "Cookie Settings",
    group: "Legal",
    sections: [
      {
        heading: "Essential cookies only",
        body: "This site sets a sign-in session cookie when you sign in, and uses browser storage to remember your shopping bag. There are no analytics or advertising cookies, so there is nothing to opt out of.",
      },
    ],
  },
];

export const getInfoPage = (slug: string) =>
  infoPages.find((page) => page.slug === slug);

export const infoHref = (slug: string) => `/info/${slug}`;
