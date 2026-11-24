import "server-only";

import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  ne,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import { db } from "@/db";
import { categories, products, productVariants } from "@/db/schema";
import {
  curatedListings,
  type Listing,
  type ListingFilter,
  type SortOption,
} from "@/lib/listings";
import type {
  ProductDetail,
  ProductVariant,
  StorefrontProduct,
} from "@/lib/product-utils";

// Every storefront product read goes through this file. Reads are cached and
// tagged "products"; call revalidateTag("products") after changing catalog data.
// The one exception is getLiveBagLines, which must always see current stock.

// Total stock across a product's variants.
const totalStock = sql<number>`(
  select coalesce(sum(${productVariants.stock}), 0)::int
  from ${productVariants}
  where ${productVariants.productId} = ${products.id}
)`;

const storefrontColumns = {
  slug: products.slug,
  name: products.name,
  categorySlug: categories.slug,
  categoryName: categories.name,
  priceCents: products.priceCents,
  stock: totalStock,
  isNew: products.isNew,
  color: products.color,
  description: products.description,
  details: products.details,
  images: products.images,
};

const selectStorefrontProducts = () =>
  db
    .select(storefrontColumns)
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id));

const toStorefrontProduct = ({
  categorySlug,
  categoryName,
  ...row
}: Awaited<ReturnType<typeof selectStorefrontProducts>>[number]): StorefrontProduct => ({
  ...row,
  category: { slug: categorySlug, name: categoryName },
});

const variantColumns = {
  sku: productVariants.sku,
  color: productVariants.color,
  colorHex: productVariants.colorHex,
  size: productVariants.size,
  stock: productVariants.stock,
};

export async function getProductBySlug(
  slug: string,
): Promise<ProductDetail | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("products");

  const [row] = await selectStorefrontProducts()
    .where(eq(products.slug, slug))
    .limit(1);
  if (!row) return null;

  const variants: ProductVariant[] = await db
    .select(variantColumns)
    .from(productVariants)
    .innerJoin(products, eq(productVariants.productId, products.id))
    .where(eq(products.slug, slug))
    .orderBy(asc(productVariants.sortOrder), asc(productVariants.createdAt));

  return { ...toStorefrontProduct(row), variants };
}

export type LiveBagLine = {
  sku: string;
  stock: number;
  priceCents: number;
  name: string;
};

// Current stock and price for the given SKUs, read straight from the
// database (not cached). Used to re-validate the bag; unknown SKUs are omitted.
export async function getLiveBagLines(skus: string[]): Promise<LiveBagLine[]> {
  if (skus.length === 0) return [];
  return db
    .select({
      sku: productVariants.sku,
      stock: productVariants.stock,
      priceCents: products.priceCents,
      name: products.name,
    })
    .from(productVariants)
    .innerJoin(products, eq(productVariants.productId, products.id))
    .where(inArray(productVariants.sku, skus));
}

export async function getAllProductSlugs() {
  "use cache";
  cacheLife("hours");
  cacheTag("products");

  const rows = await db.select({ slug: products.slug }).from(products);
  return rows.map((row) => row.slug);
}

export async function getNewArrivals(limit = 4) {
  "use cache";
  cacheLife("hours");
  cacheTag("products");

  const rows = await selectStorefrontProducts()
    .orderBy(desc(products.createdAt))
    .limit(limit);
  return rows.map(toStorefrontProduct);
}

export async function getProductsByCategorySlugs(slugs: string[], limit = 4) {
  "use cache";
  cacheLife("hours");
  cacheTag("products");

  const rows = await selectStorefrontProducts()
    .where(inArray(categories.slug, slugs))
    .orderBy(categories.sortOrder, desc(products.createdAt))
    .limit(limit);
  return rows.map(toStorefrontProduct);
}

// Same-category products first, then the rest of the catalog.
export async function getRelatedProducts(
  productSlug: string,
  categorySlug: string,
  limit = 4,
) {
  "use cache";
  cacheLife("hours");
  cacheTag("products");

  const rows = await selectStorefrontProducts()
    .where(ne(products.slug, productSlug))
    .orderBy(
      desc(sql`${categories.slug} = ${categorySlug}`),
      desc(products.createdAt),
    )
    .limit(limit);
  return rows.map(toStorefrontProduct);
}

export async function getCategories() {
  "use cache";
  cacheLife("hours");
  cacheTag("products");

  return db
    .select({ slug: categories.slug, name: categories.name })
    .from(categories)
    .orderBy(asc(categories.sortOrder));
}

// A curated listing, or a category page for any category slug.
export async function getListing(slug: string): Promise<Listing | null> {
  const curated = curatedListings.find((listing) => listing.slug === slug);
  if (curated) return curated;

  const category = (await getCategories()).find((c) => c.slug === slug);
  if (!category) return null;
  return {
    slug: category.slug,
    title: category.name,
    eyebrow: "Category",
    description: `Explore ${category.name.toLowerCase()} from the current collection.`,
    filter: { categorySlugs: [category.slug] },
  };
}

const listingConditions = (filter: ListingFilter) => {
  const conditions: SQL[] = [];
  if (filter.audience) {
    conditions.push(inArray(products.audience, [filter.audience, "unisex"]));
  }
  if (filter.isNew) conditions.push(eq(products.isNew, true));
  if (filter.isGift) conditions.push(eq(products.isGift, true));
  if (filter.categorySlugs?.length) {
    conditions.push(inArray(categories.slug, filter.categorySlugs));
  }
  return conditions;
};

const sortOrder = {
  newest: [desc(products.createdAt)],
  "price-asc": [asc(products.priceCents), desc(products.createdAt)],
  "price-desc": [desc(products.priceCents), desc(products.createdAt)],
} satisfies Record<SortOption, SQL[]>;

// Shopper-chosen filters from the URL (sizes, colours, stock, price).
export type ListingRefine = {
  sizes: string[];
  colors: string[];
  inStock: boolean;
  minCents: number | null;
  maxCents: number | null;
};

const SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL"];
const sizeRank = (size: string) => {
  const named = SIZE_ORDER.indexOf(size);
  if (named !== -1) return named;
  const numeric = Number(size);
  return Number.isFinite(numeric) ? 100 + numeric : 1000;
};

// A product matches when at least one of its variants fits the chosen sizes,
// colours and stock; price filters apply to the product price.
const refineConditions = (refine: ListingRefine) => {
  const conditions: SQL[] = [];
  const variantChecks: SQL[] = [];
  if (refine.sizes.length) variantChecks.push(inArray(productVariants.size, refine.sizes));
  if (refine.colors.length) variantChecks.push(inArray(productVariants.color, refine.colors));
  if (refine.inStock) variantChecks.push(sql`${productVariants.stock} > 0`);
  if (variantChecks.length) {
    conditions.push(
      sql`exists (select 1 from ${productVariants} where ${productVariants.productId} = ${products.id} and ${and(...variantChecks)})`,
    );
  }
  if (refine.minCents !== null) conditions.push(sql`${products.priceCents} >= ${refine.minCents}`);
  if (refine.maxCents !== null) conditions.push(sql`${products.priceCents} <= ${refine.maxCents}`);
  return conditions;
};

export async function getListingProducts(
  filter: ListingFilter,
  options: {
    category?: string;
    sort: SortOption;
    page: number;
    pageSize: number;
    refine: ListingRefine;
  },
) {
  "use cache";
  cacheLife("hours");
  cacheTag("products");

  const base = listingConditions(filter);

  // Category facets are counted over the whole listing, before the category filter.
  const facets = await db
    .select({ slug: categories.slug, name: categories.name, count: count() })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(and(...base))
    .groupBy(categories.slug, categories.name, categories.sortOrder)
    .orderBy(asc(categories.sortOrder));

  // Only apply a category that actually belongs to this listing.
  const category = facets.some((facet) => facet.slug === options.category)
    ? options.category
    : undefined;
  const scope = and(...base, ...(category ? [eq(categories.slug, category)] : []));
  const where = and(scope, ...refineConditions(options.refine));

  // Sizes, colours and price range on offer in this listing (before refining).
  const [options_, [priceRange]] = await Promise.all([
    db
      .selectDistinct({
        size: productVariants.size,
        color: productVariants.color,
        colorHex: productVariants.colorHex,
      })
      .from(productVariants)
      .innerJoin(products, eq(productVariants.productId, products.id))
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(scope),
    db
      .select({
        min: sql<number>`coalesce(min(${products.priceCents}), 0)::int`,
        max: sql<number>`coalesce(max(${products.priceCents}), 0)::int`,
      })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(scope),
  ]);
  const sizes = [...new Set(options_.flatMap((o) => (o.size ? [o.size] : [])))].sort(
    (a, b) => sizeRank(a) - sizeRank(b) || a.localeCompare(b),
  );
  const colorMap = new Map<string, string | null>();
  for (const o of options_) if (!colorMap.has(o.color)) colorMap.set(o.color, o.colorHex);
  const colors = [...colorMap]
    .map(([name, hex]) => ({ name, hex }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const [{ total }] = await db
    .select({ total: count() })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(where);

  const pageCount = Math.max(1, Math.ceil(total / options.pageSize));
  const page = Math.min(Math.max(1, options.page), pageCount);

  const rows = await selectStorefrontProducts()
    .where(where)
    .orderBy(...sortOrder[options.sort])
    .limit(options.pageSize)
    .offset((page - 1) * options.pageSize);

  return {
    products: rows.map(toStorefrontProduct),
    total,
    page,
    pageCount,
    facets,
    category,
    refineOptions: { sizes, colors, priceRange },
  };
}

export async function searchProducts(query: string, limit = 24) {
  "use cache";
  cacheLife("hours");
  cacheTag("products");

  const term = query.trim();
  if (!term) return [];

  // Escape LIKE wildcards so the query is matched literally.
  const pattern = `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  const rows = await selectStorefrontProducts()
    .where(
      or(
        ilike(products.name, pattern),
        ilike(products.description, pattern),
        ilike(products.color, pattern),
        ilike(categories.name, pattern),
        sql`exists (
          select 1 from ${productVariants}
          where ${productVariants.productId} = ${products.id}
            and ${productVariants.color} ilike ${pattern}
        )`,
      ),
    )
    .orderBy(desc(products.createdAt))
    .limit(limit);
  return rows.map(toStorefrontProduct);
}

export type CheckoutVariant = {
  variantId: string;
  sku: string;
  stock: number;
  color: string;
  size: string | null;
  productSlug: string;
  name: string;
  priceCents: number;
  image: string | null;
};

// Everything checkout needs per SKU, read live (not cached): prices always
// come from here, never from the browser.
export async function getCheckoutVariants(skus: string[]): Promise<CheckoutVariant[]> {
  if (skus.length === 0) return [];
  return db
    .select({
      variantId: productVariants.id,
      sku: productVariants.sku,
      stock: productVariants.stock,
      color: productVariants.color,
      size: productVariants.size,
      productSlug: products.slug,
      name: products.name,
      priceCents: products.priceCents,
      image: sql<string | null>`${products.images}[1]`,
    })
    .from(productVariants)
    .innerJoin(products, eq(productVariants.productId, products.id))
    .where(inArray(productVariants.sku, skus));
}

// Uncached: the slug list is per customer (wishlist), and stock should be live.
export async function getProductsBySlugs(slugs: string[]) {
  if (slugs.length === 0) return [];
  const rows = await selectStorefrontProducts().where(inArray(products.slug, slugs));
  const bySlug = new Map(rows.map((row) => [row.slug, toStorefrontProduct(row)]));
  // Keep the order the caller asked for.
  return slugs.flatMap((slug) => bySlug.get(slug) ?? []);
}
