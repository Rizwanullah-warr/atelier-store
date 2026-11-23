import "server-only";

import { and, asc, count, desc, eq, inArray, max, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  categories,
  orderItems,
  orders,
  products,
  productVariants,
  user,
  type FulfillmentStatus,
  type OrderStatus,
} from "@/db/schema";
import { LOW_STOCK_THRESHOLD, skuFor } from "@/lib/product-utils";

// Admin reads and writes. Nothing here is cached: admins need live data.
// Callers (admin pages and src/lib/admin-actions.ts) check the admin role first.

// ---------------------------------------------------------------- dashboard

export async function getAdminStats() {
  const [[productCount], [variantStats], [orderStats], lowStock, recentOrders] =
    await Promise.all([
      db.select({ total: count() }).from(products),
      db
        .select({
          lowStock: sql<number>`count(*) filter (where ${productVariants.stock} > 0 and ${productVariants.stock} <= ${LOW_STOCK_THRESHOLD})::int`,
          soldOut: sql<number>`count(*) filter (where ${productVariants.stock} = 0)::int`,
        })
        .from(productVariants),
      db
        .select({
          paid: sql<number>`count(*) filter (where ${orders.status} = 'paid')::int`,
          toShip: sql<number>`count(*) filter (where ${orders.status} = 'paid' and ${orders.fulfillmentStatus} = 'unfulfilled')::int`,
          revenueCents: sql<number>`coalesce(sum(${orders.totalCents}) filter (where ${orders.status} = 'paid'), 0)::int`,
        })
        .from(orders),
      db
        .select({
          productId: products.id,
          name: products.name,
          color: productVariants.color,
          size: productVariants.size,
          stock: productVariants.stock,
        })
        .from(productVariants)
        .innerJoin(products, eq(productVariants.productId, products.id))
        .where(sql`${productVariants.stock} <= ${LOW_STOCK_THRESHOLD}`)
        .orderBy(asc(productVariants.stock), asc(products.name))
        .limit(8),
      listAdminOrders("paid", 5),
    ]);

  return {
    products: productCount.total,
    lowStockVariants: variantStats.lowStock,
    soldOutVariants: variantStats.soldOut,
    paidOrders: orderStats.paid,
    ordersToShip: orderStats.toShip,
    revenueCents: orderStats.revenueCents,
    lowStock,
    recentOrders,
  };
}

// ---------------------------------------------------------------- products

export async function listAdminProducts() {
  return db
    .select({
      id: products.id,
      slug: products.slug,
      name: products.name,
      priceCents: products.priceCents,
      isNew: products.isNew,
      isGift: products.isGift,
      image: sql<string | null>`${products.images}[1]`,
      categoryName: categories.name,
      stock: sql<number>`coalesce(sum(${productVariants.stock}), 0)::int`,
      variants: sql<number>`count(${productVariants.id})::int`,
    })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(productVariants, eq(productVariants.productId, products.id))
    .groupBy(products.id, categories.name)
    .orderBy(desc(products.createdAt));
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (value: unknown): value is string =>
  typeof value === "string" && UUID.test(value);

export async function getAdminProduct(id: string) {
  if (!isUuid(id)) return null;
  const [product] = await db.select().from(products).where(eq(products.id, id)).limit(1);
  if (!product) return null;
  const variants = await db
    .select({
      id: productVariants.id,
      sku: productVariants.sku,
      color: productVariants.color,
      colorHex: productVariants.colorHex,
      size: productVariants.size,
      stock: productVariants.stock,
    })
    .from(productVariants)
    .where(eq(productVariants.productId, id))
    .orderBy(asc(productVariants.sortOrder), asc(productVariants.createdAt));
  return { ...product, variants };
}

export type ProductInput = {
  name: string;
  slug: string;
  categoryId: string;
  priceCents: number;
  description: string;
  details: string[];
  color: string | null;
  audience: "women" | "men" | "unisex";
  isNew: boolean;
  isGift: boolean;
  images: string[];
};

export async function createProduct(input: ProductInput) {
  const [created] = await db
    .insert(products)
    .values(input)
    .returning({ id: products.id });
  return created.id;
}

export async function updateProduct(id: string, input: ProductInput) {
  const [updated] = await db
    .update(products)
    .set(input)
    .where(eq(products.id, id))
    .returning({ id: products.id });
  return Boolean(updated);
}

// Variants are deleted with the product; past orders keep their own copy of
// what was bought (order_items), with variant_id set to null.
export async function deleteProduct(id: string) {
  const [deleted] = await db
    .delete(products)
    .where(eq(products.id, id))
    .returning({ id: products.id });
  return Boolean(deleted);
}

// ---------------------------------------------------------------- variants

export async function createVariant(
  productId: string,
  input: { color: string; colorHex: string | null; size: string | null; stock: number },
) {
  const [product] = await db
    .select({ slug: products.slug })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);
  if (!product) return null;

  const [{ last }] = await db
    .select({ last: max(productVariants.sortOrder) })
    .from(productVariants)
    .where(eq(productVariants.productId, productId));

  const [created] = await db
    .insert(productVariants)
    .values({
      productId,
      // The SKU is fixed when the variant is created, so bags and orders keep
      // pointing at it even if the product slug changes later.
      sku: skuFor(product.slug, input.color, input.size),
      color: input.color,
      colorHex: input.colorHex,
      size: input.size,
      stock: input.stock,
      sortOrder: (last ?? -1) + 1,
    })
    .returning({ id: productVariants.id });
  return created.id;
}

export async function updateVariant(
  id: string,
  input: { stock: number; colorHex: string | null },
) {
  const [updated] = await db
    .update(productVariants)
    .set(input)
    .where(eq(productVariants.id, id))
    .returning({ id: productVariants.id });
  return Boolean(updated);
}

export async function deleteVariant(id: string) {
  const [deleted] = await db
    .delete(productVariants)
    .where(eq(productVariants.id, id))
    .returning({ productId: productVariants.productId });
  return deleted?.productId ?? null;
}

// ---------------------------------------------------------------- categories

export async function listCategoriesWithCounts() {
  return db
    .select({
      id: categories.id,
      slug: categories.slug,
      name: categories.name,
      sortOrder: categories.sortOrder,
      products: sql<number>`count(${products.id})::int`,
    })
    .from(categories)
    .leftJoin(products, eq(products.categoryId, categories.id))
    .groupBy(categories.id)
    .orderBy(asc(categories.sortOrder), asc(categories.name));
}

export type CategoryInput = { name: string; slug: string; sortOrder: number };

export async function createCategory(input: CategoryInput) {
  await db.insert(categories).values(input);
}

export async function updateCategory(id: string, input: CategoryInput) {
  const [updated] = await db
    .update(categories)
    .set(input)
    .where(eq(categories.id, id))
    .returning({ id: categories.id });
  return Boolean(updated);
}

// Fails with a foreign key error while products still use the category.
export async function deleteCategory(id: string) {
  const [deleted] = await db
    .delete(categories)
    .where(eq(categories.id, id))
    .returning({ id: categories.id });
  return Boolean(deleted);
}

// ---------------------------------------------------------------- orders

export const ADMIN_ORDER_FILTERS = {
  paid: { label: "Paid", statuses: ["paid"] },
  refunded: { label: "Refunded", statuses: ["refunded"] },
  incomplete: { label: "Not Completed", statuses: ["pending", "expired", "failed"] },
  all: { label: "All", statuses: null },
} satisfies Record<string, { label: string; statuses: OrderStatus[] | null }>;
export type AdminOrderFilter = keyof typeof ADMIN_ORDER_FILTERS;

export async function listAdminOrders(filter: AdminOrderFilter, limit = 100) {
  const statuses = ADMIN_ORDER_FILTERS[filter].statuses;
  return db
    .select({
      id: orders.id,
      number: orders.number,
      status: orders.status,
      fulfillmentStatus: orders.fulfillmentStatus,
      email: orders.email,
      totalCents: sql<number>`coalesce(${orders.totalCents}, ${orders.subtotalCents})::int`,
      createdAt: orders.createdAt,
      pieces: sql<number>`(select coalesce(sum(${orderItems.quantity}), 0)::int from ${orderItems} where ${orderItems.orderId} = ${orders.id})`,
    })
    .from(orders)
    .where(statuses ? inArray(orders.status, statuses) : undefined)
    .orderBy(desc(orders.createdAt))
    .limit(limit);
}

export async function getAdminOrder(number: number) {
  const order = await db.query.orders.findFirst({
    where: eq(orders.number, number),
    with: { items: { orderBy: [asc(orderItems.name), asc(orderItems.sku)] } },
  });
  if (!order) return null;
  const [account] = order.userId
    ? await db
        .select({ name: user.name, email: user.email })
        .from(user)
        .where(eq(user.id, order.userId))
        .limit(1)
    : [];
  return { ...order, account: account ?? null };
}

// Only paid orders have a delivery to track.
export async function setFulfillmentStatus(orderId: string, status: FulfillmentStatus) {
  const [updated] = await db
    .update(orders)
    .set({ fulfillmentStatus: status, fulfillmentUpdatedAt: new Date() })
    .where(and(eq(orders.id, orderId), eq(orders.status, "paid")))
    .returning({ id: orders.id });
  return Boolean(updated);
}
