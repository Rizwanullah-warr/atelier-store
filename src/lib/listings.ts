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
