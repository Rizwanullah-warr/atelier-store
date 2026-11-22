// Pure product helpers, safe to import from server and client components.

export type StorefrontProduct = {
  slug: string;
  name: string;
  category: { slug: string; name: string };
  priceCents: number;
  stock: number;
  isNew: boolean;
  color: string | null;
  description: string;
  details: string[];
  images: string[];
  // Empty means one size.
  sizes: string[];
};

export const LOW_STOCK_THRESHOLD = 3;

export type StockState = "in-stock" | "low-stock" | "sold-out";

export const getStockState = (stock: number): StockState =>
  stock === 0
    ? "sold-out"
    : stock <= LOW_STOCK_THRESHOLD
      ? "low-stock"
      : "in-stock";

export const formatPrice = (cents: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
