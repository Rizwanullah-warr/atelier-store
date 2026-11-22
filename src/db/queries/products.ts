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
import { categories, products } from "@/db/schema";
import {
  curatedListings,
  type Listing,
  type ListingFilter,
  type SortOption,
} from "@/lib/listings";
import type { StorefrontProduct } from "@/lib/product-utils";

// Every storefront product read goes through this file. Reads are cached and
// tagged "products"; call revalidateTag("products") after changing catalog data.

const storefrontColumns = {
  slug: products.slug,
  name: products.name,
  categorySlug: categories.slug,
  categoryName: categories.name,
  priceCents: products.priceCents,
  stock: products.stock,
  isNew: products.isNew,
  color: products.color,
  description: products.description,
  details: products.details,
  images: products.images,
  sizes: products.sizes,
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

export async function getProductBySlug(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("products");

  const [row] = await selectStorefrontProducts()
    .where(eq(products.slug, slug))
    .limit(1);
  return row ? toStorefrontProduct(row) : null;
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

export async function getListingProducts(
  filter: ListingFilter,
  options: { category?: string; sort: SortOption; page: number; pageSize: number },
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
  const where = and(
    ...base,
    ...(category ? [eq(categories.slug, category)] : []),
  );

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
      ),
    )
    .orderBy(desc(products.createdAt))
    .limit(limit);
  return rows.map(toStorefrontProduct);
}
