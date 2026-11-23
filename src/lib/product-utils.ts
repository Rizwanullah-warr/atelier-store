// Pure product helpers, safe to import from server and client components.

export type StorefrontProduct = {
  slug: string;
  name: string;
  category: { slug: string; name: string };
  priceCents: number;
  // Total stock across all variants (0 means every variant is sold out).
  stock: number;
  isNew: boolean;
  // The colour the product is photographed in.
  color: string | null;
  description: string;
  details: string[];
  images: string[];
};

export type ProductVariant = {
  sku: string;
  color: string;
  colorHex: string | null;
  // Null means one size.
  size: string | null;
  stock: number;
};

// The product page also gets every purchasable variant.
export type ProductDetail = StorefrontProduct & { variants: ProductVariant[] };

// Lower-case words joined by hyphens: "Petrol Blue" -> "petrol-blue".
export const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

// Must match the SKU format in drizzle/0002_product_variants.sql.
export const skuFor = (productSlug: string, color: string, size: string | null) =>
  [productSlug, slugify(color), ...(size ? [slugify(size)] : [])].join("-");

export const LOW_STOCK_THRESHOLD = 3;

export type StockState = "in-stock" | "low-stock" | "sold-out";

export const getStockState = (stock: number): StockState =>
  stock === 0
    ? "sold-out"
    : stock <= LOW_STOCK_THRESHOLD
      ? "low-stock"
      : "in-stock";

// Whole-dollar prices show no cents ($2,450); others show them ($199.50).
export const formatPrice = (cents: number) => {
  const digits = cents % 100 === 0 ? 0 : 2;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(cents / 100);
};
