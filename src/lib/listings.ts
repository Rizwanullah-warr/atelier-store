// Curated product listings served at /shop/[slug]. Category slugs from the
// database are also valid /shop/[slug] pages (see getListing in db/queries).

export type ListingFilter = {
  audience?: "women" | "men";
  isNew?: boolean;
  isGift?: boolean;
  categorySlugs?: string[];
};

export type Listing = {
  slug: string;
  title: string;
  eyebrow: string;
  description: string;
  filter: ListingFilter;
};

export const curatedListings: Listing[] = [
  {
    slug: "all",
    title: "All Products",
    eyebrow: "The Collection",
    description: "Every piece in the current collection.",
    filter: {},
  },
  {
    slug: "new-in",
    title: "New In",
    eyebrow: "Just Arrived",
    description: "The latest pieces to arrive in the atelier.",
    filter: { isNew: true },
  },
  {
    slug: "women",
    title: "Women",
    eyebrow: "Shop",
    description: "Coats, dresses, knitwear and accessories for women.",
    filter: { audience: "women" },
  },
  {
    slug: "men",
    title: "Men",
    eyebrow: "Shop",
    description: "Tailoring, outerwear, shoes and accessories for men.",
    filter: { audience: "men" },
  },
  {
    slug: "gifts",
    title: "Gifts",
    eyebrow: "Considered Gifting",
    description: "Pieces chosen to give, each arriving in signature packaging.",
    filter: { isGift: true },
  },
  {
    slug: "accessories",
    title: "Accessories",
    eyebrow: "Finishing Touches",
    description: "Bags, shoes, eyewear and jewelry.",
    filter: { categorySlugs: ["bags", "shoes", "eyewear", "jewelry"] },
  },
];

export const navItems = [
  { label: "New In", href: "/new-arrivals" },
  { label: "Women", href: "/shop/women" },
  { label: "Men", href: "/shop/men" },
  { label: "Bags", href: "/shop/bags" },
  { label: "Shoes", href: "/shop/shoes" },
  { label: "Jewelry", href: "/shop/jewelry" },
  { label: "Gifts", href: "/shop/gifts" },
];

export const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
] as const;

export type SortOption = (typeof SORT_OPTIONS)[number]["value"];

export const parseSort = (value: unknown): SortOption =>
  SORT_OPTIONS.some((option) => option.value === value)
    ? (value as SortOption)
    : "newest";

export const PAGE_SIZE = 8;

// Shop filters live in the URL (?size=M&size=L&color=Black&stock=1&min=100&max=900)
// so a filtered listing can be shared. Values are validated, never trusted.
export type RefineParams = {
  sizes: string[];
  colors: string[];
  inStock: boolean;
  minCents: number | null;
  maxCents: number | null;
};

type ParamValue = string | string[] | undefined;
const all = (value: ParamValue) =>
  (Array.isArray(value) ? value : value ? [value] : [])
    .map((v) => v.trim())
    .filter((v) => v.length > 0 && v.length <= 40);
const dollars = (value: ParamValue) => {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw && /^\d{1,7}$/.test(raw.trim()) ? Number(raw.trim()) * 100 : null;
};

export function parseRefine(params: Record<string, ParamValue>): RefineParams {
  let minCents = dollars(params.min);
  let maxCents = dollars(params.max);
  if (minCents !== null && maxCents !== null && minCents > maxCents) {
    [minCents, maxCents] = [maxCents, minCents];
  }
  return {
    // Sorted so the same filters always share one cache entry.
    sizes: [...new Set(all(params.size))].slice(0, 12).sort(),
    colors: [...new Set(all(params.color))].slice(0, 12).sort(),
    inStock: (Array.isArray(params.stock) ? params.stock[0] : params.stock) === "1",
    minCents,
    maxCents,
  };
}

export const refineCount = (refine: RefineParams) =>
  refine.sizes.length +
  refine.colors.length +
  (refine.inStock ? 1 : 0) +
  (refine.minCents !== null || refine.maxCents !== null ? 1 : 0);

export function appendRefine(query: URLSearchParams, refine: RefineParams) {
  for (const size of refine.sizes) query.append("size", size);
  for (const color of refine.colors) query.append("color", color);
  if (refine.inStock) query.set("stock", "1");
  if (refine.minCents !== null) query.set("min", String(refine.minCents / 100));
  if (refine.maxCents !== null) query.set("max", String(refine.maxCents / 100));
  return query;
}
