import "server-only";

import { and, desc, eq, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import { db } from "@/db";
import { orderItems, orders, products, productVariants, reviews, user } from "@/db/schema";

// Public review reads are cached and tagged "reviews"; writes call
// updateTag("reviews"). Per-customer checks (bought it? reviewed it?) are not cached.

export type ReviewSummary = { count: number; average: number };

export async function getReviewSummary(productSlug: string): Promise<ReviewSummary> {
  "use cache";
  cacheLife("hours");
  cacheTag("reviews");

  const [row] = await db
    .select({
      count: sql<number>`count(*)::int`,
      average: sql<number>`coalesce(round(avg(${reviews.rating})::numeric, 1), 0)::float`,
    })
    .from(reviews)
    .innerJoin(products, eq(reviews.productId, products.id))
    .where(eq(products.slug, productSlug));
  return row;
}

export async function getProductReviews(productSlug: string, limit = 20) {
  "use cache";
  cacheLife("hours");
  cacheTag("reviews");

  const rows = await db
    .select({
      id: reviews.id,
      rating: reviews.rating,
      title: reviews.title,
      body: reviews.body,
      createdAt: reviews.createdAt,
      authorName: user.name,
    })
    .from(reviews)
    .innerJoin(user, eq(reviews.userId, user.id))
    .innerJoin(products, eq(reviews.productId, products.id))
    .where(eq(products.slug, productSlug))
    .orderBy(desc(reviews.createdAt))
    .limit(limit);
  // Show first names only.
  return rows.map(({ authorName, ...review }) => ({
    ...review,
    author: authorName.trim().split(/\s+/)[0] || "Customer",
  }));
}

// Did this customer buy the product (a paid order with any of its variants)?
export async function hasBoughtProduct(userId: string, productId: string) {
  const [row] = await db
    .select({ found: sql<number>`1` })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .innerJoin(products, eq(products.id, productId))
    .where(
      and(
        eq(orders.userId, userId),
        eq(orders.status, "paid"),
        sql`(${orderItems.productSlug} = ${products.slug} or ${orderItems.variantId} in (select ${productVariants.id} from ${productVariants} where ${productVariants.productId} = ${productId}))`,
      ),
    )
    .limit(1);
  return Boolean(row);
}

export async function getOwnReview(userId: string, productId: string) {
  const [row] = await db
    .select({ rating: reviews.rating, title: reviews.title, body: reviews.body })
    .from(reviews)
    .where(and(eq(reviews.userId, userId), eq(reviews.productId, productId)))
    .limit(1);
  return row ?? null;
}

export async function saveReview(
  userId: string,
  productId: string,
  input: { rating: number; title: string | null; body: string },
) {
  await db
    .insert(reviews)
    .values({ userId, productId, ...input })
    .onConflictDoUpdate({
      target: [reviews.productId, reviews.userId],
      set: { ...input, updatedAt: new Date() },
    });
}

export async function deleteReview(userId: string, productId: string) {
  await db
    .delete(reviews)
    .where(and(eq(reviews.userId, userId), eq(reviews.productId, productId)));
}

export async function getProductIdBySlug(slug: string) {
  const [row] = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.slug, slug))
    .limit(1);
  return row?.id ?? null;
}
