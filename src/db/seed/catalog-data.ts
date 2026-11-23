// Initial catalog loaded by `npm run db:seed`. Images are from Unsplash.

import { detail, unsplash } from "@/lib/sample-data";

export type CategorySeed = { slug: string; name: string; sortOrder: number };

// Stock is one number for one-size products, or one number per size.
export type ColorSeed = { name: string; hex: string; stock: number | number[] };

export type ProductSeed = {
  slug: string;
  name: string;
  categorySlug: string;
  priceCents: number;
  isNew?: boolean;
  audience: "women" | "men" | "unisex";
  isGift?: boolean;
  // Empty means one size.
  sizes: string[];
  colors: ColorSeed[];
  description: string;
  details: string[];
  images: string[];
};

export const categorySeeds: CategorySeed[] = [
  { slug: "knitwear", name: "Knitwear", sortOrder: 0 },
  { slug: "outerwear", name: "Outerwear", sortOrder: 1 },
  { slug: "ready-to-wear", name: "Ready-to-wear", sortOrder: 2 },
  { slug: "bags", name: "Bags", sortOrder: 3 },
  { slug: "shoes", name: "Shoes", sortOrder: 4 },
  { slug: "eyewear", name: "Eyewear", sortOrder: 5 },
  { slug: "jewelry", name: "Jewelry", sortOrder: 6 },
  { slug: "dresses", name: "Dresses", sortOrder: 7 },
  { slug: "tailoring", name: "Tailoring", sortOrder: 8 },
];

// Listed newest first; the seed gives earlier entries a later created_at.
export const productSeeds: ProductSeed[] = [
  {
    slug: "fringed-knit-poncho",
    name: "Fringed Knit Poncho",
    categorySlug: "knitwear",
    priceCents: 690_00,
    audience: "women",
    isGift: true,
    sizes: [],
    // The first colour is the one photographed.
    colors: [{ name: "Ivory", hex: "#EFE8DA", stock: 12 }, { name: "Sand", hex: "#CDB89A", stock: 5 }],
    isNew: true,
    description:
      "An open-stitch poncho knitted from a soft cotton blend, finished with a knotted fringe along the hem. Light enough to layer over a shirt, warm enough for late evenings.",
    details: [
      "70% cotton, 30% linen",
      "Open-stitch knit with knotted fringe",
      "Relaxed, one-size fit",
      "Hand wash cold, dry flat",
    ],
    images: [
      unsplash("1434389677669-e08b4cac3105", 1400),
      detail("1434389677669-e08b4cac3105", 0.5, 0.55, 2),
      detail("1434389677669-e08b4cac3105", 0.5, 0.85, 2.2),
      detail("1434389677669-e08b4cac3105", 0.35, 0.4, 1.6),
    ],
  },
  {
    slug: "biker-leather-jacket",
    name: "Biker Leather Jacket",
    categorySlug: "outerwear",
    priceCents: 2450_00,
    audience: "unisex",
    sizes: ["XS", "S", "M", "L", "XL"],
    // The first colour is the one photographed.
    colors: [{ name: "Black", hex: "#1C1C1C", stock: [0, 1, 2, 1, 0] }, { name: "Cognac", hex: "#8A4B2A", stock: [1, 2, 0, 1, 0] }],
    description:
      "A close-fitting biker jacket cut from supple lambskin, with an asymmetric zip, snap-down lapels and zipped pockets. It softens and takes on your shape with wear.",
    details: [
      "100% lambskin leather, cotton lining",
      "Asymmetric front zip, three zipped pockets",
      "Fitted through the body",
      "Specialist leather clean only",
    ],
    images: [
      unsplash("1551028719-00167b16eac5", 1400),
      detail("1551028719-00167b16eac5", 0.6, 0.7, 2),
      detail("1551028719-00167b16eac5", 0.3, 0.75, 2.2),
      detail("1551028719-00167b16eac5", 0.75, 0.45, 2),
    ],
  },
  {
    slug: "suede-bomber-jacket",
    name: "Suede Bomber Jacket",
    categorySlug: "outerwear",
    priceCents: 1890_00,
    audience: "unisex",
    sizes: ["XS", "S", "M", "L", "XL"],
    // The first colour is the one photographed.
    colors: [{ name: "Terracotta", hex: "#B5553A", stock: [0, 0, 0, 0, 0] }],
    isNew: true,
    description:
      "A lightweight bomber with a soft sheen, ribbed hem and cuffs, and a utility pocket on the sleeve. Cut slightly boxy to sit easily over knitwear.",
    details: [
      "100% polyamide shell, viscose lining",
      "Front zip, sleeve utility pocket",
      "Regular fit, ribbed hem and cuffs",
      "Dry clean",
    ],
    images: [
      unsplash("1591047139829-d91aecb6caea", 1400),
      detail("1591047139829-d91aecb6caea", 0.5, 0.62, 2.2),
      detail("1591047139829-d91aecb6caea", 0.45, 0.85, 2.2),
      detail("1591047139829-d91aecb6caea", 0.78, 0.62, 2.4),
    ],
  },
  {
    slug: "pleated-jogging-trousers",
    name: "Pleated Jogging Trousers",
    categorySlug: "ready-to-wear",
    priceCents: 520_00,
    audience: "women",
    sizes: ["XS", "S", "M", "L", "XL"],
    // The first colour is the one photographed.
    colors: [{ name: "Blush", hex: "#E4B9B0", stock: [1, 2, 3, 2, 0] }],
    description:
      "Tailored joggers in washed satin with an elasticated waist, patch pockets and gathered cuffs. Dress them up with heels or down with a knit.",
    details: [
      "100% washed satin viscose",
      "Elasticated waist, front patch pockets",
      "Relaxed leg with elasticated cuffs",
      "Machine wash cold, delicate cycle",
    ],
    images: [
      unsplash("1594633312681-425c7b97ccd1", 1400),
      detail("1594633312681-425c7b97ccd1", 0.5, 0.3, 2),
      detail("1594633312681-425c7b97ccd1", 0.5, 0.8, 2),
      detail("1594633312681-425c7b97ccd1", 0.35, 0.55, 2),
    ],
  },
  {
    slug: "top-handle-bag",
    name: "Top Handle Bag",
    categorySlug: "bags",
    priceCents: 2890_00,
    audience: "women",
    isGift: true,
    sizes: [],
    // The first colour is the one photographed.
    colors: [{ name: "Petrol Blue", hex: "#1F4E5F", stock: 1 }],
    description:
      "A structured top handle bag in pebbled calfskin, closed with a polished push-lock. Carry it by hand or wear it on the detachable shoulder strap.",
    details: [
      "Pebbled calfskin, suede interior",
      "Gold-tone push-lock closure",
      "Detachable, adjustable shoulder strap",
      "W 26 × H 19 × D 10 cm",
    ],
    images: [
      unsplash("1594223274512-ad4803739b7c", 1400),
      detail("1594223274512-ad4803739b7c", 0.75, 0.7, 2.2),
      detail("1594223274512-ad4803739b7c", 0.7, 0.3, 2),
      detail("1594223274512-ad4803739b7c", 0.6, 0.55, 1.6),
    ],
  },
  {
    slug: "suede-derby-shoes",
    name: "Suede Derby Shoes",
    categorySlug: "shoes",
    priceCents: 890_00,
    audience: "men",
    sizes: ["40", "41", "42", "43", "44", "45"],
    // The first colour is the one photographed.
    colors: [{ name: "Sage", hex: "#9AA58A", stock: [1, 1, 2, 1, 1, 0] }, { name: "Tan", hex: "#B08458", stock: [0, 2, 2, 1, 0, 1] }],
    description:
      "Brogued derbies in soft calf suede on a stacked leather heel. Goodyear-welted, so they can be resoled for years to come.",
    details: [
      "Calf suede upper, leather lining",
      "Brogue detailing, stacked leather heel",
      "Goodyear-welted leather sole",
      "Brush with a suede brush, protect before wear",
    ],
    images: [
      unsplash("1560343090-f0409e92791a", 1400),
      detail("1560343090-f0409e92791a", 0.55, 0.5, 2),
      detail("1560343090-f0409e92791a", 0.33, 0.58, 2.4),
      detail("1560343090-f0409e92791a", 0.4, 0.6, 2),
    ],
  },
  {
    slug: "round-metal-sunglasses",
    name: "Round Metal Sunglasses",
    categorySlug: "eyewear",
    priceCents: 410_00,
    audience: "unisex",
    isGift: true,
    sizes: [],
    // The first colour is the one photographed.
    colors: [{ name: "Gold / Green", hex: "#B49A54", stock: 20 }, { name: "Silver / Grey", hex: "#A7A9AC", stock: 8 }],
    isNew: true,
    description:
      "Slim round frames in gold-tone metal with green mineral glass lenses. A light, timeless shape that suits most faces.",
    details: [
      "Gold-tone metal frame",
      "Green mineral glass lenses, 100% UV protection",
      "Adjustable nose pads",
      "Comes with a leather case and cloth",
    ],
    images: [
      unsplash("1511499767150-a48a237f0083", 1400),
      detail("1511499767150-a48a237f0083", 0.35, 0.45, 2.2),
      detail("1511499767150-a48a237f0083", 0.75, 0.45, 2.2),
      detail("1511499767150-a48a237f0083", 0.5, 0.5, 1.5),
    ],
  },
  {
    slug: "sapphire-drop-earrings",
    name: "Sapphire Drop Earrings",
    categorySlug: "jewelry",
    priceCents: 1150_00,
    audience: "women",
    isGift: true,
    sizes: [],
    // The first colour is the one photographed.
    colors: [{ name: "Silver / Blue", hex: "#5470A8", stock: 4 }],
    description:
      "Statement drop earrings set with a pear-cut blue stone framed by baguette and round crystals. Made for evenings.",
    details: [
      "Rhodium-plated brass",
      "Pear-cut blue glass stone, clear crystals",
      "Post-back fastening",
      "Length 6 cm",
    ],
    images: [
      unsplash("1535632066927-ab7c9ab60908", 1400),
      detail("1535632066927-ab7c9ab60908", 0.6, 0.6, 2.2),
      detail("1535632066927-ab7c9ab60908", 0.4, 0.35, 2.2),
      detail("1535632066927-ab7c9ab60908", 0.5, 0.5, 1.5),
    ],
  },
  {
    slug: "belted-wool-coat",
    name: "Belted Wool Coat",
    categorySlug: "outerwear",
    priceCents: 2150_00,
    isNew: true,
    audience: "women",
    sizes: ["XS", "S", "M", "L", "XL"],
    // The first colour is the one photographed.
    colors: [{ name: "Powder Blue", hex: "#A9C1DA", stock: [1, 1, 1, 1, 1] }, { name: "Camel", hex: "#C19A6B", stock: [2, 3, 3, 2, 1] }],
    description:
      "A long, softly tailored coat in double-faced wool, worn open or cinched at the waist. Dropped shoulders and deep patch pockets keep it relaxed.",
    details: [
      "90% wool, 10% cashmere",
      "Double-faced, unlined construction",
      "Relaxed fit, falls below the knee",
      "Dry clean",
    ],
    images: [
      unsplash("1539109136881-3be0616acf4b", 1400),
      detail("1539109136881-3be0616acf4b", 0.45, 0.45, 2),
      detail("1539109136881-3be0616acf4b", 0.5, 0.72, 2),
    ],
  },
  {
    slug: "checked-wool-overcoat",
    name: "Checked Wool Overcoat",
    categorySlug: "outerwear",
    priceCents: 1980_00,
    audience: "women",
    sizes: ["XS", "S", "M", "L", "XL"],
    // The first colour is the one photographed.
    colors: [{ name: "Forest Check", hex: "#2F4A3A", stock: [0, 1, 1, 1, 0] }],
    description:
      "An oversized overcoat in a dark windowpane check, with notch lapels and a single-breasted front. Cut generously to layer over knitwear.",
    details: [
      "100% virgin wool, viscose lining",
      "Single-breasted, two flap pockets",
      "Oversized fit",
      "Dry clean",
    ],
    images: [
      unsplash("1485968579580-b6d095142e6e", 1400),
      detail("1485968579580-b6d095142e6e", 0.5, 0.5, 2),
      detail("1485968579580-b6d095142e6e", 0.45, 0.75, 2.2),
    ],
  },
  {
    slug: "floral-wrap-dress",
    name: "Floral Wrap Dress",
    categorySlug: "dresses",
    priceCents: 760_00,
    isNew: true,
    audience: "women",
    sizes: ["XS", "S", "M", "L", "XL"],
    // The first colour is the one photographed.
    colors: [{ name: "Ivory Floral", hex: "#F1EADF", stock: [2, 2, 2, 2, 1] }],
    description:
      "A fluid wrap dress in printed crêpe de chine with a tie waist and short sleeves. The skirt moves beautifully with every step.",
    details: [
      "100% silk crêpe de chine",
      "Wrap front with tie waist",
      "Midi length",
      "Dry clean",
    ],
    images: [
      unsplash("1496747611176-843222e1e57c", 1400),
      detail("1496747611176-843222e1e57c", 0.5, 0.4, 2),
      detail("1496747611176-843222e1e57c", 0.5, 0.7, 2),
    ],
  },
  {
    slug: "off-shoulder-evening-dress",
    name: "Off-Shoulder Evening Dress",
    categorySlug: "dresses",
    priceCents: 1290_00,
    audience: "women",
    sizes: ["XS", "S", "M", "L"],
    // The first colour is the one photographed.
    colors: [{ name: "Plum", hex: "#5B2A45", stock: [0, 1, 1, 0] }, { name: "Black", hex: "#1C1C1C", stock: [1, 1, 1, 1] }],
    description:
      "A sculpted evening dress in compact rib knit with a wide off-shoulder neckline. It holds its shape while following the body.",
    details: [
      "80% viscose, 20% polyamide rib knit",
      "Off-shoulder ribbed neckline",
      "Fitted, floor-skimming length",
      "Hand wash cold",
    ],
    images: [
      unsplash("1566174053879-31528523f8ae", 1400),
      detail("1566174053879-31528523f8ae", 0.5, 0.75, 2),
      detail("1566174053879-31528523f8ae", 0.6, 0.55, 2.4),
    ],
  },
  {
    slug: "navy-wool-suit-jacket",
    name: "Navy Wool Suit Jacket",
    categorySlug: "tailoring",
    priceCents: 1650_00,
    isNew: true,
    audience: "men",
    sizes: ["S", "M", "L", "XL"],
    // The first colour is the one photographed.
    colors: [{ name: "Midnight Navy", hex: "#1F2A44", stock: [1, 2, 3, 1] }],
    description:
      "A single-breasted suit jacket in fine wool twill, half-canvassed for a soft, natural shoulder. Pair it with the matching trousers or wear it alone.",
    details: [
      "100% wool twill, cupro lining",
      "Half-canvas construction, notch lapels",
      "Slim fit",
      "Dry clean",
    ],
    images: [
      unsplash("1507679799987-c73779587ccf", 1400),
      detail("1507679799987-c73779587ccf", 0.5, 0.45, 2),
      detail("1507679799987-c73779587ccf", 0.45, 0.25, 2.4),
    ],
  },
  {
    slug: "two-piece-cotton-suit",
    name: "Two-Piece Cotton Suit",
    categorySlug: "tailoring",
    priceCents: 1890_00,
    audience: "men",
    sizes: ["S", "M", "L", "XL"],
    // The first colour is the one photographed.
    colors: [{ name: "Royal Blue", hex: "#2B4BA0", stock: [0, 0, 0, 0] }],
    description:
      "A lightweight two-piece suit in stretch cotton, with a soft-shouldered jacket and slim, cropped trousers. Made for warm-weather events.",
    details: [
      "97% cotton, 3% elastane",
      "Unstructured jacket, slim cropped trousers",
      "Slim fit",
      "Dry clean",
    ],
    images: [
      unsplash("1617137968427-85924c800a22", 1400),
      detail("1617137968427-85924c800a22", 0.5, 0.4, 2.2),
      detail("1617137968427-85924c800a22", 0.5, 0.7, 2.2),
    ],
  },
];
